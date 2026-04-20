export type DatabaseEngine = 'sqlserver'

export interface ConnectionProfile {
  id: string
  engine: DatabaseEngine
  name: string
  server: string
  port: number
  database: string
  user: string
  encrypt: boolean
  trustServerCertificate: boolean
  hasSavedPassword: boolean
  updatedAt: string
}

export interface ConnectionProfileInput {
  id?: string
  engine: DatabaseEngine
  name: string
  server: string
  port: number
  database: string
  user: string
  password?: string
  encrypt: boolean
  trustServerCertificate: boolean
  savePassword: boolean
}

export interface ActiveConnection {
  profileId?: string
  engine: DatabaseEngine
  name: string
  server: string
  database: string
  user: string
  connectedAt: string
}

export interface SchemaObjectRef {
  schema: string
  name: string
  type: 'table' | 'view'
}

export interface ColumnMetadata {
  name: string
  dataType: string
  isNullable: boolean
  isPrimaryKey: boolean
  maxLength: number | null
  precision: number | null
  scale: number | null
  isJsonCandidate: boolean
}

export interface SchemaObjectMetadata extends SchemaObjectRef {
  rowCount: number | null
  columns: ColumnMetadata[]
}

export interface SchemaObjectDetail extends SchemaObjectMetadata {
  jsonPaths: Record<string, string[]>
}

export interface SchemaGroup {
  schema: string
  objects: SchemaObjectMetadata[]
}

export interface DatabaseSchema {
  database: string
  generatedAt: string
  schemas: SchemaGroup[]
}

export interface QueryColumn {
  field: string
  headerName: string
  sqlType: string
}

export interface QueryMessage {
  kind: 'info' | 'warning' | 'error'
  text: string
}

export interface QueryExecutionResult {
  columns: QueryColumn[]
  rows: Array<Record<string, unknown>>
  rowCount: number
  durationMs: number
  truncated: boolean
  messages: QueryMessage[]
}

export interface CopilotSqlRequest {
  goal: string
  currentSql?: string
  selectedObject?: SchemaObjectRef | null
}

export interface CopilotModel {
  id: string
  name: string
}

export interface CopilotConfig {
  models: CopilotModel[]
  selectedModel: string | null
}

export interface CopilotSqlResult {
  sql: string
  rationale: string
  rawResponse: string
  model: string
}

export interface AppHealth {
  connected: boolean
  activeConnection: ActiveConnection | null
}

export interface DbGenieApi {
  listConnectionProfiles(): Promise<ConnectionProfile[]>
  saveConnectionProfile(input: ConnectionProfileInput): Promise<ConnectionProfile>
  deleteConnectionProfile(id: string): Promise<void>
  connect(input: ConnectionProfileInput): Promise<ActiveConnection>
  disconnect(): Promise<void>
  getHealth(): Promise<AppHealth>
  getSchema(forceRefresh?: boolean): Promise<DatabaseSchema>
  getObjectDetail(ref: SchemaObjectRef): Promise<SchemaObjectDetail>
  runQuery(sql: string): Promise<QueryExecutionResult>
  cancelQuery(): Promise<void>
  getCopilotConfig(): Promise<CopilotConfig>
  setCopilotModel(modelId: string): Promise<CopilotConfig>
  generateSql(request: CopilotSqlRequest): Promise<CopilotSqlResult>
}
