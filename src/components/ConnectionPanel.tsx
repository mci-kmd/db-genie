import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import SyncRoundedIcon from '@mui/icons-material/SyncRounded'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'

import type { ActiveConnection, ConnectionProfile, ConnectionProfileInput } from '../shared/contracts'

interface ConnectionPanelProps {
  profiles: ConnectionProfile[]
  form: ConnectionProfileInput
  selectedProfile?: ConnectionProfile
  activeConnection: ActiveConnection | null
  busy: boolean
  saving: boolean
  schemaBusy: boolean
  onFormChange: (
    field: keyof ConnectionProfileInput,
    value: ConnectionProfileInput[keyof ConnectionProfileInput],
  ) => void
  onProfileSelect: (profile: ConnectionProfile) => void
  onConnect: () => void
  onDisconnect: () => void
  onSaveProfile: () => void
  onDeleteProfile: () => void
  onRefreshSchema: () => void
}

export function ConnectionPanel({
  profiles,
  form,
  selectedProfile,
  activeConnection,
  busy,
  saving,
  schemaBusy,
  onFormChange,
  onProfileSelect,
  onConnect,
  onDisconnect,
  onSaveProfile,
  onDeleteProfile,
  onRefreshSchema,
}: ConnectionPanelProps) {
  return (
    <Card sx={{ minHeight: 0 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6">Connections</Typography>
              <Typography variant="body2" color="text.secondary">
                SQL Server first. Keep the happy path tight.
              </Typography>
            </Box>
            <Chip
              color={activeConnection ? 'success' : 'default'}
              label={activeConnection ? 'Connected' : 'Offline'}
              variant={activeConnection ? 'filled' : 'outlined'}
            />
          </Stack>

          <TextField
            select
            label="Saved profile"
            value={selectedProfile?.id ?? ''}
            onChange={(event) => {
              const profile = profiles.find((entry) => entry.id === event.target.value)
              if (profile) {
                onProfileSelect(profile)
              }
            }}
            size="small"
          >
            {profiles.length === 0 ? (
              <MenuItem value="" disabled>
                No saved profiles yet
              </MenuItem>
            ) : null}
            {profiles.map((profile) => (
              <MenuItem key={profile.id} value={profile.id}>
                {profile.name}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction="row" spacing={1.5}>
            <TextField
              fullWidth
              label="Profile name"
              size="small"
              value={form.name}
              onChange={(event) => onFormChange('name', event.target.value)}
            />
            <TextField
              label="Port"
              size="small"
              type="number"
              sx={{ width: 110 }}
              value={form.port}
              onChange={(event) => onFormChange('port', Number(event.target.value))}
            />
          </Stack>

          <TextField
            fullWidth
            label="Server"
            size="small"
            value={form.server}
            onChange={(event) => onFormChange('server', event.target.value)}
          />

          <TextField
            fullWidth
            label="Database"
            size="small"
            value={form.database}
            onChange={(event) => onFormChange('database', event.target.value)}
          />

          <TextField
            fullWidth
            label="User"
            size="small"
            value={form.user}
            onChange={(event) => onFormChange('user', event.target.value)}
          />

          <TextField
            fullWidth
            label="Password"
            size="small"
            type="password"
            value={form.password ?? ''}
            helperText={
              selectedProfile?.hasSavedPassword && !(form.password ?? '')
                ? 'Stored password available. Leave blank to reuse it.'
                : 'Password stays in memory unless you choose to save it.'
            }
            onChange={(event) => onFormChange('password', event.target.value)}
          />

          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.encrypt}
                  onChange={(event) => onFormChange('encrypt', event.target.checked)}
                />
              }
              label="Encrypt"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.trustServerCertificate}
                  onChange={(event) =>
                    onFormChange('trustServerCertificate', event.target.checked)
                  }
                />
              }
              label="Trust server certificate"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.savePassword}
                  onChange={(event) => onFormChange('savePassword', event.target.checked)}
                />
              }
              label="Save password"
            />
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<LinkRoundedIcon />}
              onClick={onConnect}
              disabled={busy}
            >
              Connect
            </Button>
            <Button variant="outlined" onClick={onDisconnect} disabled={!activeConnection}>
              Disconnect
            </Button>
            <Button
              variant="outlined"
              startIcon={<SyncRoundedIcon />}
              onClick={onRefreshSchema}
              disabled={!activeConnection || schemaBusy}
            >
              Refresh
            </Button>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<SaveRoundedIcon />}
              onClick={onSaveProfile}
              disabled={saving}
            >
              Save profile
            </Button>
            <Button
              color="error"
              variant="outlined"
              startIcon={<DeleteOutlineRoundedIcon />}
              onClick={onDeleteProfile}
              disabled={!form.id}
            >
              Delete
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
