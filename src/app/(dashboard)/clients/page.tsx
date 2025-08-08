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
import { useStaticAuth } from '@/contexts/StaticAuthContext';
import { clientService, type Client, type ClientFormData } from '@/lib/services/client-service';

// 컴포넌트용 폼 타입 (서비스 타입과 호환)
interface ClientFormInput extends ClientFormData {
  business_number?: string;
  status?: 'active' | 'inactive';
}

export default function ClientsPage() {
  const { user } = useStaticAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
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
  } = useForm<ClientFormInput>({
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
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await clientService.getAllClients();
      
      if (response.error) {
        throw new Error(response.error as string);
      }
      
      setClients(response.data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setSnackbar({
        open: true,
        message: '클라이언트 정보를 불러오는데 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = () => {
    setEditingClient(null);
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

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    reset({
      name: client.name,
      business_number: client.business_registration_number || '',
      contact_person: client.contact_person,
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      status: client.is_active ? 'active' : 'inactive',
    });
    setDialogOpen(true);
  };

  const handleDeleteClient = (client: Client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const onSubmit = async (data: ClientFormInput) => {
    try {
      // 폼 데이터를 서비스 타입으로 변환
      const formData: ClientFormData = {
        name: data.name,
        business_registration_number: data.business_number || undefined,
        contact_person: data.contact_person,
        phone: data.phone || undefined,
        email: data.email || undefined,
        address: data.address || undefined,
        is_active: data.status === 'active',
      };

      const response = editingClient
        ? await clientService.updateClient(editingClient.id, formData)
        : await clientService.createClient(formData);

      if (response.error) {
        throw new Error(response.error as string);
      }

      setSnackbar({
        open: true,
        message: editingClient
          ? '클라이언트가 수정되었습니다.'
          : '클라이언트가 생성되었습니다.',
        severity: 'success',
      });
      setDialogOpen(false);
      fetchClients();
    } catch (error) {
      console.error('Error saving client:', error);
      setSnackbar({
        open: true,
        message: '클라이언트 저장에 실패했습니다.',
        severity: 'error',
      });
    }
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    try {
      const response = await clientService.deleteClient(clientToDelete.id);
      
      if (response.error) {
        throw new Error(response.error as string);
      }

      setSnackbar({
        open: true,
        message: '클라이언트가 삭제되었습니다.',
        severity: 'success',
      });
      setDeleteDialogOpen(false);
      setClientToDelete(null);
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      setSnackbar({
        open: true,
        message: '클라이언트 삭제에 실패했습니다.',
        severity: 'error',
      });
    }
  };

  const handleExportCSV = () => {
    const csvData = clients.map((client) => ({
      회사명: client.name,
      사업자번호: client.business_registration_number || '',
      담당자: client.contact_person,
      전화번호: client.phone || '',
      이메일: client.email || '',
      주소: client.address || '',
      상태: client.is_active ? '활성' : '비활성',
      생성일: new Date(client.created_at).toLocaleDateString('ko-KR'),
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map((row) => Object.values(row || {}).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `클라이언트_목록_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contact_person
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (client.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: GridColDef[] = [
    { field: 'name', headerName: '회사명', width: 200, flex: 1 },
    { 
      field: 'business_registration_number', 
      headerName: '사업자번호', 
      width: 150,
      valueFormatter: (params) => params.value || '-'
    },
    { field: 'contact_person', headerName: '담당자', width: 120 },
    { 
      field: 'phone', 
      headerName: '전화번호', 
      width: 130,
      valueFormatter: (params) => params.value || '-'
    },
    { 
      field: 'email', 
      headerName: '이메일', 
      width: 200, 
      flex: 1,
      valueFormatter: (params) => params.value || '-'
    },
    {
      field: 'is_active',
      headerName: '상태',
      width: 100,
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
          onClick={() => handleEditClient(params.row)}
        />,
        <GridActionsCellItem
          key='delete'
          icon={<Delete />}
          label='삭제'
          onClick={() => handleDeleteClient(params.row)}
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
          클라이언트 관리
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
            onClick={handleCreateClient}
          >
            클라이언트 추가
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <TextField
          fullWidth
          placeholder='클라이언트명, 담당자, 이메일로 검색...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
      </Paper>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredClients}
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

      {/* 클라이언트 생성/수정 다이얼로그 */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          {editingClient ? '클라이언트 수정' : '클라이언트 추가'}
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
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label='사업자번호'
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
              {editingClient ? '수정' : '생성'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>클라이언트 삭제</DialogTitle>
        <DialogContent>
          <Typography>
            '{clientToDelete?.name}' 클라이언트를 정말 삭제하시겠습니까? 이 작업은
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