'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  CircularProgress,
  Box,
  Typography,
  Alert,
  Button,
} from '@mui/material';
import { supabase } from '@/lib/supabase/client';
import { AuthService } from '@/lib/auth/auth-service';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<
    'loading' | 'success' | 'error' | 'timeout'
  >('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // 강제 로그 함수 - 화면과 콘솔 모두에 출력
  const forceLog = (message: string) => {
    console.log(`🔥 FORCE LOG: ${message}`);
    console.error(`🔥 FORCE ERROR LOG: ${message}`); // 에러로도 출력
    alert(`DEBUG: ${message}`); // alert로도 출력
    setDebugLogs((prev) => [
      ...prev,
      `${new Date().toISOString()}: ${message}`,
    ]);
  };

  const processUser = async (user: any) => {
    forceLog('processUser 함수 시작됨');

    if (isProcessing) {
      forceLog('이미 처리 중이므로 건너뜀');
      return;
    }

    setIsProcessing(true);
    forceLog(`사용자 처리 시작: ${user.email}`);

    try {
      // 도메인 체크 스킵하고 바로 성공 처리
      forceLog('도메인 체크 스킵하고 바로 대시보드로 이동');

      setStatus('success');
      forceLog('상태를 success로 변경');

      // 즉시 대시보드로 리디렉트 (window.location 강제 사용)
      forceLog('대시보드로 리디렉트 실행');
      forceLog('window.location.href 강제 리디렉트 사용');

      // router.push 대신 강제로 window.location 사용
      window.location.href = '/dashboard';
    } catch (error) {
      forceLog(`processUser 에러: ${error}`);
      setStatus('error');
      setErrorMessage('간단 처리 중 오류 발생');
    } finally {
      setIsProcessing(false);
      forceLog('processUser 함수 종료');
    }
  };

  useEffect(() => {
    forceLog('useEffect 시작됨');

    const handleAuthCallback = async () => {
      forceLog('handleAuthCallback 함수 시작');

      try {
        forceLog('window 객체 확인 중...');

        // 단순하게 기존 세션만 확인
        forceLog('기존 세션 확인 중...');
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          forceLog(`세션 에러: ${error.message}`);
          setStatus('error');
          setErrorMessage(error.message);
          return;
        }

        if (data.session?.user) {
          forceLog(`사용자 발견: ${data.session.user.email}`);
          await processUser(data.session.user);
        } else {
          forceLog('세션에서 사용자 없음');
          setStatus('error');
          setErrorMessage('인증 정보를 찾을 수 없습니다.');

          setTimeout(() => {
            forceLog('로그인 페이지로 리디렉트');
            router.push('/auth/login');
          }, 3000);
        }
      } catch (error) {
        forceLog(`전체 처리 에러: ${error}`);
        setStatus('error');
        setErrorMessage('로그인 처리 중 오류가 발생했습니다.');
      }
    };

    // 즉시 실행
    forceLog('handleAuthCallback 함수 호출');
    handleAuthCallback();
  }, []);

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

      {/* 디버그 로그 표시 */}
      <Box sx={{ mt: 4, maxWidth: '80%', maxHeight: 300, overflow: 'auto' }}>
        <Typography variant='h6' gutterBottom>
          디버그 로그:
        </Typography>
        {debugLogs.map((log, index) => (
          <Typography
            key={index}
            variant='caption'
            sx={{ display: 'block', mb: 0.5 }}
          >
            {log}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
