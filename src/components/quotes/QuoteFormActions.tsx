'use client';

import React, { memo } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Stack,
} from '@mui/material';
import {
  Save as SaveIcon,
  Send as SendIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

interface QuoteFormActionsProps {
  saving: boolean;
  onCancel: () => void;
  onSave: (status: 'draft') => void;
  onSaveAndSend: (status: 'sent') => void;
  disabled?: boolean;
  isEdit?: boolean;
}

const QuoteFormActions = memo(function QuoteFormActions({
  saving,
  onCancel,
  onSave,
  onSaveAndSend,
  disabled = false,
  isEdit = false,
}: QuoteFormActionsProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSaveDraft = () => onSave('draft');
  const handleSaveAndSend = () => onSaveAndSend('sent');

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mt: 4,
        gap: 2,
        flexDirection: { xs: 'column', sm: 'row' },
        position: 'sticky',
        bottom: 0,
        backgroundColor: 'background.default',
        py: 2,
        zIndex: 1,
      }}
    >
      <Button
        variant='outlined'
        startIcon={<CancelIcon />}
        onClick={onCancel}
        disabled={saving || disabled}
        size={isMobile ? 'large' : 'medium'}
        sx={{
          minWidth: { xs: '100%', sm: 120 },
          minHeight: 44, // 터치 타겟 크기 개선
          fontWeight: 500,
          borderRadius: 2,
          color: 'text.secondary',
          borderColor: 'grey.300',
          '&:hover': {
            borderColor: 'grey.400',
            backgroundColor: 'grey.50',
          },
          '&:disabled': {
            opacity: 0.6,
          },
        }}
        aria-label='견적서 작성 취소'
      >
        취소
      </Button>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ width: { xs: '100%', sm: 'auto' } }}
      >
        <Button
          variant='outlined'
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          onClick={handleSaveDraft}
          disabled={saving || disabled}
          size={isMobile ? 'large' : 'medium'}
          sx={{
            minWidth: { xs: '100%', sm: 140 },
            minHeight: 44,
            fontWeight: 500,
            borderRadius: 2,
            borderColor: 'primary.main',
            color: 'primary.main',
            '&:hover': {
              backgroundColor: 'primary.50',
              borderColor: 'primary.dark',
            },
            '&:disabled': {
              opacity: 0.6,
            },
          }}
          aria-label={saving ? '임시저장 중' : '견적서 임시저장'}
        >
          {saving ? '저장 중...' : '임시저장'}
        </Button>

        <Button
          variant='contained'
          startIcon={
            saving ? (
              <CircularProgress size={16} color='inherit' />
            ) : (
              <SendIcon />
            )
          }
          onClick={handleSaveAndSend}
          disabled={saving || disabled}
          size={isMobile ? 'large' : 'medium'}
          sx={{
            minWidth: { xs: '100%', sm: 160 },
            minHeight: 44,
            fontWeight: 600,
            borderRadius: 2,
            boxShadow: 2,
            '&:hover': {
              boxShadow: 4,
              transform: 'translateY(-1px)',
            },
            '&:disabled': {
              opacity: 0.6,
              transform: 'none',
              boxShadow: 1,
            },
            transition: 'all 0.2s ease-in-out',
          }}
          aria-label={saving ? '저장 및 발송 중' : '견적서 저장 후 발송'}
        >
          {saving ? '발송 중...' : `${isEdit ? '수정' : '저장'} 후 발송`}
        </Button>
      </Stack>
    </Box>
  );
});

export default QuoteFormActions;
