'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { useMediaQuery } from '@mui/material'
import * as colors from '@/theme/colors'
import { typography } from '@/theme/typography'
import * as spacing from '@/theme/spacing'
import { components } from '@/theme/components'
import { fallbackTheme } from '@/theme/fallback'

type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextType {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  effectiveMode: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useCustomTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useCustomTheme must be used within a CustomThemeProvider')
  }
  return context
}

interface CustomThemeProviderProps {
  children: ReactNode
}

// 안전한 localStorage 접근 함수
const safeGetLocalStorage = (key: string, defaultValue: string): string => {
  if (typeof window === 'undefined') return defaultValue
  try {
    return localStorage.getItem(key) || defaultValue
  } catch {
    return defaultValue
  }
}

const safeSetLocalStorage = (key: string, value: string): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, value)
  } catch {
    // localStorage 접근 실패 시 무시
  }
}

export const CustomThemeProvider: React.FC<CustomThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('light') // 기본값을 'light'로 설정
  const [mounted, setMounted] = useState(false)
  
  // SSR 호환성을 위한 안전한 useMediaQuery 사용
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)', {
    noSsr: true, // SSR에서 제외
  })
  
  // 컴포넌트가 마운트된 후에만 로컬 스토리지에서 테마 로드
  useEffect(() => {
    setMounted(true)
    const savedMode = safeGetLocalStorage('theme-mode', 'light') as ThemeMode
    if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
      setMode(savedMode)
    }
  }, [])

  // 효과적인 테마 모드 계산 (SSR 시 안전한 기본값 사용)
  const effectiveMode: 'light' | 'dark' = !mounted 
    ? 'light' // SSR 중에는 기본값 사용
    : mode === 'system' 
      ? (prefersDarkMode ? 'dark' : 'light')
      : mode as 'light' | 'dark'

  // 테마 모드 변경 시 로컬 스토리지에 저장
  const handleSetMode = (newMode: ThemeMode) => {
    setMode(newMode)
    safeSetLocalStorage('theme-mode', newMode)
  }

  // 안전한 테마 생성 함수
  const createSafeTheme = () => {
    try {
      return createTheme({
        palette: {
          mode: effectiveMode,
          primary: {
            main: colors.primary?.main || fallbackTheme.palette.primary.main,
            light: colors.primary?.light || fallbackTheme.palette.primary.light,
            dark: colors.primary?.dark || fallbackTheme.palette.primary.dark,
            contrastText: colors.primary?.contrastText || fallbackTheme.palette.primary.contrastText,
          },
          secondary: {
            main: colors.secondary?.main || fallbackTheme.palette.secondary.main,
            light: colors.secondary?.light || fallbackTheme.palette.secondary.light,
            dark: colors.secondary?.dark || fallbackTheme.palette.secondary.dark,
            contrastText: colors.secondary?.contrastText || fallbackTheme.palette.secondary.contrastText,
          },
          success: {
            main: colors.success?.main || fallbackTheme.palette.success.main,
            light: colors.success?.light || fallbackTheme.palette.success.light,
            dark: colors.success?.dark || fallbackTheme.palette.success.dark,
            contrastText: colors.success?.contrastText || fallbackTheme.palette.success.contrastText,
          },
          warning: {
            main: colors.warning?.main || fallbackTheme.palette.warning.main,
            light: colors.warning?.light || fallbackTheme.palette.warning.light,
            dark: colors.warning?.dark || fallbackTheme.palette.warning.dark,
            contrastText: colors.warning?.contrastText || fallbackTheme.palette.warning.contrastText,
          },
          error: {
            main: colors.error?.main || fallbackTheme.palette.error.main,
            light: colors.error?.light || fallbackTheme.palette.error.light,
            dark: colors.error?.dark || fallbackTheme.palette.error.dark,
            contrastText: colors.error?.contrastText || fallbackTheme.palette.error.contrastText,
          },
          info: {
            main: colors.info?.main || fallbackTheme.palette.info.main,
            light: colors.info?.light || fallbackTheme.palette.info.light,
            dark: colors.info?.dark || fallbackTheme.palette.info.dark,
            contrastText: colors.info?.contrastText || fallbackTheme.palette.info.contrastText,
          },
          grey: colors.grey || fallbackTheme.palette.grey,
          background: {
            default: effectiveMode === 'dark' ? '#121212' : '#f5f5f5',
            paper: effectiveMode === 'dark' ? '#1e1e1e' : '#ffffff',
          },
          text: {
            primary: effectiveMode === 'dark' ? 'rgba(255, 255, 255, 0.87)' : 'rgba(0, 0, 0, 0.87)',
            secondary: effectiveMode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
          },
          divider: effectiveMode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
        },
        typography: typography || fallbackTheme.typography,
        spacing: spacing?.base 
          ? (factor: number) => `${spacing.base * factor}px`
          : (factor: number) => `${fallbackTheme.spacing.base * factor}px`,
        shape: {
          borderRadius: fallbackTheme.shape.borderRadius,
        },
        components: {
          ...(components || {}),
          // 다크 모드에서 컴포넌트 스타일 조정
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: effectiveMode === 'dark' 
                  ? 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))'
                  : 'none',
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: effectiveMode === 'dark' ? '#1e1e1e' : (colors.primary?.main || fallbackTheme.palette.primary.main),
                color: '#ffffff',
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                backgroundColor: effectiveMode === 'dark' ? '#1e1e1e' : '#ffffff',
                borderRight: `1px solid ${effectiveMode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.12)' 
                  : 'rgba(0, 0, 0, 0.12)'
                }`,
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                backgroundColor: effectiveMode === 'dark' ? '#1e1e1e' : '#ffffff',
                border: `1px solid ${effectiveMode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.12)' 
                  : 'rgba(0, 0, 0, 0.12)'
                }`,
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: effectiveMode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.23)' 
                      : 'rgba(0, 0, 0, 0.23)',
                  },
                },
              },
            },
          },
        },
      })
    } catch (error) {
      console.error('테마 생성 중 오류 발생:', error)
      // fallback 테마 사용
      return createTheme({
        palette: {
          mode: effectiveMode,
          ...fallbackTheme.palette,
          background: {
            default: effectiveMode === 'dark' ? '#121212' : '#f5f5f5',
            paper: effectiveMode === 'dark' ? '#1e1e1e' : '#ffffff',
          },
        },
        typography: fallbackTheme.typography,
        spacing: (factor: number) => `${fallbackTheme.spacing.base * factor}px`,
        shape: fallbackTheme.shape,
      })
    }
  }

  const theme = createSafeTheme()

  const contextValue: ThemeContextType = {
    mode,
    setMode: handleSetMode,
    effectiveMode,
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  )
}