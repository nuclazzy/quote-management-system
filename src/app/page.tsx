'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/common/LoadingState';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // 인증된 사용자는 대시보드로 리다이렉트
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // 로딩 중
  if (loading) {
    return <LoadingState message='시스템을 초기화하고 있습니다...' />;
  }

  // 로그인하지 않은 사용자에게 랜딩 페이지 표시
  if (!user) {
    return (
      <Container maxWidth='md' sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant='h2' component='h1' gutterBottom>
            견적서 관리 시스템
          </Typography>
          <Typography variant='h6' color='text.secondary' paragraph>
            Motion Sense 견적서 관리 시스템에 오신 것을 환영합니다
          </Typography>
        </Box>

        <Card sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant='h5' component='h2' gutterBottom>
              주요 기능
            </Typography>
            <Stack spacing={2} sx={{ mt: 3 }}>
              <Typography variant='body1'>✅ 견적서 작성 및 관리</Typography>
              <Typography variant='body1'>✅ 고객사 및 공급처 관리</Typography>
              <Typography variant='body1'>
                ✅ 실시간 대시보드 및 통계
              </Typography>
              <Typography variant='body1'>✅ PDF 견적서 생성</Typography>
              <Typography variant='body1'>✅ 프로젝트 수익성 분석</Typography>
            </Stack>
          </CardContent>
        </Card>

        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant='contained'
            size='large'
            startIcon={<LoginIcon />}
            onClick={() => router.push('/auth/login')}
            sx={{ px: 4, py: 1.5 }}
          >
            로그인하여 시작하기
          </Button>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
            @motionsense.co.kr 계정으로만 접근 가능합니다
          </Typography>
        </Box>
      </Container>
    );
  }

  // 이 시점에는 리다이렉트가 진행 중이므로 로딩 표시
  return <LoadingState message='대시보드로 이동 중...' />;
}
