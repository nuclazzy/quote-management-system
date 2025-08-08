'use client';

import { useAuth } from '@/contexts/AuthContext';
import { CircularProgress, Box, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { user, loading, initialized } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    console.log('AuthGuard state:', { 
      initialized, 
      loading, 
      user: !!user,
      userEmail: user?.email,
      requireAdmin,
      isRedirecting 
    });

    // 타임아웃 설정 - 10초 이상 로딩이면 강제로 처리
    const timeout = setTimeout(() => {
      if (!initialized && loading) {
        console.error('AuthGuard timeout - forcing redirect to login');
        router.push('/auth/login');
      }
    }, 10000);

    if (initialized && !loading) {
      if (!user) {
        console.log('AuthGuard: No user, redirecting to login');
        setIsRedirecting(true);
        router.push('/auth/login');
      } else if (requireAdmin && user.profile?.role !== 'admin') {
        console.log('AuthGuard: Admin required but user is not admin');
        setIsRedirecting(true);
        router.push('/unauthorized');
      } else if (!user.profile?.is_active) {
        console.log('AuthGuard: User is inactive');
        setIsRedirecting(true);
        router.push('/inactive');
      } else {
        console.log('AuthGuard: Authentication successful');
      }
    }

    return () => clearTimeout(timeout);
  }, [user, loading, initialized, requireAdmin, router]);

  // 로딩 상태
  if (!initialized || loading) {
    return (
      <Box
        display='flex'
        flexDirection='column'
        justifyContent='center'
        alignItems='center'
        minHeight='100vh'
        gap={2}
        role='status'
        aria-label='로딩 중'
      >
        <CircularProgress size={48} aria-label='인증 상태 확인 중' />
        <Typography variant="body1" color="text.secondary">
          인증 상태 확인 중...
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {!initialized ? '초기화 중...' : '로딩 중...'}
        </Typography>
      </Box>
    );
  }

  // 리다이렉팅 중
  if (isRedirecting || !user) {
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
          페이지 이동 중...
        </Typography>
      </Box>
    );
  }

  // 권한 체크
  if (requireAdmin && user.profile?.role !== 'admin') {
    return (
      <Box
        display='flex'
        flexDirection='column'
        justifyContent='center'
        alignItems='center'
        minHeight='100vh'
        gap={2}
      >
        <Typography variant="h6" color="error">
          권한이 없습니다
        </Typography>
        <Typography variant="body2" color="text.secondary">
          관리자 권한이 필요합니다.
        </Typography>
      </Box>
    );
  }

  // 비활성 사용자
  if (!user.profile?.is_active) {
    return (
      <Box
        display='flex'
        flexDirection='column'
        justifyContent='center'
        alignItems='center'
        minHeight='100vh'
        gap={2}
      >
        <Typography variant="h6" color="error">
          계정이 비활성화되었습니다
        </Typography>
        <Typography variant="body2" color="text.secondary">
          관리자에게 문의하세요.
        </Typography>
      </Box>
    );
  }

  // 정상적으로 인증된 경우
  return <>{children}</>;
}

export default AuthGuard;