'use client';

import React, { memo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Paper,
  Grid,
} from '@mui/material';

interface LoadingSkeletonProps {
  variant?: 'table' | 'card' | 'form' | 'list' | 'dashboard';
  rows?: number;
  height?: number | string;
  animation?: 'pulse' | 'wave' | false;
}

const LoadingSkeleton = memo(function LoadingSkeleton({
  variant = 'card',
  rows = 3,
  height = 200,
  animation = 'wave',
}: LoadingSkeletonProps) {
  const TableSkeleton = () => (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <Box sx={{ p: 2 }}>
        <Skeleton
          variant='text'
          width='40%'
          height={32}
          animation={animation}
          sx={{ mb: 2 }}
        />
        <Stack spacing={1}>
          {Array.from({ length: rows }).map((_, index) => (
            <Box
              key={index}
              sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
            >
              <Skeleton
                variant='circular'
                width={40}
                height={40}
                animation={animation}
              />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant='text' width='60%' animation={animation} />
                <Skeleton variant='text' width='40%' animation={animation} />
              </Box>
              <Skeleton
                variant='rectangular'
                width={80}
                height={32}
                animation={animation}
              />
            </Box>
          ))}
        </Stack>
      </Box>
    </Paper>
  );

  const CardSkeleton = () => (
    <Stack spacing={2}>
      {Array.from({ length: rows }).map((_, index) => (
        <Card
          key={index}
          sx={{ height: typeof height === 'number' ? height : undefined }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Skeleton
                variant='circular'
                width={48}
                height={48}
                animation={animation}
                sx={{ mr: 2 }}
              />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant='text' width='70%' animation={animation} />
                <Skeleton variant='text' width='50%' animation={animation} />
              </Box>
            </Box>
            <Skeleton
              variant='rectangular'
              width='100%'
              height={60}
              animation={animation}
              sx={{ mb: 2, borderRadius: 1 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Skeleton variant='text' width='30%' animation={animation} />
              <Skeleton
                variant='rectangular'
                width={100}
                height={32}
                animation={animation}
              />
            </Box>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );

  const FormSkeleton = () => (
    <Paper sx={{ p: 3 }}>
      <Skeleton
        variant='text'
        width='30%'
        height={32}
        animation={animation}
        sx={{ mb: 3 }}
      />
      <Grid container spacing={3}>
        {Array.from({ length: rows * 2 }).map((_, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Skeleton
              variant='text'
              width='40%'
              height={20}
              animation={animation}
              sx={{ mb: 1 }}
            />
            <Skeleton
              variant='rectangular'
              width='100%'
              height={56}
              animation={animation}
              sx={{ borderRadius: 1 }}
            />
          </Grid>
        ))}
        <Grid item xs={12}>
          <Skeleton
            variant='text'
            width='20%'
            height={20}
            animation={animation}
            sx={{ mb: 1 }}
          />
          <Skeleton
            variant='rectangular'
            width='100%'
            height={120}
            animation={animation}
            sx={{ borderRadius: 1 }}
          />
        </Grid>
      </Grid>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Skeleton
          variant='rectangular'
          width={100}
          height={40}
          animation={animation}
        />
        <Skeleton
          variant='rectangular'
          width={120}
          height={40}
          animation={animation}
        />
      </Box>
    </Paper>
  );

  const ListSkeleton = () => (
    <Stack spacing={2}>
      {Array.from({ length: rows }).map((_, index) => (
        <Paper key={index} sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Skeleton
              variant='circular'
              width={32}
              height={32}
              animation={animation}
            />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant='text' width='80%' animation={animation} />
              <Skeleton variant='text' width='60%' animation={animation} />
            </Box>
            <Skeleton
              variant='rectangular'
              width={24}
              height={24}
              animation={animation}
            />
          </Box>
        </Paper>
      ))}
    </Stack>
  );

  const DashboardSkeleton = () => (
    <Box>
      {/* 헤더 */}
      <Box sx={{ mb: 3 }}>
        <Skeleton
          variant='text'
          width='40%'
          height={40}
          animation={animation}
        />
        <Skeleton
          variant='text'
          width='60%'
          height={20}
          animation={animation}
        />
      </Box>

      {/* 통계 카드들 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Skeleton
                    variant='circular'
                    width={40}
                    height={40}
                    animation={animation}
                  />
                  <Box sx={{ ml: 2, flex: 1 }}>
                    <Skeleton
                      variant='text'
                      width='70%'
                      animation={animation}
                    />
                  </Box>
                </Box>
                <Skeleton
                  variant='text'
                  width='50%'
                  height={32}
                  animation={animation}
                />
                <Skeleton variant='text' width='30%' animation={animation} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 차트 영역 */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Skeleton variant='text' width='30%' animation={animation} />
              <Skeleton
                variant='rectangular'
                width='100%'
                height={300}
                animation={animation}
                sx={{ mt: 2, borderRadius: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Skeleton variant='text' width='40%' animation={animation} />
              <Stack spacing={2} sx={{ mt: 2 }}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Box
                    key={index}
                    sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                  >
                    <Skeleton
                      variant='circular'
                      width={24}
                      height={24}
                      animation={animation}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton
                        variant='text'
                        width='70%'
                        animation={animation}
                      />
                    </Box>
                    <Skeleton
                      variant='text'
                      width='20%'
                      animation={animation}
                    />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderSkeleton = () => {
    switch (variant) {
      case 'table':
        return <TableSkeleton />;
      case 'card':
        return <CardSkeleton />;
      case 'form':
        return <FormSkeleton />;
      case 'list':
        return <ListSkeleton />;
      case 'dashboard':
        return <DashboardSkeleton />;
      default:
        return <CardSkeleton />;
    }
  };

  return (
    <Box
      role='progressbar'
      aria-label='콘텐츠 로딩 중'
      aria-busy='true'
      sx={{
        width: '100%',
        '& .MuiSkeleton-root': {
          bgcolor: 'grey.300',
          ...(animation === 'wave' && {
            '&::after': {
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
            },
          }),
        },
      }}
    >
      {renderSkeleton()}
    </Box>
  );
});

export default LoadingSkeleton;
