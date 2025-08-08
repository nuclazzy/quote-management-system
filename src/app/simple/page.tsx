'use client';

import { Box, Typography, Button, Card, CardContent } from '@mui/material';

// 모든 인증 및 복잡한 로직을 완전히 우회한 단순 대시보드
export default function SimplePage() {
  console.log('🔥 SIMPLE PAGE: 로드됨 - 인증 없음');

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h3" gutterBottom>
        🎉 단순 대시보드
      </Typography>
      
      <Card sx={{ mb: 3, bgcolor: 'success.light', color: 'success.contrastText' }}>
        <CardContent>
          <Typography variant="h6">
            ✅ 성공! 인증 없이 페이지에 접근했습니다!
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            이 페이지는 복잡한 Context나 인증 로직 없이 작동합니다.
          </Typography>
        </CardContent>
      </Card>

      <Typography variant="body1" sx={{ mb: 3 }}>
        현재 시간: {new Date().toLocaleString()}
      </Typography>

      <Button 
        variant="contained" 
        onClick={() => alert('버튼 클릭됨!')}
        sx={{ mr: 2 }}
      >
        테스트 버튼
      </Button>

      <Button 
        variant="outlined" 
        onClick={() => window.location.href = '/dashboard'}
      >
        원래 대시보드로 시도
      </Button>
    </Box>
  );
}