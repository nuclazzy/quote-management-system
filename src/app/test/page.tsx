'use client';

import { Box, Typography } from '@mui/material';

// 가장 단순한 테스트 페이지 - 어떤 Context나 로딩도 없음
export default function TestPage() {
  console.log('🧪 TEST PAGE: 가장 단순한 페이지 로드됨');

  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h1" gutterBottom>
        ✅ 테스트 성공!
      </Typography>
      
      <Typography variant="h5" color="success.main" paragraph>
        이 페이지가 보인다면 Next.js는 정상 작동 중입니다.
      </Typography>
      
      <Typography variant="body1" sx={{ mt: 3 }}>
        현재 시간: {new Date().toLocaleString()}
      </Typography>
      
      <Box sx={{ mt: 4, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
        <Typography variant="body2">
          이 페이지는 어떤 Context, 인증, API 호출도 하지 않는 순수 React 컴포넌트입니다.
        </Typography>
      </Box>
    </Box>
  );
}
