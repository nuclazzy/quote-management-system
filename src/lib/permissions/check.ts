import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// 권한 체크 함수
export async function checkPermission(
  permissionName: string
): Promise<boolean> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return false;
    }

    // 사용자 역할 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // 최고 관리자는 모든 권한 보유
    if (profile?.role === 'super_admin') {
      return true;
    }

    // 특정 권한 확인
    const { data: hasPermission, error } = await supabase.rpc(
      'check_user_permission',
      {
        p_user_id: user.id,
        p_permission_name: permissionName,
      }
    );

    if (error) {
      console.error('Permission check error:', error);
      return false;
    }

    return hasPermission || false;
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
}

// 여러 권한 동시 체크
export async function checkMultiplePermissions(
  permissionNames: string[]
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  for (const permission of permissionNames) {
    results[permission] = await checkPermission(permission);
  }

  return results;
}

// 권한별 컴포넌트 표시 여부
export async function canAccess(permission: string): Promise<boolean> {
  return await checkPermission(permission);
}

// 역할 기반 접근 제어
export async function hasRole(
  role: 'super_admin' | 'admin' | 'member'
): Promise<boolean> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return false;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return profile?.role === role;
  } catch (error) {
    console.error('Role check failed:', error);
    return false;
  }
}

// 최소 역할 요구사항 체크
export async function hasMinimumRole(
  minimumRole: 'member' | 'admin' | 'super_admin'
): Promise<boolean> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return false;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) return false;

    const roleHierarchy = {
      member: 0,
      admin: 1,
      super_admin: 2,
    };

    const userRoleLevel =
      roleHierarchy[profile.role as keyof typeof roleHierarchy] ?? -1;
    const requiredLevel = roleHierarchy[minimumRole];

    return userRoleLevel >= requiredLevel;
  } catch (error) {
    console.error('Minimum role check failed:', error);
    return false;
  }
}

// 권한 목록 조회
export async function getUserPermissions(): Promise<string[]> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return [];
    }

    // 최고 관리자는 모든 권한 보유
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'super_admin') {
      // 모든 권한 반환
      const { data: allPermissions } = await supabase
        .from('permissions')
        .select('name');

      return allPermissions?.map((p) => p.name) || [];
    }

    // 사용자별 권한 조회
    const { data: userPermissions } = await supabase
      .from('user_permissions')
      .select(
        `
        permissions (
          name
        )
      `
      )
      .eq('user_id', user.id)
      .eq('is_active', true);

    return userPermissions?.map((up) => up.permissions.name) || [];
  } catch (error) {
    console.error('Get user permissions failed:', error);
    return [];
  }
}
