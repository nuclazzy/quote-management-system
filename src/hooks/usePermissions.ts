'use client';

import { useState, useEffect } from 'react';
import {
  checkPermission,
  checkMultiplePermissions,
  hasRole,
  getUserPermissions,
} from '@/lib/permissions/check';

// 단일 권한 체크 훅
export function usePermission(permission: string) {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkUserPermission = async () => {
      try {
        setLoading(true);
        const result = await checkPermission(permission);
        setHasPermission(result);
      } catch (error) {
        console.error('Permission check failed:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkUserPermission();
  }, [permission]);

  return { hasPermission, loading };
}

// 여러 권한 동시 체크 훅
export function usePermissions(permissions: string[]) {
  const [permissionMap, setPermissionMap] = useState<Record<string, boolean>>(
    {}
  );
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkUserPermissions = async () => {
      try {
        setLoading(true);
        const results = await checkMultiplePermissions(permissions);
        setPermissionMap(results);
      } catch (error) {
        console.error('Permissions check failed:', error);
        setPermissionMap({});
      } finally {
        setLoading(false);
      }
    };

    if (permissions.length > 0) {
      checkUserPermissions();
    } else {
      setLoading(false);
    }
  }, [permissions]);

  return { permissions: permissionMap, loading };
}

// 역할 체크 훅
export function useRole(role: 'super_admin' | 'admin' | 'member') {
  const [hasRequiredRole, setHasRequiredRole] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        setLoading(true);
        const result = await hasRole(role);
        setHasRequiredRole(result);
      } catch (error) {
        console.error('Role check failed:', error);
        setHasRequiredRole(false);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, [role]);

  return { hasRole: hasRequiredRole, loading };
}

// 사용자 권한 목록 훅
export function useUserPermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadUserPermissions = async () => {
      try {
        setLoading(true);
        const userPermissions = await getUserPermissions();
        setPermissions(userPermissions);
      } catch (error) {
        console.error('Load user permissions failed:', error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    loadUserPermissions();
  }, []);

  const hasPermission = (permission: string) =>
    permissions.includes(permission);
  const hasAnyPermission = (permissionList: string[]) =>
    permissionList.some((permission) => permissions.includes(permission));
  const hasAllPermissions = (permissionList: string[]) =>
    permissionList.every((permission) => permissions.includes(permission));

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
