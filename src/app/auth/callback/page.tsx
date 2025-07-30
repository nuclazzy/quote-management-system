'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CircularProgress,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const processUser = async (user: any) => {
    try {
      setStatus('success');
      
      // 대시보드로 리디렉트
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('processUser 에러:', error);
      setStatus('error');
      setErrorMessage('로그인 처리 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // 현재 세션 확인
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('세션 에러:', error.message);
          setStatus('error');
          setErrorMessage(error.message);
          return;
        }

        if (data.session?.user) {
          await processUser(data.session.user);
        } else {
          setStatus('error');
          setErrorMessage('인증 정보를 찾을 수 없습니다.');
          
          setTimeout(() => {
            router.push('/auth/login');
          }, 3000);
        }
      } catch (error) {
        console.error('전체 처리 에러:', error);
        setStatus('error');
        setErrorMessage('로그인 처리 중 오류가 발생했습니다.');
      }
    };

    handleAuthCallback();
  }, [router]);

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
        <Alert severity='error' sx={{ maxWidth: 400 }}>
          <Typography variant='h6' gutterBottom>
            로그인 실패
          </Typography>
          <Typography variant='body2'>{errorMessage}</Typography>
        </Alert>
        <Typography
          variant='body2'
          color='primary'
          sx={{ cursor: 'pointer' }}
          onClick={() => router.push('/auth/login')}
        >
          다시 로그인하기
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
      sx={{ p: 2 }}
    >
      <CircularProgress />
      <Typography variant='body1'>
        {status === 'success'
          ? '로그인 완료! 대시보드로 이동 중...'
          : '로그인 처리 중...'}
      </Typography>
    </Box>
  );
}