'use client';

import { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  FileUpload,
  FileDownload,
  Search,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

interface Supplier {
  id: string;
  name: string;
  business_registration_number?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  website?: string;
  payment_terms?: string;
  lead_time_days?: number;
  quality_rating?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  created_by_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
  updated_by_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface SupplierFormData {
  name: string;
  business_registration_number?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  website?: string;
  payment_terms?: string;
  lead_time_days?: number;
  quality_rating?: number;
  notes?: string;
  is_active?: boolean;
}

const paymentTermsOptions = [
  '현금',
  '월말결제',
  '30일 후 결제',
  '60일 후 결제',
  '90일 후 결제',
  '기타',
];

export default function SuppliersPage() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(
    null
  );
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormData>({
    defaultValues: {
      name: '',
      business_registration_number: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      postal_code: '',
      website: '',
      payment_terms: '',
      lead_time_days: 0,
      quality_rating: undefined,
      notes: '',
      is_active: true,
    },
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      console.log('🔥 공급처: 직접 Supabase 연동으로 데이터 로딩');
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('✅ 공급처: 직접 연동 데이터 로딩 성공', data?.length);
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSnackbar({
        open: true,
        message: '공급업체 정보를 불러오는데 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = () => {
    setEditingSupplier(null);
    reset({
      name: '',
      business_registration_number: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      postal_code: '',
      website: '',
      payment_terms: '',
      lead_time_days: 0,
      quality_rating: undefined,
      notes: '',
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    reset({
      name: supplier.name,
      business_registration_number: supplier.business_registration_number || '',
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      postal_code: supplier.postal_code || '',
      website: supplier.website || '',
      payment_terms: supplier.payment_terms || '',
      lead_time_days: supplier.lead_time_days || 0,
      quality_rating: supplier.quality_rating || undefined,
      notes: supplier.notes || '',
      is_active: supplier.is_active,
    });
    setDialogOpen(true);
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setDeleteDialogOpen(true);
  };

  const onSubmit = async (data: SupplierFormData) => {
    try {
      console.log('🔥 공급처: 직접 Supabase 연동으로 저장', editingSupplier ? '수정' : '생성');
      const supabase = createClient();

      if (editingSupplier) {
        // 수정
        const { error } = await supabase
          .from('suppliers')
          .update({
            name: data.name,
            business_registration_number: data.business_registration_number || null,
            contact_person: data.contact_person || null,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address || null,
            postal_code: data.postal_code || null,
            website: data.website || null,
            payment_terms: data.payment_terms || null,
            lead_time_days: data.lead_time_days || 0,
            quality_rating: data.quality_rating || null,
            notes: data.notes || null,
            is_active: data.is_active !== false,
            updated_by: 'anonymous',
          })
          .eq('id', editingSupplier.id);

        if (error) throw error;
      } else {
        // 생성
        const { error } = await supabase
          .from('suppliers')
          .insert({
            name: data.name,
            business_registration_number: data.business_registration_number || null,
            contact_person: data.contact_person || null,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address || null,
            postal_code: data.postal_code || null,
            website: data.website || null,
            payment_terms: data.payment_terms || null,
            lead_time_days: data.lead_time_days || 0,
            quality_rating: data.quality_rating || null,
            notes: data.notes || null,
            is_active: data.is_active !== false,
            created_by: 'anonymous',
            updated_by: 'anonymous',
          });

        if (error) throw error;
      }

      console.log('✅ 공급처: 직접 연동 저장 성공');
      setSnackbar({
        open: true,
        message: editingSupplier
          ? '공급업체가 수정되었습니다.'
          : '공급업체가 생성되었습니다.',
        severity: 'success',
      });
      setDialogOpen(false);
      fetchSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      setSnackbar({
        open: true,
        message:
          error instanceof Error
            ? error.message
            : '공급업체 저장에 실패했습니다.',
        severity: 'error',
      });
    }
  };

  const confirmDelete = async () => {
    if (!supplierToDelete) return;

    try {
      console.log('🔥 공급처: 직접 Supabase 연동으로 삭제');
      const supabase = createClient();
      
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierToDelete.id);

      if (error) {
        throw error;
      }

      console.log('✅ 공급처: 직접 연동 삭제 성공');
      setSnackbar({
        open: true,
        message: '공급업체가 삭제되었습니다.',
        severity: 'success',
      });
      setDeleteDialogOpen(false);
      setSupplierToDelete(null);
      fetchSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      setSnackbar({
        open: true,
        message:
          error instanceof Error
            ? error.message
            : '공급업체 삭제에 실패했습니다.',
        severity: 'error',
      });
    }
  };

  const handleExportCSV = () => {
    const csvData = suppliers.map((supplier) => ({
      회사명: supplier.name,
      사업자번호: supplier.business_registration_number || '',
      담당자: supplier.contact_person || '',
      전화번호: supplier.phone || '',
      이메일: supplier.email || '',
      주소: supplier.address || '',
      우편번호: supplier.postal_code || '',
      웹사이트: supplier.website || '',
      결제조건: supplier.payment_terms || '',
      납기일수: supplier.lead_time_days || 0,
      품질평가: supplier.quality_rating || '',
      상태: supplier.is_active ? '활성' : '비활성',
      생성일: new Date(supplier.created_at).toLocaleDateString('ko-KR'),
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map((row) => Object.values(row || {}).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `공급업체_목록_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.contact_person &&
        supplier.contact_person
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      (supplier.email &&
        supplier.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (supplier.business_registration_number &&
        supplier.business_registration_number
          .toLowerCase()
          .includes(searchTerm.toLowerCase()))
  );

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: '회사명',
      width: 200,
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant='body2' fontWeight='medium'>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'business_registration_number',
      headerName: '사업자번호',
      width: 150,
      valueFormatter: (params) => params || '-',
    },
    {
      field: 'contact_person',
      headerName: '담당자',
      width: 120,
      valueFormatter: (params) => params || '-',
    },
    {
      field: 'phone',
      headerName: '전화번호',
      width: 130,
      valueFormatter: (params) => params || '-',
    },
    {
      field: 'email',
      headerName: '이메일',
      width: 200,
      flex: 1,
      valueFormatter: (params) => params || '-',
    },
    {
      field: 'payment_terms',
      headerName: '결제조건',
      width: 120,
      valueFormatter: (params) => params || '-',
    },
    {
      field: 'lead_time_days',
      headerName: '납기(일)',
      width: 80,
      valueFormatter: (params) => (params ? `${params}일` : '-'),
    },
    {
      field: 'quality_rating',
      headerName: '품질평가',
      width: 90,
      renderCell: (params) =>
        params.value ? (
          <Chip
            label={`${params.value}★`}
            color={
              params.value >= 4
                ? 'success'
                : params.value >= 3
                  ? 'warning'
                  : 'error'
            }
            size='small'
          />
        ) : (
          '-'
        ),
    },
    {
      field: 'is_active',
      headerName: '상태',
      width: 80,
      renderCell: (params) => (
        <Chip
          label={params.value ? '활성' : '비활성'}
          color={params.value ? 'success' : 'default'}
          size='small'
        />
      ),
    },
    {
      field: 'created_at',
      headerName: '등록일',
      width: 100,
      valueFormatter: (params) => new Date(params).toLocaleDateString('ko-KR'),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '작업',
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          key='edit'
          icon={<Edit />}
          label='수정'
          onClick={() => handleEditSupplier(params.row)}
        />,
        <GridActionsCellItem
          key='delete'
          icon={<Delete />}
          label='삭제'
          onClick={() => handleDeleteSupplier(params.row)}
        />,
      ],
    },
  ];

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant='h4' component='h1'>
          공급업체 관리
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant='outlined'
            startIcon={<FileUpload />}
            onClick={(e) => setMenuAnchorEl(e.currentTarget)}
          >
            일괄 작업
          </Button>
          <Button
            variant='contained'
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
          placeholder='공급업체명, 담당자, 이메일, 사업자번호로 검색...'
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
        maxWidth='md'
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
                  name='name'
                  control={control}
                  rules={{ required: '회사명은 필수입니다.' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label='회사명'
                      error={!!errors.name}
                      helperText={errors.name?.message}
                      margin='normal'
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name='business_registration_number'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label='사업자번호'
                      error={!!errors.business_registration_number}
                      helperText={errors.business_registration_number?.message}
                      margin='normal'
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name='contact_person'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label='담당자'
                      error={!!errors.contact_person}
                      helperText={errors.contact_person?.message}
                      margin='normal'
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name='phone'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label='전화번호'
                      margin='normal'
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name='email'
                  control={control}
                  rules={{
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: '올바른 이메일 형식이 아닙니다.',
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label='이메일'
                      type='email'
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      margin='normal'
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name='website'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label='웹사이트'
                      placeholder='예: company.com 또는 https://company.com'
                      margin='normal'
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name='payment_terms'
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth margin='normal'>
                      <InputLabel>결제조건</InputLabel>
                      <Select {...field} label='결제조건'>
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
              <Grid item xs={12} sm={6}>
                <Controller
                  name='lead_time_days'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label='납기일수'
                      type='number'
                      inputProps={{ min: 0 }}
                      margin='normal'
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name='quality_rating'
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth margin='normal'>
                      <InputLabel>품질평가</InputLabel>
                      <Select {...field} label='품질평가'>
                        <MenuItem value=''>선택 안함</MenuItem>
                        <MenuItem value={1}>1★ - 매우 낮음</MenuItem>
                        <MenuItem value={2}>2★ - 낮음</MenuItem>
                        <MenuItem value={3}>3★ - 보통</MenuItem>
                        <MenuItem value={4}>4★ - 좋음</MenuItem>
                        <MenuItem value={5}>5★ - 매우 좋음</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <Controller
                  name='address'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label='주소'
                      multiline
                      rows={2}
                      margin='normal'
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller
                  name='postal_code'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label='우편번호'
                      margin='normal'
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name='notes'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label='메모'
                      multiline
                      rows={3}
                      placeholder='공급업체 관련 메모를 입력하세요...'
                      margin='normal'
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>취소</Button>
            <Button type='submit' variant='contained'>
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
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
            견적서에서 사용 중인 공급업체는 비활성화되며, 사용하지 않는
            공급업체는 완전히 삭제됩니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button onClick={confirmDelete} color='error' variant='contained'>
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
        <MenuItem
          onClick={() => {
            setMenuAnchorEl(null);
            // TODO: CSV 업로드 기능 구현
          }}
        >
          <FileUpload sx={{ mr: 1 }} />
          CSV 파일 업로드
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchorEl(null);
            handleExportCSV();
          }}
        >
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
  );
}
