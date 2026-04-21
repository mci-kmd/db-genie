import { useState } from 'react'

import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'

import type {
  ConnectionProfile,
  ConnectionProfileInput,
} from '../shared/contracts'
import { palette } from '../theme'

export type ConnectionDialogMode = 'add' | 'edit'

interface ConnectionDialogProps {
  open: boolean
  mode: ConnectionDialogMode
  initial: ConnectionProfileInput
  existingProfile?: ConnectionProfile
  busy?: boolean
  saving?: boolean
  onClose: () => void
  onSave: (form: ConnectionProfileInput) => Promise<void>
  onConnect: (form: ConnectionProfileInput) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

export function ConnectionDialog(props: ConnectionDialogProps) {
  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="sm" fullWidth>
      {props.open ? (
        <ConnectionDialogBody
          key={`${props.mode}:${props.existingProfile?.id ?? 'new'}`}
          {...props}
        />
      ) : null}
    </Dialog>
  )
}

function ConnectionDialogBody({
  mode,
  initial,
  existingProfile,
  busy = false,
  saving = false,
  onClose,
  onSave,
  onConnect,
  onDelete,
}: Omit<ConnectionDialogProps, 'open'>) {
  const [form, setForm] = useState<ConnectionProfileInput>(initial)

  function update<K extends keyof ConnectionProfileInput>(
    field: K,
    value: ConnectionProfileInput[K],
  ): void {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSave(): Promise<void> {
    await onSave(form)
  }

  async function handleConnect(): Promise<void> {
    await onConnect(form)
  }

  async function handleDelete(): Promise<void> {
    if (existingProfile?.id && onDelete) {
      await onDelete(existingProfile.id)
    }
  }

  const hasSavedPassword = existingProfile?.hasSavedPassword ?? false
  const passwordBlank = !(form.password ?? '').length

  return (
    <>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          {mode === 'add' ? 'New connection' : 'Edit connection'}
          <Typography
            variant="body2"
            sx={{ color: palette.textDim, fontWeight: 400, mt: 0.25 }}
          >
            SQL Server connection profile.
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: palette.textDim }}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Stack direction="row" spacing={1.5}>
            <TextField
              fullWidth
              label="Profile name"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
            />
            <TextField
              label="Port"
              type="number"
              sx={{ width: 110 }}
              value={form.port}
              onChange={(event) => update('port', Number(event.target.value))}
            />
          </Stack>

          <TextField
            fullWidth
            label="Server"
            value={form.server}
            onChange={(event) => update('server', event.target.value)}
          />

          <TextField
            fullWidth
            label="Database"
            value={form.database}
            onChange={(event) => update('database', event.target.value)}
          />

          <Stack direction="row" spacing={1.5}>
            <TextField
              fullWidth
              label="User"
              value={form.user}
              onChange={(event) => update('user', event.target.value)}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={form.password ?? ''}
              helperText={
                hasSavedPassword && passwordBlank
                  ? 'Stored password available. Leave blank to reuse.'
                  : 'Password stays in memory unless saved.'
              }
              onChange={(event) => update('password', event.target.value)}
            />
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 1,
              pt: 0.5,
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={form.encrypt}
                  onChange={(event) => update('encrypt', event.target.checked)}
                />
              }
              label="Encrypt"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.trustServerCertificate}
                  onChange={(event) =>
                    update('trustServerCertificate', event.target.checked)
                  }
                />
              }
              label="Trust cert"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.savePassword}
                  onChange={(event) => update('savePassword', event.target.checked)}
                />
              }
              label="Save password"
            />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Box>
          {mode === 'edit' && existingProfile && onDelete ? (
            <Button
              variant="text"
              color="error"
              startIcon={<DeleteOutlineRoundedIcon />}
              onClick={handleDelete}
              sx={{ color: palette.peach }}
            >
              Delete
            </Button>
          ) : null}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} variant="text">
            Cancel
          </Button>
          <Button
            variant="outlined"
            startIcon={<SaveRoundedIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            Save
          </Button>
          <Button
            variant="contained"
            startIcon={<LinkRoundedIcon />}
            onClick={handleConnect}
            disabled={busy}
          >
            Connect
          </Button>
        </Stack>
      </DialogActions>
    </>
  )
}
