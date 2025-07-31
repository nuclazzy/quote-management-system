'use client';

import { Container, Typography, Button, Box, TextField } from '@mui/material';
import { useRouter } from 'next/navigation';
// import { useMotionsenseQuote } from '@/hooks/useMotionsenseQuote';

export default function MinimalQuotePage() {
  const router = useRouter();
  
  console.log('MinimalQuotePage 컴포넌트 렌더링 시작');
  
  // 임시로 훅 없이 테스트
  const formData = { project_title: '' };
  const updateFormData = (updates: any) => {
    console.log('업데이트:', updates);
  };
  
  console.log('formData:', formData);

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Typography variant="h4" gutterBottom>
        최소 기능 견적서 페이지
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        원본 훅을 사용한 최소 기능 테스트
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <TextField
          label="프로젝트명"
          value={formData?.project_title || ''}
          onChange={(e) => {
            if (updateFormData) {
              updateFormData({ project_title: e.target.value });
            }
          }}
          fullWidth
          sx={{ mb: 2 }}
        />
        <Typography variant="body2">
          현재 프로젝트명: {formData?.project_title || '없음'}
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button 
          variant="contained" 
          onClick={() => router.push('/quotes')}
        >
          견적서 목록으로
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => window.location.reload()}
        >
          새로고침
        </Button>
      </Box>
    </Container>
  );
}