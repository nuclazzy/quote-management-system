'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Skeleton,
} from '@mui/material';
import { Dashboard, ViewKanban } from '@mui/icons-material';
import { createBrowserClient } from '@/lib/supabase/client';
import LoadingState from '@/components/common/LoadingState';
import ErrorAlert from '@/components/common/ErrorAlert';
import KanbanBoard, { Transaction } from '@/components/revenue/KanbanBoard';
import { useStaticAuth } from '@/contexts/StaticAuthContext';

interface RevenueStats {
  totalIncome: number;
  totalExpense: number;
  totalProfit: number;
  pendingIncome: number;
  pendingExpense: number;
  overdueCount: number;
}

type ViewMode = 'kanban' | 'dashboard';

export default function RevenueKanbanPage() {
  const router = useRouter();
  const { isAdmin } = useStaticAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient();
  
  // 관리자 권한 체크
  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error'>관리자 권한이 필요합니다.</Alert>
      </Box>
    );
  }

  // 거래 데이터 가져오기
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      // API를 통해 거래 데이터 가져오기
      const response = await fetch('/api/transactions');
      if (!response.ok) {
        throw new Error('거래 데이터를 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      const formattedTransactions: Transaction[] = data.transactions?.map((t: any) => ({
        id: t.id,
        project_id: t.project_id,
        project_name: t.projects?.name || '알 수 없음',
        type: t.type,
        partner_name: t.partner_name,
        item_name: t.item_name,
        amount: t.amount,
        due_date: t.due_date,
        status: t.status,
        tax_invoice_status: t.tax_invoice_status,
        notes: t.notes,
        created_at: t.created_at,
        updated_at: t.updated_at,
      })) || [];

      setTransactions(formattedTransactions);

      // 통계 계산
      calculateStats(formattedTransactions);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 통계 계산
  const calculateStats = (transactions: Transaction[]) => {
    const stats: RevenueStats = {
      totalIncome: 0,
      totalExpense: 0,
      totalProfit: 0,
      pendingIncome: 0,
      pendingExpense: 0,
      overdueCount: 0,
    };

    const today = new Date();

    transactions.forEach((t) => {
      if (t.status === 'completed') {
        if (t.type === 'income') {
          stats.totalIncome += t.amount;
        } else {
          stats.totalExpense += t.amount;
        }
      } else {
        if (t.type === 'income') {
          stats.pendingIncome += t.amount;
        } else {
          stats.pendingExpense += t.amount;
        }
      }

      // 기한 초과 체크
      if (t.due_date && t.status !== 'completed') {
        const dueDate = new Date(t.due_date);
        if (dueDate < today) {
          stats.overdueCount++;
        }
      }
    });

    stats.totalProfit = stats.totalIncome - stats.totalExpense;
    setStats(stats);
  };

  // 거래 업데이트
  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('거래 업데이트에 실패했습니다.');
      }

      // 낙관적 업데이트
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );

      // 통계 재계산
      const updatedTransactions = transactions.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      );
      calculateStats(updatedTransactions);

      // 서버에서 최신 데이터 다시 가져오기
      await fetchTransactions();
    } catch (err: any) {
      console.error('Error updating transaction:', err);
      setError(err.message);
      // 실패 시 원래 상태로 롤백
      await fetchTransactions();
    }
  };

  // 거래 삭제
  const handleDeleteTransaction = async (id: string) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('거래 삭제에 실패했습니다.');
      }

      // 낙관적 업데이트
      setTransactions((prev) => prev.filter((t) => t.id !== id));

      // 통계 재계산
      const updatedTransactions = transactions.filter((t) => t.id !== id);
      calculateStats(updatedTransactions);
    } catch (err: any) {
      console.error('Error deleting transaction:', err);
      setError(err.message);
      // 실패 시 원래 상태로 롤백
      await fetchTransactions();
    }
  };

  // 새 거래 생성
  const handleCreateTransaction = async (
    transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });

      if (!response.ok) {
        throw new Error('거래 생성에 실패했습니다.');
      }

      // 데이터 다시 가져오기
      await fetchTransactions();
    } catch (err: any) {
      console.error('Error creating transaction:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  if (loading) return <LoadingState />;

  return (
    <Box>
      {/* 페이지 헤더 */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" component="h1">
          매출 관리
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="kanban">
              <ViewKanban sx={{ mr: 1 }} />
              칸반 보드
            </ToggleButton>
            <ToggleButton value="dashboard">
              <Dashboard sx={{ mr: 1 }} />
              대시보드
            </ToggleButton>
          </ToggleButtonGroup>
          <Button variant="outlined" onClick={() => router.push('/projects')}>
            프로젝트 관리
          </Button>
        </Box>
      </Box>

      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

      {/* 통계 카드 */}
      {stats && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  총 수입
                </Typography>
                <Typography variant="h6" color="primary.main">
                  {stats.totalIncome.toLocaleString()}원
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  총 지출
                </Typography>
                <Typography variant="h6" color="error.main">
                  {stats.totalExpense.toLocaleString()}원
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  순이익
                </Typography>
                <Typography
                  variant="h6"
                  color={stats.totalProfit >= 0 ? 'success.main' : 'error.main'}
                >
                  {stats.totalProfit.toLocaleString()}원
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  대기중 수입
                </Typography>
                <Typography variant="h6" color="info.main">
                  {stats.pendingIncome.toLocaleString()}원
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  대기중 지출
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {stats.pendingExpense.toLocaleString()}원
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ bgcolor: stats.overdueCount > 0 ? 'error.light' : 'background.paper' }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  기한 초과
                </Typography>
                <Typography
                  variant="h6"
                  color={stats.overdueCount > 0 ? 'error.dark' : 'text.primary'}
                  fontWeight="bold"
                >
                  {stats.overdueCount}건
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 뷰 모드에 따른 컨텐츠 */}
      {viewMode === 'kanban' ? (
        <KanbanBoard
          transactions={transactions}
          onUpdateTransaction={handleUpdateTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onCreateTransaction={handleCreateTransaction}
        />
      ) : (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              대시보드 뷰
            </Typography>
            <Alert severity="info">
              대시보드 뷰는 추가 개발 예정입니다. 칸반 보드를 사용해주세요.
            </Alert>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}