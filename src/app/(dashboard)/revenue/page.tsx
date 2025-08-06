'use client';

import { Box, Typography, Container } from '@mui/material';

export default function RevenuePage() {
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          매출 관리
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          매출 관리 페이지가 임시적으로 단순화되었습니다. 
          빌드 완료 후 원본 기능을 복원할 예정입니다.
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          기능:
          - 매출 현황 대시보드
          - 예정된 정산 관리
          - 연도별 매출 통계
          - 칸반 보드 뷰
        </Typography>
      </Box>
    </Container>
  );
}