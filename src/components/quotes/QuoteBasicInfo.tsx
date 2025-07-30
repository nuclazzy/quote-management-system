'use client';

import React, { memo } from 'react';
import {
  Paper,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import { Customer } from '@/types';

interface QuoteBasicInfoProps {
  formData: {
    project_title: string;
    customer_id?: string;
    customer_name_snapshot: string;
    issue_date: string;
    status: string;
    vat_type: string;
    agency_fee_rate: number;
    discount_amount: number;
    notes?: string;
  };
  customers: Customer[];
  errors: Record<string, string>;
  onUpdate: (data: Partial<QuoteBasicInfoProps['formData']>) => void;
  onCustomerChange: (customerId: string) => void;
}

const QuoteBasicInfo = memo(function QuoteBasicInfo({
  formData,
  customers,
  errors,
  onUpdate,
  onCustomerChange,
}: QuoteBasicInfoProps) {
  return (
    <Paper sx={{ p: 3, mb: 3 }} elevation={1}>
      <Typography
        variant='h6'
        gutterBottom
        component='h2'
        sx={{
          mb: 3,
          fontWeight: 600,
          color: 'text.primary',
        }}
      >
        기본 정보
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label='프로젝트명'
            value={formData.project_title}
            onChange={(e) => onUpdate({ project_title: e.target.value })}
            error={!!errors.project_title}
            helperText={errors.project_title}
            required
            inputProps={{
              'aria-label': '프로젝트명 입력',
              'aria-describedby': errors.project_title
                ? 'project-title-error'
                : undefined,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
              },
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl
            fullWidth
            required
            error={!!errors.customer_name_snapshot}
          >
            <InputLabel id='customer-select-label'>고객사</InputLabel>
            <Select
              labelId='customer-select-label'
              value={formData.customer_id || ''}
              onChange={(e) => onCustomerChange(e.target.value)}
              label='고객사'
              inputProps={{
                'aria-label': '고객사 선택',
                'aria-describedby': errors.customer_name_snapshot
                  ? 'customer-error'
                  : undefined,
              }}
            >
              <MenuItem value=''>
                <em>직접 입력</em>
              </MenuItem>
              {customers.map((customer) => (
                <MenuItem key={customer.id} value={customer.id}>
                  {customer.name}
                </MenuItem>
              ))}
            </Select>
            {errors.customer_name_snapshot && (
              <FormHelperText id='customer-error'>
                {errors.customer_name_snapshot}
              </FormHelperText>
            )}
          </FormControl>
        </Grid>

        {!formData.customer_id && (
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label='고객사명 (직접 입력)'
              value={formData.customer_name_snapshot}
              onChange={(e) =>
                onUpdate({ customer_name_snapshot: e.target.value })
              }
              error={!!errors.customer_name_snapshot}
              helperText={errors.customer_name_snapshot}
              required
              inputProps={{
                'aria-label': '고객사명 직접 입력',
                'aria-describedby': errors.customer_name_snapshot
                  ? 'customer-name-error'
                  : undefined,
              }}
            />
          </Grid>
        )}

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label='발행일'
            type='date'
            value={formData.issue_date}
            onChange={(e) => onUpdate({ issue_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            required
            inputProps={{
              'aria-label': '견적서 발행일 선택',
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel id='status-select-label'>상태</InputLabel>
            <Select
              labelId='status-select-label'
              value={formData.status}
              onChange={(e) => onUpdate({ status: e.target.value })}
              label='상태'
              inputProps={{
                'aria-label': '견적서 상태 선택',
              }}
            >
              <MenuItem value='draft'>임시저장</MenuItem>
              <MenuItem value='sent'>발송됨</MenuItem>
              <MenuItem value='accepted'>수주확정</MenuItem>
              <MenuItem value='revised'>수정요청</MenuItem>
              <MenuItem value='canceled'>취소됨</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel id='vat-type-select-label'>VAT 처리</InputLabel>
            <Select
              labelId='vat-type-select-label'
              value={formData.vat_type}
              onChange={(e) => onUpdate({ vat_type: e.target.value })}
              label='VAT 처리'
              inputProps={{
                'aria-label': 'VAT 처리 방식 선택',
              }}
            >
              <MenuItem value='exclusive'>VAT 별도</MenuItem>
              <MenuItem value='inclusive'>VAT 포함</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label='대행수수료율 (%)'
            type='number'
            value={formData.agency_fee_rate}
            onChange={(e) =>
              onUpdate({ agency_fee_rate: parseFloat(e.target.value) || 0 })
            }
            inputProps={{
              min: 0,
              max: 100,
              step: 0.1,
              'aria-label': '대행수수료율 입력 (0-100%)',
            }}
            helperText='0-100% 범위로 입력해주세요'
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label='할인 금액'
            type='number'
            value={formData.discount_amount}
            onChange={(e) =>
              onUpdate({ discount_amount: parseFloat(e.target.value) || 0 })
            }
            inputProps={{
              min: 0,
              step: 1000,
              'aria-label': '할인 금액 입력',
            }}
            helperText='1,000원 단위로 입력해주세요'
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label='비고'
            multiline
            rows={3}
            value={formData.notes || ''}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            inputProps={{
              'aria-label': '비고 입력',
              maxLength: 1000,
            }}
            helperText={`${(formData.notes || '').length}/1000자`}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
              },
            }}
          />
        </Grid>
      </Grid>
    </Paper>
  );
});

export default QuoteBasicInfo;
