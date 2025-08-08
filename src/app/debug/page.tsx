'use client';

import { useEffect, useState } from 'react';
import { Box, Paper, Typography, Button, Alert } from '@mui/material';
import { createClient } from '@/lib/supabase/client';

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      
      try {
        // 1. 세션 확인
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // 2. 쿠키 확인
        const cookies = document.cookie;
        
        // 3. localStorage 확인
        const localStorageKeys = Object.keys(localStorage);
        const authStorage = localStorage.getItem('motionsense-auth');
        const supabaseStorage = localStorage.getItem('supabase.auth.token');
        
        // 4. 현재 URL 정보
        const urlInfo = {
          href: window.location.href,
          hostname: window.location.hostname,
          protocol: window.location.protocol,
          port: window.location.port,
        };
        
        // 5. 환경 변수
        const envInfo = {
          NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        };

        setDebugInfo({
          session: session ? {
            user: session.user.email,
            expires: session.expires_at,
            provider: session.user.app_metadata?.provider,
          } : null,
          sessionError: sessionError?.message,
          cookies: cookies || 'No cookies',
          localStorage: {
            keys: localStorageKeys,
            authStorage: authStorage ? JSON.parse(authStorage) : null,
            supabaseStorage: supabaseStorage ? 'Found' : 'Not found',
          },
          url: urlInfo,
          env: envInfo,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        setDebugInfo({
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleClearStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    window.location.reload();
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        인증 디버그 페이지
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        도메인: {typeof window !== 'undefined' ? window.location.hostname : 'Loading...'}
      </Alert>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          세션 정보
        </Typography>
        <pre style={{ overflow: 'auto', fontSize: '12px' }}>
          {JSON.stringify(debugInfo.session, null, 2)}
        </pre>
        {debugInfo.sessionError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            세션 에러: {debugInfo.sessionError}
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          쿠키 정보
        </Typography>
        <pre style={{ overflow: 'auto', fontSize: '12px' }}>
          {debugInfo.cookies}
        </pre>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          LocalStorage 정보
        </Typography>
        <pre style={{ overflow: 'auto', fontSize: '12px' }}>
          {JSON.stringify(debugInfo.localStorage, null, 2)}
        </pre>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          URL 정보
        </Typography>
        <pre style={{ overflow: 'auto', fontSize: '12px' }}>
          {JSON.stringify(debugInfo.url, null, 2)}
        </pre>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          환경 변수
        </Typography>
        <pre style={{ overflow: 'auto', fontSize: '12px' }}>
          {JSON.stringify(debugInfo.env, null, 2)}
        </pre>
      </Paper>

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button 
          variant="contained" 
          color="error" 
          onClick={handleClearStorage}
        >
          모든 저장소 초기화
        </Button>
        <Button 
          variant="contained" 
          onClick={() => window.location.href = '/auth/login'}
        >
          로그인 페이지로
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => window.location.reload()}
        >
          새로고침
        </Button>
      </Box>
    </Box>
  );
}