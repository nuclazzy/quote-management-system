'use client';

import { useEffect } from 'react';
import { Button, Container, Typography, Alert, Box } from '@mui/material';
import { ModernBackground } from '@/components/layout/ModernBackground';

export default function QuoteNewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 에러 로깅
    console.error('견적서 페이지 에러:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <ModernBackground>
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            견적서 페이지 로드 중 오류가 발생했습니다
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
              에러 메시지: {error.message}
            </Typography>
            {error.digest && (
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem', mt: 1 }}>
                에러 ID: {error.digest}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
            <Button 
              variant="contained" 
              onClick={reset}
            >
              다시 시도
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => window.location.href = '/quotes'}
            >
              견적서 목록으로
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => window.location.reload()}
            >
              페이지 새로고침
            </Button>
          </Box>
        </Alert>
        
        <Alert severity="info" sx={{ mt: 4 }}>
          <Typography variant="body2">
            개발자 정보: 브라우저 콘솔(F12)에서 상세한 에러 정보를 확인할 수 있습니다.
          </Typography>
        </Alert>
      </Container>
    </ModernBackground>
  );
}