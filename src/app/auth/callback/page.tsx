'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CircularProgress, Box, Typography, Alert } from '@mui/material'
import { supabase } from '@/lib/supabase/client'
import { AuthService } from '@/lib/auth/auth-service'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const processUser = async (user: any) => {
    // 도메인 제한 확인
    if (!user.email?.endsWith('@motionsense.co.kr')) {
      await supabase.auth.signOut()
      setStatus('error')
      setErrorMessage('접근이 제한된 도메인입니다. @motionsense.co.kr 계정을 사용해주세요.')
      return
    }

    // 프로필 생성/업데이트
    try {
      await AuthService.upsertProfile(
        user.id,
        user.email,
        user.user_metadata.full_name || user.email.split('@')[0]
      )
    } catch (profileError) {
      console.error('Profile upsert error:', profileError)
      // 프로필 생성 실패해도 로그인은 계속 진행
    }

    setStatus('success')
    
    // 성공 시 대시보드로 리디렉트
    setTimeout(() => {
      router.push('/dashboard')
    }, 1500)
  }

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Supabase auth callback 처리
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setStatus('error')
          setErrorMessage(error.message)
          return
        }

        // URL hash fragment에서 auth 정보 확인
        if (typeof window !== 'undefined') {
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          
          if (accessToken && refreshToken && !data.session) {
            // 수동으로 세션 설정
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })
            
            if (sessionError) {
              console.error('Session set error:', sessionError)
              setStatus('error')
              setErrorMessage(sessionError.message)
              return
            }
            
            if (sessionData.session?.user) {
              await processUser(sessionData.session.user)
              return
            }
          }
        }

        // 기존 세션이 있는 경우
        if (data.session?.user) {
          await processUser(data.session.user)
        } else {
          setStatus('error')
          setErrorMessage('인증 정보를 찾을 수 없습니다.')
        }
      } catch (error) {
        console.error('Auth callback processing error:', error)
        setStatus('error')
        setErrorMessage('로그인 처리 중 오류가 발생했습니다.')
      }
    }

    handleAuthCallback()
  }, [router])

  if (status === 'error') {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={2}
        px={2}
      >
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          <Typography variant="h6" gutterBottom>
            로그인 실패
          </Typography>
          <Typography variant="body2">
            {errorMessage}
          </Typography>
        </Alert>
        <Typography 
          variant="body2" 
          color="primary" 
          sx={{ cursor: 'pointer' }}
          onClick={() => router.push('/auth/login')}
        >
          다시 로그인하기
        </Typography>
      </Box>
    )
  }

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
        {status === 'success' ? '로그인 완료! 대시보드로 이동 중...' : '로그인 처리 중...'}
      </Typography>
    </Box>
  )
}