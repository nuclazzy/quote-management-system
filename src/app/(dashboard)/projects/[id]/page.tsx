'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  MonetizationOn as MonetizationOnIcon,
} from '@mui/icons-material';
import { createBrowserClient } from '@/lib/supabase/client';
import LoadingState from '@/components/common/LoadingState';
import ErrorAlert from '@/components/common/ErrorAlert';
import ProjectTimeline from '@/components/projects/ProjectTimeline';
import ProjectDocuments from '@/components/projects/ProjectDocuments';

interface Project {
  id: string;
  name: string;
  total_revenue: number;
  total_cost: number;
  status: 'active' | 'completed' | 'on_hold' | 'canceled';
  start_date?: string;
  end_date?: string;
  assignee_name?: string;
  assignee_email?: string;
  created_at: string;
  quotes: {
    id: string;
    quote_number: string;
    customer_name_snapshot: string;
    project_title: string;
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
  notes?: string;
  created_at: string;
}

interface ExpenseItem {
  id: string;
  expense_date: string;
  description: string;
  amount: number;
  receipt_url?: string;
  created_at: string;
}

export default function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [addTransactionDialog, setAddTransactionDialog] = useState(false);
  const [addExpenseDialog, setAddExpenseDialog] = useState(false);
  const [editAssigneeDialog, setEditAssigneeDialog] = useState(false);
  const [assigneeForm, setAssigneeForm] = useState({
    name: '',
    email: '',
  });
  const [newTransaction, setNewTransaction] = useState({
    type: 'income' as 'income' | 'expense',
    partner_name: '',
    item_name: '',
    amount: 0,
    due_date: '',
    notes: '',
  });
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
  });

  const supabase = createBrowserClient();

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 프로젝트 정보 조회
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(
          `
          *,
          quotes!inner(id, quote_number, customer_name_snapshot, project_title)
        `
        )
        .eq('id', params.id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // 거래 내역 조회
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('project_id', params.id)
        .order('created_at', { ascending: false });

      if (transactionError) throw transactionError;
      setTransactions(transactionData || []);

      // 기타 경비 조회
      const { data: expenseData, error: expenseError } = await supabase
        .from('project_expenses')
        .select('*')
        .eq('project_id', params.id)
        .order('expense_date', { ascending: false });

      if (expenseError) throw expenseError;
      setExpenses(expenseData || []);
    } catch (err: any) {
      console.error('Error fetching project data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [params.id]);

  const handleAddTransaction = async () => {
    try {
      const { error } = await supabase.from('transactions').insert({
        project_id: params.id,
        ...newTransaction,
      });

      if (error) throw error;

      await fetchProjectData();
      setAddTransactionDialog(false);
      setNewTransaction({
        type: 'income',
        partner_name: '',
        item_name: '',
        amount: 0,
        due_date: '',
        notes: '',
      });
    } catch (err: any) {
      console.error('Error adding transaction:', err);
      setError(err.message);
    }
  };

  const handleAddExpense = async () => {
    try {
      const { error } = await supabase.from('project_expenses').insert({
        project_id: params.id,
        ...newExpense,
      });

      if (error) throw error;

      await fetchProjectData();
      setAddExpenseDialog(false);
      setNewExpense({
        description: '',
        amount: 0,
        expense_date: new Date().toISOString().split('T')[0],
      });
    } catch (err: any) {
      console.error('Error adding expense:', err);
      setError(err.message);
    }
  };

  const handleEditAssignee = () => {
    setAssigneeForm({
      name: project?.assignee_name || '',
      email: project?.assignee_email || '',
    });
    setEditAssigneeDialog(true);
  };

  const handleUpdateAssignee = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          assignee_name: assigneeForm.name || null,
          assignee_email: assigneeForm.email || null,
        })
        .eq('id', params.id);

      if (error) throw error;

      setEditAssigneeDialog(false);
      fetchProjectData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateTransactionStatus = async (
    transactionId: string,
    status: Transaction['status']
  ) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status })
        .eq('id', transactionId);

      if (error) throw error;
      await fetchProjectData();
    } catch (err: any) {
      console.error('Error updating transaction status:', err);
      setError(err.message);
    }
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

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      active: '진행중',
      completed: '완료',
      on_hold: '보류',
      canceled: '취소',
      pending: '대기',
      processing: '진행중',
      issue: '문제',
      not_issued: '미발행',
      issued: '발행완료',
      received: '수취완료',
    };
    return statusMap[status] || status;
  };

  const calculateTotalIncome = () =>
    transactions
      .filter((t) => t.type === 'income' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

  const calculateTotalExpense = () =>
    transactions
      .filter((t) => t.type === 'expense' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0) +
    expenses.reduce((sum, e) => sum + e.amount, 0);

  const actualProfit = calculateTotalIncome() - calculateTotalExpense();

  if (loading) return <LoadingState />;
  if (!project) return <ErrorAlert message='프로젝트를 찾을 수 없습니다.' />;

  return (
    <Box>
      <Box display='flex' alignItems='center' mb={3}>
        <IconButton onClick={() => router.back()} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant='h4' component='h1'>
          {project.name}
        </Typography>
      </Box>

      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

      {/* 프로젝트 개요 */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                프로젝트 정보
              </Typography>
              <Typography variant='body2' gutterBottom>
                <strong>고객:</strong> {project.quotes.customer_name_snapshot}
              </Typography>
              <Typography variant='body2' gutterBottom>
                <strong>견적번호:</strong> {project.quotes.quote_number}
              </Typography>
              <Typography variant='body2' gutterBottom>
                <strong>상태:</strong>{' '}
                <Chip
                  size='small'
                  label={getStatusText(project.status)}
                  color={getStatusColor(project.status)}
                />
              </Typography>
              {project.start_date && (
                <Typography variant='body2' gutterBottom>
                  <strong>기간:</strong> {project.start_date} ~{' '}
                  {project.end_date || '미정'}
                </Typography>
              )}
              <Box display='flex' justifyContent='space-between' alignItems='center' mt={2}>
                <Box>
                  <Typography variant='body2' gutterBottom>
                    <strong>담당자:</strong> {project.assignee_name || '미지정'}
                  </Typography>
                  {project.assignee_email && (
                    <Typography variant='body2' color='text.secondary'>
                      {project.assignee_email}
                    </Typography>
                  )}
                </Box>
                <Button
                  size='small'
                  variant='outlined'
                  startIcon={<EditIcon />}
                  onClick={handleEditAssignee}
                >
                  담당자 편집
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                수익성 분석
              </Typography>
              <Box display='flex' justifyContent='space-between' mb={1}>
                <Typography variant='body2'>예상 매출:</Typography>
                <Typography variant='body2' fontWeight='bold'>
                  {project.total_revenue.toLocaleString()}원
                </Typography>
              </Box>
              <Box display='flex' justifyContent='space-between' mb={1}>
                <Typography variant='body2'>예상 원가:</Typography>
                <Typography variant='body2' fontWeight='bold'>
                  {project.total_cost.toLocaleString()}원
                </Typography>
              </Box>
              <Box display='flex' justifyContent='space-between' mb={1}>
                <Typography variant='body2'>실제 수입:</Typography>
                <Typography
                  variant='body2'
                  fontWeight='bold'
                  color='primary.main'
                >
                  {calculateTotalIncome().toLocaleString()}원
                </Typography>
              </Box>
              <Box display='flex' justifyContent='space-between' mb={1}>
                <Typography variant='body2'>실제 지출:</Typography>
                <Typography
                  variant='body2'
                  fontWeight='bold'
                  color='error.main'
                >
                  {calculateTotalExpense().toLocaleString()}원
                </Typography>
              </Box>
              <Box
                display='flex'
                justifyContent='space-between'
                borderTop={1}
                borderColor='divider'
                pt={1}
              >
                <Typography variant='body2' fontWeight='bold'>
                  실제 수익:
                </Typography>
                <Typography
                  variant='body2'
                  fontWeight='bold'
                  color={actualProfit >= 0 ? 'success.main' : 'error.main'}
                >
                  {actualProfit.toLocaleString()}원
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 탭 메뉴 */}
      <Card>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
        >
          <Tab label='정산 관리' />
          <Tab label='기타 경비' />
          <Tab label='타임라인' />
          <Tab label='문서' />
        </Tabs>

        {/* 정산 관리 탭 */}
        {tabValue === 0 && (
          <CardContent>
            <Box
              display='flex'
              justifyContent='space-between'
              alignItems='center'
              mb={2}
            >
              <Typography variant='h6'>정산 내역</Typography>
              <Button
                variant='contained'
                startIcon={<AddIcon />}
                onClick={() => setAddTransactionDialog(true)}
              >
                거래 추가
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>구분</TableCell>
                    <TableCell>거래처</TableCell>
                    <TableCell>항목</TableCell>
                    <TableCell align='right'>금액</TableCell>
                    <TableCell>마감일</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>세금계산서</TableCell>
                    <TableCell>액션</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <Chip
                          size='small'
                          label={
                            transaction.type === 'income' ? '수입' : '지출'
                          }
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
                      <TableCell>{transaction.due_date || '-'}</TableCell>
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
                      <TableCell>
                        {transaction.status !== 'completed' && (
                          <Button
                            size='small'
                            onClick={() =>
                              updateTransactionStatus(
                                transaction.id,
                                'completed'
                              )
                            }
                          >
                            완료처리
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* 기타 경비 탭 */}
        {tabValue === 1 && (
          <CardContent>
            <Box
              display='flex'
              justifyContent='space-between'
              alignItems='center'
              mb={2}
            >
              <Typography variant='h6'>기타 경비</Typography>
              <Button
                variant='contained'
                startIcon={<AddIcon />}
                onClick={() => setAddExpenseDialog(true)}
              >
                경비 추가
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>날짜</TableCell>
                    <TableCell>내용</TableCell>
                    <TableCell align='right'>금액</TableCell>
                    <TableCell>영수증</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{expense.expense_date}</TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell align='right'>
                        <Typography color='error.main' fontWeight='bold'>
                          -{expense.amount.toLocaleString()}원
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {expense.receipt_url ? (
                          <IconButton size='small'>
                            <ReceiptIcon />
                          </IconButton>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* 타임라인 탭 */}
        {tabValue === 2 && (
          <CardContent>
            <ProjectTimeline 
              projectId={params.id} 
              onUpdate={fetchProjectData}
            />
          </CardContent>
        )}

        {/* 문서 탭 */}
        {tabValue === 3 && (
          <CardContent>
            <ProjectDocuments 
              projectId={params.id}
              onUpdate={fetchProjectData}
            />
          </CardContent>
        )}
      </Card>

      {/* 거래 추가 다이얼로그 */}
      <Dialog
        open={addTransactionDialog}
        onClose={() => setAddTransactionDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>거래 추가</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>구분</InputLabel>
              <Select
                value={newTransaction.type}
                label='구분'
                onChange={(e: SelectChangeEvent<'income' | 'expense'>) =>
                  setNewTransaction((prev) => ({
                    ...prev,
                    type: e.target.value as 'income' | 'expense',
                  }))
                }
              >
                <MenuItem value='income'>수입</MenuItem>
                <MenuItem value='expense'>지출</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label='거래처명'
              value={newTransaction.partner_name}
              onChange={(e) =>
                setNewTransaction((prev) => ({
                  ...prev,
                  partner_name: e.target.value,
                }))
              }
            />
            <TextField
              fullWidth
              label='항목명'
              value={newTransaction.item_name}
              onChange={(e) =>
                setNewTransaction((prev) => ({
                  ...prev,
                  item_name: e.target.value,
                }))
              }
            />
            <TextField
              fullWidth
              label='금액'
              type='number'
              value={newTransaction.amount}
              onChange={(e) =>
                setNewTransaction((prev) => ({
                  ...prev,
                  amount: Number(e.target.value),
                }))
              }
            />
            <TextField
              fullWidth
              label='마감일'
              type='date'
              InputLabelProps={{ shrink: true }}
              value={newTransaction.due_date}
              onChange={(e) =>
                setNewTransaction((prev) => ({
                  ...prev,
                  due_date: e.target.value,
                }))
              }
            />
            <TextField
              fullWidth
              label='메모'
              multiline
              rows={3}
              value={newTransaction.notes}
              onChange={(e) =>
                setNewTransaction((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddTransactionDialog(false)}>취소</Button>
          <Button onClick={handleAddTransaction} variant='contained'>
            추가
          </Button>
        </DialogActions>
      </Dialog>

      {/* 경비 추가 다이얼로그 */}
      <Dialog
        open={addExpenseDialog}
        onClose={() => setAddExpenseDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>기타 경비 추가</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label='날짜'
              type='date'
              InputLabelProps={{ shrink: true }}
              value={newExpense.expense_date}
              onChange={(e) =>
                setNewExpense((prev) => ({
                  ...prev,
                  expense_date: e.target.value,
                }))
              }
            />
            <TextField
              fullWidth
              label='내용'
              value={newExpense.description}
              onChange={(e) =>
                setNewExpense((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
            <TextField
              fullWidth
              label='금액'
              type='number'
              value={newExpense.amount}
              onChange={(e) =>
                setNewExpense((prev) => ({
                  ...prev,
                  amount: Number(e.target.value),
                }))
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddExpenseDialog(false)}>취소</Button>
          <Button onClick={handleAddExpense} variant='contained'>
            추가
          </Button>
        </DialogActions>
      </Dialog>

      {/* 담당자 편집 다이얼로그 */}
      <Dialog
        open={editAssigneeDialog}
        onClose={() => setEditAssigneeDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>담당자 편집</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label='담당자명'
              value={assigneeForm.name}
              onChange={(e) =>
                setAssigneeForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
            />
            <TextField
              fullWidth
              label='이메일'
              type='email'
              value={assigneeForm.email}
              onChange={(e) =>
                setAssigneeForm((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditAssigneeDialog(false)}>취소</Button>
          <Button onClick={handleUpdateAssignee} variant='contained'>
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
