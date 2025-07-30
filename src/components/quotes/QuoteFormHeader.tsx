'use client';

import React, { memo } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Chip,
  useMediaQuery,
  useTheme,
  Stack,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';

interface QuoteFormHeaderProps {
  isEdit: boolean;
  showCostPrice: boolean;
  onToggleCostPrice: (show: boolean) => void;
  isDirty?: boolean;
}

const QuoteFormHeader = memo(function QuoteFormHeader({
  isEdit,
  showCostPrice,
  onToggleCostPrice,
  isDirty = false,
}: QuoteFormHeaderProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        mb: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
      }}
    >
      <Box>
        <Stack direction='row' alignItems='center' spacing={2}>
          <Typography
            variant={isMobile ? 'h5' : 'h4'}
            component='h1'
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              mb: { xs: 1, sm: 0 },
            }}
          >
            {isEdit ? '견적서 수정' : '견적서 작성'}
          </Typography>

          {isDirty && (
            <Chip
              label='변경됨'
              size='small'
              color='warning'
              variant='outlined'
              sx={{
                fontSize: '0.75rem',
                height: 24,
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
            />
          )}
        </Stack>

        <Typography
          variant='body2'
          color='text.secondary'
          sx={{
            mt: 0.5,
            display: { xs: 'block', sm: 'none' }, // 모바일에서만 표시
          }}
        >
          견적서 정보를 입력하고 저장하세요
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FormControlLabel
          control={
            <Switch
              checked={showCostPrice}
              onChange={(e) => onToggleCostPrice(e.target.checked)}
              color='primary'
              inputProps={{
                'aria-label': '내부 원가 표시 토글',
              }}
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {showCostPrice ? (
                <VisibilityIcon sx={{ fontSize: 18 }} />
              ) : (
                <VisibilityOffIcon sx={{ fontSize: 18 }} />
              )}
              <Typography
                variant='body2'
                sx={{
                  fontWeight: 500,
                  color: showCostPrice ? 'primary.main' : 'text.secondary',
                }}
              >
                내부 원가 표시
              </Typography>
            </Box>
          }
          sx={{
            m: 0,
            '& .MuiFormControlLabel-label': {
              fontSize: { xs: '0.875rem', sm: '1rem' },
            },
            '& .MuiSwitch-root': {
              mr: 1,
            },
          }}
        />
      </Box>
    </Box>
  );
});

export default QuoteFormHeader;
