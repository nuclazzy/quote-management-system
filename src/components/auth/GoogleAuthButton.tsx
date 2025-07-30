'use client';

import { useState } from 'react';
import { Button, Typography, Box } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

interface GoogleAuthButtonProps {
  variant?: 'contained' | 'outlined' | 'text';
  fullWidth?: boolean;
}

export default function GoogleAuthButton({
  variant = 'contained',
  fullWidth = true,
}: GoogleAuthButtonProps) {
  const { signIn, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setError(null);
      await signIn();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.'
      );
    }
  };

  return (
    <Box>
      <Button
        variant={variant}
        fullWidth={fullWidth}
        onClick={handleSignIn}
        disabled={loading}
        startIcon={<GoogleIcon />}
        sx={{
          py: 1.5,
          textTransform: 'none',
          fontSize: '16px',
          fontWeight: 500,
        }}
      >
        {loading ? '로그인 중...' : 'Google로 로그인'}
      </Button>

      {error && (
        <Typography
          color='error'
          variant='body2'
          sx={{ mt: 1, textAlign: 'center' }}
        >
          {error}
        </Typography>
      )}

      <Typography
        variant='caption'
        color='textSecondary'
        sx={{ mt: 2, display: 'block', textAlign: 'center' }}
      >
        @motionsense.co.kr 계정만 접근 가능합니다
      </Typography>
    </Box>
  );
}
