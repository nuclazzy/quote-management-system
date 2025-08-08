'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { createClient } from '@/lib/supabase/client';
import { useForm, Controller } from 'react-hook-form';

// 간소화된 품목 타입
interface SimpleItem {
  id: string;
  name: string;
  unit_price: number;
  unit: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

interface ItemFormData {
  name: string;
  unit_price: number;
  unit: string;
  description?: string;
}

const units = [
  'EA', '개', '대', '세트', '박스', '팩', 'SET', 'LICENSE', 
  '년', '월', 'KG', 'L', 'M', '기타'
];

export default function ItemsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SimpleItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SimpleItem | null>(null);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<ItemFormData>();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      console.log('🔥 품목: 직접 Supabase 연동으로 데이터 로딩');
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('items')
        .select('id, name, unit_price, unit, description, is_active, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('✅ 품목: 직접 연동 데이터 로딩 성공', data?.length);
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      setSnackbar({
        open: true,
        message: '품목 목록을 불러오는데 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ItemFormData) => {
    try {
      console.log('🔥 품목: 직접 Supabase 연동으로 저장', editingItem ? '수정' : '생성');
      const supabase = createClient();

      if (editingItem) {
        // 수정
        const { error } = await supabase
          .from('items')
          .update({
            name: data.name,
            unit_price: data.unit_price,
            unit: data.unit,
            description: data.description || null,
            updated_by: 'anonymous',
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        setSnackbar({
          open: true,
          message: '품목이 수정되었습니다.',
          severity: 'success',
        });
      } else {
        // 생성 - 카테고리 없이 간단하게
        const { error } = await supabase
          .from('items')
          .insert({
            name: data.name,
            unit_price: data.unit_price,
            unit: data.unit,
            description: data.description || null,
            sku: `ITEM-${Date.now()}`, // 자동 생성 SKU
            category_id: null, // 카테고리 없음
            stock_quantity: 0,
            minimum_stock_level: 0,
            item_type: 'product',
            is_active: true,
            created_by: 'anonymous',
            updated_by: 'anonymous',
          });

        if (error) throw error;
        setSnackbar({
          open: true,
          message: '품목이 생성되었습니다.',
          severity: 'success',
        });
      }

      console.log('✅ 품목: 직접 연동 저장 성공');
      setDialogOpen(false);
      setEditingItem(null);
      reset();
      fetchItems();
    } catch (error) {
      console.error('Error saving item:', error);
      setSnackbar({
        open: true,
        message: '품목 저장에 실패했습니다.',
        severity: 'error',
      });
    }
  };

  const handleEdit = (item: SimpleItem) => {
    setEditingItem(item);
    reset({
      name: item.name,
      unit_price: item.unit_price,
      unit: item.unit,
      description: item.description || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (item: SimpleItem) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      console.log('🔥 품목: 직접 Supabase 연동으로 삭제');
      const supabase = createClient();
      
      const { error } = await supabase
        .from('items')
        .update({ is_active: false }) // 실제로는 비활성화
        .eq('id', item.id);

      if (error) throw error;

      console.log('✅ 품목: 직접 연동 삭제 성공');
      setSnackbar({
        open: true,
        message: '품목이 삭제되었습니다.',
        severity: 'success',
      });
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      setSnackbar({
        open: true,
        message: '품목 삭제에 실패했습니다.',
        severity: 'error',
      });
    }
  };

  const handleCreateNew = () => {
    setEditingItem(null);
    reset({
      name: '',
      unit_price: 0,
      unit: 'EA',
      description: '',
    });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>품목 목록을 불러오는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          품목 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateNew}
        >
          품목 추가
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        간소화된 품목 관리입니다. 품목명, 단가, 단위만 관리하여 견적서 작성 시 사용할 수 있습니다.
      </Alert>

      {/* 품목 목록 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>품목명</TableCell>
              <TableCell>단가</TableCell>
              <TableCell>단위</TableCell>
              <TableCell>설명</TableCell>
              <TableCell>등록일</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length > 0 ? (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.unit_price.toLocaleString()}원</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>{item.description || '-'}</TableCell>
                  <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => handleEdit(item)} size="small">
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(item)} size="small" color="error">
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  등록된 품목이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 품목 추가/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingItem ? '품목 수정' : '품목 추가'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <TextField
              fullWidth
              label="품목명"
              margin="normal"
              {...register('name', { required: '품목명은 필수입니다.' })}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
            
            <TextField
              fullWidth
              label="단가"
              type="number"
              margin="normal"
              {...register('unit_price', { 
                required: '단가는 필수입니다.',
                min: { value: 0, message: '단가는 0 이상이어야 합니다.' }
              })}
              error={!!errors.unit_price}
              helperText={errors.unit_price?.message}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>단위</InputLabel>
              <Controller
                name="unit"
                control={control}
                defaultValue="EA"
                rules={{ required: '단위는 필수입니다.' }}
                render={({ field }) => (
                  <Select {...field} label="단위">
                    {units.map((unit) => (
                      <MenuItem key={unit} value={unit}>
                        {unit}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>

            <TextField
              fullWidth
              label="설명 (선택사항)"
              margin="normal"
              multiline
              rows={3}
              {...register('description')}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button type="submit" variant="contained">
              {editingItem ? '수정' : '추가'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}