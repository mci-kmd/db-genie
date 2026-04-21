import { Box } from '@mui/material'
import { fonts, gradients, palette } from '../theme'

export function SidebarBrand() {
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
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '8px',
          background: gradients.brand,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          color: '#fff',
          fontWeight: 700,
          fontFamily: fonts.sans,
        }}
      >
        G
      </Box>
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
