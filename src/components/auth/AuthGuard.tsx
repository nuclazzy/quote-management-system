'use client'

import { useAuth } from '@/contexts/AuthContext'
import { CircularProgress, Box } from '@mui/material'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface AuthGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { user, loading, initialized } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (initialized && !loading) {
      if (!user) {
        router.push('/auth/login')
        return
      }

      if (requireAdmin && user.profile?.role !== 'admin') {
        router.push('/unauthorized')
        return
      }

      if (!user.profile?.is_active) {
        router.push('/inactive')
        return
      }
    }
  }, [user, loading, initialized, requireAdmin, router])

  if (!initialized || loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        role="status"
        aria-label="로딩 중"
      >
        <CircularProgress aria-label="인증 상태 확인 중" />
      </Box>
    )
  }

  if (!user) {
    return null
  }

  if (requireAdmin && user.profile?.role !== 'admin') {
    return null
  }

  if (!user.profile?.is_active) {
    return null
  }

  return <>{children}</>
}

export default AuthGuard