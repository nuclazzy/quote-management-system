'use client'

import {
  Paper,
  Typography,
  Box,
  Grid,
  Divider,
  Chip,
} from '@mui/material'
import { QuoteCalculation, QuoteFormData } from '@/types'

interface QuoteCalculationSummaryProps {
  calculation: QuoteCalculation
  formData: QuoteFormData
}

export default function QuoteCalculationSummary({ 
  calculation, 
  formData 
}: QuoteCalculationSummaryProps) {
  const formatCurrency = (amount: number) => {
    return `₩${amount.toLocaleString()}`
  }

  const getSummaryItems = () => {
    const items = [
      {
        label: '소계',
        value: calculation.subtotal,
        description: '모든 세부내용의 합계'
      },
    ]

    if (calculation.agencyFee > 0) {
      items.push({
        label: `대행수수료 (${formData.agency_fee_rate}%)`,
        value: calculation.agencyFee,
        description: `수수료 적용 대상: ${formatCurrency(calculation.feeApplicableAmount)}`
      })
    }

    if (formData.discount_amount > 0) {
      items.push({
        label: '할인',
        value: -formData.discount_amount,
        description: '직접 할인 금액'
      })
    }

    items.push({
      label: formData.vat_type === 'exclusive' ? 'VAT 별도 소계' : '소계',
      value: calculation.totalBeforeVat,
      description: formData.vat_type === 'exclusive' ? 'VAT 제외 금액' : 'VAT 포함 금액'
    })

    if (formData.vat_type === 'exclusive' && calculation.vatAmount > 0) {
      items.push({
        label: 'VAT (10%)',
        value: calculation.vatAmount,
        description: 'VAT 별도 처리'
      })
    }

    return items
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        견적 요약
      </Typography>

      <Grid container spacing={3}>
        {/* 계산 세부사항 */}
        <Grid item xs={12} md={8}>
          <Box>
            {getSummaryItems().map((item, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">
                    {item.label}
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: item.label.includes('소계') || item.label.includes('VAT') ? 'bold' : 'normal',
                      color: item.value < 0 ? 'error.main' : 'inherit'
                    }}
                  >
                    {formatCurrency(Math.abs(item.value))}
                  </Typography>
                </Box>
                <Typography variant="caption" color="textSecondary">
                  {item.description}
                </Typography>
              </Box>
            ))}
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                최종 금액
              </Typography>
              <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(calculation.finalTotal)}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* 수익성 분석 */}
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
            <Typography variant="subtitle1" gutterBottom>
              수익성 분석
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">매출액</Typography>
                <Typography variant="body2">{formatCurrency(calculation.finalTotal)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">원가</Typography>
                <Typography variant="body2">{formatCurrency(calculation.totalCostPrice)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>수익</Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 'bold',
                    color: calculation.profitAmount >= 0 ? 'success.main' : 'error.main'
                  }}
                >
                  {formatCurrency(calculation.profitAmount)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">수익률</Typography>
                <Chip
                  label={`${calculation.profitMargin.toFixed(1)}%`}
                  color={calculation.profitMargin >= 20 ? 'success' : calculation.profitMargin >= 10 ? 'warning' : 'error'}
                  size="small"
                />
              </Box>
            </Box>

            <Typography variant="caption" color="textSecondary">
              * 수익률 기준: 20% 이상 양호, 10% 이상 보통, 10% 미만 주의
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 추가 정보 */}
      <Box sx={{ mt: 3, p: 2, backgroundColor: 'primary.50', borderRadius: 1 }}>
        <Typography variant="body2" color="primary.main">
          📋 견적서 정보: {formData.project_title} | 고객: {formData.customer_name_snapshot} | 
          발행일: {formData.issue_date} | VAT: {formData.vat_type === 'exclusive' ? '별도' : '포함'}
        </Typography>
      </Box>
    </Paper>
  )
}