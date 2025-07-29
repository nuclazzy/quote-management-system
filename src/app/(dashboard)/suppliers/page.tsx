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
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  FileUpload,
  FileDownload,
  Search,
} from '@mui/icons-material'
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid'
import { useForm, Controller } from 'react-hook-form'
import { useAuth } from '@/contexts/AuthContext'

interface Supplier {
  id: string
  name: string
  business_number: string
  contact_person: string
  phone: string
  email: string
  address: string
  category: string
  payment_terms: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

interface SupplierFormData {
  name: string
  business_number: string
  contact_person: string
  phone: string
  email: string
  address: string
  category: string
  payment_terms: string
  status: 'active' | 'inactive'
}

const supplierCategories = [
  '제조업체',
  '유통업체',
  '서비스업체',
  'IT 솔루션',
  '건설/시공',
  '컨설팅',
  '기타'
]

const paymentTermsOptions = [
  '현금',
  '월말결제',
  '30일 후 결제',
  '60일 후 결제',
  '90일 후 결제',
  '기타'
]

export default function SuppliersPage() {
  const { user } = useAuth()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null)
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormData>({
    defaultValues: {
      name: '',
      business_number: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      category: '',
      payment_terms: '',
      status: 'active',
    },
  })

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers')
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data)
      } else {
        throw new Error('공급업체 정보를 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      setSnackbar({
        open: true,
        message: '공급업체 정보를 불러오는데 실패했습니다.',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSupplier = () => {
    setEditingSupplier(null)
    reset({
      name: '',
      business_number: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      category: '',
      payment_terms: '',
      status: 'active',
    })
    setDialogOpen(true)
  }

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    reset({
      name: supplier.name,
      business_number: supplier.business_number,
      contact_person: supplier.contact_person,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      category: supplier.category,
      payment_terms: supplier.payment_terms,
      status: supplier.status,
    })
    setDialogOpen(true)
  }

  const handleDeleteSupplier = (supplier: Supplier) => {
    setSupplierToDelete(supplier)
    setDeleteDialogOpen(true)
  }

  const onSubmit = async (data: SupplierFormData) => {
    try {
      const url = editingSupplier ? `/api/suppliers/${editingSupplier.id}` : '/api/suppliers'
      const method = editingSupplier ? 'PUT' : 'POST'

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
          message: editingSupplier ? '공급업체가 수정되었습니다.' : '공급업체가 생성되었습니다.',
          severity: 'success'
        })
        setDialogOpen(false)
        fetchSuppliers()
      } else {
        throw new Error('공급업체 저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error saving supplier:', error)
      setSnackbar({
        open: true,
        message: '공급업체 저장에 실패했습니다.',
        severity: 'error'
      })
    }
  }

  const confirmDelete = async () => {
    if (!supplierToDelete) return

    try {
      const response = await fetch(`/api/suppliers/${supplierToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSnackbar({
          open: true,
          message: '공급업체가 삭제되었습니다.',
          severity: 'success'
        })
        setDeleteDialogOpen(false)
        setSupplierToDelete(null)
        fetchSuppliers()
      } else {
        throw new Error('공급업체 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error deleting supplier:', error)
      setSnackbar({
        open: true,
        message: '공급업체 삭제에 실패했습니다.',
        severity: 'error'
      })
    }
  }

  const handleExportCSV = () => {
    const csvData = suppliers.map(supplier => ({
      회사명: supplier.name,
      사업자번호: supplier.business_number,
      담당자: supplier.contact_person,
      전화번호: supplier.phone,
      이메일: supplier.email,
      주소: supplier.address,
      카테고리: supplier.category,
      결제조건: supplier.payment_terms,
      상태: supplier.status === 'active' ? '활성' : '비활성',
      생성일: new Date(supplier.created_at).toLocaleDateString('ko-KR'),
    }))

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `공급업체_목록_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns: GridColDef[] = [
    { field: 'name', headerName: '회사명', width: 180, flex: 1 },
    { field: 'business_number', headerName: '사업자번호', width: 130 },
    { field: 'contact_person', headerName: '담당자', width: 110 },
    { field: 'phone', headerName: '전화번호', width: 120 },
    { field: 'email', headerName: '이메일', width: 180, flex: 1 },
    { field: 'category', headerName: '카테고리', width: 110 },
    { field: 'payment_terms', headerName: '결제조건', width: 120 },
    {
      field: 'status',
      headerName: '상태',
      width: 80,
      renderCell: (params) => (
        <Chip
          label={params.value === 'active' ? '활성' : '비활성'}
          color={params.value === 'active' ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'created_at',
      headerName: '등록일',
      width: 100,
      valueFormatter: (value) => new Date(value).toLocaleDateString('ko-KR'),
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
          onClick={() => handleEditSupplier(params.row)}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<Delete />}
          label="삭제"
          onClick={() => handleDeleteSupplier(params.row)}
        />,
      ],
    },
  ]

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          공급업체 관리
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
            onClick={handleCreateSupplier}
          >
            공급업체 추가
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <TextField
          fullWidth
          placeholder="회사명, 담당자, 이메일, 카테고리로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
      </Paper>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredSuppliers}
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

      {/* 공급업체 생성/수정 다이얼로그 */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingSupplier ? '공급업체 수정' : '공급업체 추가'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: '회사명은 필수입니다.' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="회사명"
                      error={!!errors.name}
                      helperText={errors.name?.message}
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="business_number"
                  control={control}
                  rules={{ required: '사업자번호는 필수입니다.' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="사업자번호"
                      error={!!errors.business_number}
                      helperText={errors.business_number?.message}
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="contact_person"
                  control={control}
                  rules={{ required: '담당자명은 필수입니다.' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="담당자"
                      error={!!errors.contact_person}
                      helperText={errors.contact_person?.message}
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="전화번호"
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
                        {supplierCategories.map((category) => (
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
                  name="payment_terms"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth margin="normal">
                      <InputLabel>결제조건</InputLabel>
                      <Select
                        {...field}
                        label="결제조건"
                      >
                        {paymentTermsOptions.map((terms) => (
                          <MenuItem key={terms} value={terms}>
                            {terms}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="email"
                  control={control}
                  rules={{ 
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: '올바른 이메일 형식이 아닙니다.'
                    }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="이메일"
                      type="email"
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="address"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="주소"
                      multiline
                      rows={2}
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
              {editingSupplier ? '수정' : '생성'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>공급업체 삭제</DialogTitle>
        <DialogContent>
          <Typography>
            '{supplierToDelete?.name}' 공급업체를 정말 삭제하시겠습니까?
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