import {
  createDirectApi,
  DirectQueryBuilder,
} from '@/lib/api/direct-integration';

// POST /api/admin/users/invite - 최적화된 사용자 초대
export const POST = createDirectApi(
  async ({ supabase, user, body }) => {
    const { email, full_name, role } = body;

    // 필수 필드 검증
    if (!email || !full_name || !role) {
      throw new Error('필수 필드가 누락되었습니다: email, full_name, role');
    }

    // 역할 검증
    if (!['admin', 'member'].includes(role)) {
      throw new Error('올바른 역할을 선택해주세요. (admin 또는 member)');
    }

    // 사용자 프로필과 회사 ID 조회
    const profileQuery = new DirectQueryBuilder(supabase, 'profiles');
    const userProfile = await profileQuery.findOne(user.id, 'role, company_id');
    
    if (!userProfile?.company_id) {
      throw new Error('회사 정보를 찾을 수 없습니다.');
    }

    // 이미 존재하는 사용자인지 확인
    const existingUser = await profileQuery.findOne('email', email);
    if (existingUser) {
      throw new Error('이미 존재하는 이메일입니다.');
    }

    // 임시 비밀번호 생성
    const tempPassword =
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-8).toUpperCase();

    // Auth 사용자 생성
    const { data: authUser, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: false, // 사용자가 비밀번호 설정 시 확인됨
        user_metadata: {
          full_name,
          role,
          company_id: userProfile.company_id,
          invited_by: user.id,
        },
      });

    if (createError) {
      console.error('Auth 사용자 생성 오류:', createError);
      throw new Error('사용자 계정 생성에 실패했습니다.');
    }

    if (!authUser.user) {
      throw new Error('사용자 계정 생성에 실패했습니다.');
    }

    // 사용자 프로필 생성
    try {
      await profileQuery.create({
        id: authUser.user.id,
        email,
        full_name,
        role,
        company_id: userProfile.company_id,
      });
    } catch (profileError) {
      console.error('사용자 프로필 생성 오류:', profileError);
      // Auth 사용자 정리
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw new Error('사용자 프로필 생성에 실패했습니다.');
    }

    // 초대 이메일 발송
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=invite`,
        data: {
          full_name,
          role,
          invited_by: user.id,
        },
      }
    );

    if (inviteError) {
      console.error('초대 이메일 발송 오류:', inviteError);
      // 이메일 발송 실패해도 요청은 성공으로 처리
    }

    return {
      message: '사용자 초대가 성공적으로 완료되었습니다.',
      user_id: authUser.user.id,
    };
  },
  { requireAuth: true, requiredRole: 'admin', enableLogging: true }
);
