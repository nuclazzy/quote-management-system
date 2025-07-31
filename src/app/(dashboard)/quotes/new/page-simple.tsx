'use client';

import { Container, Typography, Button, Box } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function SimpleQuotePage() {
  const router = useRouter();

  return (
    <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        간단한 견적서 페이지 테스트
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        이 페이지가 정상적으로 표시되면 기본 컴포넌트들은 정상입니다.
      </Typography>
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