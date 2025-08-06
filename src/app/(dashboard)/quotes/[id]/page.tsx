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
} from '@mui/material';
import {
  Edit as EditIcon,
  FileCopy as CopyIcon,
  Download as DownloadIcon,
  Send as SendIcon,
  ArrowBack as BackIcon,
  Transform as TransformIcon,
} from '@mui/icons-material';
import { QuoteService } from '@/lib/services/quote-service';
import { QuoteWithDetails } from '@/types';

interface QuoteDetailPageProps {
  params: {
    id: string;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft':
      return 'default';
    case 'sent':
      return 'primary';
    case 'accepted':
      return 'success';
    case 'revised':
      return 'warning';
    case 'canceled':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'draft':
      return '임시저장';
    case 'sent':
      return '발송됨';
    case 'accepted':
      return '수주확정';
    case 'revised':
      return '수정요청';
    case 'canceled':
      return '취소됨';
    default:
      return status;
  }
};

export default function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [convertingToProject, setConvertingToProject] = useState(false);

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
    // TODO: PDF 다운로드 기능 구현
    console.log('PDF 다운로드');
  };

  const handleSend = () => {
    // TODO: 견적서 발송 기능 구현
    console.log('견적서 발송');
  };

  const handleConvertToProject = async () => {
    if (!quote || quote.status !== 'accepted') {
      return;
    }

    try {
      setConvertingToProject(true);
      setError(null);

      const response = await fetch(
        `/api/quotes/${quote.id}/convert-to-project`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            auto_settlement_schedule: true,
            settlement_periods: 1,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '프로젝트 전환에 실패했습니다.');
      }

      const result = await response.json();

      // 성공 시 프로젝트 페이지로 이동
      router.push(`/projects/${result.project.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '프로젝트 전환에 실패했습니다.'
      );
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
          <Chip
            label={getStatusText(quote.status)}
            color={getStatusColor(quote.status) as any}
            size='medium'
          />
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
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            variant='outlined'
          >
            PDF
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
    </Box>
  );
}
