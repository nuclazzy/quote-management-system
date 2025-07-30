'use client'

import { useState } from 'react'
import {
  Box,
  Typography,
  Button,
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
  Grid,
  Chip,
  InputAdornment,
  Alert,
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  Search,
  Inventory as InventoryIcon,
} from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { ItemService, type Item, type ItemCategory, type CreateItemData, type UpdateItemData } from '@/lib/services/item-service'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { useNotification } from '@/contexts/NotificationContext'

interface ItemListProps {
  items: Item[]
  categories: ItemCategory[]
  onRefresh: () => Promise<void>
}

interface ItemFormData {
  name: string
  description?: string
  category_id: string
  sku: string
  unit: string
  unit_price: number
  stock_quantity: number
  minimum_stock_level?: number
}

const units = [
  'EA', '개', '대', '세트', '박스', '팩', 'SET', 'LICENSE', '년', '월', 'KG', 'L', 'M', '기타'
]

export function ItemList({ items, categories, onRefresh }: ItemListProps) {
  const { handleError } = useErrorHandler()
  const { showNotification } = useNotification()
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ItemFormData>({
    defaultValues: {
      name: '',
      description: '',
      category_id: '',
      sku: '',
      unit: '',
      unit_price: 0,
      stock_quantity: 0,
      minimum_stock_level: 0,
    },
  })

  // 품목 생성 모드
  const handleCreateItem = () => {
    setEditingItem(null)
    reset({
      name: '',
      description: '',
      category_id: '',
      sku: '',
      unit: '',
      unit_price: 0,
      stock_quantity: 0,
      minimum_stock_level: 0,
    })
    setDialogOpen(true)
  }

  // 품목 수정 모드
  const handleEditItem = (item: Item) => {
    setEditingItem(item)
    reset({
      name: item.name,
      description: item.description || '',
      category_id: item.category_id,
      sku: item.sku,
      unit: item.unit,
      unit_price: item.unit_price,
      stock_quantity: item.stock_quantity,
      minimum_stock_level: item.minimum_stock_level || 0,
    })
    setDialogOpen(true)
  }

  // 품목 삭제 모드
  const handleDeleteItem = (item: Item) => {
    setItemToDelete(item)
    setDeleteDialogOpen(true)
  }

  // 폼 제출
  const onSubmit = async (data: ItemFormData) => {
    try {
      setLoading(true)
      
      if (editingItem) {
        // 수정
        await ItemService.updateItem(editingItem.id, {
          name: data.name,
          description: data.description,
          category_id: data.category_id,
          unit: data.unit,
          unit_price: data.unit_price,
          stock_quantity: data.stock_quantity,
          minimum_stock_level: data.minimum_stock_level,
        })
        showNotification('품목이 수정되었습니다.', 'success')
      } else {
        // 생성
        await ItemService.createItem({
          name: data.name,
          description: data.description,
          category_id: data.category_id,
          sku: data.sku,
          unit: data.unit,
          unit_price: data.unit_price,
          stock_quantity: data.stock_quantity,
          minimum_stock_level: data.minimum_stock_level,
        })
        showNotification('품목이 생성되었습니다.', 'success')
      }
      
      setDialogOpen(false)
      await onRefresh()
    } catch (err) {
      const errorMessage = handleError(err)
      showNotification(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  // 삭제 확인
  const confirmDelete = async () => {
    if (!itemToDelete) return

    try {
      setLoading(true)
      await ItemService.deleteItem(itemToDelete.id)
      showNotification('품목이 삭제되었습니다.', 'success')
      setDeleteDialogOpen(false)
      setItemToDelete(null)
      await onRefresh()
    } catch (err) {
      const errorMessage = handleError(err)
      showNotification(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  // 재고 상태 계산
  const getStockStatus = (item: Item) => {
    if (item.minimum_stock_level && item.stock_quantity <= item.minimum_stock_level) {
      return { label: '부족', color: 'error' as const }
    }
    return { label: '정상', color: 'success' as const }
  }

  // 품목 필터링
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.category?.name && item.category.name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <Box>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            품목 관리
          </Typography>
          <Typography variant="body2" color="text.secondary">
            품목을 생성, 수정, 삭제하고 재고를 관리할 수 있습니다
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateItem}
          disabled={categories.length === 0}
        >
          품목 추가
        </Button>
      </Box>

      {/* 카테고리 없음 경고 */}
      {categories.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          품목을 추가하려면 먼저 카테고리를 생성해주세요.
        </Alert>
      )}

      {/* 검색 */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="품목명, SKU, 설명으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* 품목 없음 상태 */}
      {filteredItems.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <InventoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm ? '검색 결과가 없습니다' : '등록된 품목이 없습니다'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchTerm ? '다른 검색어를 시도해보세요' : '첫 번째 품목을 추가해보세요'}
          </Typography>
          {!searchTerm && categories.length > 0 && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateItem}
            >
              품목 추가
            </Button>
          )}
        </Box>
      ) : (
        /* 품목 테이블 */
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>품목명</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>카테고리</TableCell>
                <TableCell>단위</TableCell>
                <TableCell align="right">단가</TableCell>
                <TableCell align="right">재고</TableCell>
                <TableCell>재고상태</TableCell>
                <TableCell align="center">작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.map((item) => {
                const stockStatus = getStockStatus(item)
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">
                          {item.name}
                        </Typography>
                        {item.description && (
                          <Typography variant="caption" color="text.secondary">
                            {item.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {item.sku}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={item.category?.name || '미분류'} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell align="right">
                      ₩{item.unit_price.toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      {item.stock_quantity.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={stockStatus.label}
                        color={stockStatus.color}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleEditItem(item)}
                        disabled={loading}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteItem(item)}
                        disabled={loading}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 품목 생성/수정 다이얼로그 */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingItem ? '품목 수정' : '품목 추가'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="name"
                    control={control}
                    rules={{ required: '품목명은 필수입니다.' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="품목명"
                        error={!!errors.name}
                        helperText={errors.name?.message}
                        margin="normal"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="sku"
                    control={control}
                    rules={{ required: 'SKU는 필수입니다.' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="SKU"
                        error={!!errors.sku}
                        helperText={errors.sku?.message || 'SKU는 고유해야 합니다'}
                        margin="normal"
                        disabled={!!editingItem} // 수정 시 SKU 변경 불가
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="설명"
                        multiline
                        rows={2}
                        margin="normal"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="category_id"
                    control={control}
                    rules={{ required: '카테고리는 필수입니다.' }}
                    render={({ field }) => (
                      <FormControl fullWidth margin="normal" error={!!errors.category_id}>
                        <InputLabel>카테고리</InputLabel>
                        <Select {...field} label="카테고리">
                          {categories.map((category) => (
                            <MenuItem key={category.id} value={category.id}>
                              {category.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="unit"
                    control={control}
                    rules={{ required: '단위는 필수입니다.' }}
                    render={({ field }) => (
                      <FormControl fullWidth margin="normal" error={!!errors.unit}>
                        <InputLabel>단위</InputLabel>
                        <Select {...field} label="단위">
                          {units.map((unit) => (
                            <MenuItem key={unit} value={unit}>
                              {unit}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Controller
                    name="unit_price"
                    control={control}
                    rules={{ 
                      required: '단가는 필수입니다.',
                      min: { value: 0, message: '단가는 0 이상이어야 합니다.' }
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="단가"
                        type="number"
                        error={!!errors.unit_price}
                        helperText={errors.unit_price?.message}
                        margin="normal"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₩</InputAdornment>,
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Controller
                    name="stock_quantity"
                    control={control}
                    rules={{ 
                      required: '재고는 필수입니다.',
                      min: { value: 0, message: '재고는 0 이상이어야 합니다.' }
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="현재 재고"
                        type="number"
                        error={!!errors.stock_quantity}
                        helperText={errors.stock_quantity?.message}
                        margin="normal"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Controller
                    name="minimum_stock_level"
                    control={control}
                    rules={{ 
                      min: { value: 0, message: '최소 재고는 0 이상이어야 합니다.' }
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="최소 재고 (선택)"
                        type="number"
                        error={!!errors.minimum_stock_level}
                        helperText={errors.minimum_stock_level?.message}
                        margin="normal"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDialogOpen(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={loading}
            >
              {editingItem ? '수정' : '생성'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
      >
        <DialogTitle>품목 삭제</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            이 작업은 되돌릴 수 없습니다.
          </Alert>
          <Typography>
            '<strong>{itemToDelete?.name}</strong>' 품목을 정말 삭제하시겠습니까?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            disabled={loading}
          >
            취소
          </Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            disabled={loading}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}