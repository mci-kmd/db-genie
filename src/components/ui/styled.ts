import { Box, styled, Typography } from '@mui/material'
import { fonts, palette } from '../../theme'

export const SectionLabel = styled(Typography)({
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 1,
  color: palette.textMuted,
})

export const MonoText = styled(Typography)({
  fontFamily: fonts.mono,
  fontSize: 11,
  color: palette.textDim,
})

export const StatChip = styled(Box)({
  fontFamily: fonts.mono,
  fontSize: 11,
  padding: '2px 10px',
  background: palette.bg,
  borderRadius: 6,
  color: palette.textDim,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
})

export const Surface = styled(Box)({
  background: palette.surface,
  border: `1px solid ${palette.border}`,
  borderRadius: 10,
})

export const SurfaceRaised = styled(Box)({
  background: palette.surfaceRaised,
  border: `1px solid ${palette.border}`,
  borderRadius: 10,
})

export const Panel = styled(Box)({
  background: palette.surface,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
})

export const PanelHeader = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 16px',
  borderBottom: `1px solid ${palette.border}`,
  background: palette.surface,
  flexShrink: 0,
  minHeight: 40,
})
