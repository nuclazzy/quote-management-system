'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  Alert,
  Snackbar,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Pagination
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Security as SecurityIcon
} from '@mui/icons-material'
import { supabase } from '@/lib/supabase/client'
import UserPermissionsDialog from '@/components/UserPermissionsDialog'

interface User {
  id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
  last_sign_in_at?: string
}

interface UserFormData {
  email: string
  password: string
  full_name: string
  role: 'member' | 'admin'
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  // 다이얼로그 상태
  const [openAddDialog, setOpenAddDialog] = useState(false)
  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [openPermissionsDialog, setOpenPermissionsDialog] = useState(false)
  
  // 선택된 사용자
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  
  // 폼 데이터
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    full_name: '',
    role: 'member'
  })
  
  // 메뉴 상태
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  
  // 알림 상태
  const [notification, setNotification] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'warning' | 'info'
  }>({
    open: false,
    message: '',
    severity: 'success'
  })

  // 사용자 목록 로드
  const loadUsers = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })
      
      // 검색 기능 제거 - 단순한 목록 표시만
      if (roleFilter) params.append('role', roleFilter)
      if (statusFilter) params.append('status', statusFilter)
      
      const response = await fetch(`/api/admin/users?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      
      const data = await response.json()
      setUsers(data.users)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      console.error('Error loading users:', error)
      showNotification('사용자 목록을 불러오는데 실패했습니다.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // 사용자 생성
  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create user')
      }
      
      showNotification('사용자가 성공적으로 생성되었습니다.', 'success')
      setOpenAddDialog(false)
      resetForm()
      loadUsers()
    } catch (error) {
      console.error('Error creating user:', error)
      showNotification(
        error instanceof Error ? error.message : '사용자 생성에 실패했습니다.',
        'error'
      )
    }
  }

  // 사용자 수정
  const handleUpdateUser = async () => {
    if (!selectedUser) return
    
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          is_active: selectedUser.is_active
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update user')
      }
      
      showNotification('사용자 정보가 성공적으로 수정되었습니다.', 'success')
      setOpenEditDialog(false)
      resetForm()
      loadUsers()
    } catch (error) {
      console.error('Error updating user:', error)
      showNotification(
        error instanceof Error ? error.message : '사용자 수정에 실패했습니다.',
        'error'
      )
    }
  }

  // 사용자 삭제
  const handleDeleteUser = async () => {
    if (!selectedUser) return
    
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete user')
      }
      
      showNotification('사용자가 성공적으로 삭제되었습니다.', 'success')
      setOpenDeleteDialog(false)
      setSelectedUser(null)
      loadUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      showNotification(
        error instanceof Error ? error.message : '사용자 삭제에 실패했습니다.',
        'error'
      )
    }
  }

  // 알림 표시
  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setNotification({ open: true, message, severity })
  }

  // 폼 리셋
  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'member'
    })
  }

  // 사용자 편집 모드 시작
  const startEditUser = (user: User) => {
    setSelectedUser(user)
    setFormData({
      email: user.email,
      password: '',
      full_name: user.full_name,
      role: user.role as 'member' | 'admin'
    })
    setOpenEditDialog(true)
    setAnchorEl(null)
  }

  // 권한 관리 모드 시작
  const startManagePermissions = (user: User) => {
    setSelectedUser(user)
    setOpenPermissionsDialog(true)
    setAnchorEl(null)
  }

  // 사용자 삭제 확인
  const confirmDeleteUser = (user: User) => {
    setSelectedUser(user)
    setOpenDeleteDialog(true)
    setAnchorEl(null)
  }

  // 역할 색상
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'error'
      case 'admin': return 'warning'
      case 'member': return 'primary'
      default: return 'default'
    }
  }

  // 역할 한글명
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return '최고 관리자'
      case 'admin': return '관리자'
      case 'member': return '일반 사용자'
      default: return role
    }
  }

  // API 호출 효과
  useEffect(() => {
    loadUsers()
  }, [page, roleFilter, statusFilter])

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        사용자 관리
      </Typography>

      {/* 사용자 추가 버튼 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'medium' }}>
          등록된 사용자 목록
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenAddDialog(true)}
        >
          사용자 추가
        </Button>
      </Box>

      {/* 사용자 테이블 */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>이메일</TableCell>
                  <TableCell>이름</TableCell>
                  <TableCell>역할</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>생성일</TableCell>
                  <TableCell>마지막 로그인</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      사용자가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.full_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={getRoleLabel(user.role)}
                          color={getRoleColor(user.role) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.is_active ? '활성' : '비활성'}
                          color={user.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('ko-KR')}
                      </TableCell>
                      <TableCell>
                        {user.last_sign_in_at 
                          ? new Date(user.last_sign_in_at).toLocaleDateString('ko-KR')
                          : '없음'
                        }
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          onClick={(e) => {
                            setSelectedUser(user)
                            setAnchorEl(e.currentTarget)
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 작업 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => startEditUser(selectedUser!)}>
          <EditIcon sx={{ mr: 1 }} />
          편집
        </MenuItem>
        <MenuItem onClick={() => startManagePermissions(selectedUser!)}>
          <SecurityIcon sx={{ mr: 1 }} />
          권한 관리
        </MenuItem>
        <MenuItem 
          onClick={() => confirmDeleteUser(selectedUser!)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          삭제
        </MenuItem>
      </Menu>

      {/* 사용자 추가 다이얼로그 */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>새 사용자 추가</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="이메일"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@motionsense.co.kr"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="비밀번호"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="최소 6자리"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="이름"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>역할</InputLabel>
                <Select
                  value={formData.role}
                  label="역할"
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'member' | 'admin' })}
                >
                  <MenuItem value="member">일반 사용자</MenuItem>
                  <MenuItem value="admin">관리자</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>취소</Button>
          <Button onClick={handleCreateUser} variant="contained">추가</Button>
        </DialogActions>
      </Dialog>

      {/* 사용자 편집 다이얼로그 */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>사용자 편집</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="이메일"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="이름"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>역할</InputLabel>
                <Select
                  value={formData.role}
                  label="역할"
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'member' | 'admin' })}
                >
                  <MenuItem value="member">일반 사용자</MenuItem>
                  <MenuItem value="admin">관리자</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>취소</Button>
          <Button onClick={handleUpdateUser} variant="contained">수정</Button>
        </DialogActions>
      </Dialog>

      {/* 사용자 삭제 확인 다이얼로그 */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>사용자 삭제 확인</DialogTitle>
        <DialogContent>
          <Typography>
            사용자 "{selectedUser?.full_name} ({selectedUser?.email})"를 삭제하시겠습니까?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            이 작업은 되돌릴 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>취소</Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* 알림 스낵바 */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      {/* 권한 관리 다이얼로그 */}
      <UserPermissionsDialog
        open={openPermissionsDialog}
        onClose={() => {
          setOpenPermissionsDialog(false)
          setSelectedUser(null)
        }}
        user={selectedUser}
      />
    </Box>
  )
}