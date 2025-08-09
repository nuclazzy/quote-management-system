'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Settings as SettingsIcon,
  Lock as PasswordIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useStaticAuth } from '@/contexts/StaticAuthContext';

export function AdminPanel() {
  const { isAdmin, adminLogout } = useStaticAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // 클라이언트 사이드에서만 렌더링
  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR 중에는 렌더링하지 않음
  if (!mounted || !isAdmin) {
    return null;
  }

  const handleLogout = () => {
    adminLogout();
    router.push('/dashboard');
  };

  const handlePasswordChange = () => {
    // 입력값 검증
    if (!currentPassword || !newPassword || !confirmPassword) {
      setSnackbarMessage('모든 필드를 입력해주세요.');
      setSnackbarOpen(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      setSnackbarMessage('새 비밀번호가 일치하지 않습니다.');
      setSnackbarOpen(true);
      return;
    }

    if (newPassword.length < 4) {
      setSnackbarMessage('새 비밀번호는 최소 4자리 이상이어야 합니다.');
      setSnackbarOpen(true);
      return;
    }

    // 현재 비밀번호 확인 (StaticAuth에서는 'admin')
    if (currentPassword !== 'admin') {
      setSnackbarMessage('현재 비밀번호가 일치하지 않습니다.');
      setSnackbarOpen(true);
      return;
    }

    // localStorage에 새 비밀번호 저장
    localStorage.setItem('motionsense_admin_password', newPassword);
    
    setSnackbarMessage('비밀번호가 성공적으로 변경되었습니다.');
    setSnackbarOpen(true);
    setPasswordDialogOpen(false);
    
    // 입력 필드 초기화
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handlePasswordDialogClose = () => {
    setPasswordDialogOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <Card sx={{ mb: 4, border: '2px solid #ff9800' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AdminIcon color="warning" />
            <Typography variant="h6" color="warning.main">
              관리자 모드
            </Typography>
            <Chip 
              label="ADMIN" 
              color="warning" 
              size="small" 
              variant="outlined"
            />
          </Box>
          <Button
            variant="outlined"
            color="warning"
            size="small"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
          >
            로그아웃
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          관리자 권한으로 로그인되었습니다. 시스템 관리 기능을 사용할 수 있습니다.
        </Alert>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            color="warning"
            onClick={() => router.push('/admin/settings')}
          >
            시스템 설정
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<PasswordIcon />}
            color="warning"
            onClick={() => setPasswordDialogOpen(true)}
          >
            비밀번호 변경
          </Button>

        </Box>

        {/* 비밀번호 변경 다이얼로그 */}
        <Dialog
          open={passwordDialogOpen}
          onClose={handlePasswordDialogClose}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>관리자 비밀번호 변경</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="현재 비밀번호"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="새 비밀번호"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="새 비밀번호 확인"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handlePasswordDialogClose}>취소</Button>
            <Button onClick={handlePasswordChange} variant="contained">
              변경
            </Button>
          </DialogActions>
        </Dialog>

        {/* 스낵바 */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity="success"
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
}