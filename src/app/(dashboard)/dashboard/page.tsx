'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Description,
  Business,
  People,
  TrendingUp,
  Add,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 기본 통계 데이터 (하드코딩)
  const stats = {
    totalQuotes: 12,
    totalAmount: 45000000,
    activeCustomers: 8,
    activeProjects: 3,
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        대시보드
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* 통계 카드 */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Description color="primary" />
                  <Box>
                    <Typography variant="h6">{stats.totalQuotes}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      전체 견적서
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TrendingUp color="success" />
                  <Box>
                    <Typography variant="h6">
                      {(stats.totalAmount / 1000000).toFixed(0)}M
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      총 견적 금액
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <People color="info" />
                  <Box>
                    <Typography variant="h6">{stats.activeCustomers}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      활성 고객사
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Business color="warning" />
                  <Box>
                    <Typography variant="h6">{stats.activeProjects}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      진행중 프로젝트
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* 빠른 작업 버튼 */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              빠른 작업
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => router.push('/quotes/new')}
              >
                새 견적서 작성
              </Button>
              <Button
                variant="outlined"
                onClick={() => router.push('/quotes')}
              >
                견적서 목록
              </Button>
              <Button
                variant="outlined"
                onClick={() => router.push('/clients')}
              >
                고객사 관리
              </Button>
              <Button
                variant="outlined"
                onClick={() => router.push('/projects')}
              >
                프로젝트 관리
              </Button>
            </Box>
          </Paper>

          {/* 최근 활동 */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              최근 활동
            </Typography>
            <Alert severity="info">
              최근 활동 내역이 곧 표시됩니다.
            </Alert>
          </Paper>
        </>
      )}
    </Box>
  );
}