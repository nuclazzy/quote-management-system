'use client'

import { Chip, ChipProps } from '@mui/material'
import { statusColors } from '@/theme/colors'

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'revised' | 'canceled'

interface QuoteStatusChipProps extends Omit<ChipProps, 'color'> {
  status: QuoteStatus
}

const statusConfig = {
  draft: {
    label: '임시저장',
    color: statusColors.draft,
    bgcolor: '#f5f5f5',
  },
  sent: {
    label: '발송됨',
    color: statusColors.sent,
    bgcolor: '#e3f2fd',
  },
  accepted: {
    label: '수주확정',
    color: statusColors.accepted,
    bgcolor: '#e8f5e8',
  },
  revised: {
    label: '수정요청',
    color: statusColors.revised,
    bgcolor: '#fff8e1',
  },
  canceled: {
    label: '취소됨',
    color: statusColors.canceled,
    bgcolor: '#ffebee',
  },
}

export function QuoteStatusChip({ status, ...props }: QuoteStatusChipProps) {
  const config = statusConfig[status]

  return (
    <Chip
      label={config.label}
      size="small"
      sx={{
        backgroundColor: config.bgcolor,
        color: config.color,
        fontWeight: 500,
        borderRadius: '6px',
        ...props.sx,
      }}
      {...props}
    />
  )
}

export default QuoteStatusChip