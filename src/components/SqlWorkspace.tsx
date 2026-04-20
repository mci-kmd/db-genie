import { useEffect, useMemo, useState } from 'react'

import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded'
import StopRoundedIcon from '@mui/icons-material/StopRounded'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import Editor, { type Monaco } from '@monaco-editor/react'
import type { editor, Position } from 'monaco-editor'

import type {
  ActiveConnection,
  CopilotModel,
  CopilotSqlResult,
  DatabaseSchema,
  SchemaObjectDetail,
} from '../shared/contracts'

interface SqlWorkspaceProps {
  activeConnection: ActiveConnection | null
  sqlText: string
  copilotPrompt: string
  copilotModels: CopilotModel[]
  selectedCopilotModel: string | null
  schema: DatabaseSchema | null
  selectedObject: SchemaObjectDetail | null
  runningQuery: boolean
  generatingSql: boolean
  copilotModelBusy: boolean
  canRun: boolean
  copilotResult: CopilotSqlResult | null
  onChangeSql: (value: string) => void
  onChangeCopilotPrompt: (value: string) => void
  onChangeCopilotModel: (value: string) => void
  onRunQuery: () => void
  onCancel: () => void
  onGenerateSql: () => void
  onInsertTemplate: () => void
}

const SQL_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'GROUP BY',
  'ORDER BY',
  'HAVING',
  'TOP',
  'WITH',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'OVER',
  'PARTITION BY',
]

const JSON_SNIPPETS = [
  {
    label: 'JSON_VALUE',
    insertText: "JSON_VALUE(${1:jsonColumn}, '${2:$.path}')",
  },
  {
    label: 'JSON_QUERY',
    insertText: "JSON_QUERY(${1:jsonColumn}, '${2:$.path}')",
  },
  {
    label: 'OPENJSON',
    insertText: "OPENJSON(${1:jsonColumn}, '${2:$.path}')",
  },
]

export function SqlWorkspace({
  activeConnection,
  sqlText,
  copilotPrompt,
  copilotModels,
  selectedCopilotModel,
  schema,
  selectedObject,
  runningQuery,
  generatingSql,
  copilotModelBusy,
  canRun,
  copilotResult,
  onChangeSql,
  onChangeCopilotPrompt,
  onChangeCopilotModel,
  onRunQuery,
  onCancel,
  onGenerateSql,
  onInsertTemplate,
}: SqlWorkspaceProps) {
  const [monaco, setMonaco] = useState<Monaco | null>(null)

  const completionPayload = useMemo(
    () => buildCompletionPayload(schema, selectedObject),
    [schema, selectedObject],
  )

  useEffect(() => {
    if (!monaco) {
      return
    }

    const disposable = monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems(model: editor.ITextModel, position: Position) {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        return {
          suggestions: completionPayload.map((item) => ({
            ...item,
            range,
          })),
        }
      },
    })

    return () => disposable.dispose()
  }, [completionPayload, monaco])

  function handleEditorMount(_editor: editor.IStandaloneCodeEditor, nextMonaco: Monaco): void {
    nextMonaco.editor.defineTheme('db-genie', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '9aa5ff' },
        { token: 'string', foreground: '86efac' },
      ],
      colors: {
        'editor.background': '#081120',
        'editor.lineHighlightBackground': '#121a2d',
        'editorCursor.foreground': '#7c8cff',
        'editor.selectionBackground': '#2c3a67',
      },
    })
    setMonaco(nextMonaco)
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">SQL workspace</Typography>
            <Typography variant="body2" color="text.secondary">
              Monaco editor, schema-aware completion, and Copilot drafting.
            </Typography>
          </Box>
          {activeConnection ? (
            <Typography variant="body2" color="text.secondary">
              {activeConnection.server} / {activeConnection.database}
            </Typography>
          ) : null}
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<PlayArrowRoundedIcon />}
            onClick={onRunQuery}
            disabled={!canRun || runningQuery}
          >
            Run query
          </Button>
          <Button variant="outlined" startIcon={<StopRoundedIcon />} onClick={onCancel} disabled={!runningQuery}>
            Cancel
          </Button>
          <Button
            variant="outlined"
            startIcon={<PlaylistAddRoundedIcon />}
            onClick={onInsertTemplate}
            disabled={!selectedObject}
          >
            Insert SELECT
          </Button>
        </Stack>

        <Stack direction="row" spacing={1.5}>
          <TextField
            fullWidth
            label="Ask Copilot for SQL"
            size="small"
            value={copilotPrompt}
            onChange={(event) => onChangeCopilotPrompt(event.target.value)}
            placeholder="e.g. Find customers with failed payments in the last 30 days"
          />
          <TextField
            select
            label="Model"
            size="small"
            value={selectedCopilotModel ?? ''}
            onChange={(event) => onChangeCopilotModel(event.target.value)}
            disabled={copilotModelBusy || copilotModels.length === 0}
            sx={{ minWidth: 260 }}
          >
            {copilotModels.length === 0 ? (
              <MenuItem value="" disabled>
                {copilotModelBusy ? 'Loading models...' : 'No models available'}
              </MenuItem>
            ) : (
              copilotModels.map((model) => (
                <MenuItem key={model.id} value={model.id}>
                  {formatModelLabel(model)}
                </MenuItem>
              ))
            )}
          </TextField>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AutoAwesomeRoundedIcon />}
            onClick={onGenerateSql}
            disabled={
              !canRun || generatingSql || copilotModelBusy || !selectedCopilotModel || !copilotPrompt.trim()
            }
          >
            Generate
          </Button>
        </Stack>

        {copilotResult?.rationale ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            {copilotResult.rationale}
          </Alert>
        ) : null}

        <Box sx={{ flex: 1, minHeight: 0, borderRadius: 3, overflow: 'hidden' }}>
          <Editor
            height="100%"
            defaultLanguage="sql"
            value={sqlText}
            theme="db-genie"
            onChange={(value) => onChangeSql(value ?? '')}
            onMount={handleEditorMount}
            options={{
              automaticLayout: true,
              fontSize: 14,
              fontLigatures: true,
              minimap: { enabled: false },
              quickSuggestions: true,
              padding: { top: 18 },
              suggest: {
                showWords: false,
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  )
}

type CompletionPayload = Array<{
  label: string
  kind: number
  detail: string
  insertText: string
  insertTextRules?: number
}>

function buildCompletionPayload(
  schema: DatabaseSchema | null,
  selectedObject: SchemaObjectDetail | null,
): CompletionPayload {
  const payload: CompletionPayload = []
  const seen = new Set<string>()

  const push = (entry: CompletionPayload[number]) => {
    if (seen.has(entry.label)) {
      return
    }
    seen.add(entry.label)
    payload.push(entry)
  }

  for (const keyword of SQL_KEYWORDS) {
    push({
      label: keyword,
      kind: 14,
      detail: 'T-SQL keyword',
      insertText: keyword,
    })
  }

  for (const snippet of JSON_SNIPPETS) {
    push({
      label: snippet.label,
      kind: 27,
      detail: 'SQL Server JSON helper',
      insertText: snippet.insertText,
      insertTextRules: 4,
    })
  }

  for (const schemaGroup of schema?.schemas ?? []) {
    push({
      label: schemaGroup.schema,
      kind: 8,
      detail: 'Schema',
      insertText: schemaGroup.schema,
    })

    for (const objectMetadata of schemaGroup.objects) {
      push({
        label: `${objectMetadata.schema}.${objectMetadata.name}`,
        kind: 8,
        detail: `${objectMetadata.type} · ${objectMetadata.columns.length} columns`,
        insertText: `[${objectMetadata.schema}].[${objectMetadata.name}]`,
      })

      for (const column of objectMetadata.columns) {
        push({
          label: column.name,
          kind: 5,
          detail: `${column.dataType}${column.isJsonCandidate ? ' · JSON?' : ''}`,
          insertText: `[${column.name}]`,
        })
      }
    }
  }

  for (const [columnName, jsonPaths] of Object.entries(selectedObject?.jsonPaths ?? {})) {
    for (const jsonPath of jsonPaths) {
      push({
        label: `${columnName} ${jsonPath}`,
        kind: 12,
        detail: `JSON path from ${columnName}`,
        insertText: `'${jsonPath}'`,
      })
    }
  }

  return payload
}

function formatModelLabel(model: CopilotModel): string {
  return model.name === model.id ? model.name : `${model.name} (${model.id})`
}
