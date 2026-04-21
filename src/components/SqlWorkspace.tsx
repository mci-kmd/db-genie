import { useEffect, useMemo, useState } from 'react'

import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded'
import StopRoundedIcon from '@mui/icons-material/StopRounded'
import {
  Box,
  Button,
  IconButton,
  InputBase,
  MenuItem,
  Select,
  Tooltip,
} from '@mui/material'
import Editor, { type Monaco } from '@monaco-editor/react'
import type { editor, Position } from 'monaco-editor'

import type {
  CopilotModel,
  CopilotSqlResult,
  DatabaseSchema,
  SchemaObjectDetail,
} from '../shared/contracts'
import { fonts, gradients, palette } from '../theme'

interface SqlWorkspaceProps {
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

  function handleBeforeMount(nextMonaco: Monaco): void {
    nextMonaco.editor.defineTheme('db-genie', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'f472b6' },
        { token: 'keyword.sql', foreground: 'f472b6' },
        { token: 'string', foreground: '5eead4' },
        { token: 'string.sql', foreground: '5eead4' },
        { token: 'number', foreground: 'fca89d' },
        { token: 'number.sql', foreground: 'fca89d' },
        { token: 'comment', foreground: '4a4562', fontStyle: 'italic' },
        { token: 'operator', foreground: 'a78bfa' },
        { token: 'operator.sql', foreground: 'a78bfa' },
        { token: 'predefined.sql', foreground: '60a5fa' },
        { token: 'identifier', foreground: 'e2dff0' },
      ],
      colors: {
        'editor.background': palette.bg,
        'editor.foreground': palette.text,
        'editor.lineHighlightBackground': '#1a1726',
        'editor.lineHighlightBorder': '#1a172600',
        'editorLineNumber.foreground': palette.textMuted,
        'editorLineNumber.activeForeground': palette.textDim,
        'editorCursor.foreground': palette.purple,
        'editor.selectionBackground': '#3a2f5a',
        'editor.inactiveSelectionBackground': '#3a2f5a80',
        'editorWidget.background': palette.surfaceRaised,
        'editorWidget.border': palette.border,
        'editorSuggestWidget.background': palette.surfaceRaised,
        'editorSuggestWidget.border': palette.border,
        'editorSuggestWidget.selectedBackground': '#a78bfa1a',
        'editorSuggestWidget.highlightForeground': palette.purple,
        'editorHoverWidget.background': palette.surfaceRaised,
        'editorHoverWidget.border': palette.border,
        'scrollbarSlider.background': '#4a456266',
        'scrollbarSlider.hoverBackground': '#4a4562aa',
        'scrollbarSlider.activeBackground': '#a78bfa80',
      },
    })
  }

  function handleEditorMount(_editor: editor.IStandaloneCodeEditor, nextMonaco: Monaco): void {
    setMonaco(nextMonaco)
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: '10px 16px',
          borderBottom: `1px solid ${palette.border}`,
          background: palette.surface,
          flexShrink: 0,
        }}
      >
        <Button
          variant="contained"
          onClick={onRunQuery}
          disabled={!canRun || runningQuery}
          startIcon={<PlayArrowRoundedIcon sx={{ fontSize: 16 }} />}
          sx={{ px: 2.25, py: 0.875 }}
        >
          Run
        </Button>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={!runningQuery}
          startIcon={<StopRoundedIcon sx={{ fontSize: 16 }} />}
          sx={{ py: 0.875 }}
        >
          Cancel
        </Button>
        <Tooltip title={selectedObject ? 'Insert SELECT for selected table' : 'Select a table first'}>
          <span>
            <IconButton
              onClick={onInsertTemplate}
              disabled={!selectedObject}
              size="small"
              sx={{
                borderRadius: '8px',
                border: `1px solid ${palette.border}`,
                background: palette.surfaceRaised,
                color: palette.textDim,
                width: 32,
                height: 32,
                '&:hover': { color: palette.text, borderColor: palette.textMuted },
              }}
            >
              <PlaylistAddRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </span>
        </Tooltip>

        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, ml: 1.5 }}>
          <Box
            sx={{
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 8px',
              background: gradients.aiBadge,
              border: `1px solid ${palette.purple}33`,
              borderRadius: '6px',
              color: palette.purple,
              flexShrink: 0,
            }}
          >
            GENIE
          </Box>
          <InputBase
            fullWidth
            value={copilotPrompt}
            onChange={(event) => onChangeCopilotPrompt(event.target.value)}
            placeholder="Ask the Genie about your data..."
            onKeyDown={(event) => {
              if (event.key === 'Enter' && canRun && !generatingSql && copilotPrompt.trim()) {
                event.preventDefault()
                onGenerateSql()
              }
            }}
            sx={{
              flex: 1,
              background: palette.bg,
              border: `1px solid ${palette.border}`,
              color: palette.text,
              padding: '5px 12px',
              borderRadius: '8px',
              fontFamily: fonts.sans,
              fontSize: 12,
              transition: 'all 0.2s',
              '&:focus-within': {
                borderColor: palette.purple,
                boxShadow: `0 0 0 3px ${palette.purple}1a`,
              },
              '& input::placeholder': {
                color: palette.textMuted,
                opacity: 1,
              },
            }}
          />
          <Select
            value={selectedCopilotModel ?? ''}
            onChange={(event) => onChangeCopilotModel(String(event.target.value))}
            disabled={copilotModelBusy || copilotModels.length === 0}
            size="small"
            displayEmpty
            sx={{
              minWidth: 180,
              height: 30,
              fontSize: 11,
              fontFamily: fonts.mono,
              background: palette.bg,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: palette.border },
            }}
            renderValue={(value) => {
              if (!value) {
                return (
                  <Box sx={{ color: palette.textMuted }}>
                    {copilotModelBusy ? 'Loading…' : 'No model'}
                  </Box>
                )
              }
              const model = copilotModels.find((candidate) => candidate.id === value)
              return model ? formatModelLabel(model) : String(value)
            }}
          >
            {copilotModels.map((model) => (
              <MenuItem key={model.id} value={model.id} sx={{ fontFamily: fonts.mono, fontSize: 11 }}>
                {formatModelLabel(model)}
              </MenuItem>
            ))}
          </Select>
          <Button
            variant="contained"
            startIcon={<AutoAwesomeRoundedIcon sx={{ fontSize: 14 }} />}
            onClick={onGenerateSql}
            disabled={
              !canRun ||
              generatingSql ||
              copilotModelBusy ||
              !selectedCopilotModel ||
              !copilotPrompt.trim()
            }
            sx={{ py: 0.875, flexShrink: 0 }}
          >
            Ask
          </Button>
        </Box>
      </Box>

      {copilotResult?.rationale ? (
        <Box
          sx={{
            padding: '8px 16px',
            borderBottom: `1px solid ${palette.border}`,
            background: `${palette.purple}0d`,
            color: palette.textDim,
            fontSize: 11,
            fontFamily: fonts.mono,
            flexShrink: 0,
          }}
        >
          <Box component="span" sx={{ color: palette.purple, fontWeight: 600, mr: 1 }}>
            Genie:
          </Box>
          {copilotResult.rationale}
        </Box>
      ) : null}

      <Box sx={{ flex: 1, minHeight: 0, background: palette.bg }}>
        <Editor
          height="100%"
          defaultLanguage="sql"
          value={sqlText}
          theme="db-genie"
          onChange={(value) => onChangeSql(value ?? '')}
          beforeMount={handleBeforeMount}
          onMount={handleEditorMount}
          options={{
            automaticLayout: true,
            fontSize: 13,
            fontFamily: fonts.mono,
            fontLigatures: true,
            minimap: { enabled: false },
            quickSuggestions: true,
            padding: { top: 14 },
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            scrollbar: {
              verticalScrollbarSize: 4,
              horizontalScrollbarSize: 4,
            },
            suggest: {
              showWords: false,
            },
          }}
        />
      </Box>
    </Box>
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
  return model.name === model.id ? model.name : `${model.name}`
}
