'use client';

import { useEffect, useState } from 'react';
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
  const [hydrated, setHydrated] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();

  // 하이드레이션 완료 후에만 실제 로직 실행
  useEffect(() => {
    console.log('🔥 HOME PAGE: 하이드레이션 완료');
    setHydrated(true);
    
    if (typeof document !== 'undefined') {
      document.title = 'NoAuth 시스템 - ' + new Date().toLocaleTimeString();
    }
  }, []);
  
  console.log('🔥 HOME PAGE: 인증 상태', { 
    hasUser: !!user, 
    loading, 
    userEmail: user?.email,
    userId: user?.id,
    hydrated
  });

  // 하이드레이션 후 바로 대시보드로 이동
  useEffect(() => {
    console.log('🔥 HOME PAGE: 리다이렉트 체크', {
      hydrated,
      loading,
      hasUser: !!user
    });
    
    if (hydrated && !loading && user) {
      console.log('🔥 HOME PAGE: 대시보드로 자동 리다이렉트');
      router.push('/dashboard');
    } else if (hydrated && !loading && !user) {
      console.log('🚨 HOME PAGE: 사용자가 없습니다! NoAuth 초기화 실패');
    }
  }, [user, loading, router, hydrated]);

  // 하이드레이션 전이거나 로딩 중
  if (!hydrated || loading) {
    return (
      <div suppressHydrationWarning>
        <LoadingState message='시스템을 초기화하고 있습니다...' />
      </div>
    );
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
            누구나 사용할 수 있는 견적서 관리 시스템
          </Typography>
          {/* 개발모드 디버깅 (배포시 제거) */}
          {process.env.NODE_ENV === 'development' && (
            <Typography 
              variant='caption' 
              color='text.secondary' 
              sx={{ display: 'block', mt: 2 }} 
              suppressHydrationWarning
            >
              개발 모드: {hydrated ? '클라이언트 로드 완료' : '서버 렌더링'}
            </Typography>
          )}
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
            onClick={() => router.push('/dashboard')}
            sx={{ px: 4, py: 1.5 }}
          >
            시작하기
          </Button>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
            누구나 자유롭게 이용하실 수 있습니다
          </Typography>
        </Box>
      </Container>
    );
  }

  // 이 시점에는 리다이렉트가 진행 중이므로 로딩 표시
  return (
    <div suppressHydrationWarning>
      <LoadingState message='대시보드로 이동 중...' />
    </div>
  );
}
