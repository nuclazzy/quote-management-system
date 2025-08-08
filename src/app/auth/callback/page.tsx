'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CircularProgress, Box, Typography, Alert } from '@mui/material';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('Auth callback started');
        console.log('Current URL:', window.location.href);
        
        // 1. URL에서 에러 체크
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          console.error('Auth error:', error, errorDescription);
          setStatus('error');
          setErrorMessage(errorDescription || '인증 중 오류가 발생했습니다.');
          return;
        }

        // 2. URL 해시에서 OAuth 토큰 처리 (Supabase OAuth 플로우)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          console.log('Found OAuth tokens in URL hash');
          
          // Supabase에 세션 설정
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (setSessionError) {
            console.error('Set session error:', setSessionError);
            setStatus('error');
            setErrorMessage('세션 설정 중 오류가 발생했습니다.');
            return;
          }
          
          console.log('Session set successfully');
          setStatus('success');
          
          // 짧은 딜레이 후 대시보드로 이동
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1000);
          return;
        }

        // 3. 기존 세션 확인
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Get session error:', sessionError);
          setStatus('error');
          setErrorMessage('세션 처리 중 오류가 발생했습니다.');
          return;
        }

        if (session) {
          console.log('Found existing session');
          setStatus('success');
          
          // 세션이 있으면 대시보드로 이동
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1000);
          return;
        }

        // 4. 세션이 없을 경우
        console.warn('No session found');
        setStatus('error');
        setErrorMessage('인증 정보를 찾을 수 없습니다.');
        
        // 3초 후 로그인 페이지로 리다이렉트
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
        
      } catch (error) {
        console.error('Callback error:', error);
        setStatus('error');
        setErrorMessage('인증 처리 중 오류가 발생했습니다.');
        
        // 에러 발생 시에도 3초 후 로그인으로 리다이렉트
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (status === 'error') {
    return (
      <Box
        display='flex'
        flexDirection='column'
        justifyContent='center'
        alignItems='center'
        minHeight='100vh'
        gap={2}
        px={2}
      >
        <Alert severity='error' sx={{ maxWidth: 500 }}>
          <Typography variant='h6' gutterBottom>
            로그인 실패
          </Typography>
          <Typography variant='body2' paragraph>
            {errorMessage}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            3초 후 로그인 페이지로 이동합니다...
          </Typography>
        </Alert>
        <Typography
          variant='body2'
          color='primary'
          sx={{ cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => router.push('/auth/login')}
        >
          지금 로그인 페이지로 이동
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      display='flex'
      flexDirection='column'
      justifyContent='center'
      alignItems='center'
      minHeight='100vh'
      gap={2}
    >
      <CircularProgress size={48} />
      <Typography variant='h5'>
        {status === 'success' ? '로그인 성공!' : '로그인 처리 중...'}
      </Typography>
      <Typography variant='body1' color='text.secondary'>
        {status === 'success' 
          ? '대시보드로 이동하고 있습니다...' 
          : '잠시만 기다려주세요...'}
      </Typography>
    </Box>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <Box
        display='flex'
        flexDirection='column'
        justifyContent='center'
        alignItems='center'
        minHeight='100vh'
        gap={2}
      >
        <CircularProgress size={48} />
        <Typography variant='body1'>로딩 중...</Typography>
      </Box>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}