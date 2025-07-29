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
    console.log('Processing user:', user)
    
    // 도메인 제한 확인
    if (!user.email?.endsWith('@motionsense.co.kr')) {
      console.log('Domain restriction failed:', user.email)
      await supabase.auth.signOut()
      setStatus('error')
      setErrorMessage('접근이 제한된 도메인입니다. @motionsense.co.kr 계정을 사용해주세요.')
      return
    }

    // 프로필 생성/업데이트
    try {
      console.log('Attempting to upsert profile for:', user.email)
      await AuthService.upsertProfile(
        user.id,
        user.email,
        user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0]
      )
      console.log('Profile upsert successful')
    } catch (profileError) {
      console.error('Profile upsert error:', profileError)
      // 프로필 생성 실패 시 에러 표시
      setStatus('error')
      setErrorMessage(`프로필 생성 실패: ${profileError instanceof Error ? profileError.message : '알 수 없는 오류'}`)
      return
    }

    console.log('Setting success status')
    setStatus('success')
    
    // 성공 시 대시보드로 리디렉트
    setTimeout(() => {
      console.log('Redirecting to dashboard')
      router.push('/dashboard')
    }, 1000)
  }

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log('Starting auth callback handling...')
      
      try {
        // URL hash fragment에서 auth 정보 먼저 확인
        if (typeof window !== 'undefined') {
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          const errorParam = hashParams.get('error')
          const errorDescription = hashParams.get('error_description')
          
          console.log('Hash params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, error: errorParam })
          
          if (errorParam) {
            console.error('OAuth error:', errorParam, errorDescription)
            setStatus('error')
            setErrorMessage(errorDescription || errorParam)
            return
          }
          
          if (accessToken && refreshToken) {
            console.log('Setting session with tokens from URL')
            // URL에서 토큰으로 세션 설정
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
              console.log('User found in session data:', sessionData.session.user.email)
              await processUser(sessionData.session.user)
              return
            }
          }
        }

        // 기존 세션 확인
        console.log('Checking existing session...')
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Get session error:', error)
          setStatus('error')
          setErrorMessage(error.message)
          return
        }

        if (data.session?.user) {
          console.log('User found in existing session:', data.session.user.email)
          await processUser(data.session.user)
        } else {
          console.log('No session found')
          setStatus('error')
          setErrorMessage('인증 정보를 찾을 수 없습니다. 다시 로그인해주세요.')
          
          // 3초 후 로그인 페이지로 리디렉트
          setTimeout(() => {
            router.push('/auth/login')
          }, 3000)
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