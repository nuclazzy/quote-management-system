'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Container,
} from '@mui/material';
import { Dashboard as DashboardIcon } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // 사용자가 있으면 바로 대시보드로 리다이렉트
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

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
              누구나 사용할 수 있는 시스템
            </Typography>

            <Button
              fullWidth
              variant='contained'
              size='large'
              startIcon={<DashboardIcon />}
              onClick={() => router.push('/dashboard')}
              sx={{
                py: 1.5,
                mb: 3,
                fontSize: '1.1rem',
              }}
            >
              대시보드로 이동
            </Button>

            <Typography variant='caption' color='text.secondary'>
              별도 로그인 없이 바로 사용하실 수 있습니다
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
