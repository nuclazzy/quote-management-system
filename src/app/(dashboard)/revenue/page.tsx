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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Divider,
} from '@mui/material';
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
//   ResponsiveContainer,
//   PieChart,
//   Pie,
//   Cell,
//   LineChart,
//   Line
// } from 'recharts';
import { createBrowserClient } from '@/lib/supabase/client';
import LoadingState from '@/components/common/LoadingState';
import ErrorAlert from '@/components/common/ErrorAlert';

interface RevenueData {
  monthly: Array<{
    month: string;
    income: number;
    expense: number;
    profit: number;
  }>;
  projectStatus: Array<{
    status: string;
    count: number;
    revenue: number;
  }>;
  totalStats: {
    totalIncome: number;
    totalExpense: number;
    totalProfit: number;
    totalProjects: number;
    completedProjects: number;
    activeProjects: number;
  };
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  partner_name: string;
  item_name: string;
  amount: number;
  due_date?: string;
  status: 'pending' | 'processing' | 'completed' | 'issue';
  tax_invoice_status: 'not_issued' | 'issued' | 'received';
  project_name: string;
  created_at: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function RevenuePage() {
  const router = useRouter();
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [upcomingTransactions, setUpcomingTransactions] = useState<
    Transaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<string>(
    new Date().getFullYear().toString()
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const supabase = createBrowserClient();

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 프로젝트 기본 데이터 조회
      const { data: projects, error: projectsError } = await supabase.from(
        'projects'
      ).select(`
          id,
          name,
          status,
          total_revenue,
          total_cost,
          created_at,
          transactions!inner(
            type,
            amount,
            status,
            created_at
          )
        `);

      if (projectsError) throw projectsError;

      // 거래 내역 조회 (예정된 정산)
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(
          `
          *,
          projects!inner(name)
        `
        )
        .gte('due_date', new Date().toISOString().split('T')[0])
        .lte(
          'due_date',
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0]
        )
        .order('due_date', { ascending: true });

      if (transactionsError) throw transactionsError;

      // 월별 데이터 계산
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const month = new Date(parseInt(yearFilter), i, 1);
        const monthStr = month.toLocaleDateString('ko-KR', { month: 'short' });

        let income = 0;
        let expense = 0;

        projects?.forEach((project) => {
          project.transactions?.forEach((transaction: any) => {
            const transactionDate = new Date(transaction.created_at);
            if (
              transactionDate.getFullYear() === parseInt(yearFilter) &&
              transactionDate.getMonth() === i &&
              transaction.status === 'completed'
            ) {
              if (transaction.type === 'income') {
                income += transaction.amount;
              } else {
                expense += transaction.amount;
              }
            }
          });
        });

        return {
          month: monthStr,
          income,
          expense,
          profit: income - expense,
        };
      });

      // 프로젝트 상태별 통계
      const statusStats = projects?.reduce((acc: any, project: any) => {
        if (!acc[project.status]) {
          acc[project.status] = { count: 0, revenue: 0 };
        }
        acc[project.status].count += 1;
        acc[project.status].revenue += project.total_revenue || 0;
        return acc;
      }, {});

      const projectStatusData = Object.entries(statusStats || {}).map(
        ([status, stats]: [string, any]) => ({
          status: getStatusText(status),
          count: stats.count,
          revenue: stats.revenue,
        })
      );

      // 전체 통계 계산
      const totalStats = {
        totalIncome:
          projects?.reduce(
            (sum, project) =>
              sum +
              (project.transactions
                ?.filter(
                  (t: any) => t.type === 'income' && t.status === 'completed'
                )
                .reduce((acc: number, t: any) => acc + t.amount, 0) || 0),
            0
          ) || 0,
        totalExpense:
          projects?.reduce(
            (sum, project) =>
              sum +
              (project.transactions
                ?.filter(
                  (t: any) => t.type === 'expense' && t.status === 'completed'
                )
                .reduce((acc: number, t: any) => acc + t.amount, 0) || 0),
            0
          ) || 0,
        totalProfit: 0,
        totalProjects: projects?.length || 0,
        completedProjects:
          projects?.filter((p) => p.status === 'completed').length || 0,
        activeProjects:
          projects?.filter((p) => p.status === 'active').length || 0,
      };
      totalStats.totalProfit = totalStats.totalIncome - totalStats.totalExpense;

      setRevenueData({
        monthly: monthlyData,
        projectStatus: projectStatusData,
        totalStats,
      });

      // 예정된 정산 내역 처리
      const formattedTransactions =
        transactions?.map((transaction) => ({
          ...transaction,
          project_name: transaction.projects?.name || '알 수 없음',
        })) || [];

      setUpcomingTransactions(formattedTransactions);
    } catch (err: any) {
      console.error('Error fetching revenue data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueData();
  }, [yearFilter]);

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      active: '진행중',
      completed: '완료',
      on_hold: '보류',
      canceled: '취소',
      pending: '대기',
      processing: '진행중',
      issue: '문제',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
        return 'success';
      case 'pending':
      case 'processing':
        return 'warning';
      case 'on_hold':
      case 'issue':
        return 'error';
      case 'canceled':
        return 'default';
      default:
        return 'primary';
    }
  };

  const filteredTransactions = upcomingTransactions.filter(
    (transaction) =>
      statusFilter === 'all' || transaction.status === statusFilter
  );

  if (loading) return <LoadingState />;

  return (
    <Box>
      <Box
        display='flex'
        justifyContent='space-between'
        alignItems='center'
        mb={3}
      >
        <Typography variant='h4' component='h1'>
          매출 관리
        </Typography>
        <Box display='flex' gap={2} alignItems='center'>
          <FormControl size='small' sx={{ minWidth: 120 }}>
            <InputLabel>연도</InputLabel>
            <Select
              value={yearFilter}
              label='연도'
              onChange={(e: SelectChangeEvent) => setYearFilter(e.target.value)}
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return (
                  <MenuItem key={year} value={year.toString()}>
                    {year}년
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          <Button variant='outlined' onClick={() => router.push('/projects')}>
            프로젝트 관리
          </Button>
        </Box>
      </Box>

      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

      {revenueData && (
        <>
          {/* 전체 통계 카드 */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color='textSecondary' gutterBottom>
                    총 수입
                  </Typography>
                  <Typography variant='h5' color='primary.main'>
                    {revenueData.totalStats.totalIncome.toLocaleString()}원
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color='textSecondary' gutterBottom>
                    총 지출
                  </Typography>
                  <Typography variant='h5' color='error.main'>
                    {revenueData.totalStats.totalExpense.toLocaleString()}원
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color='textSecondary' gutterBottom>
                    순이익
                  </Typography>
                  <Typography
                    variant='h5'
                    color={
                      revenueData.totalStats.totalProfit >= 0
                        ? 'success.main'
                        : 'error.main'
                    }
                  >
                    {revenueData.totalStats.totalProfit.toLocaleString()}원
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color='textSecondary' gutterBottom>
                    프로젝트 현황
                  </Typography>
                  <Typography variant='h6'>
                    {revenueData.totalStats.activeProjects}개 진행중
                  </Typography>
                  <Typography variant='body2' color='textSecondary'>
                    완료: {revenueData.totalStats.completedProjects}개
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 월별 매출 테이블 */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom>
                    월별 매출 현황 ({yearFilter}년)
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>월</TableCell>
                          <TableCell align='right'>수입</TableCell>
                          <TableCell align='right'>지출</TableCell>
                          <TableCell align='right'>순이익</TableCell>
                          <TableCell align='right'>수익률</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {revenueData.monthly.map((monthData) => (
                          <TableRow key={monthData.month}>
                            <TableCell>{monthData.month}</TableCell>
                            <TableCell align='right'>
                              <Typography color='primary.main'>
                                {monthData.income.toLocaleString()}원
                              </Typography>
                            </TableCell>
                            <TableCell align='right'>
                              <Typography color='error.main'>
                                {monthData.expense.toLocaleString()}원
                              </Typography>
                            </TableCell>
                            <TableCell align='right'>
                              <Typography
                                color={
                                  monthData.profit >= 0
                                    ? 'success.main'
                                    : 'error.main'
                                }
                                fontWeight='bold'
                              >
                                {monthData.profit.toLocaleString()}원
                              </Typography>
                            </TableCell>
                            <TableCell align='right'>
                              <Typography
                                color={
                                  monthData.income > 0 && monthData.profit >= 0
                                    ? 'success.main'
                                    : 'error.main'
                                }
                              >
                                {monthData.income > 0
                                  ? (
                                      (monthData.profit / monthData.income) *
                                      100
                                    ).toFixed(1)
                                  : 0}
                                %
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom>
                    프로젝트 상태별 분포
                  </Typography>
                  <Box>
                    {revenueData.projectStatus.map((statusData, index) => (
                      <Box
                        key={statusData.status}
                        display='flex'
                        justifyContent='space-between'
                        alignItems='center'
                        mb={1}
                      >
                        <Box display='flex' alignItems='center'>
                          <Box
                            width={12}
                            height={12}
                            borderRadius='50%'
                            bgcolor={COLORS[index % COLORS.length]}
                            mr={1}
                          />
                          <Typography variant='body2'>
                            {statusData.status}
                          </Typography>
                        </Box>
                        <Typography variant='body2' fontWeight='bold'>
                          {statusData.count}개 (
                          {statusData.revenue.toLocaleString()}원)
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* 예정된 정산 */}
      <Card>
        <CardContent>
          <Box
            display='flex'
            justifyContent='space-between'
            alignItems='center'
            mb={2}
          >
            <Typography variant='h6'>예정된 정산 (30일 이내)</Typography>
            <FormControl size='small' sx={{ minWidth: 120 }}>
              <InputLabel>상태 필터</InputLabel>
              <Select
                value={statusFilter}
                label='상태 필터'
                onChange={(e: SelectChangeEvent) =>
                  setStatusFilter(e.target.value)
                }
              >
                <MenuItem value='all'>전체</MenuItem>
                <MenuItem value='pending'>대기</MenuItem>
                <MenuItem value='processing'>진행중</MenuItem>
                <MenuItem value='completed'>완료</MenuItem>
                <MenuItem value='issue'>문제</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>프로젝트</TableCell>
                  <TableCell>구분</TableCell>
                  <TableCell>거래처</TableCell>
                  <TableCell>항목</TableCell>
                  <TableCell align='right'>금액</TableCell>
                  <TableCell>마감일</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>세금계산서</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <Button
                        variant='text'
                        onClick={() =>
                          router.push(`/projects/${transaction.project_name}`)
                        }
                      >
                        {transaction.project_name}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        label={transaction.type === 'income' ? '수입' : '지출'}
                        color={
                          transaction.type === 'income'
                            ? 'primary'
                            : 'secondary'
                        }
                      />
                    </TableCell>
                    <TableCell>{transaction.partner_name}</TableCell>
                    <TableCell>{transaction.item_name}</TableCell>
                    <TableCell align='right'>
                      <Typography
                        color={
                          transaction.type === 'income'
                            ? 'primary.main'
                            : 'error.main'
                        }
                        fontWeight='bold'
                      >
                        {transaction.type === 'income' ? '+' : '-'}
                        {transaction.amount.toLocaleString()}원
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {transaction.due_date
                        ? new Date(transaction.due_date).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        label={getStatusText(transaction.status)}
                        color={getStatusColor(transaction.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        label={getStatusText(transaction.tax_invoice_status)}
                        variant='outlined'
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {filteredTransactions.length === 0 && (
            <Box textAlign='center' py={4}>
              <Typography variant='body1' color='text.secondary'>
                예정된 정산이 없습니다
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
