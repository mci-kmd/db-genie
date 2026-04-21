import { alpha, createTheme } from '@mui/material'

export const palette = {
  bg: '#13111c',
  surface: '#1a1726',
  surfaceRaised: '#211e30',
  border: '#2a2640',
  text: '#e2dff0',
  textDim: '#8b84a8',
  textMuted: '#4a4562',
  pink: '#f472b6',
  purple: '#a78bfa',
  blue: '#60a5fa',
  teal: '#5eead4',
  peach: '#fca89d',
} as const

export const fonts = {
  sans: "'Instrument Sans', 'Segoe UI', sans-serif",
  mono: "'Fira Code', ui-monospace, monospace",
} as const

export const gradients = {
  brand: `linear-gradient(135deg, ${palette.pink}, ${palette.purple})`,
  aiBadge: `linear-gradient(135deg, ${alpha(palette.pink, 0.15)}, ${alpha(palette.purple, 0.15)})`,
} as const

export const appTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: palette.purple },
    secondary: { main: palette.pink },
    success: { main: palette.teal },
    warning: { main: palette.peach },
    info: { main: palette.blue },
    background: {
      default: palette.bg,
      paper: palette.surface,
    },
    text: {
      primary: palette.text,
      secondary: palette.textDim,
      disabled: palette.textMuted,
    },
    divider: palette.border,
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: fonts.sans,
    fontSize: 13,
    h1: { letterSpacing: '-0.5px' },
    h2: { letterSpacing: '-0.5px' },
    h3: { letterSpacing: '-0.5px' },
    h4: { letterSpacing: '-0.4px' },
    h5: { letterSpacing: '-0.3px', fontWeight: 600 },
    h6: { letterSpacing: '-0.3px', fontWeight: 600, fontSize: 15 },
    body1: { fontSize: 13 },
    body2: { fontSize: 12 },
    button: { textTransform: 'none', fontWeight: 600 },
    caption: { fontSize: 11 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          WebkitFontSmoothing: 'antialiased',
        },
        '::-webkit-scrollbar': { width: 4, height: 4 },
        '::-webkit-scrollbar-thumb': {
          background: palette.textMuted,
          borderRadius: 2,
        },
        '::-webkit-scrollbar-track': { background: 'transparent' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: palette.surface,
          border: `1px solid ${palette.border}`,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ ownerState }) => ({
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: 12,
          ...(ownerState.variant === 'contained' &&
            ownerState.color === 'primary' && {
              background: gradients.brand,
              color: '#fff',
              boxShadow: `0 2px 12px ${alpha(palette.purple, 0.3)}`,
              '&:hover': { background: gradients.brand, opacity: 0.9 },
            }),
          ...(ownerState.variant === 'outlined' && {
            borderColor: palette.border,
            backgroundColor: palette.surfaceRaised,
            color: palette.textDim,
            '&:hover': {
              borderColor: palette.textMuted,
              color: palette.text,
              backgroundColor: palette.surfaceRaised,
            },
          }),
          ...(ownerState.variant === 'text' && {
            color: palette.textDim,
            '&:hover': { color: palette.text, backgroundColor: 'transparent' },
          }),
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontFamily: fonts.mono,
          fontSize: 11,
          height: 22,
          backgroundColor: palette.bg,
          color: palette.textDim,
          border: 'none',
        },
        outlined: {
          borderColor: palette.border,
          backgroundColor: 'transparent',
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          backgroundColor: palette.bg,
          fontSize: 12,
          borderRadius: 8,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: palette.border },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: palette.textMuted },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.purple,
            borderWidth: 1,
          },
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px ${alpha(palette.purple, 0.1)}`,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: palette.textDim,
          fontSize: 12,
          '&.Mui-focused': { color: palette.purple },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: { fontSize: 10, color: palette.textMuted },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: palette.surface,
          backgroundImage: 'none',
          border: `1px solid ${palette.border}`,
          borderRadius: 12,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: 16,
          fontWeight: 600,
          padding: '16px 20px',
          borderBottom: `1px solid ${palette.border}`,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: { root: { padding: '20px' } },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '12px 20px',
          borderTop: `1px solid ${palette.border}`,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: 12,
          '&.Mui-selected': { backgroundColor: alpha(palette.purple, 0.1) },
          '&:hover': { backgroundColor: alpha(palette.purple, 0.06) },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: palette.surfaceRaised,
          border: `1px solid ${palette.border}`,
          borderRadius: 8,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: palette.surfaceRaised,
          border: `1px solid ${palette.border}`,
          color: palette.text,
          fontSize: 11,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: { height: 28, width: 44, padding: 6 },
        switchBase: {
          padding: 6,
          '&.Mui-checked': { color: palette.purple },
          '&.Mui-checked + .MuiSwitch-track': {
            backgroundColor: alpha(palette.purple, 0.5),
            opacity: 1,
          },
        },
        thumb: { width: 16, height: 16 },
        track: {
          backgroundColor: palette.border,
          opacity: 1,
          borderRadius: 8,
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        label: { fontSize: 12, color: palette.textDim },
      },
    },
  },
})
