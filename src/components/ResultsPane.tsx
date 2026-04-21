import { useMemo, useState } from 'react'

import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded'
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { Box, Divider, Stack, Tab, Tabs } from '@mui/material'

import type {
  QueryExecutionResult,
  SchemaObjectDetail,
} from '../shared/contracts'
import { fonts, palette } from '../theme'
import { EmptyHint, SectionLabel, StatChip } from './ui/primitives'

interface ResultsPaneProps {
  queryResult: QueryExecutionResult | null
  selectedObject: SchemaObjectDetail | null
  queryRunning: boolean
}

type ResultsTab = 'results' | 'details'

export function ResultsPane({
  queryResult,
  selectedObject,
  queryRunning,
}: ResultsPaneProps) {
  const [tab, setTab] = useState<ResultsTab>('results')
  const tabsAvailable = useMemo(() => {
    const out: ResultsTab[] = []
    if (queryResult) out.push('results')
    if (selectedObject) out.push('details')
    return out
  }, [queryResult, selectedObject])

  const effectiveTab: ResultsTab =
    tabsAvailable.includes(tab) ? tab : (tabsAvailable[0] ?? 'results')

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          padding: '8px 16px',
          borderBottom: `1px solid ${palette.border}`,
          background: palette.surface,
          flexShrink: 0,
          minHeight: 40,
        }}
      >
        <Tabs
          value={effectiveTab}
          onChange={(_event, value: ResultsTab) => setTab(value)}
          sx={{
            minHeight: 24,
            '& .MuiTabs-indicator': { backgroundColor: palette.purple, height: 2 },
            '& .MuiTab-root': {
              minHeight: 24,
              padding: '0 8px',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: palette.textMuted,
              '&.Mui-selected': { color: palette.text },
            },
          }}
        >
          <Tab label="Results" value="results" disabled={!queryResult} />
          <Tab label="Details" value="details" disabled={!selectedObject} />
        </Tabs>

        <Box sx={{ flex: 1 }} />

        {effectiveTab === 'results' && queryResult ? (
          <>
            <StatChip>
              <GridViewRoundedIcon sx={{ fontSize: 12 }} /> {queryResult.rowCount} rows
            </StatChip>
            <StatChip>
              <SpeedRoundedIcon sx={{ fontSize: 12 }} /> {queryResult.durationMs}ms
            </StatChip>
            {queryResult.truncated ? (
              <StatChip sx={{ color: palette.peach }}>
                <InfoOutlinedIcon sx={{ fontSize: 12 }} /> first 500
              </StatChip>
            ) : null}
          </>
        ) : null}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {effectiveTab === 'results' && queryResult ? (
          <ResultsTable queryResult={queryResult} />
        ) : effectiveTab === 'details' && selectedObject ? (
          <ObjectDetails detail={selectedObject} />
        ) : (
          <EmptyHint>
            {queryRunning
              ? 'Query is running…'
              : 'Run a query or pick a table to inspect its columns and JSON hints.'}
          </EmptyHint>
        )}
      </Box>
    </Box>
  )
}

function ResultsTable({ queryResult }: { queryResult: QueryExecutionResult }) {
  return (
    <Box sx={{ width: '100%' }}>
      <Box
        component="table"
        sx={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: fonts.mono,
          fontSize: 12,
        }}
      >
        <Box component="thead" sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
          <Box component="tr">
            {queryResult.columns.map((column) => (
              <Box
                key={column.field}
                component="th"
                sx={{
                  background: palette.surface,
                  padding: '8px 16px',
                  textAlign: 'left',
                  fontWeight: 500,
                  fontSize: 11,
                  color: palette.textDim,
                  borderBottom: `1px solid ${palette.border}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {column.headerName}
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          {queryResult.rows.map((row, rowIndex) => (
            <Box
              component="tr"
              key={(row as Record<string, unknown>).__rowId as number ?? rowIndex}
              sx={{
                '&:hover td': {
                  background: 'rgba(167,139,250,0.05)',
                  color: palette.text,
                },
              }}
            >
              {queryResult.columns.map((column) => {
                const value = (row as Record<string, unknown>)[column.field]
                return (
                  <Box
                    key={column.field}
                    component="td"
                    sx={{
                      padding: '6px 16px',
                      borderBottom: `1px solid ${palette.border}80`,
                      color: isNumeric(value) ? palette.peach : palette.textDim,
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatCell(value)}
                  </Box>
                )
              })}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

function ObjectDetails({ detail }: { detail: SchemaObjectDetail }) {
  return (
    <Stack spacing={2} sx={{ padding: '16px 20px' }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'baseline' }}>
        <Box sx={{ fontSize: 14, fontWeight: 600, color: palette.text }}>
          {detail.schema}.{detail.name}
        </Box>
        <Box
          sx={{
            fontSize: 10,
            fontFamily: fonts.mono,
            textTransform: 'uppercase',
            color: palette.textMuted,
            letterSpacing: '1px',
          }}
        >
          {detail.type}
        </Box>
        {detail.rowCount !== null ? (
          <StatChip>{detail.rowCount.toLocaleString()} rows</StatChip>
        ) : null}
      </Stack>

      <Box
        component="table"
        sx={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: fonts.mono,
          fontSize: 12,
        }}
      >
        <Box component="thead">
          <Box component="tr">
            {['Column', 'Type', 'Flags'].map((header) => (
              <Box
                key={header}
                component="th"
                sx={{
                  textAlign: 'left',
                  padding: '6px 12px',
                  fontSize: 10,
                  color: palette.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  borderBottom: `1px solid ${palette.border}`,
                  fontWeight: 600,
                }}
              >
                {header}
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          {detail.columns.map((column) => (
            <Box component="tr" key={column.name}>
              <Box
                component="td"
                sx={{
                  padding: '6px 12px',
                  color: palette.text,
                  borderBottom: `1px solid ${palette.border}80`,
                }}
              >
                {column.name}
              </Box>
              <Box
                component="td"
                sx={{
                  padding: '6px 12px',
                  color: palette.textDim,
                  borderBottom: `1px solid ${palette.border}80`,
                }}
              >
                {column.dataType}
              </Box>
              <Box
                component="td"
                sx={{
                  padding: '6px 12px',
                  borderBottom: `1px solid ${palette.border}80`,
                }}
              >
                <Stack direction="row" spacing={0.5}>
                  {column.isPrimaryKey ? <Flag color={palette.purple}>PK</Flag> : null}
                  {column.isNullable ? <Flag>NULL</Flag> : null}
                  {column.isJsonCandidate ? (
                    <Flag color={palette.teal}>JSON?</Flag>
                  ) : null}
                </Stack>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {Object.keys(detail.jsonPaths).length > 0 ? (
        <>
          <Divider sx={{ borderColor: palette.border }} />
          <SectionLabel>JSON paths</SectionLabel>
          {Object.entries(detail.jsonPaths).map(([columnName, paths]) => (
            <Box key={columnName}>
              <Box
                sx={{
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  color: palette.textDim,
                  mb: 0.5,
                }}
              >
                {columnName}
              </Box>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                {paths.map((path) => (
                  <Box
                    key={path}
                    sx={{
                      fontFamily: fonts.mono,
                      fontSize: 10,
                      color: palette.textDim,
                      background: palette.bg,
                      border: `1px solid ${palette.border}`,
                      borderRadius: '6px',
                      padding: '2px 8px',
                    }}
                  >
                    {path}
                  </Box>
                ))}
              </Stack>
            </Box>
          ))}
        </>
      ) : null}
    </Stack>
  )
}

function Flag({
  children,
  color = palette.textMuted,
}: {
  children: React.ReactNode
  color?: string
}) {
  return (
    <Box
      sx={{
        fontFamily: fonts.mono,
        fontSize: 9,
        color,
        border: `1px solid ${color}55`,
        borderRadius: '4px',
        padding: '1px 5px',
      }}
    >
      {children}
    </Box>
  )
}

function isNumeric(value: unknown): boolean {
  return typeof value === 'number' || typeof value === 'bigint'
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return value.toLocaleString()
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
