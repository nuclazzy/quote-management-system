'use client';

import { Alert, Button, Box } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  severity?: 'error' | 'warning' | 'info';
}

export function ErrorAlert({
  message,
  onRetry,
  onDismiss,
  severity = 'error',
}: ErrorAlertProps) {
  return (
    <Alert
      severity={severity}
      onClose={onDismiss}
      sx={{ mb: 2 }}
      action={
        onRetry && (
          <Button
            size='small'
            startIcon={<RefreshIcon />}
            onClick={onRetry}
            color='inherit'
          >
            다시 시도
          </Button>
        )
      }
    >
      {message}
    </Alert>
  );
}

export default ErrorAlert;
