'use client';

import { useRouter } from 'next/navigation';
import { Box, Typography, Button } from '@mui/material';

// 모든 복잡한 로직 제거한 직접 대시보드 페이지
export default function DirectPage() {
  console.log('🎯 DIRECT PAGE: 직접 로딩 - 복잡한 로직 없음');
  const router = useRouter();

  return (
    <Box sx={{ 
      p: 4, 
      textAlign: 'center',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <Typography variant="h2" gutterBottom>
        🎉 견적서 관리 시스템
      </Typography>
      
      <Typography variant="h6" color="text.secondary" paragraph>
        직접 접근 성공!
      </Typography>

      <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button 
          variant="contained" 
          size="large"
          onClick={() => router.push('/dashboard')}
        >
          원래 대시보드로
        </Button>

        <Button 
          variant="outlined" 
          size="large"
          onClick={() => router.push('/simple')}
        >
          단순 페이지로
        </Button>

        <Button 
          variant="outlined" 
          color="success"
          onClick={() => alert('작동합니다!')}
        >
          테스트
        </Button>
      </Box>

      <Typography variant="caption" sx={{ mt: 3 }}>
        현재 시간: {new Date().toLocaleString()}
      </Typography>
    </Box>
  );
}