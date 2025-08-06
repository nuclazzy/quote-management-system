'use client';

import { Box, Typography, Button, Container } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
// import PDFTestComponent from '@/components/quotes/PDFTestComponent';

export default function PDFTestPage() {
  const router = useRouter();

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.back()}
          sx={{ mb: 2 }}
        >
          돌아가기
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom>
          PDF 한글 폰트 테스트
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          PDF 생성 기능이 일시적으로 비활성화되었습니다. jspdf 패키지 설치 후 다시 활성화됩니다.
        </Typography>
      </Box>

      {/* <PDFTestComponent /> */}
    </Container>
  );
}