import {
  createDirectApi,
  DirectQueryBuilder,
} from '@/lib/api/direct-integration';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// PUT /api/admin/users/[id] - 최적화된 사용자 정보 수정 (최고 관리자만)
export const PUT = createDirectApi(
  async ({ supabase, user, body }, { params }: { params: { id: string } }) => {
    const { email, full_name, role, is_active } = body;

    // 입력 검증
    if (!email || !full_name || !role) {
      throw new Error('필수 필드가 누락되었습니다: email, full_name, role');
    }

    if (!['admin', 'member'].includes(role)) {
      throw new Error('올바른 역할을 선택해주세요. (admin 또는 member)');
    }

    // 자신의 계정 수정 제한
    if (params.id === user.id) {
      throw new Error('자신의 계정은 수정할 수 없습니다.');
    }

    const queryBuilder = new DirectQueryBuilder(supabase, 'profiles');

    // 수정할 사용자 존재 확인
    const targetUser = await queryBuilder.findOne<UserProfile>(params.id);
    if (!targetUser) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    // 프로필 업데이트
    const updatedUser = await queryBuilder.update<UserProfile>(params.id, {
      email,
      full_name,
      role,
      is_active: is_active !== undefined ? is_active : true,
    });

    // Auth 사용자 이메일 업데이트 (옵션)
    try {
      await supabase.auth.admin.updateUserById(params.id, { email });
    } catch (authUpdateError) {
      console.error('Auth 이메일 업데이트 오류:', authUpdateError);
      // Auth 업데이트 실패해도 계속 진행
    }

    return {
      message: '사용자 정보가 성공적으로 수정되었습니다.',
      user: updatedUser,
    };
  },
  { requireAuth: true, requiredRole: 'super_admin', enableLogging: true }
);

// DELETE /api/admin/users/[id] - 최적화된 사용자 삭제 (최고 관리자만)
export const DELETE = createDirectApi(
  async ({ supabase, user }, { params }: { params: { id: string } }) => {
    // 자신의 계정 삭제 방지
    if (params.id === user.id) {
      throw new Error('자신의 계정은 삭제할 수 없습니다.');
    }

    const queryBuilder = new DirectQueryBuilder(supabase, 'profiles');

    // 삭제할 사용자 존재 확인
    const userToDelete = await queryBuilder.findOne<UserProfile>(params.id);
    if (!userToDelete) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    // 프로필 데이터 먼저 삭제 (CASCADE로 연관된 데이터도 삭제됨)
    await queryBuilder.delete(params.id);

    // Auth 사용자 삭제
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      params.id
    );

    if (deleteError) {
      console.error('Auth 사용자 삭제 오류:', deleteError);
      // Auth 삭제는 실패해도 프로필은 이미 삭제됨
    }

    return {
      message: '사용자가 성공적으로 삭제되었습니다.',
    };
  },
  { requireAuth: true, requiredRole: 'super_admin', enableLogging: true }
);
