'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Description,
  Business,
  People,
  TrendingUp,
  Add,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardService } from '@/lib/services/dashboard-service';
import { DashboardStats } from '@/types/dashboard';

const dashboardService = new DashboardService();

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 인증 체크
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else {
        loadDashboardData();
      }
    }
  }, [user, authLoading, router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // API 호출 시도
      const data = await dashboardService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('대시보드 데이터를 불러오는 중 오류가 발생했습니다.');
      
      // 에러 발생 시 폴백 데이터 사용
      setStats({
        totalQuotes: 0,
        totalAmount: 0,
        activeCustomers: 0,
        activeProjects: 0,
        pendingQuotes: 0,
        acceptedQuotes: 0,
        recentQuotes: [],
        monthlyStats: {
          quotes: 0,
          amount: 0,
          growth: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  // 인증 로딩 중
  if (authLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '80vh',
        gap: 2 
      }}>
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          인증 확인 중...
        </Typography>
      </Box>
    );
  }

  // 로그인되지 않은 경우 (이미 리다이렉트 중)
  if (!user) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '80vh',
        gap: 2 
      }}>
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          로그인 페이지로 이동 중...
        </Typography>
      </Box>
    );
  }

  // 데이터 로딩 중
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '80vh',
        gap: 2 
      }}>
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          대시보드 데이터 로딩 중...
        </Typography>
      </Box>
    );
  }

  // 데이터가 없는 경우
  if (!stats) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          대시보드 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        대시보드
      </Typography>

      {/* 에러 메시지 표시 */}
      {error && (
        <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Description color="primary" />
              <Box>
                <Typography variant="h6">{stats.totalQuotes || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  전체 견적서
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TrendingUp color="success" />
              <Box>
                <Typography variant="h6">
                  {stats.totalAmount ? (stats.totalAmount / 1000000).toFixed(0) : 0}M
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  총 견적 금액
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <People color="info" />
              <Box>
                <Typography variant="h6">{stats.activeCustomers || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  활성 고객사
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Business color="warning" />
              <Box>
                <Typography variant="h6">{stats.activeProjects || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  진행중 프로젝트
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 빠른 작업 버튼 */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          빠른 작업
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => router.push('/quotes/new')}
          >
            새 견적서 작성
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.push('/quotes')}
          >
            견적서 목록
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.push('/clients')}
          >
            고객사 관리
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.push('/projects')}
          >
            프로젝트 관리
          </Button>
        </Box>
      </Paper>

      {/* 최근 활동 */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          최근 활동
        </Typography>
        {stats.recentQuotes && stats.recentQuotes.length > 0 ? (
          <Box>
            {stats.recentQuotes.map((quote: any) => (
              <Box key={quote.id} sx={{ py: 1, borderBottom: '1px solid #eee' }}>
                <Typography variant="body2">
                  {quote.quote_number} - {quote.client_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(quote.created_at).toLocaleDateString()}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Alert severity="info">
            최근 생성된 견적서가 없습니다.
          </Alert>
        )}
      </Paper>
    </Box>
  );
}