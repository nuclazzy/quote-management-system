'use client'

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
  IconButton
} from '@mui/material'
import {
  Close as CloseIcon,
  Print as PrintIcon,
  GetApp as DownloadIcon,
  Send as SendIcon
} from '@mui/icons-material'
import { formatCurrency, formatDate } from '@/utils/format'
import QuoteStatusChip from './QuoteStatusChip'

interface QuoteData {
  id: string
  project_title: string
  customer_name_snapshot: string
  issue_date: string
  status: 'draft' | 'sent' | 'accepted' | 'revised' | 'canceled'
  vat_type: 'inclusive' | 'exclusive'
  agency_fee_rate: number
  discount_amount: number
  notes?: string
  groups: Array<{
    title: string
    items: Array<{
      title: string
      description?: string
      quantity: number
      unit_price: number
      total_price: number
    }>
  }>
  subtotal: number
  agency_fee: number
  total_before_vat: number
  vat_amount: number
  total_amount: number
}

interface QuotePreviewModalProps {
  open: boolean
  onClose: () => void
  quote: QuoteData | null
  onPrint?: () => void
  onDownload?: () => void
  onSend?: () => void
}

export default function QuotePreviewModal({
  open,
  onClose,
  quote,
  onPrint,
  onDownload,
  onSend
}: QuotePreviewModalProps) {
  if (!quote) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">견적서 미리보기</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ p: 2 }}>
          {/* 헤더 */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              견 적 서
            </Typography>
            <Typography variant="h6" color="textSecondary">
              Motion Sense
            </Typography>
          </Box>

          {/* 기본 정보 */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  프로젝트 정보
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>프로젝트명:</strong> {quote.project_title}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>고객사:</strong> {quote.customer_name_snapshot}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>발행일:</strong> {formatDate(quote.issue_date)}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <QuoteStatusChip status={quote.status} />
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  견적 정보
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>VAT 처리:</strong> {quote.vat_type === 'inclusive' ? 'VAT 포함' : 'VAT 별도'}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>대행수수료율:</strong> {quote.agency_fee_rate}%
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>할인금액:</strong> {formatCurrency(quote.discount_amount)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* 견적 내역 */}
          <Typography variant="h6" gutterBottom fontWeight="bold">
            견적 내역
          </Typography>
          
          {quote.groups.map((group, groupIndex) => (
            <Box key={groupIndex} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary">
                {group.title}
              </Typography>
              
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>항목명</TableCell>
                      <TableCell>설명</TableCell>
                      <TableCell align="center">수량</TableCell>
                      <TableCell align="right">단가</TableCell>
                      <TableCell align="right">금액</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.items.map((item, itemIndex) => (
                      <TableRow key={itemIndex}>
                        <TableCell>{item.title}</TableCell>
                        <TableCell>{item.description || '-'}</TableCell>
                        <TableCell align="center">{item.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(item.total_price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ))}

          {/* 견적 요약 */}
          <Box sx={{ mt: 4 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom fontWeight="bold">
              견적 요약
            </Typography>
            
            <Box sx={{ maxWidth: 400, ml: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>소계</Typography>
                <Typography>{formatCurrency(quote.subtotal)}</Typography>
              </Box>
              
              {quote.agency_fee > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>대행수수료 ({quote.agency_fee_rate}%)</Typography>
                  <Typography>{formatCurrency(quote.agency_fee)}</Typography>
                </Box>
              )}
              
              {quote.discount_amount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="error">할인</Typography>
                  <Typography color="error">-{formatCurrency(quote.discount_amount)}</Typography>
                </Box>
              )}
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>VAT 전 금액</Typography>
                <Typography>{formatCurrency(quote.total_before_vat)}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>VAT (10%)</Typography>
                <Typography>{formatCurrency(quote.vat_amount)}</Typography>
              </Box>
              
              <Divider sx={{ my: 1 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6" fontWeight="bold">총 금액</Typography>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  {formatCurrency(quote.total_amount)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* 비고 */}
          {quote.notes && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                비고
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                  {quote.notes}
                </Typography>
              </Paper>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          닫기
        </Button>
        
        {onPrint && (
          <Button startIcon={<PrintIcon />} onClick={onPrint}>
            인쇄
          </Button>
        )}
        
        {onDownload && (
          <Button startIcon={<DownloadIcon />} onClick={onDownload}>
            다운로드
          </Button>
        )}
        
        {onSend && quote.status === 'draft' && (
          <Button 
            variant="contained" 
            startIcon={<SendIcon />} 
            onClick={onSend}
          >
            발송
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}