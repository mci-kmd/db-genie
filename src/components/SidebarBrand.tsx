import { Box } from '@mui/material'
import { gradients, palette } from '../theme'
import { GenieMascot } from './GenieMascot'

type SidebarBrandProps = {
  generatingSql?: boolean
}

export function SidebarBrand({ generatingSql = false }: SidebarBrandProps) {
  return (
    <Box
      sx={{
        padding: '16px 20px',
        borderBottom: `1px solid ${palette.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        flexShrink: 0,
      }}
    >
      <GenieMascot casting={generatingSql} />
      <Box
        sx={{
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: '-0.3px',
          color: palette.text,
        }}
      >
        DB{' '}
        <Box
          component="span"
          sx={{
            background: gradients.brand,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Genie
        </Box>
      </Box>
    </Box>
  )
}
