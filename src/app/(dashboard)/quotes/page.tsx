'use client'

import { useState, useEffect } from 'react'
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
} from '@mui/material'
import {
  Add,
  Edit,
  GetApp,
  Search,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { QuoteService } from '@/lib/services/quote-service'
import { QuoteStatusChip } from '@/components/quotes/QuoteStatusChip'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorAlert } from '@/components/common/ErrorAlert'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { formatCurrency, formatDate } from '@/utils/format'
import type { Quote, QuoteFilter } from '@/types'

export default function QuotesPage() {
  const router = useRouter()
  const { handleError } = useErrorHandler()
  
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // 필터 상태
  const [filters, setFilters] = useState<QuoteFilter>({
    search: '',
    status: [],
  })
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // 견적서 목록 조회
  const fetchQuotes = async (page = 1) => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await QuoteService.getQuotes(filters, page, 20)
      setQuotes(result.data)
      setTotalPages(result.total_pages)
      setTotalCount(result.count)
      setCurrentPage(page)
    } catch (err) {
      const errorMessage = handleError(err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // 초기 로드
  useEffect(() => {
    fetchQuotes()
  }, [])

  // 필터 변경 시 재조회
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchQuotes(1)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [filters])

  // 검색 필터 적용
  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    setFilters(prev => ({ ...prev, search: value }))
  }

  // 상태 필터 적용
  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setFilters(prev => ({
      ...prev,
      status: value ? [value] : []
    }))
  }

  // 페이지 변경
  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    fetchQuotes(page)
  }

  // 견적서 상세로 이동
  const handleQuoteDetail = (id: string) => {
    router.push(`/quotes/${id}`)
  }

  // 견적서 수정으로 이동
  const handleQuoteEdit = (id: string) => {
    router.push(`/quotes/${id}/edit`)
  }

  // PDF 다운로드
  const handlePDFDownload = async (id: string) => {
    try {
      // PDF 다운로드 로직 구현
      window.open(`/api/quotes/${id}/pdf`, '_blank')
    } catch (err) {
      handleError(err)
    }
  }

  // 새 견적서 작성으로 이동
  const handleNewQuote = () => {
    router.push('/quotes/new')
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorAlert 
          message={error} 
          onRetry={() => fetchQuotes(currentPage)} 
        />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          견적서 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleNewQuote}
        >
          새 견적서
        </Button>
      </Box>

      {/* 필터 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="견적서 검색..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ color: 'action.active', mr: 1 }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>상태</InputLabel>
              <Select
                value={statusFilter}
                label="상태"
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                <MenuItem value="">전체 상태</MenuItem>
                <MenuItem value="draft">임시저장</MenuItem>
                <MenuItem value="sent">발송됨</MenuItem>
                <MenuItem value="accepted">수주확정</MenuItem>
                <MenuItem value="rejected">거절됨</MenuItem>
                <MenuItem value="expired">만료됨</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" color="text.secondary">
              총 {totalCount}건의 견적서
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* 로딩 상태 */}
      {loading && <LoadingState />}

      {/* 견적서 목록 */}
      {!loading && (
        <>
          <Grid container spacing={3}>
            {quotes.map((quote) => (
              <Grid item xs={12} key={quote.id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 4 }
                  }}
                  onClick={() => handleQuoteDetail(quote.id)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" component="h3" gutterBottom>
                          {quote.project_title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          견적번호: {quote.quote_number}
                        </Typography>
                      </Box>
                      <QuoteStatusChip status={quote.status} />
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2">
                          <strong>고객사:</strong> {quote.customer_name_snapshot}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2">
                          <strong>총 금액:</strong> {formatCurrency(quote.total_amount)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2">
                          <strong>작성일:</strong> {formatDate(quote.created_at)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                  
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<Edit />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleQuoteEdit(quote.id)
                      }}
                    >
                      수정
                    </Button>
                    <Button
                      size="small"
                      startIcon={<GetApp />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePDFDownload(quote.id)
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
              <Typography variant="h6" color="text.secondary" gutterBottom>
                견적서가 없습니다
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                새로운 견적서를 작성해보세요
              </Typography>
              <Button
                variant="contained"
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
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  )
}