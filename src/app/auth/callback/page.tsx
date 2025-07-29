'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CircularProgress, Box, Typography } from '@mui/material'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // 인증 콜백 처리 후 대시보드로 리다이렉트
    const timer = setTimeout(() => {
      router.push('/dashboard')
    }, 2000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      gap={2}
    >
      <CircularProgress />
      <Typography variant="body1">
        로그인 처리 중...
      </Typography>
    </Box>
  )
}