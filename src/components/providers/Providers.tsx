'use client'

import React from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
import { AuthProvider } from '@/contexts/AuthContext'
import { CustomThemeProvider } from '@/contexts/ThemeContext'
import WebVitals from '@/components/analytics/WebVitals'
import GlobalErrorBoundary from '@/components/common/GlobalErrorBoundary'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AppRouterCacheProvider>
      <CustomThemeProvider>
        <CssBaseline />
        <GlobalErrorBoundary>
          <AuthProvider>
            <WebVitals />
            {children}
          </AuthProvider>
        </GlobalErrorBoundary>
      </CustomThemeProvider>
    </AppRouterCacheProvider>
  )
}