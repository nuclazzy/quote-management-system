'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { useMediaQuery } from '@mui/material'
import { modernTheme, modernDarkTheme } from '@/styles/modern-theme'

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
  const [mode, setMode] = useState<ThemeMode>('light')
  const [mounted, setMounted] = useState(false)
  
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)', {
    noSsr: true,
  })
  
  useEffect(() => {
    setMounted(true)
    const savedMode = safeGetLocalStorage('theme-mode', 'light') as ThemeMode
    if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
      setMode(savedMode)
    }
  }, [])

  const effectiveMode: 'light' | 'dark' = !mounted 
    ? 'light'
    : mode === 'system' 
      ? (prefersDarkMode ? 'dark' : 'light')
      : mode as 'light' | 'dark'

  const handleSetMode = (newMode: ThemeMode) => {
    setMode(newMode)
    safeSetLocalStorage('theme-mode', newMode)
  }

  // 모던 테마 사용
  const theme = effectiveMode === 'dark' ? modernDarkTheme : modernTheme

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