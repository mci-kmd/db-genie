import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'

import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import SyncRoundedIcon from '@mui/icons-material/SyncRounded'
import {
  Alert,
  AppBar,
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Skeleton,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material'
import { Group, Panel, Separator } from 'react-resizable-panels'

const ConnectionPanel = lazy(async () => ({
  default: (await import('./components/ConnectionPanel')).ConnectionPanel,
}))
const ResultsPane = lazy(async () => ({
  default: (await import('./components/ResultsPane')).ResultsPane,
}))
const SchemaExplorer = lazy(async () => ({
  default: (await import('./components/SchemaExplorer')).SchemaExplorer,
}))
const SqlWorkspace = lazy(async () => ({
  default: (await import('./components/SqlWorkspace')).SqlWorkspace,
}))
import type {
  ActiveConnection,
  CopilotConfig,
  CopilotModel,
  ConnectionProfile,
  ConnectionProfileInput,
  CopilotSqlResult,
  DatabaseSchema,
  QueryExecutionResult,
  SchemaObjectDetail,
  SchemaObjectRef,
} from './shared/contracts'

const defaultForm: ConnectionProfileInput = {
  engine: 'sqlserver',
  name: 'Local SQL Server',
  server: 'localhost',
  port: 1433,
  database: 'master',
  user: 'sa',
  password: '',
  encrypt: true,
  trustServerCertificate: true,
  savePassword: false,
}

const defaultSql = `SELECT TOP (100)
  *
FROM sys.tables
ORDER BY name;`

const defaultCopilotPrompt = 'Show the newest rows for the selected table and project the most useful columns.'

function App() {
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([])
  const [form, setForm] = useState<ConnectionProfileInput>(defaultForm)
  const [activeConnection, setActiveConnection] = useState<ActiveConnection | null>(null)
  const [schema, setSchema] = useState<DatabaseSchema | null>(null)
  const [selectedObject, setSelectedObject] = useState<SchemaObjectRef | null>(null)
  const [objectDetails, setObjectDetails] = useState<Record<string, SchemaObjectDetail>>({})
  const [sqlText, setSqlText] = useState(defaultSql)
  const [copilotPrompt, setCopilotPrompt] = useState(defaultCopilotPrompt)
  const [copilotModels, setCopilotModels] = useState<CopilotModel[]>([])
  const [selectedCopilotModel, setSelectedCopilotModel] = useState<string | null>(null)
  const [copilotResult, setCopilotResult] = useState<CopilotSqlResult | null>(null)
  const [queryResult, setQueryResult] = useState<QueryExecutionResult | null>(null)
  const [statusMessage, setStatusMessage] = useState('Ready.')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [loadingSchema, setLoadingSchema] = useState(false)
  const [loadingCopilotConfig, setLoadingCopilotConfig] = useState(false)
  const [savingCopilotModel, setSavingCopilotModel] = useState(false)
  const [runningQuery, setRunningQuery] = useState(false)
  const [generatingSql, setGeneratingSql] = useState(false)

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === form.id),
    [form.id, profiles],
  )
  const selectedObjectDetail = useMemo(
    () => (selectedObject ? objectDetails[makeObjectKey(selectedObject)] ?? null : null),
    [objectDetails, selectedObject],
  )
  const busy =
    loadingProfiles ||
    savingProfile ||
    connecting ||
    loadingSchema ||
    loadingCopilotConfig ||
    savingCopilotModel ||
    runningQuery ||
    generatingSql

  const applyCopilotConfig = useCallback((config: CopilotConfig): void => {
    setCopilotModels(config.models)
    setSelectedCopilotModel(config.selectedModel)
  }, [])

  const loadCopilotConfig = useCallback(async (): Promise<void> => {
    setLoadingCopilotConfig(true)
    try {
      applyCopilotConfig(await window.dbGenie.getCopilotConfig())
    } catch (error) {
      setCopilotModels([])
      setSelectedCopilotModel(null)
      setErrorMessage(toErrorMessage(error))
    } finally {
      setLoadingCopilotConfig(false)
    }
  }, [applyCopilotConfig])

  useEffect(() => {
    void (async () => {
      setLoadingProfiles(true)
      try {
        const [nextProfiles, health] = await Promise.all([
          window.dbGenie.listConnectionProfiles(),
          window.dbGenie.getHealth(),
        ])
        setProfiles(nextProfiles)
        if (nextProfiles.length > 0) {
          applyProfile(nextProfiles[0])
        }
        if (health.activeConnection) {
          setActiveConnection(health.activeConnection)
          await refreshSchema(true)
        }
      } catch (error) {
        setErrorMessage(toErrorMessage(error))
      } finally {
        setLoadingProfiles(false)
      }

      await loadCopilotConfig()
    })()
  }, [loadCopilotConfig])

  function applyProfile(profile: ConnectionProfile): void {
    setForm({
      id: profile.id,
      engine: profile.engine,
      name: profile.name,
      server: profile.server,
      port: profile.port,
      database: profile.database,
      user: profile.user,
      password: '',
      encrypt: profile.encrypt,
      trustServerCertificate: profile.trustServerCertificate,
      savePassword: profile.hasSavedPassword,
    })
    setStatusMessage(`Loaded profile "${profile.name}".`)
  }

  function handleFormChange(
    field: keyof ConnectionProfileInput,
    value: ConnectionProfileInput[keyof ConnectionProfileInput],
  ): void {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSaveProfile(): Promise<void> {
    setSavingProfile(true)
    try {
      const savedProfile = await window.dbGenie.saveConnectionProfile(form)
      const nextProfiles = await window.dbGenie.listConnectionProfiles()
      setProfiles(nextProfiles)
      applyProfile(savedProfile)
      setStatusMessage(`Saved profile "${savedProfile.name}".`)
    } catch (error) {
      setErrorMessage(toErrorMessage(error))
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleDeleteProfile(): Promise<void> {
    if (!form.id) {
      return
    }

    try {
      await window.dbGenie.deleteConnectionProfile(form.id)
      const nextProfiles = await window.dbGenie.listConnectionProfiles()
      setProfiles(nextProfiles)
      setForm(defaultForm)
      setStatusMessage('Deleted saved connection profile.')
    } catch (error) {
      setErrorMessage(toErrorMessage(error))
    }
  }

  async function handleConnect(): Promise<void> {
    setConnecting(true)
    try {
      const nextConnection = await window.dbGenie.connect(form)
      setActiveConnection(nextConnection)
      setQueryResult(null)
      setCopilotResult(null)
      setStatusMessage(`Connected to ${nextConnection.server}/${nextConnection.database}.`)
      await refreshSchema(true)
    } catch (error) {
      setErrorMessage(toErrorMessage(error))
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect(): Promise<void> {
    try {
      await window.dbGenie.disconnect()
      setActiveConnection(null)
      setSchema(null)
      setSelectedObject(null)
      setObjectDetails({})
      setQueryResult(null)
      setCopilotResult(null)
      setStatusMessage('Disconnected.')
    } catch (error) {
      setErrorMessage(toErrorMessage(error))
    }
  }

  async function refreshSchema(forceRefresh = false): Promise<void> {
    setLoadingSchema(true)
    try {
      const nextSchema = await window.dbGenie.getSchema(forceRefresh)
      setSchema(nextSchema)
      setStatusMessage(`Loaded schema for ${nextSchema.database}.`)
    } catch (error) {
      setErrorMessage(toErrorMessage(error))
    } finally {
      setLoadingSchema(false)
    }
  }

  async function handleSelectObject(nextObject: SchemaObjectRef): Promise<void> {
    setSelectedObject(nextObject)
    const key = makeObjectKey(nextObject)
    if (objectDetails[key]) {
      return
    }

    try {
      const detail = await window.dbGenie.getObjectDetail(nextObject)
      setObjectDetails((current) => ({
        ...current,
        [key]: detail,
      }))
    } catch (error) {
      setErrorMessage(toErrorMessage(error))
    }
  }

  function insertTemplateFromSelection(): void {
    if (!selectedObjectDetail) {
      return
    }

    const projection = selectedObjectDetail.columns
      .slice(0, 8)
      .map((column) => `  ${quoteIdentifier(column.name)}`)
      .join(',\n')

    setSqlText(`SELECT TOP (100)
${projection || '  *'}
FROM ${quoteIdentifier(selectedObjectDetail.schema)}.${quoteIdentifier(selectedObjectDetail.name)}
ORDER BY 1;`)
    setStatusMessage(`Drafted SELECT for ${selectedObjectDetail.schema}.${selectedObjectDetail.name}.`)
  }

  async function handleRunQuery(): Promise<void> {
    setRunningQuery(true)
    try {
      const result = await window.dbGenie.runQuery(sqlText)
      setQueryResult(result)
      setStatusMessage(`Query returned ${result.rowCount} row(s) in ${result.durationMs} ms.`)
    } catch (error) {
      setErrorMessage(toErrorMessage(error))
    } finally {
      setRunningQuery(false)
    }
  }

  async function handleCancelQuery(): Promise<void> {
    try {
      await window.dbGenie.cancelQuery()
      setRunningQuery(false)
      setStatusMessage('Cancel requested.')
    } catch (error) {
      setErrorMessage(toErrorMessage(error))
    }
  }

  async function handleGenerateSql(): Promise<void> {
    if (!selectedCopilotModel) {
      setErrorMessage('Select a Copilot model before generating SQL.')
      return
    }

    setGeneratingSql(true)
    try {
      const result = await window.dbGenie.generateSql({
        goal: copilotPrompt,
        currentSql: sqlText,
        selectedObject,
      })
      setCopilotResult(result)
      if (result.sql) {
        setSqlText(result.sql)
      }
      setStatusMessage(`Copilot generated SQL with ${result.model}.`)
    } catch (error) {
      setErrorMessage(toErrorMessage(error))
    } finally {
      setGeneratingSql(false)
    }
  }

  async function handleCopilotModelChange(modelId: string): Promise<void> {
    setSavingCopilotModel(true)
    try {
      const config = await window.dbGenie.setCopilotModel(modelId)
      applyCopilotConfig(config)
      if (config.selectedModel) {
        setStatusMessage(`Using Copilot model ${config.selectedModel}.`)
      }
    } catch (error) {
      setErrorMessage(toErrorMessage(error))
    } finally {
      setSavingCopilotModel(false)
    }
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar sx={{ gap: 2, px: 3, py: 1.5 }}>
          <Stack spacing={0.25} sx={{ flexGrow: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              DB Genie
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Fast SQL happy path for SQL Server, schema-aware IntelliSense, and Copilot-assisted query drafting.
            </Typography>
          </Stack>
          <Chip
            color={activeConnection ? 'success' : 'default'}
            icon={<BoltRoundedIcon />}
            label={
              activeConnection
                ? `${activeConnection.server} / ${activeConnection.database}`
                : 'Disconnected'
            }
            variant={activeConnection ? 'filled' : 'outlined'}
          />
          <Chip icon={<AutoAwesomeRoundedIcon />} label="Copilot SDK" variant="outlined" />
          <Chip icon={<SyncRoundedIcon />} label="SQL Server first" variant="outlined" />
        </Toolbar>
        {busy ? <LinearProgress /> : null}
      </AppBar>

      {errorMessage ? (
        <Alert
          severity="error"
          onClose={() => setErrorMessage(null)}
          sx={{ mx: 3, mt: 2, borderRadius: 2 }}
        >
          {errorMessage}
        </Alert>
      ) : null}

      <Box sx={{ flex: 1, minHeight: 0, p: 2.5 }}>
        <Group orientation="horizontal" style={{ height: '100%' }}>
          <Panel defaultSize={25} minSize={20}>
            <Stack sx={{ height: '100%', gap: 2 }}>
              <Suspense fallback={<PanelLoadingCard lines={6} />}>
                <ConnectionPanel
                  activeConnection={activeConnection}
                  form={form}
                  profiles={profiles}
                  selectedProfile={selectedProfile}
                  busy={connecting}
                  saving={savingProfile}
                  schemaBusy={loadingSchema}
                  onFormChange={handleFormChange}
                  onProfileSelect={applyProfile}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  onSaveProfile={handleSaveProfile}
                  onDeleteProfile={handleDeleteProfile}
                  onRefreshSchema={() => void refreshSchema(true)}
                />
              </Suspense>
              <Suspense fallback={<PanelLoadingCard lines={8} grow />}>
                <SchemaExplorer
                  schema={schema}
                  selectedObject={selectedObject}
                  onSelect={(nextObject) => void handleSelectObject(nextObject)}
                />
              </Suspense>
            </Stack>
          </Panel>

          <Separator className="panel-resize-handle" />

          <Panel minSize={35}>
            <Group orientation="vertical" style={{ height: '100%' }}>
              <Panel defaultSize={58} minSize={35}>
                <Suspense fallback={<PanelLoadingCard lines={10} grow />}>
                  <SqlWorkspace
                    activeConnection={activeConnection}
                    canRun={Boolean(activeConnection)}
                    copilotModels={copilotModels}
                    selectedCopilotModel={selectedCopilotModel}
                    copilotModelBusy={loadingCopilotConfig || savingCopilotModel}
                    copilotPrompt={copilotPrompt}
                    copilotResult={copilotResult}
                    generatingSql={generatingSql}
                    runningQuery={runningQuery}
                    schema={schema}
                    selectedObject={selectedObjectDetail}
                    sqlText={sqlText}
                    onCancel={handleCancelQuery}
                    onChangeSql={setSqlText}
                    onChangeCopilotPrompt={setCopilotPrompt}
                    onChangeCopilotModel={(modelId) => void handleCopilotModelChange(modelId)}
                    onGenerateSql={() => void handleGenerateSql()}
                    onInsertTemplate={insertTemplateFromSelection}
                    onRunQuery={() => void handleRunQuery()}
                  />
                </Suspense>
              </Panel>

              <Separator className="panel-resize-handle" />

              <Panel minSize={25}>
                <Suspense fallback={<PanelLoadingCard lines={7} grow />}>
                  <ResultsPane
                    activeConnection={activeConnection}
                    queryResult={queryResult}
                    queryRunning={runningQuery}
                    selectedObject={selectedObjectDetail}
                  />
                </Suspense>
              </Panel>
            </Group>
          </Panel>
        </Group>
      </Box>

      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          px: 3,
          py: 1.25,
          color: 'text.secondary',
        }}
      >
        <Typography variant="body2">{statusMessage}</Typography>
      </Box>
    </Box>
  )
}

function makeObjectKey(objectRef: SchemaObjectRef): string {
  return `${objectRef.schema}.${objectRef.name}`
}

function quoteIdentifier(value: string): string {
  return `[${value.replaceAll(']', ']]')}]`
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error.'
}

function PanelLoadingCard({
  lines,
  grow = false,
}: {
  lines: number
  grow?: boolean
}) {
  return (
    <Card sx={{ height: '100%', minHeight: 0, flex: grow ? 1 : undefined }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Skeleton variant="text" width="42%" height={32} />
          {Array.from({ length: lines }, (_, index) => (
            <Skeleton
              key={index}
              variant="rounded"
              height={index === lines - 1 && grow ? 220 : 40}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default App
