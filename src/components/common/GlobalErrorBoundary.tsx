'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import {
  Refresh as RefreshIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';
import { trackError } from '@/lib/analytics';
import GlobalErrorHandler from '@/lib/error/global-handler';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class GlobalErrorBoundary extends Component<Props, State> {
  private errorHandler: GlobalErrorHandler;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
    this.errorHandler = GlobalErrorHandler.getInstance();
    
    // 전역 에러 핸들러 초기화
    if (typeof window !== 'undefined') {
      this.errorHandler.initialize();
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 전역 에러 핸들러에 React 에러 전달
    this.errorHandler.handleReactError(error, errorInfo);

    // 에러 추적
    trackError(error, {
      errorInfo,
      component: 'GlobalErrorBoundary',
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleResetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display='flex'
          flexDirection='column'
          justifyContent='center'
          alignItems='center'
          minHeight='100vh'
          bgcolor='background.default'
          p={3}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 600,
              textAlign: 'center',
              borderRadius: 2,
            }}
          >
            <BugReportIcon
              sx={{
                fontSize: 64,
                color: 'error.main',
                mb: 2,
              }}
            />

            <Typography variant='h4' color='error' gutterBottom>
              앗! 문제가 발생했습니다
            </Typography>

            <Typography variant='body1' color='text.secondary' paragraph>
              예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
            </Typography>

            {process.env.NODE_ENV === 'development' && (
              <Alert severity='error' sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant='subtitle2' gutterBottom>
                  개발 모드 에러 정보:
                </Typography>
                <Typography
                  variant='body2'
                  component='pre'
                  sx={{ fontSize: '0.8rem' }}
                >
                  {this.state.error?.message}
                </Typography>
                {this.state.error?.stack && (
                  <Typography
                    variant='body2'
                    component='pre'
                    sx={{ fontSize: '0.7rem', mt: 1 }}
                  >
                    {this.state.error.stack}
                  </Typography>
                )}
              </Alert>
            )}

            <Box display='flex' gap={2} justifyContent='center'>
              <Button
                variant='contained'
                startIcon={<RefreshIcon />}
                onClick={this.handleRefresh}
                size='large'
              >
                페이지 새로고침
              </Button>

              <Button
                variant='outlined'
                onClick={this.handleResetError}
                size='large'
              >
                다시 시도
              </Button>
            </Box>

            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ mt: 3, display: 'block' }}
            >
              문제가 지속되면 관리자에게 문의해 주세요.
            </Typography>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
