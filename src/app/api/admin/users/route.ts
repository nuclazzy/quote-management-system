import {
  createDirectApi,
  DirectQueryBuilder,
  createPaginatedResponse,
  parsePagination,
} from '@/lib/api/direct-integration';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string;
}

// GET /api/admin/users - 최적화된 모든 사용자 조회
export const GET = createDirectApi(
  async ({ supabase, searchParams }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'profiles');
    const pagination = parsePagination(searchParams);
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    // WHERE 조건
    const where: Record<string, any> = {};
    if (role) where.role = role;
    if (status === 'active') where.is_active = true;
    if (status === 'inactive') where.is_active = false;

    const { data: users, count } = await queryBuilder.findMany<UserProfile>({
      select: `
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at,
        last_sign_in_at
      `,
      where,
      sort: { by: 'created_at', order: 'desc' },
      pagination
    });

    return createPaginatedResponse(users, count, pagination.page, pagination.limit);
  },
  { requireAuth: true, requiredRole: 'admin', enableLogging: true }
);

// POST /api/admin/users - 최적화된 사용자 직접 생성 (최고 관리자만)
export const POST = createDirectApi(
  async ({ supabase, user, body }) => {
    const { email, password, full_name, role = 'member' } = body;

    // 입력 검증
    if (!email || !email.includes('@')) {
      throw new Error('올바른 이메일을 입력해주세요.');
    }

    if (!password || password.length < 6) {
      throw new Error('비밀번호는 최소 6자리 이상이어야 합니다.');
    }

    if (!['member', 'admin'].includes(role)) {
      throw new Error('올바른 역할을 선택해주세요.');
    }

    // 도메인 제한 확인
    if (!email.endsWith('@motionsense.co.kr')) {
      throw new Error('@motionsense.co.kr 이메일만 허용됩니다.');
    }

    // 이미 존재하는 사용자인지 확인
    const queryBuilder = new DirectQueryBuilder(supabase, 'profiles');
    const existingUser = await queryBuilder.findOne('email', email);

    if (existingUser) {
      throw new Error('이미 존재하는 사용자입니다.');
    }

    // Supabase Admin API로 새 사용자 생성
    const { data: newUser, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name || email.split('@')[0],
        },
      });

    if (createError) {
      console.error('사용자 생성 오류:', createError);
      throw new Error('사용자 생성에 실패했습니다.');
    }

    // 프로필 생성
    const profileData = await queryBuilder.create({
      id: newUser.user.id,
      email: newUser.user.email!,
      full_name: full_name || email.split('@')[0],
      role,
      is_active: true,
    });

    return {
      message: '사용자가 성공적으로 생성되었습니다.',
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name: full_name || email.split('@')[0],
        role,
      },
    };
  },
  { requireAuth: true, requiredRole: 'super_admin', enableLogging: true }
);
