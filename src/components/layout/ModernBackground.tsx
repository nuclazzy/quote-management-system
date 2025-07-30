'use client';

import { Box } from '@mui/material';

export function ModernBackground({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        position: 'relative',
      }}
    >
      {children}
    </Box>
  );
}
