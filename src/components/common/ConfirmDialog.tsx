'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'warning' | 'error' | 'info';
  loading?: boolean;
}

const variantConfig = {
  warning: {
    icon: <WarningIcon />,
    color: '#ed6c02',
  },
  error: {
    icon: <ErrorIcon />,
    color: '#d32f2f',
  },
  info: {
    icon: <InfoIcon />,
    color: '#0288d1',
  },
};

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'warning',
  loading = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
      aria-labelledby='confirm-dialog-title'
    >
      <DialogTitle id='confirm-dialog-title'>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ color: config.color }}>{config.icon}</Box>
          {title}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant='body1'>{message}</Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant='contained'
          color={variant === 'error' ? 'error' : 'primary'}
          disabled={loading}
          autoFocus
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
