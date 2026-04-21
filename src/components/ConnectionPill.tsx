import { useState } from 'react'

import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import { Box, Divider, Menu, MenuItem, Stack } from '@mui/material'

import type { ActiveConnection, ConnectionProfile } from '../shared/contracts'
import { fonts, palette } from '../theme'
import { Dot, SectionLabel } from './ui/primitives'

interface ConnectionPillProps {
  activeConnection: ActiveConnection | null
  profiles: ConnectionProfile[]
  connecting: boolean
  onPickProfile: (profile: ConnectionProfile) => void
  onAddConnection: () => void
  onEditActive: () => void
  onDisconnect: () => void
  onRefreshSchema: () => void
  onEditProfile: (profile: ConnectionProfile) => void
}

export function ConnectionPill({
  activeConnection,
  profiles,
  connecting,
  onPickProfile,
  onAddConnection,
  onEditActive,
  onDisconnect,
  onRefreshSchema,
  onEditProfile,
}: ConnectionPillProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [menuWidth, setMenuWidth] = useState<number | undefined>(undefined)
  const open = Boolean(anchorEl)

  const hasActive = Boolean(activeConnection)

  return (
    <Box
      sx={{
        padding: '16px',
        borderBottom: `1px solid ${palette.border}`,
        flexShrink: 0,
      }}
    >
      <SectionLabel sx={{ mb: 1.25 }}>Connection</SectionLabel>

      <Box
        onClick={(event) => {
          setMenuWidth(event.currentTarget.clientWidth)
          setAnchorEl(event.currentTarget)
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          background: palette.surfaceRaised,
          border: `1px solid ${palette.border}`,
          borderRadius: '10px',
          padding: '8px 14px',
          gap: 1.25,
          cursor: 'pointer',
          transition: 'border-color 0.2s',
          '&:hover': { borderColor: palette.purple },
        }}
      >
        <Dot
          color={connecting ? palette.peach : hasActive ? palette.teal : palette.textMuted}
          glow={hasActive}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {hasActive && activeConnection ? (
            <>
              <Box sx={{ fontSize: 12, fontWeight: 600, color: palette.text }}>
                {activeConnection.name}
              </Box>
              <Box
                sx={{
                  fontSize: 10,
                  fontFamily: fonts.mono,
                  color: palette.textDim,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeConnection.server} / {activeConnection.database}
              </Box>
            </>
          ) : (
            <>
              <Box sx={{ fontSize: 12, fontWeight: 600, color: palette.text }}>
                {connecting ? 'Connecting…' : 'No connection'}
              </Box>
              <Box
                sx={{
                  fontSize: 10,
                  fontFamily: fonts.mono,
                  color: palette.textDim,
                }}
              >
                {profiles.length === 0 ? 'Add a profile to begin' : 'Pick a profile'}
              </Box>
            </>
          )}
        </Box>
        <KeyboardArrowDownRoundedIcon sx={{ fontSize: 16, color: palette.textMuted }} />
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              width: menuWidth ?? 'auto',
              mt: 0.5,
            },
          },
        }}
      >
        {profiles.length === 0 ? (
          <MenuItem disabled>No saved profiles</MenuItem>
        ) : (
          profiles.map((profile) => {
            const isActive = activeConnection?.profileId === profile.id
            return (
              <MenuItem
                key={profile.id}
                selected={isActive}
                onClick={() => {
                  setAnchorEl(null)
                  onPickProfile(profile)
                }}
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Dot
                  color={isActive ? palette.teal : palette.textMuted}
                  glow={isActive}
                />
                <Stack sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ fontSize: 12, fontWeight: 600 }}>{profile.name}</Box>
                  <Box sx={{ fontSize: 10, fontFamily: fonts.mono, color: palette.textDim }}>
                    {profile.server} / {profile.database}
                  </Box>
                </Stack>
                <EditRoundedIcon
                  fontSize="small"
                  sx={{ fontSize: 14, color: palette.textMuted, '&:hover': { color: palette.text } }}
                  onClick={(event) => {
                    event.stopPropagation()
                    setAnchorEl(null)
                    onEditProfile(profile)
                  }}
                />
              </MenuItem>
            )
          })
        )}
        <Divider sx={{ my: 0.5, borderColor: palette.border }} />
        <MenuItem
          onClick={() => {
            setAnchorEl(null)
            onAddConnection()
          }}
        >
          <AddRoundedIcon fontSize="small" sx={{ mr: 1, color: palette.purple }} />
          Add connection
        </MenuItem>
        {hasActive ? (
          <>
            <MenuItem
              onClick={() => {
                setAnchorEl(null)
                onEditActive()
              }}
            >
              <EditRoundedIcon fontSize="small" sx={{ mr: 1, color: palette.textDim }} />
              Edit active
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAnchorEl(null)
                onRefreshSchema()
              }}
            >
              Refresh schema
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAnchorEl(null)
                onDisconnect()
              }}
              sx={{ color: palette.peach }}
            >
              Disconnect
            </MenuItem>
          </>
        ) : null}
      </Menu>
    </Box>
  )
}
