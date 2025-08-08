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
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Settings as SettingsIcon,
  Storage as DatabaseIcon,
} from '@mui/icons-material';
import { useStaticAuth } from '@/contexts/StaticAuthContext';

export function AdminPanel() {
  const { isAdmin } = useStaticAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // 클라이언트 사이드에서만 렌더링
  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR 중에는 렌더링하지 않음
  if (!mounted || !isAdmin) {
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
            onClick={() => router.push('/admin/settings')}
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

        </Box>
      </CardContent>
    </Card>
  );
}