import { Box } from '@mui/material'

import type { ActiveConnection } from '../shared/contracts'
import { fonts, palette } from '../theme'
import { Dot } from './ui/primitives'

interface StatusBarProps {
  activeConnection: ActiveConnection | null
  statusMessage: string
  busy: boolean
}

export function StatusBar({
  activeConnection,
  statusMessage,
  busy,
}: StatusBarProps) {
  return (
    <Box
      sx={{
        gridColumn: '1 / -1',
        background: palette.surface,
        borderTop: `1px solid ${palette.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 2,
        fontSize: 11,
        color: palette.textMuted,
        fontFamily: fonts.mono,
        height: '100%',
      }}
    >
      {activeConnection ? (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Dot
              color={busy ? palette.peach : palette.teal}
              glow={!busy}
              size={6}
            />
            {activeConnection.server} / {activeConnection.database}
          </Box>
          <Box>{activeConnection.user}</Box>
        </>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Dot color={palette.textMuted} glow={false} size={6} />
          Disconnected
        </Box>
      )}

      <Box
        sx={{
          marginLeft: 'auto',
          color: palette.textDim,
          fontFamily: fonts.sans,
          fontSize: 11,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '50%',
        }}
      >
        {statusMessage}
      </Box>
    </Box>
  )
}
