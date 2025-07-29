'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Stack,
} from '@mui/material'
import {
  TrendingUp,
  Description,
  Business,
  CheckCircle,
  Add,
  ViewList,
  People,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { DashboardService, type DashboardStats } from '@/lib/services/dashboard-service'
import { QuoteStatusChip } from '@/components/quotes/QuoteStatusChip'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorAlert } from '@/components/common/ErrorAlert'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { formatCurrency, formatDate } from '@/utils/format'

interface StatCard {
  title: string
  value: string | number
  icon: React.ReactNode
  color: 'primary' | 'success' | 'warning' | 'secondary'
  bgColor: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { handleError } = useErrorHandler()
  
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 대시보드 데이터 조회
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const dashboardStats = await DashboardService.getDashboardStats()
      setStats(dashboardStats)
    } catch (err) {
      const errorMessage = handleError(err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // 초기 로드
  useEffect(() => {
    fetchDashboardData()
  }, [])

  // 네비게이션 핸들러
  const handleNavigation = (path: string) => {
    router.push(path)
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorAlert 
          message={error} 
          onRetry={fetchDashboardData} 
        />
      </Box>
    )
  }

  if (loading) {
    return <LoadingState />
  }

  // 통계 카드 데이터
  const statCards: StatCard[] = [
    {
      title: '이번 달 견적서',
      value: `${stats?.totalQuotes || 0}건`,
      icon: <Description fontSize="large" />,
      color: 'primary',
      bgColor: '#e3f2fd'
    },
    {
      title: '총 견적 금액',
      value: formatCurrency(stats?.totalAmount || 0),
      icon: <TrendingUp fontSize="large" />,
      color: 'success',
      bgColor: '#e8f5e8'
    },
    {
      title: '수주확정',
      value: `${stats?.acceptedQuotes || 0}건`,
      icon: <CheckCircle fontSize="large" />,
      color: 'warning',
      bgColor: '#fff3e0'
    },
    {
      title: '활성 고객사',
      value: `${stats?.activeCustomers || 0}개`,
      icon: <Business fontSize="large" />,
      color: 'secondary',
      bgColor: '#f3e5f5'
    }
  ]

  // 빠른 작업 버튼 데이터
  const quickActions = [
    {
      label: '새 견적서 작성',
      path: '/quotes/new',
      color: 'primary' as const,
      icon: <Add />
    },
    {
      label: '견적서 목록',
      path: '/quotes',
      color: 'success' as const,
      icon: <ViewList />
    },
    {
      label: '고객사 관리',
      path: '/customers',
      color: 'warning' as const,
      icon: <People />
    }
  ]

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Typography variant="h4" component="h1" gutterBottom>
        견적서 관리 시스템 대시보드
      </Typography>

      {/* 주요 통계 */}
      <Typography variant="h5" component="h2" sx={{ mb: 3, mt: 4 }}>
        📊 주요 통계
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ 
              height: '100%',
              backgroundColor: card.bgColor,
              '&:hover': { boxShadow: 4 }
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ color: `${card.color}.main`, mr: 2 }}>
                    {card.icon}
                  </Box>
                  <Typography variant="h6" component="h3">
                    {card.title}
                  </Typography>
                </Box>
                <Typography 
                  variant="h4" 
                  component="p" 
                  sx={{ 
                    fontWeight: 'bold',
                    color: `${card.color}.main`
                  }}
                >
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 최근 견적서 */}
      <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
        📋 최근 견적서
      </Typography>
      
      <Paper sx={{ mb: 4 }}>
        <CardContent>
          {stats?.recentQuotes && stats.recentQuotes.length > 0 ? (
            <List>
              {stats.recentQuotes.map((quote, index) => (
                <div key={quote.id}>
                  <ListItem
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                    onClick={() => handleNavigation(`/quotes/${quote.id}`)}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="h6" component="h4">
                            {quote.project_title}
                          </Typography>
                          <QuoteStatusChip status={quote.status} />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {quote.customer_name_snapshot} • {formatCurrency(quote.total_amount)} • {formatDate(quote.created_at)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < stats.recentQuotes.length - 1 && <Divider />}
                </div>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                최근 작성된 견적서가 없습니다
              </Typography>
            </Box>
          )}
        </CardContent>
      </Paper>

      {/* 빠른 작업 */}
      <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
        ⚡ 빠른 작업
      </Typography>
      
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ flexWrap: 'wrap' }}>
        {quickActions.map((action, index) => (
          <Button
            key={index}
            variant="contained"
            color={action.color}
            size="large"
            startIcon={action.icon}
            onClick={() => handleNavigation(action.path)}
            sx={{ 
              minWidth: { xs: '100%', sm: 'auto' },
              px: 3,
              py: 1.5
            }}
          >
            {action.label}
          </Button>
        ))}
      </Stack>
    </Box>
  )
}