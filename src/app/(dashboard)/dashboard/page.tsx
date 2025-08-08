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
  CheckCircle,
  PendingActions,
  Folder,
  PersonAdd,
  NotificationsActive,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useStaticAuth } from '@/contexts/StaticAuthContext';
import { createClient } from '@/lib/supabase/client';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { AdminLogin } from '@/components/admin/AdminLogin';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAdmin } = useStaticAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);

  useEffect(() => {
    setHydrated(true);
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const supabase = createClient();
      
      // 이번 달 날짜 범위 계산
      const thisMonth = new Date();
      const firstDay = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
      const lastDay = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0);

      // 병렬로 모든 통계 조회
      const [
        monthlyQuotes,
        acceptedCount,
        pendingCount,
        activeCustomersCount,
        activeProjectsCount,
        newCustomersCount,
        recentQuotes,
      ] = await Promise.all([
        // 이번 달 견적서
        supabase
          .from('quotes')
          .select('total_amount, status')
          .gte('created_at', firstDay.toISOString())
          .lte('created_at', lastDay.toISOString()),

        // 수주확정 견적서
        supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'accepted'),

        // 승인 대기 견적서
        supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'submitted'),

        // 활성 고객사
        supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),

        // 진행 중인 프로젝트
        supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),

        // 이번 달 신규 고객
        supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', firstDay.toISOString())
          .lte('created_at', lastDay.toISOString()),

        // 최근 견적서 5개
        supabase
          .from('quotes')
          .select('id, project_title, customer_name_snapshot, total_amount, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      // 이번 달 총 금액 계산
      const totalAmount = monthlyQuotes.data?.reduce(
        (sum, quote) => sum + (quote.total_amount || 0),
        0
      ) || 0;

      const dashboardStats = {
        totalQuotes: monthlyQuotes.data?.length || 0,
        totalAmount,
        acceptedQuotes: acceptedCount.count || 0,
        activeCustomers: activeCustomersCount.count || 0,
        pendingApproval: pendingCount.count || 0,
        activeProjects: activeProjectsCount.count || 0,
        newCustomers: newCustomersCount.count || 0,
        unreadNotifications: 0, // 알림 시스템 미구현
        recentQuotes: recentQuotes.data || [],
      };

      setStats(dashboardStats);
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
        onSuccess={() => {
          setAdminLoginOpen(false);
          // 상태가 자동으로 업데이트되므로 새로고침 불필요
        }}
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
                  이번 달 견적서
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
              <CheckCircle color="warning" />
              <Box>
                <Typography variant="h6">{stats?.acceptedQuotes || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  수주확정
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
              <PendingActions color="warning" />
              <Box>
                <Typography variant="h6">{stats?.pendingApproval || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  승인 대기
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Folder color="primary" />
              <Box>
                <Typography variant="h6">{stats?.activeProjects || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  진행중 프로젝트
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PersonAdd color="success" />
              <Box>
                <Typography variant="h6">{stats?.newCustomers || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  신규 고객
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <NotificationsActive color="error" />
              <Box>
                <Typography variant="h6">{stats?.unreadNotifications || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  읽지 않은 알림
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