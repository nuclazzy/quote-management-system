'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Stack,
} from '@mui/material';
import {
  TrendingUp,
  Description,
  Business,
  CheckCircle,
  Add,
  ViewList,
  People,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import {
  DashboardService,
  type DashboardStats,
} from '@/lib/services/dashboard-service';
import { QuoteStatusChip } from '@/components/quotes/QuoteStatusChip';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { StatCard } from '@/components/common/StatCard';
import { GlassCard } from '@/components/common/GlassCard';
import { ModernBackground } from '@/components/layout/ModernBackground';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { formatCurrency, formatDate } from '@/utils/format';

interface StatCardData {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

export default function DashboardPage() {
  const router = useRouter();
  const { handleError } = useErrorHandler();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 대시보드 데이터 조회
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const dashboardStats = await DashboardService.getDashboardStats();
      setStats(dashboardStats);
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드 - 임시로 비활성화
  useEffect(() => {
    // fetchDashboardData() // 임시 비활성화

    // 테스트용 더미 데이터 설정
    setStats({
      totalQuotes: 0,
      totalAmount: 0,
      acceptedQuotes: 0,
      activeCustomers: 0,
      recentQuotes: [],
    });
    setLoading(false);
  }, []);

  // 네비게이션 핸들러
  const handleNavigation = (path: string) => {
    router.push(path);
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorAlert message={error} onRetry={fetchDashboardData} />
      </Box>
    );
  }

  if (loading) {
    return <LoadingState />;
  }

  // 통계 카드 데이터
  const statCards: StatCardData[] = [
    {
      title: '이번 달 견적서',
      value: `${stats?.totalQuotes || 0}개`,
      icon: <Description />,
      color: 'primary',
    },
    {
      title: '총 견적 금액',
      value: formatCurrency(stats?.totalAmount || 0),
      icon: <TrendingUp />,
      color: 'success',
    },
    {
      title: '수주확정',
      value: `${stats?.acceptedQuotes || 0}개`,
      icon: <CheckCircle />,
      color: 'warning',
    },
    {
      title: '활성 고객사',
      value: `${stats?.activeCustomers || 0}개`,
      icon: <Business />,
      color: 'info',
    },
  ];

  // 빠른 작업 버튼 데이터
  const quickActions = [
    {
      label: '새 견적서 작성',
      path: '/quotes/new',
      color: 'primary' as const,
      icon: <Add />,
    },
    {
      label: '견적서 목록',
      path: '/quotes',
      color: 'success' as const,
      icon: <ViewList />,
    },
    {
      label: '고객사 관리',
      path: '/customers',
      color: 'warning' as const,
      icon: <People />,
    },
  ];

  return (
    <ModernBackground>
      <Box sx={{ p: 3 }}>
        {/* 헤더 */}
        <Typography
          variant='h3'
          component='h1'
          sx={{
            mb: 4,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          견적서 관리 시스템 대시보드
        </Typography>

        {/* 주요 통계 - 애니메이션 */}
        <Typography
          variant='h5'
          component='h2'
          sx={{
            mb: 3,
            mt: 4,
            fontWeight: 600,
            color: 'text.primary',
          }}
        >
          📊 주요 통계
        </Typography>

        <Grid container spacing={3} sx={{ mb: 5 }}>
          {statCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <StatCard
                title={card.title}
                value={card.value}
                icon={card.icon}
                color={card.color}
                delay={index * 100}
              />
            </Grid>
          ))}
        </Grid>

        {/* 최근 견적서 */}
        <Typography
          variant='h5'
          component='h2'
          sx={{
            mb: 3,
            fontWeight: 600,
            color: 'text.primary',
          }}
        >
          📋 최근 견적서
        </Typography>

        <GlassCard variant='default' sx={{ mb: 4, p: 0 }}>
          {stats?.recentQuotes && stats.recentQuotes.length > 0 ? (
            <List sx={{ p: 0 }}>
              {stats.recentQuotes.map((quote, index) => (
                <div key={quote.id}>
                  <ListItem
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                        transform: 'translateX(8px)',
                      },
                    }}
                    onClick={() => handleNavigation(`/quotes/${quote.id}`)}
                  >
                    <ListItemText
                      primary={
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Typography
                            variant='h6'
                            component='h4'
                            sx={{ fontWeight: 600 }}
                          >
                            {quote.project_title}
                          </Typography>
                          <QuoteStatusChip status={quote.status as any} />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant='body2' color='text.secondary'>
                            {quote.customer_name_snapshot} •{' '}
                            {formatCurrency(quote.total_amount)} •{' '}
                            {formatDate(quote.created_at)}
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
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography
                variant='h6'
                color='text.secondary'
                sx={{ fontWeight: 500 }}
              >
                최근 작성된 견적서가 없습니다
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                새로운 견적서를 작성해보세요
              </Typography>
            </Box>
          )}
        </GlassCard>

        {/* 빠른 작업 */}
        <Typography
          variant='h5'
          component='h2'
          sx={{
            mb: 3,
            fontWeight: 600,
            color: 'text.primary',
          }}
        >
          ⚡ 빠른 작업
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={3}
          sx={{ flexWrap: 'wrap' }}
        >
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant='contained'
              color={action.color}
              size='large'
              startIcon={action.icon}
              onClick={() => handleNavigation(action.path)}
              sx={{
                minWidth: { xs: '100%', sm: 'auto' },
                px: 4,
                py: 2,
                borderRadius: 3,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                color: '#ffffff',
                '& .MuiSvgIcon-root': {
                  color: '#ffffff',
                },
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)',
                },
              }}
            >
              {action.label}
            </Button>
          ))}
        </Stack>
      </Box>
    </ModernBackground>
  );
}
