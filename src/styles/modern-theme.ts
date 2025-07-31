import { createTheme } from '@mui/material/styles';

// 모던 그라데이션 컬러 팔레트
export const modernColors = {
  primary: {
    50: '#f0f4ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1', // 메인 컬러
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  secondary: {
    50: '#fdf4ff',
    100: '#fae8ff',
    200: '#f5d0fe',
    300: '#f0abfc',
    400: '#e879f9',
    500: '#d946ef',
    600: '#c026d3',
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
  },
  success: {
    50: '#f0fdf5',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};

// 모던 테마 생성
export const modernTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: modernColors.primary[500],
      light: modernColors.primary[300],
      dark: modernColors.primary[700],
      contrastText: '#ffffff',
    },
    secondary: {
      main: modernColors.secondary[500],
      light: modernColors.secondary[300],
      dark: modernColors.secondary[700],
      contrastText: '#ffffff',
    },
    success: {
      main: modernColors.success[500],
      light: modernColors.success[300],
      dark: modernColors.success[700],
    },
    warning: {
      main: modernColors.warning[500],
      light: modernColors.warning[300],
      dark: modernColors.warning[700],
    },
    error: {
      main: modernColors.error[500],
      light: modernColors.error[300],
      dark: modernColors.error[700],
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: modernColors.gray[900],
      secondary: modernColors.gray[600],
    },
    divider: 'rgba(148, 163, 184, 0.12)',
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 800,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
      letterSpacing: '0.025em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: Array(25).fill('none') as any,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          padding: '10px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
            transform: 'none',
          },
        },
        contained: {
          backgroundColor: modernColors.primary[500],
          '&:hover': {
            backgroundColor: modernColors.primary[600],
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#ffffff',
          border: '1px solid #e0e0e0',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#ffffff',
          border: '1px solid #e0e0e0',
          boxShadow: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
        colorPrimary: {
          backgroundColor: modernColors.primary[500],
          color: 'white',
        },
        colorSuccess: {
          backgroundColor: modernColors.success[500],
          color: 'white',
        },
        colorWarning: {
          backgroundColor: modernColors.warning[500],
          color: 'white',
        },
        colorError: {
          backgroundColor: modernColors.error[500],
          color: 'white',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#ffffff',
          border: '1px solid #e0e0e0',
          boxShadow: 'none',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#f8fafc',
          '& .MuiTableCell-head': {
            fontWeight: 600,
            fontSize: '0.875rem',
            color: modernColors.gray[700],
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          '& .MuiTabs-indicator': {
            backgroundColor: modernColors.primary[500],
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '1rem',
          '&.Mui-selected': {
            color: modernColors.primary[600],
          },
        },
      },
    },
  },
});

// 다크 테마
export const modernDarkTheme = createTheme({
  ...modernTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: modernColors.primary[400],
      light: modernColors.primary[300],
      dark: modernColors.primary[600],
      contrastText: '#ffffff',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
    },
  },
  components: {
    ...modernTheme.components,
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#1e293b',
          border: '1px solid #475569',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#1e293b',
          border: '1px solid #475569',
          boxShadow: 'none',
        },
      },
    },
  },
});
