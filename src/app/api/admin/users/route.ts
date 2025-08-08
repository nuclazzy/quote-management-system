import { NextRequest, NextResponse } from 'next/server';

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

// 정적 사용자 목록 (StaticAuth용)
const STATIC_USERS: UserProfile[] = [
  {
    id: 'admin-1',
    email: 'admin@motionsense.co.kr',
    full_name: '관리자',
    role: 'admin',
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    last_sign_in_at: new Date().toISOString(),
  },
  {
    id: 'user-1',
    email: 'user@motionsense.co.kr',
    full_name: '일반사용자',
    role: 'member',
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    last_sign_in_at: '2024-01-15T10:30:00.000Z',
  },
];

// GET /api/admin/users - StaticAuth 사용자 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    let filteredUsers = [...STATIC_USERS];

    // 필터링
    if (role) {
      filteredUsers = filteredUsers.filter(user => user.role === role);
    }
    if (status === 'active') {
      filteredUsers = filteredUsers.filter(user => user.is_active === true);
    }
    if (status === 'inactive') {
      filteredUsers = filteredUsers.filter(user => user.is_active === false);
    }

    // 페이지네이션
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    const totalPages = Math.ceil(filteredUsers.length / limit);

    return NextResponse.json({
      success: true,
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total: filteredUsers.length,
        totalPages,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : '사용자 목록 조회에 실패했습니다.' 
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - StaticAuth 사용자 생성 (시뮬레이션)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, full_name, role = 'member' } = body;

    // 입력 검증
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        {
          success: false,
          error: { message: '올바른 이메일을 입력해주세요.' },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: { message: '비밀번호는 최소 6자리 이상이어야 합니다.' },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    if (!['member', 'admin'].includes(role)) {
      return NextResponse.json(
        {
          success: false,
          error: { message: '올바른 역할을 선택해주세요.' },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    // StaticAuth에서는 실제로 사용자를 생성하지 않고 성공 응답만 반환
    const newUser = {
      id: `user-${Date.now()}`,
      email,
      full_name: full_name || email.split('@')[0],
      role,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: {
        message: '사용자가 성공적으로 생성되었습니다.',
        user: newUser,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : '사용자 생성에 실패했습니다.' 
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}
