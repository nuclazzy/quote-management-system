'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CircularProgress, Box, Typography, Alert, Button } from '@mui/material'
import { supabase } from '@/lib/supabase/client'
import { AuthService } from '@/lib/auth/auth-service'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'timeout'>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [countdown, setCountdown] = useState<number>(30)
  const processingRef = useRef<boolean>(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  const processUser = async (user: any) => {
    if (isProcessing) {
      console.log('⚠️ Already processing user, skipping...')
      return
    }
    
    setIsProcessing(true)
    
    console.log('🔄 Processing user:', {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata
    })
    
    try {
      // 도메인 제한 확인
      if (!user.email?.endsWith('@motionsense.co.kr')) {
        console.log('❌ Domain restriction failed:', user.email)
        await supabase.auth.signOut()
        setStatus('error')
        setErrorMessage('접근이 제한된 도메인입니다. @motionsense.co.kr 계정을 사용해주세요.')
        return
      }

      console.log('✅ Domain check passed for:', user.email)

      // 프로필 생성/업데이트 시도 (여러 방법으로 시도)
      try {
        console.log('🔄 Attempting to upsert profile for:', {
          userId: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name || user.user_metadata?.name
        })
        
        let profile
        
        // 방법 1: AuthService 사용
        try {
          profile = await AuthService.upsertProfile(
            user.id,
            user.email,
            user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0]
          )
          console.log('✅ Profile upsert successful via AuthService:', profile)
        } catch (authServiceError) {
          console.warn('⚠️ AuthService upsert failed, trying direct database access:', authServiceError)
          
          // 방법 2: 직접 데이터베이스 접근 (service role 키로)
          try {
            const profileData = {
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
              role: user.email === 'lewis@motionsense.co.kr' ? 'super_admin' : 'user',
              is_active: true,
              updated_at: new Date().toISOString()
            }
            
            // 기존 프로필 확인
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single()
            
            if (existingProfile) {
              // 업데이트
              const { data, error } = await supabase
                .from('profiles')
                .update({
                  email: profileData.email,
                  full_name: profileData.full_name,
                  updated_at: profileData.updated_at
                })
                .eq('id', user.id)
                .select()
                .single()
              
              if (error) throw error
              profile = data
            } else {
              // 새로 생성
              const { data, error } = await supabase
                .from('profiles')
                .insert(profileData)
                .select()
                .single()
              
              if (error) throw error
              profile = data
            }
            
            console.log('✅ Profile upsert successful via direct access:', profile)
          } catch (directError) {
            console.error('❌ Direct database access also failed:', directError)
            
            // 방법 3: 임시로 로그인 성공 처리 (프로필 없이)
            console.log('⚠️ Proceeding without profile creation as fallback')
            profile = { id: user.id, email: user.email, role: 'user' }
          }
        }
        
      } catch (profileError) {
        console.error('❌ All profile creation methods failed:', {
          error: profileError,
          message: profileError instanceof Error ? profileError.message : profileError,
          stack: profileError instanceof Error ? profileError.stack : undefined
        })
        
        // 프로필 생성에 실패해도 로그인은 유지하고 대시보드로 이동
        console.log('⚠️ Profile creation failed but continuing with login...')
      }

      console.log('✅ Setting success status')
      setStatus('success')
      
      // 성공 시 대시보드로 리디렉트
      setTimeout(() => {
        console.log('🔄 Redirecting to dashboard')
        router.push('/dashboard')
      }, 1000)
      
    } catch (generalError) {
      console.error('❌ General error in processUser:', generalError)
      setStatus('error')
      setErrorMessage(`로그인 처리 중 오류가 발생했습니다: ${generalError instanceof Error ? generalError.message : '알 수 없는 오류'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    let isHandled = false
    
    const handleAuthCallback = async () => {
      if (isHandled) return
      isHandled = true
      
      console.log('Starting auth callback handling...')
      
      try {
        // 30초 타임아웃 설정
        timeoutId = setTimeout(() => {
          if (status === 'loading') {
            console.error('⏰ Auth callback timeout after 30 seconds')
            setStatus('error')
            setErrorMessage('로그인 처리 시간이 초과되었습니다. 다시 시도해주세요.')
            setTimeout(() => {
              router.push('/auth/login')
            }, 3000)
          }
        }, 30000)
        
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
            clearTimeout(timeoutId)
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
              clearTimeout(timeoutId)
              return
            }
            
            if (sessionData.session?.user) {
              console.log('User found in session data:', sessionData.session.user.email)
              await processUser(sessionData.session.user)
              clearTimeout(timeoutId)
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
          clearTimeout(timeoutId)
          return
        }

        if (data.session?.user) {
          console.log('User found in existing session:', data.session.user.email)
          await processUser(data.session.user)
          clearTimeout(timeoutId)
        } else {
          console.log('No session found')
          setStatus('error')
          setErrorMessage('인증 정보를 찾을 수 없습니다. 다시 로그인해주세요.')
          clearTimeout(timeoutId)
          
          // 3초 후 로그인 페이지로 리디렉트
          setTimeout(() => {
            router.push('/auth/login')
          }, 3000)
        }
      } catch (error) {
        console.error('Auth callback processing error:', error)
        setStatus('error')
        setErrorMessage('로그인 처리 중 오류가 발생했습니다.')
        clearTimeout(timeoutId)
      }
    }

    handleAuthCallback()
    
    // 컴포넌트 언마운트 시 타임아웃 정리
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [router, status])

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