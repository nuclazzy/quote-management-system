'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CircularProgress, Box, Typography } from '@mui/material';

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('Dashboard Layout - Auth state:', { 
      initialized, 
      loading, 
      user: !!user,
      userEmail: user?.email 
    });

    // 10초 타임아웃
    const timeout = setTimeout(() => {
      if (!initialized || loading) {
        console.error('Dashboard Layout timeout - Auth state stuck');
        // 강제로 로그인 페이지로 이동
        window.location.href = '/auth/login';
      }
    }, 10000);

    // 인증 체크
    if (initialized && !loading && !user) {
      console.log('No user found in dashboard layout, redirecting to login');
      router.push('/auth/login');
    }

    return () => clearTimeout(timeout);
  }, [user, loading, initialized, router]);

  // 로딩 중
  if (!initialized || loading) {
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
        <Typography variant="body1" color="text.secondary">
          시스템 초기화 중...
        </Typography>
        <Typography variant="caption" color="text.secondary">
          상태: {!initialized ? '초기화 대기' : '로딩 중'}
        </Typography>
      </Box>
    );
  }

  // 사용자가 없는 경우
  if (!user) {
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
        <Typography variant="body1" color="text.secondary">
          로그인 페이지로 이동 중...
        </Typography>
      </Box>
    );
  }

  // 정상적으로 인증된 경우
  return <DashboardLayout>{children}</DashboardLayout>;
}