import { useMemo, useState } from 'react'

import { Box } from '@mui/material'

import type {
  DatabaseSchema,
  SchemaObjectMetadata,
  SchemaObjectRef,
} from '../shared/contracts'
import { fonts, palette } from '../theme'
import { EmptyHint, SectionLabel } from './ui/primitives'

interface SchemaExplorerProps {
  schema: DatabaseSchema | null
  selectedObject: SchemaObjectRef | null
  onSelect: (ref: SchemaObjectRef) => void
}

type TreeNode =
  | { kind: 'database'; id: string; label: string; depth: number; parentId: null }
  | {
      kind: 'schema'
      id: string
      label: string
      depth: number
      parentId: string
    }
  | {
      kind: 'object'
      id: string
      label: string
      depth: number
      parentId: string
      ref: SchemaObjectRef
      rowCount: number | null
    }

export function SchemaExplorer({
  schema,
  selectedObject,
  onSelect,
}: SchemaExplorerProps) {
  const [manualExpanded, setManualExpanded] = useState<Set<string>>(
    () => new Set(),
  )

  const nodes = useMemo<TreeNode[] | null>(
    () => (schema ? buildNodes(schema) : null),
    [schema],
  )

  const selectedId = selectedObject ? objectId(selectedObject) : null

  // Auto-expand database and the selected schema group
  const expanded = useMemo(() => {
    const next = new Set(manualExpanded)
    if (schema) {
      next.add(`database:${schema.database}`)
    }
    if (selectedObject) {
      next.add(`schema:${selectedObject.schema}`)
    }
    return next
  }, [manualExpanded, schema, selectedObject])

  function toggle(id: string): void {
    setManualExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function isVisible(node: TreeNode): boolean {
    let parentId = node.parentId
    while (parentId !== null) {
      if (!expanded.has(parentId)) return false
      parentId = nodes?.find((candidate) => candidate.id === parentId)?.parentId ?? null
    }
    return true
  }

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '12px 8px',
      }}
    >
      <SectionLabel sx={{ px: 1, mb: 1 }}>Schema</SectionLabel>

      {!schema ? (
        <EmptyHint>Connect to SQL Server to load schema.</EmptyHint>
      ) : !nodes?.length ? (
        <EmptyHint>No objects found.</EmptyHint>
      ) : (
        nodes
          .filter(isVisible)
          .map((node) => (
            <SchemaRow
              key={node.id}
              node={node}
              expanded={expanded.has(node.id)}
              active={node.kind === 'object' && node.id === selectedId}
              onToggle={() => toggle(node.id)}
              onClick={() => {
                if (node.kind === 'schema' || node.kind === 'database') {
                  toggle(node.id)
                } else if (node.kind === 'object') {
                  onSelect(node.ref)
                }
              }}
            />
          ))
      )}
    </Box>
  )
}

function SchemaRow({
  node,
  expanded,
  active,
  onToggle,
  onClick,
}: {
  node: TreeNode
  expanded: boolean
  active: boolean
  onToggle: () => void
  onClick: () => void
}) {
  const arrow = getArrow(node, expanded)

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        padding: '5px 10px',
        paddingLeft: `${10 + node.depth * 16}px`,
        borderRadius: '8px',
        cursor: 'pointer',
        gap: 1,
        transition: 'background 0.12s',
        background: active ? 'rgba(167,139,250,0.1)' : 'transparent',
        '&:hover': {
          background: active ? 'rgba(167,139,250,0.14)' : 'rgba(167,139,250,0.06)',
        },
      }}
    >
      <Box
        component="span"
        onClick={(event) => {
          event.stopPropagation()
          if (node.kind === 'database' || node.kind === 'schema') onToggle()
        }}
        sx={{
          fontSize: 9,
          color: active ? palette.purple : palette.textMuted,
          width: 12,
          display: 'inline-flex',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {arrow}
      </Box>
      <Box
        sx={{
          fontFamily: fonts.mono,
          fontSize: 12,
          color: active ? palette.purple : palette.textDim,
          fontWeight: active ? 500 : 400,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          minWidth: 0,
        }}
      >
        {node.label}
      </Box>
      {node.kind === 'object' && node.rowCount !== null ? (
        <Box
          sx={{
            fontFamily: fonts.mono,
            fontSize: 10,
            color: palette.textMuted,
            background: palette.bg,
            padding: '1px 6px',
            borderRadius: '4px',
            flexShrink: 0,
          }}
        >
          {node.rowCount.toLocaleString()}
        </Box>
      ) : null}
    </Box>
  )
}

function getArrow(node: TreeNode, expanded: boolean): string {
  if (node.kind === 'object') return '◫'
  return expanded ? '▾' : '▸'
}

function buildNodes(schema: DatabaseSchema): TreeNode[] {
  const nodes: TreeNode[] = []
  const databaseId = `database:${schema.database}`
  nodes.push({
    kind: 'database',
    id: databaseId,
    label: schema.database,
    depth: 0,
    parentId: null,
  })
  for (const group of schema.schemas) {
    const schemaNodeId = `schema:${group.schema}`
    nodes.push({
      kind: 'schema',
      id: schemaNodeId,
      label: group.schema,
      depth: 1,
      parentId: databaseId,
    })
    for (const object of group.objects) {
      const oid = objectId(object)
      nodes.push({
        kind: 'object',
        id: oid,
        label: object.name,
        depth: 2,
        parentId: schemaNodeId,
        ref: { schema: object.schema, name: object.name, type: object.type },
        rowCount: object.rowCount,
      })
    }
  }
  return nodes
}

function objectId(ref: SchemaObjectRef | SchemaObjectMetadata): string {
  return `object:${ref.schema}.${ref.name}`
}
