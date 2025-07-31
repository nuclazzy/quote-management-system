'use client';

import { Container, Typography, Button, Box, TextField } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useMotionsenseQuoteSafe } from '@/hooks/useMotionsenseQuote-safe';

export default function MinimalQuotePage() {
  const router = useRouter();
  
  console.log('MinimalQuotePage 컴포넌트 렌더링 시작');
  
  // 안전한 훅 사용
  const { formData, updateFormData, addGroup } = useMotionsenseQuoteSafe();
  
  console.log('안전한 훅 결과:', { formData, updateFormData, addGroup });

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Typography variant="h4" gutterBottom>
        안전한 견적서 페이지
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        완전히 안전한 훅을 사용한 테스트 (React Error #130 방지)
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