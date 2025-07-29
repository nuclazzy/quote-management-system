'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Avatar,
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  PersonAdd,
  Email,
  AdminPanelSettings,
  Person,
  Search,
} from '@mui/icons-material'
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid'
import { useForm, Controller } from 'react-hook-form'
import { useAuth } from '@/contexts/AuthContext'

interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'member'
  avatar_url?: string
  created_at: string
  last_sign_in_at?: string
}

interface UserFormData {
  email: string
  full_name: string
  role: 'admin' | 'member'
}

interface InviteFormData {
  email: string
  full_name: string
  role: 'admin' | 'member'
}

export default function AdminUsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })

  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<UserFormData>()

  const {
    control: inviteControl,
    handleSubmit: handleInviteSubmit,
    reset: resetInvite,
    formState: { errors: inviteErrors },
  } = useForm<InviteFormData>({
    defaultValues: {
      email: '',
      full_name: '',
      role: 'member',
    },
  })

  // Check if current user is admin or super_admin
  if (!user?.profile?.role || !['admin', 'super_admin'].includes(user.profile.role)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          관리자 권한이 필요합니다.
        </Alert>
      </Box>
    )
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      // Use AuthService instead of direct API call
      const { AuthService } = await import('@/lib/auth/auth-service')
      const data = await AuthService.getUserList()
      setUsers(data)
    } catch (error: any) {
      console.error('Error fetching users:', error)
      setSnackbar({
        open: true,
        message: error.message || '사용자 정보를 불러오는데 실패했습니다.',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInviteUser = () => {
    resetInvite({
      email: '',
      full_name: '',
      role: 'member',
    })
    setInviteDialogOpen(true)
  }

  const handleEditUser = (userToEdit: User) => {
    setEditingUser(userToEdit)
    resetEdit({
      email: userToEdit.email,
      full_name: userToEdit.full_name,
      role: userToEdit.role,
    })
    setEditDialogOpen(true)
  }

  const handleDeleteUser = (userToDelete: User) => {
    setUserToDelete(userToDelete)
    setDeleteDialogOpen(true)
  }

  const onInviteSubmit = async (data: InviteFormData) => {
    try {
      const { AuthService } = await import('@/lib/auth/auth-service')
      await AuthService.inviteUser(data.email, data.full_name, data.role)
      
      setSnackbar({
        open: true,
        message: '사용자가 성공적으로 초대되었습니다.',
        severity: 'success'
      })
      setInviteDialogOpen(false)
      resetInvite()
      fetchUsers()
    } catch (error: any) {
      console.error('Error inviting user:', error)
      setSnackbar({
        open: true,
        message: error.message || '사용자 초대에 실패했습니다.',
        severity: 'error'
      })
    }
  }

  const onEditSubmit = async (data: UserFormData) => {
    if (!editingUser) return

    try {
      const { AuthService } = await import('@/lib/auth/auth-service')
      
      // Only update role if it's different and not super admin
      if (data.role !== editingUser.role && editingUser.email !== 'lewis@motionsense.co.kr') {
        await AuthService.changeUserRole(editingUser.id, data.role)
      }
      
      setSnackbar({
        open: true,
        message: '사용자 정보가 수정되었습니다.',
        severity: 'success'
      })
      setEditDialogOpen(false)
      setEditingUser(null)
      fetchUsers()
    } catch (error: any) {
      console.error('Error updating user:', error)
      setSnackbar({
        open: true,
        message: error.message || '사용자 정보 수정에 실패했습니다.',
        severity: 'error'
      })
    }
  }

  const confirmDelete = async () => {
    if (!userToDelete) return

    // Prevent self-deletion and super admin deletion
    if (userToDelete.id === user?.id) {
      setSnackbar({
        open: true,
        message: '자신의 계정은 삭제할 수 없습니다.',
        severity: 'error'
      })
      return
    }

    if (userToDelete.email === 'lewis@motionsense.co.kr') {
      setSnackbar({
        open: true,
        message: 'Super Admin 계정은 삭제할 수 없습니다.',
        severity: 'error'
      })
      return
    }

    try {
      const { AuthService } = await import('@/lib/auth/auth-service')
      await AuthService.deactivateUser(userToDelete.id)
      
      setSnackbar({
        open: true,
        message: '사용자가 비활성화되었습니다.',
        severity: 'success'
      })
      setDeleteDialogOpen(false)
      setUserToDelete(null)
      fetchUsers()
    } catch (error: any) {
      console.error('Error deactivating user:', error)
      setSnackbar({
        open: true,
        message: error.message || '사용자 비활성화에 실패했습니다.',
        severity: 'error'
      })
    }
  }

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns: GridColDef[] = [
    {
      field: 'avatar',
      headerName: '',
      width: 60,
      renderCell: (params) => (
        <Avatar
          src={params.row.avatar_url}
          sx={{ width: 32, height: 32 }}
        >
          {params.row.full_name[0]}
        </Avatar>
      ),
      sortable: false,
    },
    { field: 'full_name', headerName: '이름', width: 150, flex: 1 },
    { field: 'email', headerName: '이메일', width: 250, flex: 1 },
    {
      field: 'role',
      headerName: '권한',
      width: 120,
      renderCell: (params) => (
        <Chip
          icon={params.value === 'admin' ? <AdminPanelSettings /> : <Person />}
          label={params.value === 'admin' ? '관리자' : '사용자'}
          color={params.value === 'admin' ? 'primary' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'last_sign_in_at',
      headerName: '마지막 로그인',
      width: 150,
      valueFormatter: (params) => {
        if (!params.value) return '없음'
        return new Date(params.value).toLocaleDateString('ko-KR')
      },
    },
    {
      field: 'created_at',
      headerName: '가입일',
      width: 120,
      valueFormatter: (params) => new Date(params.value).toLocaleDateString('ko-KR'),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '작업',
      width: 100,
      getActions: (params) => {
        const actions = [
          <GridActionsCellItem
            key="edit"
            icon={<Edit />}
            label="수정"
            onClick={() => handleEditUser(params.row)}
          />
        ]

        // Only allow deletion if not current user
        if (params.row.id !== user?.id) {
          actions.push(
            <GridActionsCellItem
              key="delete"
              icon={<Delete />}
              label="삭제"
              onClick={() => handleDeleteUser(params.row)}
            />
          )
        }

        return actions
      },
    },
  ]

  const stats = [
    {
      title: '전체 사용자',
      value: users.length,
      icon: <Person />,
    },
    {
      title: '관리자',
      value: users.filter(u => u.role === 'admin').length,
      icon: <AdminPanelSettings />,
    },
    {
      title: '활성 사용자',
      value: users.filter(u => u.last_sign_in_at).length,
      icon: <Person />,
    },
  ]

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          사용자 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={handleInviteUser}
        >
          사용자 초대
        </Button>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {stat.icon}
                <Box>
                  <Typography variant="h4" component="div">
                    {stat.value}
                  </Typography>
                  <Typography color="text.secondary">
                    {stat.title}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mb: 3, p: 2 }}>
        <TextField
          fullWidth
          placeholder="이름 또는 이메일로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
      </Paper>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredUsers}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 25 },
            },
          }}
          pageSizeOptions={[25, 50, 100]}
        />
      </Paper>

      {/* 사용자 초대 다이얼로그 */}
      <Dialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>사용자 초대</DialogTitle>
        <form onSubmit={handleInviteSubmit(onInviteSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="email"
                  control={inviteControl}
                  rules={{ 
                    required: '이메일은 필수입니다.',
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
                      error={!!inviteErrors.email}
                      helperText={inviteErrors.email?.message}
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="full_name"
                  control={inviteControl}
                  rules={{ required: '이름은 필수입니다.' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="이름"
                      error={!!inviteErrors.full_name}
                      helperText={inviteErrors.full_name?.message}
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="role"
                  control={inviteControl}
                  render={({ field }) => (
                    <FormControl fullWidth margin="normal">
                      <InputLabel>권한</InputLabel>
                      <Select
                        {...field}
                        label="권한"
                      >
                        <MenuItem value="member">사용자</MenuItem>
                        <MenuItem value="admin">관리자</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInviteDialogOpen(false)}>취소</Button>
            <Button type="submit" variant="contained" startIcon={<Email />}>
              초대 발송
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 사용자 수정 다이얼로그 */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>사용자 정보 수정</DialogTitle>
        <form onSubmit={handleEditSubmit(onEditSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="email"
                  control={editControl}
                  rules={{ 
                    required: '이메일은 필수입니다.',
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
                      error={!!editErrors.email}
                      helperText={editErrors.email?.message}
                      margin="normal"
                      disabled
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="full_name"
                  control={editControl}
                  rules={{ required: '이름은 필수입니다.' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="이름"
                      error={!!editErrors.full_name}
                      helperText={editErrors.full_name?.message}
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="role"
                  control={editControl}
                  render={({ field }) => (
                    <FormControl fullWidth margin="normal">
                      <InputLabel>권한</InputLabel>
                      <Select
                        {...field}
                        label="권한"
                        disabled={editingUser?.id === user?.id} // Can't change own role
                      >
                        <MenuItem value="member">사용자</MenuItem>
                        <MenuItem value="admin">관리자</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>취소</Button>
            <Button type="submit" variant="contained">
              수정
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>사용자 삭제</DialogTitle>
        <DialogContent>
          <Typography>
            '{userToDelete?.full_name}' 사용자를 정말 삭제하시겠습니까?
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