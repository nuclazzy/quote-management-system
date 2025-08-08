'use client';

import { useEffect } from 'react';
import { CircularProgress, Box, Typography } from '@mui/material';

export default function AuthCallbackPage() {
  useEffect(() => {
    // 단순히 3초 후 대시보드로 리디렉트
    const timer = setTimeout(() => {
      window.location.href = '/dashboard';
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Box
      display='flex'
      flexDirection='column'
      justifyContent='center'
      alignItems='center'
      minHeight='100vh'
      gap={2}
    >
      <CircularProgress />
      <Typography variant='h6'>로그인 성공!</Typography>
      <Typography variant='body2' color='text.secondary'>
        대시보드로 이동 중입니다...
      </Typography>
    </Box>
  );
}