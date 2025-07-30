import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// GET /api/admin/users/[id]/permissions - 사용자 권한 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 최고 관리자 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      );
    }

    // 사용자 권한 조회
    const { data: userPermissions, error: permError } = await supabase
      .from('user_permissions')
      .select(
        `
        id,
        is_active,
        granted_at,
        expires_at,
        permissions (
          id,
          name,
          description,
          category
        )
      `
      )
      .eq('user_id', params.id)
      .eq('is_active', true);

    if (permError) {
      console.error('Error fetching user permissions:', permError);
      return NextResponse.json(
        { error: 'Failed to fetch user permissions' },
        { status: 500 }
      );
    }

    // 모든 권한 조회 (비교용)
    const { data: allPermissions, error: allPermError } = await supabase
      .from('permissions')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (allPermError) {
      console.error('Error fetching all permissions:', allPermError);
      return NextResponse.json(
        { error: 'Failed to fetch permissions' },
        { status: 500 }
      );
    }

    // 사용자가 가진 권한 ID 목록
    const userPermissionIds = new Set(
      userPermissions?.map((up) => up.permissions.id) || []
    );

    // 권한을 카테고리별로 그룹화하고 사용자 보유 여부 표시
    const groupedPermissions =
      allPermissions?.reduce(
        (acc, permission) => {
          if (!acc[permission.category]) {
            acc[permission.category] = [];
          }
          acc[permission.category].push({
            ...permission,
            granted: userPermissionIds.has(permission.id),
          });
          return acc;
        },
        {} as Record<string, any[]>
      ) || {};

    return NextResponse.json({
      user_permissions: userPermissions || [],
      all_permissions: groupedPermissions,
    });
  } catch (error) {
    console.error('Error in user permissions GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users/[id]/permissions - 사용자 권한 부여
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 최고 관리자 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { permission_names, expires_at } = body;

    if (!permission_names || !Array.isArray(permission_names)) {
      return NextResponse.json(
        {
          error: 'permission_names array is required',
        },
        { status: 400 }
      );
    }

    // 권한 부여 결과
    const results = [];
    const errors = [];

    for (const permissionName of permission_names) {
      try {
        const { data: result, error } = await supabase.rpc(
          'grant_user_permission',
          {
            p_user_id: params.id,
            p_permission_name: permissionName,
            p_granted_by: user.id,
            p_expires_at: expires_at || null,
          }
        );

        if (error) {
          errors.push({ permission: permissionName, error: error.message });
        } else {
          results.push({ permission: permissionName, success: true });
        }
      } catch (err) {
        errors.push({
          permission: permissionName,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      granted: results,
      errors: errors,
      message: `${results.length} permissions granted${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
    });
  } catch (error) {
    console.error('Error in user permissions POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id]/permissions - 사용자 권한 취소
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 최고 관리자 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { permission_names } = body;

    if (!permission_names || !Array.isArray(permission_names)) {
      return NextResponse.json(
        {
          error: 'permission_names array is required',
        },
        { status: 400 }
      );
    }

    // 권한 취소 결과
    const results = [];
    const errors = [];

    for (const permissionName of permission_names) {
      try {
        const { data: result, error } = await supabase.rpc(
          'revoke_user_permission',
          {
            p_user_id: params.id,
            p_permission_name: permissionName,
          }
        );

        if (error) {
          errors.push({ permission: permissionName, error: error.message });
        } else {
          results.push({ permission: permissionName, success: true });
        }
      } catch (err) {
        errors.push({
          permission: permissionName,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      revoked: results,
      errors: errors,
      message: `${results.length} permissions revoked${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
    });
  } catch (error) {
    console.error('Error in user permissions DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
