'use client';

import { Container, Typography, Button, Box, TextField } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useMotionsenseQuoteSimple } from '@/hooks/useMotionsenseQuote-simple';

export default function QuotePageWithHook() {
  const router = useRouter();
  
  console.log('QuotePageWithHook 컴포넌트 렌더링 시작');
  
  // 간단한 훅 테스트
  const quoteHook = useMotionsenseQuoteSimple();
  
  console.log('퀀트훅 결과:', quoteHook);
  
  const { formData, updateFormData } = quoteHook;

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Typography variant="h4" gutterBottom>
        훅 테스트 견적서 페이지
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        이 페이지가 정상 표시되면 간단한 훅은 작동합니다.
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <TextField
          label="프로젝트명"
          value={formData?.project_title || ''}
          onChange={(e) => updateFormData({ project_title: e.target.value })}
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