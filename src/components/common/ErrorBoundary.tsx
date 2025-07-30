'use client';

import React from 'react';
import { Box, Paper, Typography, Button, Alert } from '@mui/material';
import { Refresh as RefreshIcon, Home as HomeIcon } from '@mui/icons-material';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRefresh = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          display='flex'
          justifyContent='center'
          alignItems='center'
          minHeight='60vh'
          p={3}
        >
          <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
            <Alert severity='error' sx={{ mb: 3 }}>
              <Typography variant='h6' gutterBottom>
                오류가 발생했습니다
              </Typography>
              <Typography variant='body2' sx={{ mb: 2 }}>
                예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 홈으로
                이동해주세요.
              </Typography>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Typography
                  variant='caption'
                  component='pre'
                  sx={{
                    mt: 2,
                    p: 1,
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    textAlign: 'left',
                    fontSize: '0.7rem',
                    overflow: 'auto',
                  }}
                >
                  {this.state.error.message}
                </Typography>
              )}
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant='outlined'
                startIcon={<RefreshIcon />}
                onClick={this.handleRefresh}
              >
                새로고침
              </Button>
              <Button
                variant='contained'
                startIcon={<HomeIcon />}
                onClick={this.handleGoHome}
              >
                홈으로 이동
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
