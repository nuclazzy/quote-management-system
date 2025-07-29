// 브랜드 컬러 팔레트
export const brandColors = {
  primary: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#2196f3', // 메인 브랜드 컬러
    600: '#1e88e5',
    700: '#1976d2',
    800: '#1565c0',
    900: '#0d47a1',
  },
  secondary: {
    50: '#fce4ec',
    100: '#f8bbd9',
    200: '#f48fb1',
    300: '#f06292',
    400: '#ec407a',
    500: '#e91e63',
    600: '#d81b60',
    700: '#c2185b',
    800: '#ad1457',
    900: '#880e4f',
  },
  success: {
    50: '#e8f5e8',
    100: '#c8e6c9',
    200: '#a5d6a7',
    300: '#81c784',
    400: '#66bb6a',
    500: '#4caf50',
    600: '#43a047',
    700: '#388e3c',
    800: '#2e7d32',
    900: '#1b5e20',
  },
  warning: {
    50: '#fff8e1',
    100: '#ffecb3',
    200: '#ffe082',
    300: '#ffd54f',
    400: '#ffca28',
    500: '#ffc107',
    600: '#ffb300',
    700: '#ffa000',
    800: '#ff8f00',
    900: '#ff6f00',
  },
  error: {
    50: '#ffebee',
    100: '#ffcdd2',
    200: '#ef9a9a',
    300: '#e57373',
    400: '#ef5350',
    500: '#f44336',
    600: '#e53935',
    700: '#d32f2f',
    800: '#c62828',
    900: '#b71c1c',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  }
}

// 시맨틱 컬러
export const semanticColors = {
  background: {
    default: '#fafafa',
    paper: '#ffffff',
    elevated: '#ffffff',
  },
  text: {
    primary: 'rgba(0, 0, 0, 0.87)',
    secondary: 'rgba(0, 0, 0, 0.6)',
    disabled: 'rgba(0, 0, 0, 0.38)',
    hint: 'rgba(0, 0, 0, 0.38)',
  },
  divider: 'rgba(0, 0, 0, 0.12)',
  action: {
    active: 'rgba(0, 0, 0, 0.54)',
    hover: 'rgba(0, 0, 0, 0.04)',
    selected: 'rgba(0, 0, 0, 0.08)',
    disabled: 'rgba(0, 0, 0, 0.26)',
    disabledBackground: 'rgba(0, 0, 0, 0.12)',
  },
}

// 상태별 컬러
export const statusColors = {
  draft: brandColors.neutral[500],
  sent: brandColors.primary[500],
  accepted: brandColors.success[500],
  revised: brandColors.warning[500],
  canceled: brandColors.error[500],
  pending: brandColors.warning[300],
  completed: brandColors.success[500],
  active: brandColors.success[500],
  inactive: brandColors.neutral[400],
}

// MUI 표준 팔레트 구조로 색상 정의
export const primary = {
  50: brandColors.primary[50],
  100: brandColors.primary[100],
  200: brandColors.primary[200],
  300: brandColors.primary[300],
  400: brandColors.primary[400],
  500: brandColors.primary[500],
  600: brandColors.primary[600],
  700: brandColors.primary[700],
  800: brandColors.primary[800],
  900: brandColors.primary[900],
  main: brandColors.primary[500],
  light: brandColors.primary[300],
  dark: brandColors.primary[700],
  contrastText: '#ffffff',
}

export const secondary = {
  50: brandColors.secondary[50],
  100: brandColors.secondary[100],
  200: brandColors.secondary[200],
  300: brandColors.secondary[300],
  400: brandColors.secondary[400],
  500: brandColors.secondary[500],
  600: brandColors.secondary[600],
  700: brandColors.secondary[700],
  800: brandColors.secondary[800],
  900: brandColors.secondary[900],
  main: brandColors.secondary[500],
  light: brandColors.secondary[300],
  dark: brandColors.secondary[700],
  contrastText: '#ffffff',
}

export const success = {
  50: brandColors.success[50],
  100: brandColors.success[100],
  200: brandColors.success[200],
  300: brandColors.success[300],
  400: brandColors.success[400],
  500: brandColors.success[500],
  600: brandColors.success[600],
  700: brandColors.success[700],
  800: brandColors.success[800],
  900: brandColors.success[900],
  main: brandColors.success[500],
  light: brandColors.success[300],
  dark: brandColors.success[700],
  contrastText: '#ffffff',
}

export const warning = {
  50: brandColors.warning[50],
  100: brandColors.warning[100],
  200: brandColors.warning[200],
  300: brandColors.warning[300],
  400: brandColors.warning[400],
  500: brandColors.warning[500],
  600: brandColors.warning[600],
  700: brandColors.warning[700],
  800: brandColors.warning[800],
  900: brandColors.warning[900],
  main: brandColors.warning[500],
  light: brandColors.warning[300],
  dark: brandColors.warning[700],
  contrastText: 'rgba(0, 0, 0, 0.87)',
}

export const error = {
  50: brandColors.error[50],
  100: brandColors.error[100],
  200: brandColors.error[200],
  300: brandColors.error[300],
  400: brandColors.error[400],
  500: brandColors.error[500],
  600: brandColors.error[600],
  700: brandColors.error[700],
  800: brandColors.error[800],
  900: brandColors.error[900],
  main: brandColors.error[500],
  light: brandColors.error[300],
  dark: brandColors.error[700],
  contrastText: '#ffffff',
}

export const info = {
  50: '#e3f2fd',
  100: '#bbdefb',
  200: '#90caf9',
  300: '#64b5f6',
  400: '#42a5f5',
  500: '#2196f3',
  600: '#1e88e5',
  700: '#1976d2',
  800: '#1565c0',
  900: '#0d47a1',
  main: '#2196f3',
  light: '#64b5f6',
  dark: '#1976d2',
  contrastText: '#ffffff',
}

export const grey = {
  50: brandColors.neutral[50],
  100: brandColors.neutral[100],
  200: brandColors.neutral[200],
  300: brandColors.neutral[300],
  400: brandColors.neutral[400],
  500: brandColors.neutral[500],
  600: brandColors.neutral[600],
  700: brandColors.neutral[700],
  800: brandColors.neutral[800],
  900: brandColors.neutral[900],
  A100: '#f5f5f5',
  A200: '#eeeeee',
  A400: '#bdbdbd',
  A700: '#616161',
}

// 상태별 색상 (기존 유지)
export const status = statusColors