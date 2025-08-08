'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Alert,
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Database as DatabaseIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

export function AdminPanel() {
  const { isAdmin, adminLogout } = useAuth();

  if (!isAdmin) {
    return null;
  }

  return (
    <Card sx={{ mb: 4, border: '2px solid #ff9800' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
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

        <Alert severity="info" sx={{ mb: 3 }}>
          관리자 권한으로 로그인되었습니다. 시스템 관리 기능을 사용할 수 있습니다.
        </Alert>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            color="warning"
            onClick={() => alert('시스템 설정 (구현 예정)')}
          >
            시스템 설정
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<DatabaseIcon />}
            color="warning"
            onClick={() => alert('데이터베이스 관리 (구현 예정)')}
          >
            데이터베이스 관리
          </Button>

          <Button
            variant="outlined"
            startIcon={<LogoutIcon />}
            color="error"
            onClick={() => {
              adminLogout();
              alert('관리자 모드를 종료했습니다.');
            }}
          >
            관리자 로그아웃
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}