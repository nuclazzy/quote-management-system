'use client';

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import {
  ErrorOutline,
  Refresh,
  Home,
  WifiOff,
  Schedule,
  BugReport,
} from '@mui/icons-material';
import { getErrorMessage, isApiError } from '@/lib/api/client';

interface ErrorRecoveryProps {
  error: unknown;
  onRetry?: () => void;
  onReset?: () => void;
  onGoHome?: () => void;
  showDetails?: boolean;
  compact?: boolean;
}

interface ErrorAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'warning';
}

/**
 * 에러 유형별 메시지와 아이콘 반환
 */
function getErrorInfo(error: unknown) {
  const message = getErrorMessage(error);
  
  if (isApiError(error)) {
    switch (error.code) {
      case 'TIMEOUT':
        return {
          icon: <Schedule sx={{ fontSize: 48 }} />,
          title: '요청 시간 초과',
          description: '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
          color: 'warning' as const,
          severity: 'warning' as const,
        };
      case 'NETWORK_ERROR':
        return {
          icon: <WifiOff sx={{ fontSize: 48 }} />,
          title: '네트워크 연결 오류',
          description: '인터넷 연결을 확인하고 다시 시도해주세요.',
          color: 'error' as const,
          severity: 'error' as const,
        };
      case 'TRANSACTION_ERROR':
        return {
          icon: <BugReport sx={{ fontSize: 48 }} />,
          title: '데이터 처리 오류',
          description: '데이터 저장 중 문제가 발생했습니다. 다시 시도해주세요.',
          color: 'error' as const,
          severity: 'error' as const,
        };
      default:
        if (error.status === 404) {
          return {
            icon: <ErrorOutline sx={{ fontSize: 48 }} />,
            title: '페이지를 찾을 수 없음',
            description: '요청하신 페이지가 존재하지 않습니다.',
            color: 'warning' as const,
            severity: 'warning' as const,
          };
        }
        if (error.status === 403) {
          return {
            icon: <ErrorOutline sx={{ fontSize: 48 }} />,
            title: '접근 권한 없음',
            description: '이 작업을 수행할 권한이 없습니다.',
            color: 'error' as const,
            severity: 'error' as const,
          };
        }
        if (error.status === 500) {
          return {
            icon: <BugReport sx={{ fontSize: 48 }} />,
            title: '서버 오류',
            description: '서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
            color: 'error' as const,
            severity: 'error' as const,
          };
        }
    }
  }

  // 기본 에러
  return {
    icon: <ErrorOutline sx={{ fontSize: 48 }} />,
    title: '오류가 발생했습니다',
    description: message || '예상치 못한 오류가 발생했습니다.',
    color: 'error' as const,
    severity: 'error' as const,
  };
}

/**
 * 에러 복구 컴포넌트
 */
export default function ErrorRecovery({
  error,
  onRetry,
  onReset,
  onGoHome,
  showDetails = false,
  compact = false,
}: ErrorRecoveryProps) {
  const errorInfo = getErrorInfo(error);

  const defaultActions: ErrorAction[] = [
    ...(onRetry ? [{
      label: '다시 시도',
      icon: <Refresh />,
      onClick: onRetry,
      variant: 'contained' as const,
      color: 'primary' as const,
    }] : []),
    ...(onReset ? [{
      label: '초기화',
      icon: <Refresh />,
      onClick: onReset,
      variant: 'outlined' as const,
    }] : []),
    ...(onGoHome ? [{
      label: '홈으로 이동',
      icon: <Home />,
      onClick: onGoHome,
      variant: 'outlined' as const,
    }] : []),
  ];

  // 기본 액션이 없으면 페이지 새로고침과 홈 이동 제공
  const actions = defaultActions.length > 0 ? defaultActions : [
    {
      label: '페이지 새로고침',
      icon: <Refresh />,
      onClick: () => window.location.reload(),
      variant: 'contained' as const,
      color: 'primary' as const,
    },
    {
      label: '홈으로 이동',
      icon: <Home />,
      onClick: () => window.location.href = '/',
      variant: 'outlined' as const,
    },
  ];

  if (compact) {
    return (
      <Alert 
        severity={errorInfo.severity} 
        sx={{ mb: 2 }}
        action={
          <Stack direction="row" spacing={1}>
            {actions.slice(0, 2).map((action, index) => (
              <Button
                key={index}
                size="small"
                variant="text"
                onClick={action.onClick}
                startIcon={action.icon}
              >
                {action.label}
              </Button>
            ))}
          </Stack>
        }
      >
        <Typography variant="body2">
          {errorInfo.description}
        </Typography>
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
      <Card sx={{ maxWidth: 600, width: '100%' }}>
        <CardContent sx={{ textAlign: 'center', p: 4 }}>
          <Box sx={{ color: `${errorInfo.color}.main`, mb: 3 }}>
            {errorInfo.icon}
          </Box>
          
          <Typography variant="h5" component="h2" gutterBottom>
            {errorInfo.title}
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {errorInfo.description}
          </Typography>

          {/* 에러 상태 정보 */}
          {isApiError(error) && (
            <Box sx={{ mb: 3 }}>
              <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                {error.status && (
                  <Chip 
                    label={`HTTP ${error.status}`} 
                    size="small" 
                    color={errorInfo.color}
                    variant="outlined"
                  />
                )}
                {error.code && (
                  <Chip 
                    label={error.code} 
                    size="small" 
                    color={errorInfo.color}
                    variant="outlined"
                  />
                )}
                <Chip 
                  label={navigator.onLine ? '온라인' : '오프라인'} 
                  size="small" 
                  color={navigator.onLine ? 'success' : 'error'}
                  variant="outlined"
                />
              </Stack>
            </Box>
          )}

          {/* 액션 버튼들 */}
          <Stack 
            direction="row" 
            spacing={2} 
            justifyContent="center" 
            flexWrap="wrap"
            sx={{ mb: showDetails ? 3 : 0 }}
          >
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'outlined'}
                color={action.color || 'primary'}
                startIcon={action.icon}
                onClick={action.onClick}
                size="large"
              >
                {action.label}
              </Button>
            ))}
          </Stack>

          {/* 개발 환경에서만 상세 에러 정보 표시 */}
          {showDetails && process.env.NODE_ENV === 'development' && (
            <>
              <Divider sx={{ my: 3 }} />
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="subtitle2" gutterBottom>
                  개발 환경 디버그 정보:
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    overflow: 'auto',
                    maxHeight: 300,
                  }}
                >
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}
                  >
                    {error instanceof Error ? (
                      <>
                        <strong>Message:</strong> {error.message}
                        {error.stack && (
                          <>
                            {'\n\n'}
                            <strong>Stack Trace:</strong>
                            {'\n'}
                            {error.stack}
                          </>
                        )}
                        {isApiError(error) && error.details && (
                          <>
                            {'\n\n'}
                            <strong>Details:</strong>
                            {'\n'}
                            {JSON.stringify(error.details, null, 2)}
                          </>
                        )}
                      </>
                    ) : (
                      JSON.stringify(error, null, 2)
                    )}
                  </Typography>
                </Box>
              </Box>
            </>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            문제가 지속되면 관리자에게 문의해주세요.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}