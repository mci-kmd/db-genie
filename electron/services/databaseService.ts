import { performance } from 'node:perf_hooks'

import sql from 'mssql'

import type {
  ActiveConnection,
  AppHealth,
  ConnectionProfileInput,
  DatabaseSchema,
  QueryColumn,
  QueryExecutionResult,
  QueryMessage,
  SchemaGroup,
  SchemaObjectDetail,
  SchemaObjectMetadata,
  SchemaObjectRef,
} from '../../src/shared/contracts'
import { ConnectionStore } from './connectionStore'
import { SettingsStore } from './settingsStore'

interface SchemaRow {
  schemaName: string
  objectName: string
  objectType: 'table' | 'view'
  rowCount: number | null
  columnName: string
  dataType: string
  maxLength: number | null
  precision: number | null
  scale: number | null
  isNullable: boolean
  isPrimaryKey: boolean
  isJsonCandidate: boolean
}

const MAX_RENDER_ROWS = 500
const MAX_JSON_COLUMNS = 4

export class DatabaseService {
  private activePool: sql.ConnectionPool | null = null
  private activeConnection: ActiveConnection | null = null
  private activeRequest: sql.Request | null = null
  private schemaCache: DatabaseSchema | null = null
  private readonly objectDetailCache = new Map<string, SchemaObjectDetail>()
  private readonly connectionStore: ConnectionStore
  private readonly settingsStore: SettingsStore
  private resumeError: string | null = null

  constructor(connectionStore: ConnectionStore, settingsStore: SettingsStore) {
    this.connectionStore = connectionStore
    this.settingsStore = settingsStore
  }

  async connect(input: ConnectionProfileInput): Promise<ActiveConnection> {
    await this.closeActiveConnection()

    const resolved = this.connectionStore.resolveConnection(input)
    const pool = new sql.ConnectionPool({
      server: resolved.server,
      port: resolved.port,
      database: resolved.database,
      user: resolved.user,
      password: resolved.password,
      options: {
        encrypt: resolved.encrypt,
        trustServerCertificate: resolved.trustServerCertificate,
      },
      pool: {
        max: 4,
        min: 0,
        idleTimeoutMillis: 30_000,
      },
    })

    this.activePool = await pool.connect()
    this.resumeError = null
    this.activeConnection = {
      profileId: input.id,
      engine: resolved.engine,
      name: resolved.name,
      server: resolved.server,
      database: resolved.database,
      user: resolved.user,
      connectedAt: new Date().toISOString(),
    }
    this.schemaCache = null
    this.objectDetailCache.clear()
    this.settingsStore.setLastConnection({
      profileId: input.id,
      engine: resolved.engine,
      name: resolved.name,
      server: resolved.server,
      port: resolved.port,
      database: resolved.database,
      user: resolved.user,
      password: resolved.password,
      encrypt: resolved.encrypt,
      trustServerCertificate: resolved.trustServerCertificate,
    })

    return this.activeConnection
  }

  async disconnect(options?: { clearLastConnection?: boolean }): Promise<void> {
    await this.closeActiveConnection()
    this.resumeError = null
    if (options?.clearLastConnection ?? true) {
      this.settingsStore.clearLastConnection()
    }
  }

  getHealth(): AppHealth {
    return {
      connected: Boolean(this.activePool && this.activeConnection),
      activeConnection: this.activeConnection,
      resumeError: this.resumeError,
    }
  }

  async resumeLastConnection(): Promise<boolean> {
    const lastConnection = this.settingsStore.getLastConnection()
    if (!lastConnection) {
      this.resumeError = null
      return false
    }

    try {
      await this.connect(lastConnection)
      return true
    } catch (error) {
      await this.closeActiveConnection()
      this.resumeError = `Could not restore previous connection: ${error instanceof Error ? error.message : 'Unexpected error.'}`
      return false
    }
  }

  private async closeActiveConnection(): Promise<void> {
    this.activeRequest = null
    this.schemaCache = null
    this.objectDetailCache.clear()
    this.activeConnection = null

    if (this.activePool) {
      await this.activePool.close()
      this.activePool = null
    }
  }

  async getSchema(forceRefresh = false): Promise<DatabaseSchema> {
    if (this.schemaCache && !forceRefresh) {
      return this.schemaCache
    }

    const pool = this.requirePool()
    const result = await pool.request().query<SchemaRow>(`
      SELECT
        s.name AS schemaName,
        o.name AS objectName,
        CASE WHEN o.type = 'V' THEN 'view' ELSE 'table' END AS objectType,
        row_counts.[rowCount],
        c.name AS columnName,
        t.name AS dataType,
        CASE WHEN c.max_length = -1 THEN NULL ELSE c.max_length END AS maxLength,
        CAST(c.precision AS int) AS precision,
        CAST(c.scale AS int) AS scale,
        CAST(c.is_nullable AS bit) AS isNullable,
        CAST(CASE WHEN primary_key_columns.column_id IS NULL THEN 0 ELSE 1 END AS bit) AS isPrimaryKey,
        CAST(
          CASE
            WHEN t.name IN ('nvarchar', 'varchar', 'nchar', 'char')
              AND (c.max_length = -1 OR c.max_length >= 200)
            THEN 1
            ELSE 0
          END AS bit
        ) AS isJsonCandidate
      FROM sys.objects o
      INNER JOIN sys.schemas s ON s.schema_id = o.schema_id
      INNER JOIN sys.columns c ON c.object_id = o.object_id
      INNER JOIN sys.types t ON t.user_type_id = c.user_type_id
      LEFT JOIN (
        SELECT object_id, SUM(row_count) AS [rowCount]
        FROM sys.dm_db_partition_stats
        WHERE index_id IN (0, 1)
        GROUP BY object_id
      ) row_counts ON row_counts.object_id = o.object_id
      LEFT JOIN (
        SELECT ic.object_id, ic.column_id
        FROM sys.indexes i
        INNER JOIN sys.index_columns ic
          ON ic.object_id = i.object_id
         AND ic.index_id = i.index_id
        WHERE i.is_primary_key = 1
      ) primary_key_columns
        ON primary_key_columns.object_id = c.object_id
       AND primary_key_columns.column_id = c.column_id
      WHERE o.type IN ('U', 'V')
      ORDER BY s.name, o.name, c.column_id;
    `)

    const objectMap = new Map<string, SchemaObjectMetadata>()

    for (const row of result.recordset) {
      const key = this.makeObjectKey(row.schemaName, row.objectName)
      if (!objectMap.has(key)) {
        objectMap.set(key, {
          schema: row.schemaName,
          name: row.objectName,
          type: row.objectType,
          rowCount: row.rowCount,
          columns: [],
        })
      }

      objectMap.get(key)?.columns.push({
        name: row.columnName,
        dataType: row.dataType,
        isNullable: Boolean(row.isNullable),
        isPrimaryKey: Boolean(row.isPrimaryKey),
        maxLength: row.maxLength,
        precision: row.precision,
        scale: row.scale,
        isJsonCandidate: Boolean(row.isJsonCandidate),
      })
    }

    const schemaGroups = new Map<string, SchemaGroup>()
    for (const objectMetadata of objectMap.values()) {
      const group = schemaGroups.get(objectMetadata.schema) ?? {
        schema: objectMetadata.schema,
        objects: [],
      }
      group.objects.push(objectMetadata)
      schemaGroups.set(objectMetadata.schema, group)
    }

    const databaseName = this.activeConnection?.database ?? 'unknown'
    this.schemaCache = {
      database: databaseName,
      generatedAt: new Date().toISOString(),
      schemas: Array.from(schemaGroups.values())
        .sort((left, right) => left.schema.localeCompare(right.schema))
        .map((group) => ({
          ...group,
          objects: group.objects.sort((left, right) => left.name.localeCompare(right.name)),
        })),
    }

    return this.schemaCache
  }

  async getObjectDetail(ref: SchemaObjectRef): Promise<SchemaObjectDetail> {
    const key = this.makeObjectKey(ref.schema, ref.name)
    const cached = this.objectDetailCache.get(key)
    if (cached) {
      return cached
    }

    const schema = await this.getSchema()
    const baseObject = schema.schemas
      .flatMap((group) => group.objects)
      .find((objectMetadata) => objectMetadata.schema === ref.schema && objectMetadata.name === ref.name)

    if (!baseObject) {
      throw new Error(`Schema object ${ref.schema}.${ref.name} was not found.`)
    }

    const jsonPaths = await this.loadJsonPaths(baseObject)
    const detail: SchemaObjectDetail = {
      ...baseObject,
      jsonPaths,
    }

    this.objectDetailCache.set(key, detail)
    return detail
  }

  async runQuery(sqlText: string): Promise<QueryExecutionResult> {
    const trimmed = sqlText.trim()
    if (!trimmed) {
      throw new Error('Enter SQL before running a query.')
    }

    const pool = this.requirePool()
    const startedAt = performance.now()
    const request = pool.request()
    this.activeRequest = request

    try {
      const result = await request.query(trimmed)
      const rawRows = result.recordset ?? []
      const rows = rawRows
        .slice(0, MAX_RENDER_ROWS)
        .map((row: Record<string, unknown>, index: number) => ({
          __rowId: index + 1,
          ...Object.fromEntries(
            Object.entries(row).map(([key, value]) => [key, normalizeCellValue(value)]),
          ),
        }))

      const columnMap = (result.recordset as Array<Record<string, unknown>> & {
        columns?: Record<string, { type?: { declaration?: string } }>
      }).columns

      const columns = (columnMap
        ? Object.entries(columnMap).map<QueryColumn>(([field, meta]) => ({
            field,
            headerName: field,
            sqlType: meta.type?.declaration ?? 'unknown',
          }))
        : Object.keys(rawRows[0] ?? {}).map<QueryColumn>((field) => ({
            field,
            headerName: field,
            sqlType: 'unknown',
          }))) as QueryColumn[]

      const messages: QueryMessage[] = []
      if (result.rowsAffected.length > 0) {
        messages.push({
          kind: 'info',
          text: `Rows affected: ${result.rowsAffected.join(', ')}`,
        })
      }

      return {
        columns,
        rows,
        rowCount: rawRows.length,
        durationMs: Math.round(performance.now() - startedAt),
        truncated: rawRows.length > MAX_RENDER_ROWS,
        messages,
      }
    } finally {
      this.activeRequest = null
    }
  }

  async cancelQuery(): Promise<void> {
    if (this.activeRequest) {
      this.activeRequest.cancel()
    }
  }

  async getSchemaSummary(limit = 40): Promise<Array<{ schema: string; name: string; type: string; columns: string[] }>> {
    const schema = await this.getSchema()
    return schema.schemas
      .flatMap((group) =>
        group.objects.map((objectMetadata) => ({
          schema: objectMetadata.schema,
          name: objectMetadata.name,
          type: objectMetadata.type,
          columns: objectMetadata.columns.slice(0, 12).map((column) => column.name),
        })),
      )
      .slice(0, limit)
  }

  private async loadJsonPaths(objectMetadata: SchemaObjectMetadata): Promise<Record<string, string[]>> {
    if (objectMetadata.type !== 'table') {
      return {}
    }

    const jsonColumns = objectMetadata.columns
      .filter((column) => column.isJsonCandidate)
      .slice(0, MAX_JSON_COLUMNS)

    if (jsonColumns.length === 0) {
      return {}
    }

    const pool = this.requirePool()
    const quotedColumns = jsonColumns.map((column) => quoteIdentifier(column.name)).join(', ')
    const filter = jsonColumns.map((column) => `${quoteIdentifier(column.name)} IS NOT NULL`).join(' OR ')
    const sourceName = `${quoteIdentifier(objectMetadata.schema)}.${quoteIdentifier(objectMetadata.name)}`

    const result = await pool.request().query<Record<string, unknown>>(`
      SELECT TOP (16) ${quotedColumns}
      FROM ${sourceName}
      WHERE ${filter};
    `)

    const pathMap: Record<string, Set<string>> = Object.fromEntries(
      jsonColumns.map((column) => [column.name, new Set<string>()]),
    )

    for (const row of result.recordset) {
      for (const column of jsonColumns) {
        const paths = inferJsonPaths(row[column.name])
        for (const path of paths) {
          pathMap[column.name]?.add(path)
        }
      }
    }

    return Object.fromEntries(
      Object.entries(pathMap).map(([columnName, values]) => [columnName, Array.from(values).sort()]),
    )
  }

  private requirePool(): sql.ConnectionPool {
    if (!this.activePool) {
      throw new Error('Connect to a database first.')
    }

    return this.activePool
  }

  private makeObjectKey(schemaName: string, objectName: string): string {
    return `${schemaName}.${objectName}`
  }
}

function normalizeCellValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Buffer.isBuffer(value)) {
    return `0x${value.toString('hex')}`
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value)
  }

  return value
}

function quoteIdentifier(value: string): string {
  return `[${value.replaceAll(']', ']]')}]`
}

function inferJsonPaths(rawValue: unknown): string[] {
  const paths = new Set<string>()
  const parsed = parseJsonCandidate(rawValue)
  if (parsed === undefined) {
    return []
  }

  walkJsonPaths(parsed, '$', paths, 0)
  return Array.from(paths)
}

function parseJsonCandidate(rawValue: unknown): unknown {
  if (typeof rawValue !== 'string') {
    return undefined
  }

  const trimmed = rawValue.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return undefined
  }

  try {
    return JSON.parse(trimmed)
  } catch {
    return undefined
  }
}

function walkJsonPaths(value: unknown, prefix: string, paths: Set<string>, depth: number): void {
  if (depth > 4 || paths.size > 32) {
    return
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return
    }

    const arrayPrefix = `${prefix}[0]`
    paths.add(arrayPrefix)
    walkJsonPaths(value[0], arrayPrefix, paths, depth + 1)
    return
  }

  if (typeof value !== 'object' || value === null) {
    return
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = `${prefix}.${key}`
    paths.add(childPath)
    walkJsonPaths(child, childPath, paths, depth + 1)
  }
}
