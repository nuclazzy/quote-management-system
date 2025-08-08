'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Container,
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { LoadingState } from '@/components/common/LoadingState';

export default function LoginPage() {
  const { user, loading, signIn } = useSimpleAuth();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이미 로그인된 사용자는 대시보드로 리다이렉트
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setError(null);
      await signIn();
      // 성공 시 AuthProvider에서 자동으로 대시보드로 리다이렉트됨
    } catch (err) {
      console.error('로그인 에러:', err);
      setError(
        err instanceof Error
          ? err.message
          : '로그인 중 오류가 발생했습니다. 다시 시도해주세요.'
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  // 초기 로딩 중
  if (loading) {
    return <LoadingState message='인증 상태를 확인하고 있습니다...' />;
  }

  // 이미 로그인된 사용자
  if (user) {
    return <LoadingState message='대시보드로 이동 중...' />;
  }

  return (
    <Container component='main' maxWidth='sm'>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 400 }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Typography
              variant='h4'
              component='h1'
              gutterBottom
              color='primary'
            >
              견적서 관리 시스템
            </Typography>

            <Typography variant='body1' color='text.secondary' sx={{ mb: 4 }}>
              Motion Sense 내부 시스템
            </Typography>

            {error && (
              <Alert severity='error' sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Button
              fullWidth
              variant='contained'
              size='large'
              startIcon={
                isSigningIn ? <CircularProgress size={20} /> : <GoogleIcon />
              }
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              sx={{
                py: 1.5,
                mb: 3,
                fontSize: '1.1rem',
              }}
            >
              {isSigningIn ? '로그인 중...' : 'Google로 로그인'}
            </Button>

            <Typography variant='caption' color='text.secondary'>
              @motionsense.co.kr 계정으로만 접근 가능합니다
            </Typography>
          </CardContent>
        </Card>

        <Typography variant='body2' color='text.secondary' sx={{ mt: 3 }}>
          시스템 사용 문의: IT팀
        </Typography>
      </Box>
    </Container>
  );
}
