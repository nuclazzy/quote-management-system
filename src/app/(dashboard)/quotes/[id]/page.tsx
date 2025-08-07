'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
} from '@mui/material';
import {
  Edit as EditIcon,
  FileCopy as CopyIcon,
  Download as DownloadIcon,
  Send as SendIcon,
  ArrowBack as BackIcon,
  Transform as TransformIcon,
  Close as CloseIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { QuoteService } from '@/lib/services/quote-service';
import { QuoteWithDetails } from '@/types';
import QuotePDFView from '@/components/quotes/QuotePDFView';
import ProjectConversionWizard from '@/components/quotes/ProjectConversionWizard';
import { Quote4TierData } from '@/types/quote-4tier';

interface QuoteDetailPageProps {
  params: {
    id: string;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft':
      return 'default';
    case 'accepted':
      return 'success';
    case 'rejected':
      return 'error';
    case 'converted_to_project':
      return 'primary';
    default:
      return 'default';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'draft':
      return '임시저장';
    case 'accepted':
      return '수주확정';
    case 'rejected':
      return '수주실패';
    case 'converted_to_project':
      return '프로젝트 진행중';
    default:
      return status;
  }
};

// 상태 옵션
const statusOptions = [
  { value: 'draft', label: '임시저장' },
  { value: 'accepted', label: '수주확정' },
  { value: 'rejected', label: '수주실패' },
];

export default function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [convertingToProject, setConvertingToProject] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    const loadQuote = async () => {
      try {
        setLoading(true);
        const quoteData = await QuoteService.getQuoteWithDetails(params.id);
        setQuote(quoteData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '견적서를 불러올 수 없습니다.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadQuote();
    }
  }, [params.id]);

  const handleEdit = () => {
    router.push(`/quotes/${params.id}/edit`);
  };

  const handleCopy = async () => {
    try {
      const newQuoteId = await QuoteService.duplicateQuote(params.id);
      // 복사된 견적서 편집 페이지로 이동
      router.push(`/quotes/${newQuoteId}/edit`);
    } catch (error) {
      console.error('견적서 복사 실패:', error);
      setError('견적서 복사 중 오류가 발생했습니다.');
    }
  };

  const handleDownload = () => {
    setPdfDialogOpen(true);
  };

  const handleClosePdfDialog = () => {
    setPdfDialogOpen(false);
  };

  // Quote4TierData 형식으로 변환
  const convertToQuote4Tier = (quote: QuoteWithDetails): Quote4TierData => {
    return {
      id: quote.id,
      quote_number: quote.quote_number,
      project_title: quote.title,
      customer_name_snapshot: quote.customers?.name || '',
      issue_date: quote.created_at,
      valid_until: quote.valid_until,
      agency_fee_rate: quote.agency_fee_rate || 0.15,
      discount_amount: quote.discount_amount || 0,
      vat_type: quote.vat_type as 'inclusive' | 'exclusive' || 'exclusive',
      show_cost_management: false,
      groups: quote.groups?.map((group, groupIdx) => ({
        name: group.title,
        sort_order: groupIdx,
        include_in_fee: true,
        items: group.quote_items?.map((item, itemIdx) => ({
          name: item.item_name,
          sort_order: itemIdx,
          include_in_fee: true,
          details: item.quote_item_details?.map((detail, detailIdx) => ({
            name: detail.detail_name,
            description: detail.description || '',
            quantity: detail.quantity,
            days: 1,
            unit: '개',
            unit_price: detail.unit_price,
            is_service: false,
            cost_price: 0,
            sort_order: detailIdx,
          })) || []
        })) || []
      })) || [],
      subtotal: totals.subtotal,
      agency_fee: totals.agencyFee,
      vat_amount: totals.vatAmount,
      final_total: totals.finalTotal,
    };
  };

  const handleSend = () => {
    // TODO: 견적서 발송 기능 구현
    console.log('견적서 발송');
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!quote || statusChanging) return;

    try {
      setStatusChanging(true);
      
      const response = await fetch(`/api/quotes/${quote.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '상태 변경에 실패했습니다.');
      }

      // 견적서 상태 업데이트
      setQuote(prev => prev ? { ...prev, status: newStatus } : null);
      setSnackbarMessage(result.message || '견적서 상태가 변경되었습니다.');
      setSnackbarOpen(true);

    } catch (error) {
      console.error('상태 변경 오류:', error);
      setSnackbarMessage(error instanceof Error ? error.message : '상태 변경에 실패했습니다.');
      setSnackbarOpen(true);
    } finally {
      setStatusChanging(false);
    }
  };

  const handleConvertToProject = async () => {
    if (!quote || quote.status !== 'accepted') {
      return;
    }
    setWizardOpen(true);
  };

  const handleWizardConvert = async (data: any) => {
    if (!quote) return;

    try {
      setConvertingToProject(true);
      setError(null);

      // 정산 스케줄 데이터 변환
      const settlement_schedule = data.settlement_schedule.map((item: any) => ({
        description: item.description,
        amount: item.amount,
        due_date: item.due_date.toISOString().split('T')[0]
      }));

      const response = await fetch(
        `/api/quotes/${quote.id}/convert-to-project`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            start_date: data.start_date?.toISOString().split('T')[0],
            end_date: data.end_date?.toISOString().split('T')[0],
            settlement_schedule
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '프로젝트 전환에 실패했습니다.');
      }

      const result = await response.json();
      console.log('프로젝트 전환 성공:', result);

      setSnackbarMessage('프로젝트로 성공적으로 전환되었습니다!');
      setSnackbarOpen(true);

      // 견적서 상태를 converted_to_project로 업데이트
      setQuote(prev => prev ? { ...prev, status: 'converted_to_project' } : null);

      // 성공 시 프로젝트 페이지로 리다이렉트
      setTimeout(() => {
        router.push(`/projects/${result.project.id}`);
      }, 2000);
      
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '프로젝트 전환에 실패했습니다.'
      );
      throw err; // 마법사에서 에러 처리하도록 다시 throw
    } finally {
      setConvertingToProject(false);
    }
  };

  if (loading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        minHeight='400px'
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity='error' sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!quote) {
    return (
      <Alert severity='warning' sx={{ mt: 2 }}>
        견적서를 찾을 수 없습니다.
      </Alert>
    );
  }

  // 총액 계산
  const calculateTotal = () => {
    let subtotal = 0;
    let feeApplicableAmount = 0;

    quote.groups.forEach((group) => {
      group.items.forEach((item) => {
        item.details.forEach((detail) => {
          const detailAmount = detail.is_service
            ? detail.quantity * detail.unit_price
            : detail.quantity * detail.days * detail.unit_price;
          subtotal += detailAmount;

          if (group.include_in_fee && item.include_in_fee) {
            feeApplicableAmount += detailAmount;
          }
        });
      });
    });

    const agencyFee = feeApplicableAmount * (quote.agency_fee_rate / 100);
    const totalBeforeVat = subtotal + agencyFee - quote.discount_amount;
    const vatAmount = quote.vat_type === 'exclusive' ? totalBeforeVat * 0.1 : 0;
    const finalTotal = totalBeforeVat + vatAmount;

    return {
      subtotal,
      agencyFee,
      totalBeforeVat,
      vatAmount,
      finalTotal,
    };
  };

  const totals = calculateTotal();

  return (
    <Box>
      {/* 헤더 */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => router.push('/quotes')}
            variant='outlined'
          >
            목록으로
          </Button>
          <Typography variant='h4' component='h1'>
            {quote.quote_number}
          </Typography>
          <FormControl size='small' sx={{ minWidth: 120 }}>
            <InputLabel>상태</InputLabel>
            <Select
              value={quote.status}
              label="상태"
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={statusChanging}
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={option.label}
                      color={getStatusColor(option.value) as any}
                      size="small"
                    />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<CopyIcon />}
            onClick={handleCopy}
            variant='outlined'
          >
            복사
          </Button>
          <Button
            startIcon={<PdfIcon />}
            onClick={handleDownload}
            variant='outlined'
            color='primary'
          >
            PDF 미리보기
          </Button>
          {quote.status === 'draft' && (
            <Button
              startIcon={<SendIcon />}
              onClick={handleSend}
              variant='outlined'
              color='success'
            >
              발송
            </Button>
          )}
          {quote.status === 'accepted' && (
            <Button
              startIcon={<TransformIcon />}
              onClick={handleConvertToProject}
              variant='contained'
              color='success'
              disabled={convertingToProject}
            >
              {convertingToProject ? '전환 중...' : '프로젝트로 전환'}
            </Button>
          )}
          <Button
            startIcon={<EditIcon />}
            onClick={handleEdit}
            variant='contained'
          >
            수정
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* 기본 정보 */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant='h6' gutterBottom>
              기본 정보
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant='body2' color='textSecondary'>
                  프로젝트명
                </Typography>
                <Typography variant='body1'>{quote.project_title}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant='body2' color='textSecondary'>
                  고객사
                </Typography>
                <Typography variant='body1'>
                  {quote.customer_name_snapshot}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant='body2' color='textSecondary'>
                  발행일
                </Typography>
                <Typography variant='body1'>
                  {new Date(quote.issue_date).toLocaleDateString('ko-KR')}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant='body2' color='textSecondary'>
                  버전
                </Typography>
                <Typography variant='body1'>v{quote.version}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant='body2' color='textSecondary'>
                  VAT 처리
                </Typography>
                <Typography variant='body1'>
                  {quote.vat_type === 'exclusive' ? 'VAT 별도' : 'VAT 포함'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant='body2' color='textSecondary'>
                  대행수수료율
                </Typography>
                <Typography variant='body1'>
                  {quote.agency_fee_rate}%
                </Typography>
              </Grid>
              {quote.notes && (
                <Grid item xs={12}>
                  <Typography variant='body2' color='textSecondary'>
                    비고
                  </Typography>
                  <Typography variant='body1'>{quote.notes}</Typography>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* 견적 내용 */}
          <Paper sx={{ p: 3 }}>
            <Typography variant='h6' gutterBottom>
              견적 내용
            </Typography>

            {quote.groups.map((group, groupIndex) => (
              <Box key={group.id} sx={{ mb: 4 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant='h6' color='primary'>
                    {group.name}
                  </Typography>
                  <Chip
                    label={group.include_in_fee ? '수수료 포함' : '수수료 제외'}
                    size='small'
                    variant='outlined'
                  />
                </Box>

                {group.items.map((item) => (
                  <Box key={item.id} sx={{ mb: 3, ml: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                      }}
                    >
                      <Typography variant='subtitle1'>{item.name}</Typography>
                      <Chip
                        label={
                          item.include_in_fee ? '수수료 포함' : '수수료 제외'
                        }
                        size='small'
                        variant='outlined'
                      />
                    </Box>

                    <TableContainer
                      component={Paper}
                      variant='outlined'
                      sx={{ ml: 2 }}
                    >
                      <Table size='small'>
                        <TableHead>
                          <TableRow>
                            <TableCell>품목명</TableCell>
                            <TableCell>설명</TableCell>
                            <TableCell align='center'>수량</TableCell>
                            <TableCell align='center'>일수</TableCell>
                            <TableCell align='center'>단위</TableCell>
                            <TableCell align='right'>단가</TableCell>
                            <TableCell align='right'>금액</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {item.details.map((detail) => {
                            const detailAmount = detail.is_service
                              ? detail.quantity * detail.unit_price
                              : detail.quantity *
                                detail.days *
                                detail.unit_price;

                            return (
                              <TableRow key={detail.id}>
                                <TableCell>{detail.name}</TableCell>
                                <TableCell>{detail.description}</TableCell>
                                <TableCell align='center'>
                                  {detail.quantity}
                                </TableCell>
                                <TableCell align='center'>
                                  {detail.is_service ? '-' : detail.days}
                                </TableCell>
                                <TableCell align='center'>
                                  {detail.unit}
                                </TableCell>
                                <TableCell align='right'>
                                  ₩{detail.unit_price.toLocaleString()}
                                </TableCell>
                                <TableCell align='right'>
                                  ₩{detailAmount.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ))}

                {groupIndex < quote.groups.length - 1 && (
                  <Divider sx={{ my: 3 }} />
                )}
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* 금액 요약 */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 24 }}>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                금액 요약
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Typography variant='body2'>소계</Typography>
                  <Typography variant='body2'>
                    ₩{totals.subtotal.toLocaleString()}
                  </Typography>
                </Box>

                {totals.agencyFee > 0 && (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Typography variant='body2'>
                      대행수수료 ({quote.agency_fee_rate}%)
                    </Typography>
                    <Typography variant='body2'>
                      ₩{totals.agencyFee.toLocaleString()}
                    </Typography>
                  </Box>
                )}

                {quote.discount_amount > 0 && (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Typography variant='body2'>할인</Typography>
                    <Typography variant='body2' color='error'>
                      -₩{quote.discount_amount.toLocaleString()}
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ my: 1 }} />

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Typography variant='body2'>
                    {quote.vat_type === 'exclusive' ? 'VAT 별도 소계' : '소계'}
                  </Typography>
                  <Typography variant='body2'>
                    ₩{totals.totalBeforeVat.toLocaleString()}
                  </Typography>
                </Box>

                {quote.vat_type === 'exclusive' && (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Typography variant='body2'>VAT (10%)</Typography>
                    <Typography variant='body2'>
                      ₩{totals.vatAmount.toLocaleString()}
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='h6'>최종 금액</Typography>
                  <Typography variant='h6' color='primary'>
                    ₩{totals.finalTotal.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* PDF 미리보기 다이얼로그 */}
      <Dialog
        open={pdfDialogOpen}
        onClose={handleClosePdfDialog}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: '95vw',
            height: '95vh',
            maxWidth: 'none',
            maxHeight: 'none',
          },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1,
          }}
        >
          <IconButton onClick={handleClosePdfDialog}>
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          {quote && (
            <QuotePDFView
              quote={convertToQuote4Tier(quote)}
              showPrintButtons={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 프로젝트 전환 마법사 */}
      <ProjectConversionWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onConvert={handleWizardConvert}
        quote={{
          id: quote.id,
          project_title: quote.project_title,
          final_total: totals.finalTotal
        }}
      />

      {/* 상태 변경 알림 스낵바 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="info" variant="filled">
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
