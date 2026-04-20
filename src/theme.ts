import { alpha, createTheme } from '@mui/material'

export const appTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7c8cff',
    },
    secondary: {
      main: '#61d4d0',
    },
    background: {
      default: '#05070d',
      paper: alpha('#111827', 0.82),
    },
    success: {
      main: '#4ade80',
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    h5: {
      letterSpacing: -0.5,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(18px)',
          backgroundImage: `linear-gradient(180deg, ${alpha('#0f172a', 0.96)} 0%, ${alpha('#111827', 0.84)} 100%)`,
          border: `1px solid ${alpha('#ffffff', 0.08)}`,
          boxShadow: `0 18px 40px ${alpha('#020617', 0.5)}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
})
