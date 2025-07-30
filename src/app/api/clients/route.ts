import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// GET /api/clients - 고객사 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 사용자 프로필과 권한 확인
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const search = searchParams.get('search');
    const isActive = searchParams.get('is_active');

    let query = supabase.from('clients').select(
      `
        *,
        created_by_profile:profiles!clients_created_by_fkey(id, full_name, email),
        updated_by_profile:profiles!clients_updated_by_fkey(id, full_name, email)
      `,
      { count: 'exact' }
    );

    // 활성 상태 필터
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    // 검색 필터 (이름, 이메일, 연락처, 사업자번호로 검색)
    if (search) {
      query = query.or(`
        name.ilike.%${search}%,
        email.ilike.%${search}%,
        contact_person.ilike.%${search}%,
        business_registration_number.ilike.%${search}%
      `);
    }

    // 정렬 및 페이지네이션
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    const { data: clients, error, count } = await query;

    if (error) {
      console.error('Error fetching clients:', error);
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      clients: clients || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/clients error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/clients - 새 고객사 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 사용자 프로필과 권한 확인
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      business_registration_number,
      contact_person,
      email,
      phone,
      address,
      postal_code,
      website,
      notes,
    } = body;

    // 필수 필드 검증
    if (!name || !contact_person) {
      return NextResponse.json(
        { error: 'Missing required fields: name, contact_person' },
        { status: 400 }
      );
    }

    // 사업자번호 중복 검사 (사업자번호가 제공된 경우)
    if (business_registration_number) {
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('business_registration_number', business_registration_number)
        .single();

      if (existingClient) {
        return NextResponse.json(
          {
            error:
              'Client with this business registration number already exists',
          },
          { status: 400 }
        );
      }
    }

    // 새 고객사 생성
    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        name,
        business_registration_number: business_registration_number || null,
        contact_person,
        email: email || null,
        phone: phone || null,
        address: address || null,
        postal_code: postal_code || null,
        website: website || null,
        notes: notes || null,
        is_active: true,
        created_by: user.id,
        updated_by: user.id,
      })
      .select(
        `
        *,
        created_by_profile:profiles!clients_created_by_fkey(id, full_name, email)
      `
      )
      .single();

    if (error) {
      console.error('Error creating client:', error);
      return NextResponse.json(
        { error: 'Failed to create client' },
        { status: 500 }
      );
    }

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error('POST /api/clients error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
