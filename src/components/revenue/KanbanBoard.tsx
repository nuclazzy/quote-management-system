'use client';

import { useState, useEffect, DragEvent } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Avatar,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  MoreVert,
  CalendarToday,
  AttachMoney,
  Person,
  Description,
  Warning,
  CheckCircle,
  Schedule,
  Error,
  Add,
  Edit,
  Delete,
  Receipt,
} from '@mui/icons-material';

// 정산 상태 컬럼 정의
const COLUMNS = [
  { id: 'pending', title: '대기', color: '#FFA726', icon: Schedule },
  { id: 'processing', title: '진행중', color: '#42A5F5', icon: Schedule },
  { id: 'completed', title: '완료', color: '#66BB6A', icon: CheckCircle },
  { id: 'issue', title: '이슈', color: '#EF5350', icon: Error },
] as const;

type ColumnId = typeof COLUMNS[number]['id'];

export interface Transaction {
  id: string;
  project_id: string;
  project_name: string;
  type: 'income' | 'expense';
  partner_name: string;
  item_name: string;
  amount: number;
  due_date?: string;
  status: ColumnId;
  tax_invoice_status: 'not_issued' | 'issued' | 'received';
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface KanbanBoardProps {
  transactions: Transaction[];
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onCreateTransaction: (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

export default function KanbanBoard({
  transactions,
  onUpdateTransaction,
  onDeleteTransaction,
  onCreateTransaction,
}: KanbanBoardProps) {
  const [draggedItem, setDraggedItem] = useState<Transaction | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    type: 'income',
    status: 'pending',
    tax_invoice_status: 'not_issued',
  });

  // 컬럼별 거래 분류
  const getTransactionsByColumn = (columnId: ColumnId) => {
    return transactions.filter((t) => t.status === columnId);
  };

  // 드래그 시작
  const handleDragStart = (e: DragEvent<HTMLDivElement>, transaction: Transaction) => {
    setDraggedItem(transaction);
    e.dataTransfer.effectAllowed = 'move';
    // 드래그 중인 아이템에 반투명 효과
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  // 드래그 끝
  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    setDraggedItem(null);
    setDragOverColumn(null);
    // 반투명 효과 제거
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  // 드래그 오버 (컬럼 위)
  const handleDragOver = (e: DragEvent<HTMLDivElement>, columnId: ColumnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  // 드래그 떠남 (컬럼에서)
  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  // 드롭 (컬럼에)
  const handleDrop = async (e: DragEvent<HTMLDivElement>, columnId: ColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedItem && draggedItem.status !== columnId) {
      await onUpdateTransaction(draggedItem.id, { status: columnId });
    }
  };

  // 메뉴 열기
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, transaction: Transaction) => {
    setAnchorEl(event.currentTarget);
    setSelectedTransaction(transaction);
  };

  // 메뉴 닫기
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTransaction(null);
  };

  // 편집 다이얼로그 열기
  const handleEditOpen = () => {
    setEditDialog(true);
    handleMenuClose();
  };

  // 삭제 처리
  const handleDelete = async () => {
    if (selectedTransaction) {
      await onDeleteTransaction(selectedTransaction.id);
      handleMenuClose();
    }
  };

  // 새 거래 생성
  const handleCreate = async () => {
    await onCreateTransaction(newTransaction as Omit<Transaction, 'id' | 'created_at' | 'updated_at'>);
    setCreateDialog(false);
    setNewTransaction({
      type: 'income',
      status: 'pending',
      tax_invoice_status: 'not_issued',
    });
  };

  // 금액 포맷팅
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  // 날짜 포맷팅
  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  // D-Day 계산
  const getDaysRemaining = (dueDate?: string) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 세금계산서 상태 라벨
  const getTaxInvoiceLabel = (status: string) => {
    switch (status) {
      case 'not_issued':
        return '미발행';
      case 'issued':
        return '발행';
      case 'received':
        return '수령';
      default:
        return status;
    }
  };

  return (
    <Box>
      {/* 칸반 보드 헤더 */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">정산 관리 보드</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialog(true)}
        >
          새 정산 추가
        </Button>
      </Box>

      {/* 칸반 컬럼들 */}
      <Grid container spacing={2}>
        {COLUMNS.map((column) => {
          const columnTransactions = getTransactionsByColumn(column.id);
          const ColumnIcon = column.icon;
          const totalAmount = columnTransactions.reduce((sum, t) => 
            sum + (t.type === 'income' ? t.amount : -t.amount), 0
          );

          return (
            <Grid item xs={12} sm={6} md={3} key={column.id}>
              <Card
                sx={{
                  bgcolor: dragOverColumn === column.id ? 'action.hover' : 'background.paper',
                  minHeight: 600,
                  transition: 'background-color 0.2s',
                }}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <CardContent>
                  {/* 컬럼 헤더 */}
                  <Box display="flex" alignItems="center" mb={2}>
                    <ColumnIcon sx={{ color: column.color, mr: 1 }} />
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {column.title}
                    </Typography>
                    <Badge badgeContent={columnTransactions.length} color="primary">
                      <Box />
                    </Badge>
                  </Box>

                  {/* 컬럼 통계 */}
                  <Box mb={2} p={1} bgcolor="grey.100" borderRadius={1}>
                    <Typography variant="body2" color="text.secondary">
                      총액: {totalAmount >= 0 ? '+' : ''}{formatAmount(totalAmount)}원
                    </Typography>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  {/* 거래 카드들 */}
                  <Stack spacing={2}>
                    {columnTransactions.map((transaction) => {
                      const daysRemaining = getDaysRemaining(transaction.due_date);
                      const isOverdue = daysRemaining !== null && daysRemaining < 0;
                      const isUrgent = daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0;

                      return (
                        <Box
                          key={transaction.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e as any, transaction)}
                          onDragEnd={(e) => handleDragEnd(e as any)}
                          sx={{ cursor: 'move' }}
                        >
                        <Card
                          sx={{
                            '&:hover': {
                              boxShadow: 2,
                            },
                            border: isOverdue ? '2px solid #EF5350' : isUrgent ? '2px solid #FFA726' : 'none',
                          }}
                        >
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            {/* 카드 헤더 */}
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                              <Typography variant="subtitle2" fontWeight="bold" sx={{ flexGrow: 1 }}>
                                {transaction.project_name}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={(e) => handleMenuOpen(e, transaction)}
                              >
                                <MoreVert fontSize="small" />
                              </IconButton>
                            </Box>

                            {/* 거래 타입 및 금액 */}
                            <Box display="flex" alignItems="center" mb={1}>
                              <Chip
                                size="small"
                                label={transaction.type === 'income' ? '수입' : '지출'}
                                color={transaction.type === 'income' ? 'primary' : 'secondary'}
                                sx={{ mr: 1 }}
                              />
                              <Typography
                                variant="body1"
                                fontWeight="bold"
                                color={transaction.type === 'income' ? 'primary.main' : 'error.main'}
                              >
                                {transaction.type === 'income' ? '+' : '-'}
                                {formatAmount(transaction.amount)}원
                              </Typography>
                            </Box>

                            {/* 거래처 */}
                            <Box display="flex" alignItems="center" mb={1}>
                              <Person fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                {transaction.partner_name}
                              </Typography>
                            </Box>

                            {/* 항목명 */}
                            <Box display="flex" alignItems="center" mb={1}>
                              <Description fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {transaction.item_name}
                              </Typography>
                            </Box>

                            {/* 마감일 및 D-Day */}
                            {transaction.due_date && (
                              <Box display="flex" alignItems="center" mb={1}>
                                <CalendarToday fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                  {formatDate(transaction.due_date)}
                                </Typography>
                                {daysRemaining !== null && (
                                  <Chip
                                    size="small"
                                    label={daysRemaining === 0 ? 'D-Day' : daysRemaining > 0 ? `D-${daysRemaining}` : `D+${Math.abs(daysRemaining)}`}
                                    color={isOverdue ? 'error' : isUrgent ? 'warning' : 'default'}
                                    sx={{ ml: 1 }}
                                  />
                                )}
                              </Box>
                            )}

                            {/* 세금계산서 상태 */}
                            <Box display="flex" alignItems="center">
                              <Receipt fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                              <Chip
                                size="small"
                                label={getTaxInvoiceLabel(transaction.tax_invoice_status)}
                                variant="outlined"
                                color={transaction.tax_invoice_status === 'received' ? 'success' : 'default'}
                              />
                            </Box>

                            {/* 긴급 표시 */}
                            {(isOverdue || isUrgent) && (
                              <Box mt={1}>
                                <Chip
                                  size="small"
                                  icon={<Warning />}
                                  label={isOverdue ? '기한 초과' : '긴급'}
                                  color={isOverdue ? 'error' : 'warning'}
                                  sx={{ width: '100%' }}
                                />
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                        </Box>
                      );
                    })}
                  </Stack>

                  {/* 빈 컬럼 메시지 */}
                  {columnTransactions.length === 0 && (
                    <Box textAlign="center" py={4}>
                      <Typography variant="body2" color="text.secondary">
                        정산 내역이 없습니다
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* 컨텍스트 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditOpen}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          편집
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          삭제
        </MenuItem>
      </Menu>

      {/* 편집 다이얼로그 */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>정산 정보 수정</DialogTitle>
        <DialogContent>
          {selectedTransaction && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                label="프로젝트명"
                value={selectedTransaction.project_name}
                onChange={(e) => setSelectedTransaction({ ...selectedTransaction, project_name: e.target.value })}
                fullWidth
              />
              <TextField
                label="거래처"
                value={selectedTransaction.partner_name}
                onChange={(e) => setSelectedTransaction({ ...selectedTransaction, partner_name: e.target.value })}
                fullWidth
              />
              <TextField
                label="항목"
                value={selectedTransaction.item_name}
                onChange={(e) => setSelectedTransaction({ ...selectedTransaction, item_name: e.target.value })}
                fullWidth
              />
              <TextField
                label="금액"
                type="number"
                value={selectedTransaction.amount}
                onChange={(e) => setSelectedTransaction({ ...selectedTransaction, amount: Number(e.target.value) })}
                fullWidth
              />
              <TextField
                label="마감일"
                type="date"
                value={selectedTransaction.due_date || ''}
                onChange={(e) => setSelectedTransaction({ ...selectedTransaction, due_date: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <FormControl fullWidth>
                <InputLabel>세금계산서</InputLabel>
                <Select
                  value={selectedTransaction.tax_invoice_status}
                  onChange={(e) => setSelectedTransaction({ ...selectedTransaction, tax_invoice_status: e.target.value as Transaction['tax_invoice_status'] })}
                  label="세금계산서"
                >
                  <MenuItem value="not_issued">미발행</MenuItem>
                  <MenuItem value="issued">발행</MenuItem>
                  <MenuItem value="received">수령</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="메모"
                value={selectedTransaction.notes || ''}
                onChange={(e) => setSelectedTransaction({ ...selectedTransaction, notes: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>취소</Button>
          <Button
            onClick={async () => {
              if (selectedTransaction) {
                await onUpdateTransaction(selectedTransaction.id, selectedTransaction);
                setEditDialog(false);
              }
            }}
            variant="contained"
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 생성 다이얼로그 */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>새 정산 추가</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>구분</InputLabel>
              <Select
                value={newTransaction.type || 'income'}
                onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value as 'income' | 'expense' })}
                label="구분"
              >
                <MenuItem value="income">수입</MenuItem>
                <MenuItem value="expense">지출</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="프로젝트명"
              value={newTransaction.project_name || ''}
              onChange={(e) => setNewTransaction({ ...newTransaction, project_name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="거래처"
              value={newTransaction.partner_name || ''}
              onChange={(e) => setNewTransaction({ ...newTransaction, partner_name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="항목"
              value={newTransaction.item_name || ''}
              onChange={(e) => setNewTransaction({ ...newTransaction, item_name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="금액"
              type="number"
              value={newTransaction.amount || ''}
              onChange={(e) => setNewTransaction({ ...newTransaction, amount: Number(e.target.value) })}
              fullWidth
              required
            />
            <TextField
              label="마감일"
              type="date"
              value={newTransaction.due_date || ''}
              onChange={(e) => setNewTransaction({ ...newTransaction, due_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="메모"
              value={newTransaction.notes || ''}
              onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>취소</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!newTransaction.project_name || !newTransaction.partner_name || !newTransaction.item_name || !newTransaction.amount}
          >
            추가
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}