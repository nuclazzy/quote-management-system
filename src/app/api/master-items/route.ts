import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { masterItemSchema, masterItemQuerySchema } from '@/lib/validations/master-items';
import { Database } from '@/types/supabase';

// GET /api/master-items - 마스터 품목 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies });
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const rawParams = {
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      is_active: searchParams.get('is_active') ? searchParams.get('is_active') === 'true' : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    };

    const validatedParams = masterItemQuerySchema.parse(rawParams);

    // 쿼리 빌더 시작
    let query = supabase
      .from('master_items')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // 검색 필터 적용
    if (validatedParams.search) {
      query = query.or(`name.ilike.%${validatedParams.search}%,description.ilike.%${validatedParams.search}%,category.ilike.%${validatedParams.search}%`);
    }

    if (validatedParams.category) {
      query = query.eq('category', validatedParams.category);
    }

    if (validatedParams.is_active !== undefined) {
      query = query.eq('is_active', validatedParams.is_active);
    }

    // 페이지네이션 적용
    const offset = (validatedParams.page - 1) * validatedParams.limit;
    query = query.range(offset, offset + validatedParams.limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('마스터 품목 조회 중 오류:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    // 페이지네이션 메타데이터 계산
    const totalPages = Math.ceil((count || 0) / validatedParams.limit);

    return NextResponse.json({
      data: data || [],
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: count || 0,
        totalPages,
        hasNextPage: validatedParams.page < totalPages,
        hasPrevPage: validatedParams.page > 1,
      }
    });
  } catch (error) {
    console.error('마스터 품목 조회 중 오류:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/master-items - 새 마스터 품목 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies });
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 요청 본문 파싱 및 검증
    const body = await request.json();
    const validatedData = masterItemSchema.parse(body);

    // 마스터 품목 생성
    const { data, error } = await supabase
      .from('master_items')
      .insert({
        ...validatedData,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('마스터 품목 생성 중 오류:', error);
      return NextResponse.json({ error: 'Failed to create master item' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input data', details: error }, { status: 400 });
    }
    
    console.error('마스터 품목 생성 중 오류:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}