'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  CircularProgress,
  Alert,
  Pagination,
  Stack,
  Checkbox,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ko from 'date-fns/locale/ko';
import { Add, Edit, GetApp, Search, TableChart, Delete } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { QuoteService } from '@/lib/services/quote-service';
import { QuoteStatusChip } from '@/components/quotes/QuoteStatusChip';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { formatCurrency, formatDate } from '@/utils/format';
import { exportQuotesToExcel } from '@/utils/excel-export';
import AdvancedFilter from '@/components/common/AdvancedFilter';
import EnhancedFilter, { FilterField } from '@/components/common/EnhancedFilter';
import type { Quote, QuoteFilter } from '@/types';

export default function QuotesPage() {
  const router = useRouter();
  const { handleError } = useErrorHandler();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // 필터 상태
  const [filters, setFilters] = useState<QuoteFilter>({
    search: '',
    status: [],
  });
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  
  // 다중 선택 상태
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // 견적서 목록 조회
  const fetchQuotes = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const result = await QuoteService.getQuotes(filters, page, 20);
      setQuotes(result.data);
      setTotalPages(result.total_pages);
      setTotalCount(result.count);
      setCurrentPage(page);
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    fetchQuotes();
  }, []);

  // 필터 변경 시 재조회
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchQuotes(1);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters]);

  // 검색 필터 적용
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setFilters((prev) => ({ ...prev, search: value }));
  };

  // 상태 필터 적용
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setFilters((prev) => ({
      ...prev,
      status: value ? [value] : [],
    }));
  };

  // 날짜 필터 적용
  const handleDateFromChange = (date: Date | null) => {
    setDateFrom(date);
    setFilters((prev) => ({
      ...prev,
      date_from: date ? date.toISOString().split('T')[0] : undefined,
    }));
  };

  const handleDateToChange = (date: Date | null) => {
    setDateTo(date);
    setFilters((prev) => ({
      ...prev,
      date_to: date ? date.toISOString().split('T')[0] : undefined,
    }));
  };

  // 페이지 변경
  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    page: number
  ) => {
    fetchQuotes(page);
  };

  // 견적서 상세로 이동
  const handleQuoteDetail = (id: string) => {
    router.push(`/quotes/${id}`);
  };

  // 견적서 수정으로 이동
  const handleQuoteEdit = (id: string) => {
    router.push(`/quotes/${id}/edit`);
  };

  // PDF 다운로드
  const handlePDFDownload = async (id: string) => {
    try {
      // PDF 다운로드 로직 구현
      window.open(`/api/quotes/${id}/pdf`, '_blank');
    } catch (err) {
      handleError(err);
    }
  };

  // 새 견적서 작성으로 이동
  const handleNewQuote = () => {
    router.push('/quotes/new');
  };

  // Excel 내보내기
  const handleExcelExport = () => {
    if (quotes.length === 0) {
      alert('내보낼 견적서가 없습니다.');
      return;
    }
    exportQuotesToExcel(quotes);
  };

  // 견적서용 필터 필드 정의
  const quoteFilterFields: FilterField[] = [
    {
      id: 'status',
      label: '상태',
      type: 'multiselect',
      options: [
        { label: '임시저장', value: 'draft', color: 'warning' },
        { label: '발송됨', value: 'sent', color: 'primary' },
        { label: '수주확정', value: 'accepted', color: 'success' },
        { label: '거절됨', value: 'rejected', color: 'error' },
        { label: '만료됨', value: 'expired', color: 'secondary' }
      ]
    },
    {
      id: 'date_from',
      label: '시작일',
      type: 'date'
    },
    {
      id: 'date_to',
      label: '종료일',
      type: 'date'
    },
    {
      id: 'amount_min',
      label: '최소 금액',
      type: 'number',
      min: 0,
      step: 100000
    },
    {
      id: 'amount_max',
      label: '최대 금액',
      type: 'number',
      min: 0,
      step: 100000
    }
  ];

  // 선택 모드 토글
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedQuotes([]);
  };

  // 견적서 선택/해제
  const handleSelectQuote = (quoteId: string) => {
    setSelectedQuotes((prev) => {
      if (prev.includes(quoteId)) {
        return prev.filter((id) => id !== quoteId);
      }
      return [...prev, quoteId];
    });
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedQuotes.length === quotes.length) {
      setSelectedQuotes([]);
    } else {
      setSelectedQuotes(quotes.map((q) => q.id));
    }
  };

  // 선택된 견적서 삭제
  const handleDeleteSelected = async () => {
    if (selectedQuotes.length === 0) {
      alert('삭제할 견적서를 선택해주세요.');
      return;
    }

    if (!confirm(`선택한 ${selectedQuotes.length}개의 견적서를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      for (const quoteId of selectedQuotes) {
        await QuoteService.deleteQuote(quoteId);
      }
      
      setSelectedQuotes([]);
      setIsSelectionMode(false);
      fetchQuotes(currentPage);
    } catch (error) {
      handleError(error);
    }
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorAlert message={error} onRetry={() => fetchQuotes(currentPage)} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant='h4' component='h1'>
          견적서 관리
        </Typography>
        <Stack direction='row' spacing={2}>
          <Button
            variant='contained'
            startIcon={<Add />}
            onClick={handleNewQuote}
          >
            새 견적서
          </Button>
          <Button
            variant='outlined'
            startIcon={<TableChart />}
            onClick={handleExcelExport}
            disabled={quotes.length === 0}
          >
            Excel 내보내기
          </Button>
          {isSelectionMode ? (
            <>
              <Button
                variant='outlined'
                color='error'
                startIcon={<Delete />}
                onClick={handleDeleteSelected}
                disabled={selectedQuotes.length === 0}
              >
                선택 삭제 ({selectedQuotes.length})
              </Button>
              <Button
                variant='text'
                onClick={toggleSelectionMode}
              >
                취소
              </Button>
            </>
          ) : (
            <Button
              variant='text'
              onClick={toggleSelectionMode}
              disabled={quotes.length === 0}
            >
              선택
            </Button>
          )}
        </Stack>
      </Box>

      {/* 향상된 필터 시스템 */}
      <EnhancedFilter
        fields={quoteFilterFields}
        onFilterChange={(newFilters) => {
          setFilters(newFilters);
        }}
        onSearch={() => {
          fetchQuotes(1);
        }}
        onExport={(filter, format) => {
          console.log('Export requested:', format, filter);
          if (format === 'excel') {
            handleExcelExport();
          }
        }}
        searchPlaceholder='견적서 번호, 프로젝트명, 고객사명으로 검색...'
        initialFilter={filters}
        enablePresets={true}
        enableExport={true}
        enableHistory={true}
      />

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant='body2' color='text.secondary'>
          총 {totalCount}건의 견적서
        </Typography>
      </Paper>

      {/* 로딩 상태 */}
      {loading && <LoadingState />}

      {/* 견적서 목록 */}
      {!loading && (
        <>
          {isSelectionMode && quotes.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Button onClick={handleSelectAll}>
                {selectedQuotes.length === quotes.length ? '전체 해제' : '전체 선택'}
              </Button>
            </Box>
          )}
          
          <Grid container spacing={3}>
            {quotes.map((quote) => (
              <Grid item xs={12} key={quote.id}>
                <Card
                  sx={{
                    cursor: isSelectionMode ? 'default' : 'pointer',
                    '&:hover': { boxShadow: 4 },
                    border: selectedQuotes.includes(quote.id) ? '2px solid' : '1px solid',
                    borderColor: selectedQuotes.includes(quote.id) ? 'primary.main' : 'divider',
                  }}
                  onClick={() => !isSelectionMode && handleQuoteDetail(quote.id)}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        mb: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'start' }}>
                        {isSelectionMode && (
                          <Checkbox
                            checked={selectedQuotes.includes(quote.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleSelectQuote(quote.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            sx={{ mr: 2 }}
                          />
                        )}
                        <Box>
                          <Typography variant='h6' component='h3' gutterBottom>
                            {quote.project_title}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            견적번호: {quote.quote_number}
                          </Typography>
                        </Box>
                      </Box>
                      <QuoteStatusChip status={quote.status} />
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Typography variant='body2'>
                          <strong>고객사:</strong>{' '}
                          {quote.customer_name_snapshot}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant='body2'>
                          <strong>총 금액:</strong>{' '}
                          {formatCurrency(quote.total_amount)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant='body2'>
                          <strong>작성일:</strong>{' '}
                          {formatDate(quote.created_at)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>

                  <CardActions>
                    <Button
                      size='small'
                      startIcon={<Edit />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuoteEdit(quote.id);
                      }}
                    >
                      수정
                    </Button>
                    <Button
                      size='small'
                      startIcon={<GetApp />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePDFDownload(quote.id);
                      }}
                    >
                      PDF 다운로드
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* 빈 상태 */}
          {quotes.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant='h6' color='text.secondary' gutterBottom>
                견적서가 없습니다
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                새로운 견적서를 작성해보세요
              </Typography>
              <Button
                variant='contained'
                startIcon={<Add />}
                onClick={handleNewQuote}
              >
                새 견적서 작성
              </Button>
            </Box>
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color='primary'
                size='large'
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
