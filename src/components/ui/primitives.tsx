import { Box } from '@mui/material'
import type { ReactNode } from 'react'
import { palette } from '../../theme'

export function Dot({
  color = palette.teal,
  glow = true,
  size = 8,
  sx,
}: {
  color?: string
  glow?: boolean
  size?: number
  sx?: import('@mui/material').SxProps
}) {
  return (
    <Box
      component="span"
      sx={[
        {
          width: size,
          height: size,
          borderRadius: '50%',
          background: color,
          boxShadow: glow ? `0 0 10px ${color}66` : undefined,
          flexShrink: 0,
          display: 'inline-block',
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  )
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: palette.textMuted,
        fontSize: 12,
        textAlign: 'center',
        p: 3,
      }}
    >
      {children}
    </Box>
  )
}

export { SectionLabel, MonoText, StatChip, Surface, SurfaceRaised, Panel, PanelHeader } from './styled'
