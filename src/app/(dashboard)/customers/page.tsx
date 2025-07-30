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

interface Customer {
  id: string;
  name: string;
  business_number: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface CustomerFormData {
  name: string;
  business_number: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  status: 'active' | 'inactive';
}

export default function CustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
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
  } = useForm<CustomerFormData>({
    defaultValues: {
      name: '',
      business_number: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      status: 'active',
    },
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      } else {
        throw new Error('고객사 정보를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setSnackbar({
        open: true,
        message: '고객사 정보를 불러오는데 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = () => {
    setEditingCustomer(null);
    reset({
      name: '',
      business_number: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      status: 'active',
    });
    setDialogOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    reset({
      name: customer.name,
      business_number: customer.business_number,
      contact_person: customer.contact_person,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      status: customer.status,
    });
    setDialogOpen(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const onSubmit = async (data: CustomerFormData) => {
    try {
      const url = editingCustomer
        ? `/api/customers/${editingCustomer.id}`
        : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: editingCustomer
            ? '고객사가 수정되었습니다.'
            : '고객사가 생성되었습니다.',
          severity: 'success',
        });
        setDialogOpen(false);
        fetchCustomers();
      } else {
        throw new Error('고객사 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      setSnackbar({
        open: true,
        message: '고객사 저장에 실패했습니다.',
        severity: 'error',
      });
    }
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;

    try {
      const response = await fetch(`/api/customers/${customerToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: '고객사가 삭제되었습니다.',
          severity: 'success',
        });
        setDeleteDialogOpen(false);
        setCustomerToDelete(null);
        fetchCustomers();
      } else {
        throw new Error('고객사 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      setSnackbar({
        open: true,
        message: '고객사 삭제에 실패했습니다.',
        severity: 'error',
      });
    }
  };

  const handleExportCSV = () => {
    const csvData = customers.map((customer) => ({
      회사명: customer.name,
      사업자번호: customer.business_number,
      담당자: customer.contact_person,
      전화번호: customer.phone,
      이메일: customer.email,
      주소: customer.address,
      상태: customer.status === 'active' ? '활성' : '비활성',
      생성일: new Date(customer.created_at).toLocaleDateString('ko-KR'),
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map((row) => Object.values(row || {}).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `고객사_목록_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.contact_person
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: GridColDef[] = [
    { field: 'name', headerName: '회사명', width: 200, flex: 1 },
    { field: 'business_number', headerName: '사업자번호', width: 150 },
    { field: 'contact_person', headerName: '담당자', width: 120 },
    { field: 'phone', headerName: '전화번호', width: 130 },
    { field: 'email', headerName: '이메일', width: 200, flex: 1 },
    {
      field: 'status',
      headerName: '상태',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value === 'active' ? '활성' : '비활성'}
          color={params.value === 'active' ? 'success' : 'default'}
          size='small'
        />
      ),
    },
    {
      field: 'created_at',
      headerName: '등록일',
      width: 120,
      valueFormatter: (params) =>
        new Date(params.value).toLocaleDateString('ko-KR'),
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
          onClick={() => handleEditCustomer(params.row)}
        />,
        <GridActionsCellItem
          key='delete'
          icon={<Delete />}
          label='삭제'
          onClick={() => handleDeleteCustomer(params.row)}
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
          고객사 관리
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant='outlined'
            startIcon={<FileUpload />}
            onClick={() =>
              setMenuAnchorEl(document.getElementById('bulk-menu'))
            }
          >
            일괄 작업
          </Button>
          <Button
            variant='contained'
            startIcon={<Add />}
            onClick={handleCreateCustomer}
          >
            고객사 추가
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <TextField
          fullWidth
          placeholder='고객사명, 담당자, 이메일로 검색...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
      </Paper>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredCustomers}
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

      {/* 고객사 생성/수정 다이얼로그 */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          {editingCustomer ? '고객사 수정' : '고객사 추가'}
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
                  name='business_number'
                  control={control}
                  rules={{ required: '사업자번호는 필수입니다.' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label='사업자번호'
                      error={!!errors.business_number}
                      helperText={errors.business_number?.message}
                      margin='normal'
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name='contact_person'
                  control={control}
                  rules={{ required: '담당자명은 필수입니다.' }}
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
              <Grid item xs={12}>
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
              <Grid item xs={12}>
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
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>취소</Button>
            <Button type='submit' variant='contained'>
              {editingCustomer ? '수정' : '생성'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>고객사 삭제</DialogTitle>
        <DialogContent>
          <Typography>
            '{customerToDelete?.name}' 고객사를 정말 삭제하시겠습니까? 이 작업은
            되돌릴 수 없습니다.
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
