import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'

import { Alert, Box, LinearProgress, Skeleton, Snackbar, Stack } from '@mui/material'
import { Group, Panel, Separator, useDefaultLayout } from 'react-resizable-panels'

import { ConnectionDialog, type ConnectionDialogMode } from './components/ConnectionDialog'
import { ConnectionPill } from './components/ConnectionPill'
import { SidebarBrand } from './components/SidebarBrand'
import { StatusBar } from './components/StatusBar'
import { palette } from './theme'

const SchemaExplorer = lazy(async () => ({
  default: (await import('./components/SchemaExplorer')).SchemaExplorer,
}))
const ResultsPane = lazy(async () => ({
  default: (await import('./components/ResultsPane')).ResultsPane,
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

const SQL_TEXT_STORAGE_KEY = 'db-genie/sql-text'
const COPILOT_PROMPT_STORAGE_KEY = 'db-genie/copilot-prompt'

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

function App() {
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([])
  const [activeConnection, setActiveConnection] = useState<ActiveConnection | null>(null)
  const [schema, setSchema] = useState<DatabaseSchema | null>(null)
  const [selectedObject, setSelectedObject] = useState<SchemaObjectRef | null>(null)
  const [objectDetails, setObjectDetails] = useState<Record<string, SchemaObjectDetail>>({})
  const [sqlText, setSqlText] = useState(() => readStoredText(SQL_TEXT_STORAGE_KEY))
  const [copilotPrompt, setCopilotPrompt] = useState(() => readStoredText(COPILOT_PROMPT_STORAGE_KEY))
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

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<ConnectionDialogMode>('add')
  const [dialogForm, setDialogForm] = useState<ConnectionProfileInput>(defaultForm)
  const [dialogProfile, setDialogProfile] = useState<ConnectionProfile | undefined>(undefined)

  const mainSplit = useDefaultLayout({
    id: 'db-genie/main-split',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  })
  const editorResultsSplit = useDefaultLayout({
    id: 'db-genie/editor-results',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  })

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
        if (health.activeConnection) {
          setActiveConnection(health.activeConnection)
          await refreshSchema(true)
        }
        if (health.resumeError) {
          setErrorMessage(health.resumeError)
        }
      } catch (error) {
        setErrorMessage(toErrorMessage(error))
      } finally {
        setLoadingProfiles(false)
      }

      await loadCopilotConfig()
    })()
  }, [loadCopilotConfig])

  useEffect(() => {
    writeStoredText(SQL_TEXT_STORAGE_KEY, sqlText)
  }, [sqlText])

  useEffect(() => {
    writeStoredText(COPILOT_PROMPT_STORAGE_KEY, copilotPrompt)
  }, [copilotPrompt])

  function openAddDialog(): void {
    setDialogMode('add')
    setDialogProfile(undefined)
    setDialogForm(defaultForm)
    setDialogOpen(true)
  }

  function openEditDialog(profile: ConnectionProfile): void {
    setDialogMode('edit')
    setDialogProfile(profile)
    setDialogForm(profileToForm(profile))
    setDialogOpen(true)
  }

  function openEditActive(): void {
    if (!activeConnection?.profileId) {
      return
    }
    const profile = profiles.find((entry) => entry.id === activeConnection.profileId)
    if (profile) {
      openEditDialog(profile)
    }
  }

  async function handleDialogSave(form: ConnectionProfileInput): Promise<void> {
    setSavingProfile(true)
    try {
      const savedProfile = await window.dbGenie.saveConnectionProfile(form)
      const nextProfiles = await window.dbGenie.listConnectionProfiles()
      setProfiles(nextProfiles)
      setDialogProfile(savedProfile)
      setDialogForm(profileToForm(savedProfile))
      setDialogMode('edit')
      setStatusMessage(`Saved profile "${savedProfile.name}".`)
    } catch (error) {
      setErrorMessage(toErrorMessage(error))
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleDialogConnect(form: ConnectionProfileInput): Promise<void> {
    setConnecting(true)
    try {
      const nextConnection = await window.dbGenie.connect(form)
      setActiveConnection(nextConnection)
      setQueryResult(null)
      setCopilotResult(null)
      setStatusMessage(`Connected to ${nextConnection.server}/${nextConnection.database}.`)
      setDialogOpen(false)
      await refreshSchema(true)
    } catch (error) {
      setErrorMessage(toErrorMessage(error))
    } finally {
      setConnecting(false)
    }
  }

  async function handleDialogDelete(id: string): Promise<void> {
    try {
      await window.dbGenie.deleteConnectionProfile(id)
      const nextProfiles = await window.dbGenie.listConnectionProfiles()
      setProfiles(nextProfiles)
      setDialogOpen(false)
      setStatusMessage('Deleted saved connection profile.')
    } catch (error) {
      setErrorMessage(toErrorMessage(error))
    }
  }

  async function handlePickProfile(profile: ConnectionProfile): Promise<void> {
    const form = profileToForm(profile)
    setConnecting(true)
    try {
      const nextConnection = await window.dbGenie.connect(form)
      setActiveConnection(nextConnection)
      setQueryResult(null)
      setCopilotResult(null)
      setStatusMessage(`Connected to ${nextConnection.server}/${nextConnection.database}.`)
      await refreshSchema(true)
    } catch (error) {
      setDialogMode('edit')
      setDialogProfile(profile)
      setDialogForm(form)
      setDialogOpen(true)
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
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr 28px',
        height: '100vh',
        width: '100vw',
        position: 'relative',
      }}
    >
      {busy ? (
        <LinearProgress
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            zIndex: 10,
            background: 'transparent',
            '& .MuiLinearProgress-bar': {
              background: `linear-gradient(90deg, ${palette.pink}, ${palette.purple})`,
            },
          }}
        />
      ) : null}

      <Box sx={{ minHeight: 0, overflow: 'hidden' }}>
        <Group
          orientation="horizontal"
          defaultLayout={mainSplit.defaultLayout}
          onLayoutChanged={mainSplit.onLayoutChanged}
          style={{ height: '100%', display: 'flex' }}
        >
          <Panel
            id="sidebar"
            defaultSize={280}
            minSize={220}
            maxSize={480}
            style={{
              background: palette.surface,
              borderRight: `1px solid ${palette.border}`,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <SidebarBrand />
            <ConnectionPill
              activeConnection={activeConnection}
              profiles={profiles}
              connecting={connecting}
              onPickProfile={(profile) => void handlePickProfile(profile)}
              onAddConnection={openAddDialog}
              onEditActive={openEditActive}
              onDisconnect={() => void handleDisconnect()}
              onRefreshSchema={() => void refreshSchema(true)}
              onEditProfile={openEditDialog}
            />
            <Suspense fallback={<PanelLoadingSkeleton />}>
              <SchemaExplorer
                schema={schema}
                selectedObject={selectedObject}
                onSelect={(nextObject) => void handleSelectObject(nextObject)}
              />
            </Suspense>
          </Panel>

          <Separator className="panel-resize-handle-h" />

          <Panel
            id="main"
            defaultSize={1000}
            minSize={400}
            style={{ display: 'flex', minWidth: 0, overflow: 'hidden' }}
          >
            <Group
              orientation="vertical"
              defaultLayout={editorResultsSplit.defaultLayout}
              onLayoutChanged={editorResultsSplit.onLayoutChanged}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
            >
              <Panel id="editor" defaultSize={55} minSize={20} style={{ minHeight: 0 }}>
                <Suspense fallback={<PanelLoadingSkeleton />}>
                  <SqlWorkspace
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
                    onCancel={() => void handleCancelQuery()}
                    onChangeSql={setSqlText}
                    onChangeCopilotPrompt={setCopilotPrompt}
                    onChangeCopilotModel={(modelId) => void handleCopilotModelChange(modelId)}
                    onGenerateSql={() => void handleGenerateSql()}
                    onInsertTemplate={insertTemplateFromSelection}
                    onRunQuery={() => void handleRunQuery()}
                  />
                </Suspense>
              </Panel>

              <Separator className="panel-resize-handle-v" />

              <Panel id="results" defaultSize={45} minSize={15} style={{ minHeight: 0 }}>
                <Suspense fallback={<PanelLoadingSkeleton />}>
                  <ResultsPane
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

      <StatusBar
        activeConnection={activeConnection}
        statusMessage={statusMessage}
        busy={busy}
      />

      <ConnectionDialog
        open={dialogOpen}
        mode={dialogMode}
        initial={dialogForm}
        existingProfile={dialogProfile}
        busy={connecting}
        saving={savingProfile}
        onClose={() => setDialogOpen(false)}
        onSave={handleDialogSave}
        onConnect={handleDialogConnect}
        onDelete={dialogProfile ? handleDialogDelete : undefined}
      />

      <Snackbar
        open={Boolean(errorMessage)}
        autoHideDuration={6000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setErrorMessage(null)} sx={{ maxWidth: 480 }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}

function profileToForm(profile: ConnectionProfile): ConnectionProfileInput {
  return {
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
  }
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

function readStoredText(key: string): string {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.localStorage.getItem(key) ?? ''
}

function writeStoredText(key: string, value: string): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(key, value)
}

function PanelLoadingSkeleton() {
  return (
    <Stack spacing={1} sx={{ p: 2, flex: 1 }}>
      <Skeleton variant="text" width="40%" height={20} />
      <Skeleton variant="rounded" height={28} />
      <Skeleton variant="rounded" height={28} />
      <Skeleton variant="rounded" height={220} />
    </Stack>
  )
}

export default App
