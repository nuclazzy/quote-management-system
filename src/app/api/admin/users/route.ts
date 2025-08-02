import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireRole } from '@/lib/auth/secure-middleware';
import { secureLog } from '@/lib/utils/secure-logger';
import { parseSearchParams } from '@/app/api/lib/base';
import { createServerClient } from '@/lib/supabase/server';

// GET /api/admin/users - 모든 사용자 조회 (관리자 이상)
export async function GET(request: NextRequest) {
  return withAuth(request, async ({ user, supabase }) => {
    secureLog.apiRequest('GET', '/api/admin/users', user.id);
    
    const { page, limit, offset } = parseSearchParams(request);
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    let query = supabase.from('profiles').select(
      `
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at,
        last_sign_in_at
      `,
      { count: 'exact' }
    );

    // 역할 필터
    if (role) {
      query = query.eq('role', role);
    }

    // 상태 필터
    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    // 정렬 및 페이지네이션
    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      secureLog.error('Error fetching users', error);
      throw new Error('Failed to fetch users');
    }

    return {
      users: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }, requireRole('admin'));
}

// POST /api/admin/users - 사용자 직접 생성 (최고 관리자만)
export async function POST(request: NextRequest) {
  return withAuth(request, async ({ user, supabase }) => {
    secureLog.apiRequest('POST', '/api/admin/users', user.id);

    const body = await request.json();
    const { email, password, full_name, role = 'member' } = body;

    // 입력 검증
    if (!email || !email.includes('@')) {
      throw new Error('Valid email is required');
    }

    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    if (!['member', 'admin'].includes(role)) {
      throw new Error('Invalid role');
    }

    // 도메인 제한 확인
    if (!email.endsWith('@motionsense.co.kr')) {
      throw new Error('Only @motionsense.co.kr email addresses are allowed');
    }

    // 이미 존재하는 사용자인지 확인
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new Error('User already exists');
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
      secureLog.error('Error creating user', createError);
      throw new Error('Failed to create user');
    }

    // 프로필 생성
    const { error: profileError } = await supabase.from('profiles').insert({
      id: newUser.user.id,
      email: newUser.user.email,
      full_name: full_name || email.split('@')[0],
      role,
      is_active: true,
    });

    if (profileError) {
      secureLog.error('Error creating profile', profileError);
      // 프로필 생성 실패 시 인증 사용자도 삭제
      await supabase.auth.admin.deleteUser(newUser.user.id);
      throw new Error('Failed to create user profile');
    }

    secureLog.info('User created successfully', { 
      newUserId: newUser.user.id,
      email: email.replace(/(.{2}).*@/, '$1***@'),
      role,
      createdBy: user.id
    });

    return {
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name: full_name || email.split('@')[0],
        role,
      },
    };
  }, { requireSpecificRole: 'super_admin' });
}
