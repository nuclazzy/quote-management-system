'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  Menu,
  MenuItem,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  FileUpload,
  FileDownload,
  Search,
  Inventory,
} from '@mui/icons-material'
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid'
import { useForm, Controller } from 'react-hook-form'
import { useAuth } from '@/contexts/AuthContext'

interface Item {
  id: string
  name: string
  description: string
  category: string
  unit: string
  unit_price: number
  cost_price: number
  supplier_id: string
  supplier_name?: string
  min_quantity: number
  max_quantity: number
  stock_quantity: number
  barcode?: string
  sku: string
  status: 'active' | 'inactive' | 'discontinued'
  created_at: string
  updated_at: string
}

interface ItemFormData {
  name: string
  description: string
  category: string
  unit: string
  unit_price: number
  cost_price: number
  supplier_id: string
  min_quantity: number
  max_quantity: number
  stock_quantity: number
  barcode?: string
  sku: string
  status: 'active' | 'inactive' | 'discontinued'
}

const itemCategories = [
  '하드웨어',
  '소프트웨어',
  '네트워크 장비',
  '보안 장비',
  '서버/스토리지',
  '모니터/디스플레이',
  '주변기기',
  '소모품',
  '라이선스',
  '서비스',
  '기타'
]

const units = [
  '개',
  '대',
  '세트',
  '박스',
  '팩',
  'EA',
  'SET',
  'LICENSE',
  '년',
  '월',
  '기타'
]

export default function ItemsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null)
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ItemFormData>({
    defaultValues: {
      name: '',
      description: '',
      category: '',
      unit: '',
      unit_price: 0,
      cost_price: 0,
      supplier_id: '',
      min_quantity: 0,
      max_quantity: 0,
      stock_quantity: 0,
      barcode: '',
      sku: '',
      status: 'active',
    },
  })

  useEffect(() => {
    fetchItems()
    fetchSuppliers()
  }, [])

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items')
      if (response.ok) {
        const data = await response.json()
        setItems(data)
      } else {
        throw new Error('품목 정보를 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('Error fetching items:', error)
      setSnackbar({
        open: true,
        message: '품목 정보를 불러오는데 실패했습니다.',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers')
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data.map((s: any) => ({ id: s.id, name: s.name })))
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

  const handleCreateItem = () => {
    setEditingItem(null)
    reset({
      name: '',
      description: '',
      category: '',
      unit: '',
      unit_price: 0,
      cost_price: 0,
      supplier_id: '',
      min_quantity: 0,
      max_quantity: 0,
      stock_quantity: 0,
      barcode: '',
      sku: '',
      status: 'active',
    })
    setDialogOpen(true)
  }

  const handleEditItem = (item: Item) => {
    setEditingItem(item)
    reset({
      name: item.name,
      description: item.description,
      category: item.category,
      unit: item.unit,
      unit_price: item.unit_price,
      cost_price: item.cost_price,
      supplier_id: item.supplier_id,
      min_quantity: item.min_quantity,
      max_quantity: item.max_quantity,
      stock_quantity: item.stock_quantity,
      barcode: item.barcode || '',
      sku: item.sku,
      status: item.status,
    })
    setDialogOpen(true)
  }

  const handleDeleteItem = (item: Item) => {
    setItemToDelete(item)
    setDeleteDialogOpen(true)
  }

  const onSubmit = async (data: ItemFormData) => {
    try {
      const url = editingItem ? `/api/items/${editingItem.id}` : '/api/items'
      const method = editingItem ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        setSnackbar({
          open: true,
          message: editingItem ? '품목이 수정되었습니다.' : '품목이 생성되었습니다.',
          severity: 'success'
        })
        setDialogOpen(false)
        fetchItems()
      } else {
        throw new Error('품목 저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error saving item:', error)
      setSnackbar({
        open: true,
        message: '품목 저장에 실패했습니다.',
        severity: 'error'
      })
    }
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return

    try {
      const response = await fetch(`/api/items/${itemToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSnackbar({
          open: true,
          message: '품목이 삭제되었습니다.',
          severity: 'success'
        })
        setDeleteDialogOpen(false)
        setItemToDelete(null)
        fetchItems()
      } else {
        throw new Error('품목 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      setSnackbar({
        open: true,
        message: '품목 삭제에 실패했습니다.',
        severity: 'error'
      })
    }
  }

  const handleExportCSV = () => {
    const csvData = items.map(item => ({
      품목명: item.name,
      설명: item.description,
      카테고리: item.category,
      단위: item.unit,
      단가: item.unit_price,
      원가: item.cost_price,
      공급업체: item.supplier_name || '',
      최소수량: item.min_quantity,
      최대수량: item.max_quantity,
      재고수량: item.stock_quantity,
      바코드: item.barcode || '',
      SKU: item.sku,
      상태: item.status === 'active' ? '활성' : item.status === 'inactive' ? '비활성' : '단종',
      생성일: new Date(item.created_at).toLocaleDateString('ko-KR'),
    }))

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `품목_목록_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStockStatus = (item: Item) => {
    if (item.stock_quantity <= item.min_quantity) {
      return { label: '부족', color: 'error' as const }
    } else if (item.stock_quantity >= item.max_quantity) {
      return { label: '과잉', color: 'warning' as const }
    } else {
      return { label: '정상', color: 'success' as const }
    }
  }

  const columns: GridColDef[] = [
    { field: 'name', headerName: '품목명', width: 200, flex: 1 },
    { field: 'category', headerName: '카테고리', width: 120 },
    { field: 'unit', headerName: '단위', width: 80 },
    {
      field: 'unit_price',
      headerName: '단가',
      width: 100,
      valueFormatter: (value) => `₩${value.toLocaleString()}`,
    },
    {
      field: 'cost_price',
      headerName: '원가',
      width: 100,
      valueFormatter: (value) => `₩${value.toLocaleString()}`,
    },
    { field: 'supplier_name', headerName: '공급업체', width: 140 },
    {
      field: 'stock_quantity',
      headerName: '재고',
      width: 80,
      renderCell: (params) => {
        const status = getStockStatus(params.row)
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {params.value}
            <Chip
              label={status.label}
              color={status.color}
              size="small"
              variant="outlined"
            />
          </Box>
        )
      },
    },
    { field: 'sku', headerName: 'SKU', width: 120 },
    {
      field: 'status',
      headerName: '상태',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={
            params.value === 'active' ? '활성' :
            params.value === 'inactive' ? '비활성' : '단종'
          }
          color={
            params.value === 'active' ? 'success' :
            params.value === 'inactive' ? 'default' : 'error'
          }
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '작업',
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<Edit />}
          label="수정"
          onClick={() => handleEditItem(params.row)}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<Delete />}
          label="삭제"
          onClick={() => handleDeleteItem(params.row)}
        />,
      ],
    },
  ]

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          품목 관리
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FileUpload />}
            onClick={(e) => setMenuAnchorEl(e.currentTarget)}
          >
            일괄 작업
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateItem}
          >
            품목 추가
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <TextField
          fullWidth
          placeholder="품목명, 설명, 카테고리, SKU로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
      </Paper>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredItems}
          columns={columns}
          loading={loading}
          checkboxSelection
          disableRowSelectionOnClick
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 25 },
            },
          }}
          pageSizeOptions={[25, 50, 100]}
        />
      </Paper>

      {/* 품목 생성/수정 다이얼로그 */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {editingItem ? '품목 수정' : '품목 추가'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
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
                      helperText={errors.sku?.message}
                      margin="normal"
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
                  name="category"
                  control={control}
                  rules={{ required: '카테고리는 필수입니다.' }}
                  render={({ field }) => (
                    <FormControl fullWidth margin="normal" error={!!errors.category}>
                      <InputLabel>카테고리</InputLabel>
                      <Select
                        {...field}
                        label="카테고리"
                      >
                        {itemCategories.map((category) => (
                          <MenuItem key={category} value={category}>
                            {category}
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
                      <Select
                        {...field}
                        label="단위"
                      >
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
              <Grid item xs={12} sm={6}>
                <Controller
                  name="unit_price"
                  control={control}
                  rules={{ required: '단가는 필수입니다.', min: 0 }}
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
              <Grid item xs={12} sm={6}>
                <Controller
                  name="cost_price"
                  control={control}
                  rules={{ min: 0 }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="원가"
                      type="number"
                      margin="normal"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₩</InputAdornment>,
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="supplier_id"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth margin="normal">
                      <InputLabel>공급업체</InputLabel>
                      <Select
                        {...field}
                        label="공급업체"
                      >
                        {suppliers.map((supplier) => (
                          <MenuItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="barcode"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="바코드"
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller
                  name="min_quantity"
                  control={control}
                  rules={{ min: 0 }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="최소 재고"
                      type="number"
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller
                  name="max_quantity"
                  control={control}
                  rules={{ min: 0 }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="최대 재고"
                      type="number"
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller
                  name="stock_quantity"
                  control={control}
                  rules={{ min: 0 }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="현재 재고"
                      type="number"
                      margin="normal"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>취소</Button>
            <Button type="submit" variant="contained">
              {editingItem ? '수정' : '생성'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>품목 삭제</DialogTitle>
        <DialogContent>
          <Typography>
            '{itemToDelete?.name}' 품목을 정말 삭제하시겠습니까?
            이 작업은 되돌릴 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* 일괄 작업 메뉴 */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => setMenuAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          setMenuAnchorEl(null)
          // TODO: CSV 업로드 기능 구현
        }}>
          <FileUpload sx={{ mr: 1 }} />
          CSV 파일 업로드
        </MenuItem>
        <MenuItem onClick={() => {
          setMenuAnchorEl(null)
          handleExportCSV()
        }}>
          <FileDownload sx={{ mr: 1 }} />
          CSV 내보내기
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}