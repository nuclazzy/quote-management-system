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
        // 1. URL에서 에러 체크
        const error = searchParams.get('error');
        if (error) {
          setStatus('error');
          setErrorMessage('인증 중 오류가 발생했습니다.');
          setTimeout(() => router.push('/auth/login'), 3000);
          return;
        }

        // 2. 세션 처리 - Supabase가 자동으로 처리
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setStatus('success');
          // 대시보드로 리다이렉트
          router.push('/dashboard');
          return;
        }

        // 3. 세션이 없을 경우
        setStatus('error');
        setErrorMessage('인증 정보를 찾을 수 없습니다.');
        setTimeout(() => router.push('/auth/login'), 3000);
        
      } catch (error) {
        setStatus('error');
        setErrorMessage('인증 처리 중 오류가 발생했습니다.');
        setTimeout(() => router.push('/auth/login'), 3000);
      }
    };

    // 짧은 딜레이 후 실행
    setTimeout(handleCallback, 100);
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