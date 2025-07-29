import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// GET /api/admin/users - 모든 사용자 조회 (최고 관리자만)
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 최고 관리자 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const search = searchParams.get('search')
    const role = searchParams.get('role')
    const status = searchParams.get('status')

    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at,
        last_sign_in_at
      `, { count: 'exact' })

    // 검색 필터
    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
    }

    // 역할 필터
    if (role) {
      query = query.eq('role', role)
    }

    // 상태 필터
    if (status === 'active') {
      query = query.eq('is_active', true)
    } else if (status === 'inactive') {
      query = query.eq('is_active', false)
    }

    // 정렬 및 페이지네이션
    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    const { data: users, error, count } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json({
      users: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Error in admin users GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/users - 사용자 직접 생성 (최고 관리자만)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 최고 관리자 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, full_name, role = 'member' } = body

    // 입력 검증
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    if (!['member', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // 도메인 제한 확인
    if (!email.endsWith('@motionsense.co.kr')) {
      return NextResponse.json({ 
        error: 'Only @motionsense.co.kr email addresses are allowed' 
      }, { status: 400 })
    }

    // 이미 존재하는 사용자인지 확인
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    // Supabase Admin API로 새 사용자 생성
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || email.split('@')[0]
      }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // 프로필 생성
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email: newUser.user.email,
        full_name: full_name || email.split('@')[0],
        role,
        is_active: true
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // 프로필 생성 실패 시 인증 사용자도 삭제
      await supabase.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name: full_name || email.split('@')[0],
        role
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error in admin users POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}