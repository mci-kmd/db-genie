import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'

import type {
  ActiveConnection,
  QueryExecutionResult,
  SchemaObjectDetail,
} from '../shared/contracts'

interface ResultsPaneProps {
  activeConnection: ActiveConnection | null
  queryResult: QueryExecutionResult | null
  selectedObject: SchemaObjectDetail | null
  queryRunning: boolean
}

export function ResultsPane({
  activeConnection,
  queryResult,
  selectedObject,
  queryRunning,
}: ResultsPaneProps) {
  const columns: GridColDef[] = (queryResult?.columns ?? []).map((column) => ({
    field: column.field,
    headerName: column.headerName,
    minWidth: 160,
    flex: 1,
  }))

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">Results</Typography>
            <Typography variant="body2" color="text.secondary">
              Query grid, execution summary, and object details.
            </Typography>
          </Box>
          {activeConnection ? <Chip label={activeConnection.database} size="small" /> : null}
        </Stack>

        {queryResult ? (
          <>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
              <Chip icon={<GridViewRoundedIcon />} label={`${queryResult.rowCount} row(s)`} />
              <Chip icon={<InfoOutlinedIcon />} label={`${queryResult.durationMs} ms`} />
              {queryResult.truncated ? <Chip color="warning" label="Showing first 500 rows" /> : null}
            </Stack>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <DataGrid
                columns={columns}
                rows={queryResult.rows}
                getRowId={(row) => row.__rowId as number}
                disableRowSelectionOnClick
                hideFooter
                sx={{
                  borderRadius: 3,
                  borderColor: 'divider',
                  '& .MuiDataGrid-cell': {
                    borderColor: 'divider',
                  },
                }}
              />
            </Box>
          </>
        ) : selectedObject ? (
          <Box sx={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="subtitle1">
                  {selectedObject.schema}.{selectedObject.name}
                </Typography>
                <Chip label={selectedObject.type} size="small" />
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Column</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Flags</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedObject.columns.map((column) => (
                    <TableRow key={column.name}>
                      <TableCell>{column.name}</TableCell>
                      <TableCell>{column.dataType}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.75}>
                          {column.isPrimaryKey ? <Chip label="PK" size="small" /> : null}
                          {column.isNullable ? <Chip label="NULL" size="small" variant="outlined" /> : null}
                          {column.isJsonCandidate ? <Chip label="JSON?" size="small" color="secondary" /> : null}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {Object.keys(selectedObject.jsonPaths).length > 0 ? (
                <>
                  <Divider />
                  <Typography variant="subtitle2">Discovered JSON paths</Typography>
                  {Object.entries(selectedObject.jsonPaths).map(([columnName, paths]) => (
                    <Box key={columnName}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {columnName}
                      </Typography>
                      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                        {paths.map((path) => (
                          <Chip key={path} label={path} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </Box>
                  ))}
                </>
              ) : null}
            </Stack>
          </Box>
        ) : (
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
              {queryRunning
                ? 'Query is running...'
                : 'Run a query or pick a table to inspect its columns and JSON hints.'}
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}
