'use client';

import { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, Skeleton } from '@mui/material';

interface LoadingStateProps {
  type?: 'spinner' | 'skeleton';
  message?: string;
  height?: number | string;
  rows?: number;
}

export function LoadingState({
  type = 'spinner',
  message = '로딩 중...',
  height = 200,
  rows = 3,
}: LoadingStateProps) {
  const [hydrated, setHydrated] = useState(false);
  
  useEffect(() => {
    setHydrated(true);
  }, []);
  if (type === 'skeleton') {
    return (
      <Box sx={{ width: '100%' }}>
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton
            key={index}
            variant='rectangular'
            height={60}
            sx={{ mb: 1, borderRadius: 1 }}
          />
        ))}
      </Box>
    );
  }

  return (
    <Box
      display='flex'
      flexDirection='column'
      justifyContent='center'
      alignItems='center'
      height={height}
      gap={2}
    >
      <CircularProgress />
      {message && (
        <Typography variant='body2' color='textSecondary'>
          {message}
        </Typography>
      )}
      {/* 개발모드 디버깅 */}
      {process.env.NODE_ENV === 'development' && (
        <Typography 
          variant='caption' 
          color='text.secondary' 
          sx={{ mt: 1 }} 
          suppressHydrationWarning
        >
          {hydrated ? '로딩 완료' : '초기화중'}
        </Typography>
      )}
    </Box>
  );
}

export default LoadingState;
