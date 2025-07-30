'use client';

import { ReactNode } from 'react';
import {
  usePermission,
  useRole,
  useUserPermissions,
} from '@/hooks/usePermissions';
import { CircularProgress, Box, Alert } from '@mui/material';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  role?: 'super_admin' | 'admin' | 'member';
  requireAll?: boolean; // permissions 배열의 모든 권한이 필요한지 (기본: false - 하나만 있으면 됨)
  fallback?: ReactNode;
  showLoading?: boolean;
  showError?: boolean;
}

export default function PermissionGuard({
  children,
  permission,
  permissions,
  role,
  requireAll = false,
  fallback = null,
  showLoading = true,
  showError = false,
}: PermissionGuardProps) {
  // 단일 권한 체크
  const singlePermissionCheck = usePermission(permission || '');

  // 역할 체크
  const roleCheck = useRole(role || 'member');

  // 여러 권한 체크
  const userPermissions = useUserPermissions();

  // 로딩 상태 결정
  const isLoading =
    (permission && singlePermissionCheck.loading) ||
    (role && roleCheck.loading) ||
    (permissions && permissions.length > 0 && userPermissions.loading);

  // 권한 체크 결과 계산
  const hasAccess = () => {
    // 역할 기반 체크
    if (role && !roleCheck.hasRole) {
      return false;
    }

    // 단일 권한 체크
    if (permission && !singlePermissionCheck.hasPermission) {
      return false;
    }

    // 여러 권한 체크
    if (permissions && permissions.length > 0) {
      if (requireAll) {
        return userPermissions.hasAllPermissions(permissions);
      } else {
        return userPermissions.hasAnyPermission(permissions);
      }
    }

    return true;
  };

  // 로딩 중인 경우
  if (isLoading && showLoading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' p={2}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  // 권한이 없는 경우
  if (!hasAccess()) {
    if (showError) {
      return (
        <Alert severity='warning' sx={{ m: 1 }}>
          이 기능에 접근할 권한이 없습니다.
        </Alert>
      );
    }
    return <>{fallback}</>;
  }

  // 권한이 있는 경우 자식 컴포넌트 렌더링
  return <>{children}</>;
}

// 사용 편의를 위한 특화된 컴포넌트들
export function AdminOnly({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <PermissionGuard role='admin' fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function SuperAdminOnly({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <PermissionGuard role='super_admin' fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function WithPermission({
  permission,
  children,
  fallback,
}: {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <PermissionGuard permission={permission} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function WithAnyPermission({
  permissions,
  children,
  fallback,
}: {
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <PermissionGuard
      permissions={permissions}
      requireAll={false}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}

export function WithAllPermissions({
  permissions,
  children,
  fallback,
}: {
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <PermissionGuard
      permissions={permissions}
      requireAll={true}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}
