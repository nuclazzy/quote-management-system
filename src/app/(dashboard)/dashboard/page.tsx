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
import { AdminPanel } from '@/components/admin/AdminPanel';
import { AdminLogin } from '@/components/admin/AdminLogin';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);

  useEffect(() => {
    console.log('🔥 Dashboard: 하이드레이션 완료');
    setHydrated(true);
  }, []);

  useEffect(() => {
    console.log('🔥 Dashboard: useEffect 실행됨 - 무조건 데이터 로딩');
    // 모든 조건 제거하고 바로 데이터 로딩
    loadDashboardData();
  }, []); // 의존성도 제거

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // API 호출 시도 - static 메서드 사용
      const data = await DashboardService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('대시보드 데이터를 불러오는 중 오류가 발생했습니다.');
      
      // 에러 발생 시 폴백 데이터 사용
      setStats({
        totalQuotes: 0,
        totalAmount: 0,
        acceptedQuotes: 0,
        activeCustomers: 0,
        pendingApproval: 0,
        activeProjects: 0,
        newCustomers: 0,
        unreadNotifications: 0,
        recentQuotes: [],
      });
    } finally {
      setLoading(false);
    }
  };

  // 모든 조건부 체크를 로그만 남기고 바로 렌더링
  console.log('🎯 DASHBOARD: 무조건 UI 렌더링', { 
    stats: !!stats, 
    loading, 
    user: !!user,
    authLoading,
    hydrated 
  });

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          대시보드
        </Typography>
        
        {!isAdmin && (
          <Button
            variant="outlined"
            color="warning"
            onClick={() => setAdminLoginOpen(true)}
          >
            관리자 로그인
          </Button>
        )}
      </Box>

      {/* 관리자 패널 */}
      <AdminPanel />

      {/* 관리자 로그인 다이얼로그 */}
      <AdminLogin 
        open={adminLoginOpen}
        onClose={() => setAdminLoginOpen(false)}
      />

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
                <Typography variant="h6">{stats?.totalQuotes || 0}</Typography>
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
                  {stats?.totalAmount ? (stats.totalAmount / 1000000).toFixed(0) : 0}M
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
                <Typography variant="h6">{stats?.activeCustomers || 0}</Typography>
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
                <Typography variant="h6">{stats?.activeProjects || 0}</Typography>
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
        {stats?.recentQuotes && stats.recentQuotes.length > 0 ? (
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