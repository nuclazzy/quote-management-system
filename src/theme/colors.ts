// 2025 모던 브랜드 컬러 팔레트 - Gradient & Glassmorphism 지원
export const brandColors = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // 메인 브랜드 컬러 - 더 생동감 있는 파란색
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  secondary: {
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#ec4899', // 더 모던한 핑크
    600: '#db2777',
    700: '#be185d',
    800: '#9d174d',
    900: '#831843',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // 더 밝고 에너지 넘치는 초록색
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
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

// 2025 모던 시맨틱 컬러 - 라이트/다크 모드 지원
export const semanticColors = {
  light: {
    background: {
      default: '#fafbfc', // 더 세련된 라이트 그레이
      paper: '#ffffff',
      elevated: '#ffffff',
      glass: 'rgba(255, 255, 255, 0.85)', // 글래스모피즘
      gradient: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      disabled: '#94a3b8',
      hint: '#cbd5e1',
    },
    divider: '#e2e8f0',
    action: {
      active: '#334155',
      hover: 'rgba(15, 23, 42, 0.04)',
      selected: 'rgba(14, 165, 233, 0.08)',
      disabled: '#94a3b8',
      disabledBackground: '#f1f5f9',
    },
  },
  dark: {
    background: {
      default: '#0f172a', // 다크 모드 메인 배경
      paper: '#1e293b',
      elevated: '#334155',
      glass: 'rgba(30, 41, 59, 0.85)', // 다크 글래스모피즘
      gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
      disabled: '#64748b',
      hint: '#475569',
    },
    divider: '#334155',
    action: {
      active: '#cbd5e1',
      hover: 'rgba(248, 250, 252, 0.04)',
      selected: 'rgba(14, 165, 233, 0.12)',
      disabled: '#64748b',
      disabledBackground: '#1e293b',
    },
  },
}

// 2025 모던 상태별 컬러 - 그라디언트 지원
export const statusColors = {
  draft: {
    main: brandColors.neutral[500],
    gradient: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
    glass: 'rgba(100, 116, 139, 0.1)',
  },
  sent: {
    main: brandColors.primary[500],
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
    glass: 'rgba(14, 165, 233, 0.1)',
  },
  accepted: {
    main: brandColors.success[500],
    gradient: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)',
    glass: 'rgba(34, 197, 94, 0.1)',
  },
  revised: {
    main: brandColors.warning[500],
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    glass: 'rgba(245, 158, 11, 0.1)',
  },
  canceled: {
    main: brandColors.error[500],
    gradient: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
    glass: 'rgba(239, 68, 68, 0.1)',
  },
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

// 2025 트렌드 - 그라디언트 컬렉션
export const gradients = {
  primary: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
  secondary: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
  success: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)',
  warning: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
  error: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
  glass: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
  darkGlass: 'linear-gradient(135deg, rgba(30,41,59,0.8) 0%, rgba(51,65,85,0.6) 100%)',
  sunset: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #8b5cf6 100%)',
  ocean: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
}

// 2025 네오모피즘 그림자
export const shadows = {
  neumorphism: {
    light: '20px 20px 60px #d1d9e6, -20px -20px 60px #ffffff',
    dark: '20px 20px 60px #0a0f1a, -20px -20px 60px #243040',
  },
  glassmorphism: {
    light: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    dark: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  },
  modern: {
    small: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    large: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
}

// 상태별 색상 (기존 유지 + 확장)
export const status = statusColors