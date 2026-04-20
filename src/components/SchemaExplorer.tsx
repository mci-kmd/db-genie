import DataObjectRoundedIcon from '@mui/icons-material/DataObjectRounded'
import StorageRoundedIcon from '@mui/icons-material/StorageRounded'
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded'
import ViewSidebarRoundedIcon from '@mui/icons-material/ViewSidebarRounded'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
  alpha,
} from '@mui/material'
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView'
import { TreeItem } from '@mui/x-tree-view/TreeItem'
import type { ReactNode } from 'react'

import type { DatabaseSchema, SchemaObjectRef } from '../shared/contracts'

interface SchemaExplorerProps {
  schema: DatabaseSchema | null
  selectedObject: SchemaObjectRef | null
  onSelect: (objectRef: SchemaObjectRef) => void
}

export function SchemaExplorer({ schema, selectedObject, onSelect }: SchemaExplorerProps) {
  const selectedId = selectedObject ? makeObjectId(selectedObject) : null

  return (
    <Card sx={{ minHeight: 0, flex: 1 }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}
        >
          <Box>
            <Typography variant="h6">Schema explorer</Typography>
            <Typography variant="body2" color="text.secondary">
              Tables, views, columns, and JSON candidates.
            </Typography>
          </Box>
          {schema ? <Chip label={schema.database} size="small" /> : null}
        </Stack>

        {!schema ? (
          <EmptyState label="Connect to SQL Server to load schema details." />
        ) : (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              pr: 0.5,
              '& .MuiTreeItem-content': {
                borderRadius: 2,
                py: 0.25,
              },
              '& .MuiTreeItem-content.Mui-selected': {
                backgroundColor: alpha('#7c8cff', 0.16),
              },
            }}
          >
            <SimpleTreeView
              selectedItems={selectedId}
              onSelectedItemsChange={(_event, itemId) => {
                if (typeof itemId !== 'string') {
                  return
                }
                const nextObject = findObjectByItemId(schema, itemId)
                if (nextObject) {
                  onSelect(nextObject)
                }
              }}
            >
              <TreeItem
                itemId={`database:${schema.database}`}
                label={<TreeLabel icon={<StorageRoundedIcon fontSize="small" />} label={schema.database} />}
              >
                {schema.schemas.map((schemaGroup) => (
                  <TreeItem
                    key={schemaGroup.schema}
                    itemId={`schema:${schemaGroup.schema}`}
                    label={<TreeLabel icon={<ViewSidebarRoundedIcon fontSize="small" />} label={schemaGroup.schema} />}
                  >
                    {schemaGroup.objects.map((objectMetadata) => (
                      <TreeItem
                        key={makeObjectId(objectMetadata)}
                        itemId={makeObjectId(objectMetadata)}
                        label={
                          <TreeLabel
                            icon={
                              objectMetadata.type === 'table' ? (
                                <TableChartRoundedIcon fontSize="small" />
                              ) : (
                                <DataObjectRoundedIcon fontSize="small" />
                              )
                            }
                            label={objectMetadata.name}
                            trailing={
                              objectMetadata.rowCount !== null ? (
                                <Typography variant="caption" color="text.secondary">
                                  {objectMetadata.rowCount.toLocaleString()}
                                </Typography>
                              ) : undefined
                            }
                          />
                        }
                      >
                        {objectMetadata.columns.map((column) => (
                          <TreeItem
                            key={`${makeObjectId(objectMetadata)}:${column.name}`}
                            itemId={`${makeObjectId(objectMetadata)}:${column.name}`}
                            label={
                              <TreeLabel
                                icon={<DataObjectRoundedIcon fontSize="small" />}
                                label={`${column.name} · ${column.dataType}`}
                                trailing={
                                  column.isJsonCandidate ? (
                                    <Chip
                                      label="JSON?"
                                      size="small"
                                      sx={{ height: 20, fontSize: 11 }}
                                    />
                                  ) : undefined
                                }
                              />
                            }
                          />
                        ))}
                      </TreeItem>
                    ))}
                  </TreeItem>
                ))}
              </TreeItem>
            </SimpleTreeView>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

function findObjectByItemId(schema: DatabaseSchema, itemId: string): SchemaObjectRef | null {
  for (const schemaGroup of schema.schemas) {
    for (const objectMetadata of schemaGroup.objects) {
      if (makeObjectId(objectMetadata) === itemId) {
        return {
          schema: objectMetadata.schema,
          name: objectMetadata.name,
          type: objectMetadata.type,
        }
      }
    }
  }

  return null
}

function makeObjectId(objectRef: SchemaObjectRef): string {
  return `object:${objectRef.type}:${objectRef.schema}.${objectRef.name}`
}

function TreeLabel({
  icon,
  label,
  trailing,
}: {
  icon: ReactNode
  label: string
  trailing?: ReactNode
}) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        {icon}
        <Typography variant="body2">{label}</Typography>
      </Stack>
      {trailing}
    </Stack>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <Stack
      sx={{
        flex: 1,
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 3,
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
        {label}
      </Typography>
    </Stack>
  )
}
