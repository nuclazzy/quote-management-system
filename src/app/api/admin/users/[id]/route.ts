import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// PUT /api/admin/users/[id] - 사용자 정보 수정 (최고 관리자만)
export async function PUT(
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
    const { email, full_name, role, is_active } = body;

    // 입력 검증
    if (!email || !full_name || !role) {
      return NextResponse.json(
        {
          error: 'Missing required fields: email, full_name, role',
        },
        { status: 400 }
      );
    }

    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json(
        {
          error: 'Invalid role. Must be admin or member',
        },
        { status: 400 }
      );
    }

    // 자신의 계정 수정 제한
    if (params.id === user.id) {
      return NextResponse.json(
        {
          error: 'Cannot modify your own account',
        },
        { status: 400 }
      );
    }

    // 수정할 사용자 존재 확인
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', params.id)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 프로필 업데이트
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update({
        email,
        full_name,
        role,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Auth 사용자 이메일 업데이트 (옵션)
    try {
      await supabase.auth.admin.updateUserById(params.id, { email });
    } catch (authUpdateError) {
      console.error('Error updating auth email:', authUpdateError);
      // Auth 업데이트 실패해도 계속 진행
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error in admin user PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - 사용자 삭제 (최고 관리자만)
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

    // 자신의 계정 삭제 방지
    if (params.id === user.id) {
      return NextResponse.json(
        {
          error: 'Cannot delete your own account',
        },
        { status: 400 }
      );
    }

    // 삭제할 사용자 존재 확인
    const { data: userToDelete } = await supabase
      .from('profiles')
      .select('id, role, email')
      .eq('id', params.id)
      .single();

    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 프로필 데이터 먼저 삭제 (CASCADE로 연관된 데이터도 삭제됨)
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', params.id);

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError);
      return NextResponse.json(
        { error: 'Failed to delete user profile' },
        { status: 500 }
      );
    }

    // Auth 사용자 삭제
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      params.id
    );

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      // Auth 삭제는 실패해도 프로필은 이미 삭제됨
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error in admin user DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
