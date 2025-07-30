import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/get-user'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const isActive = searchParams.get('isActive')

    const offset = (page - 1) * limit

    // 기본 쿼리 구성
    let query = supabase
      .from('suppliers')
      .select(`
        *,
        created_by_profile:profiles!suppliers_created_by_fkey(id, full_name, email),
        updated_by_profile:profiles!suppliers_updated_by_fkey(id, full_name, email)
      `)

    // 검색 조건 추가
    if (search) {
      query = query.or(`name.ilike.%${search}%,contact_person.ilike.%${search}%,email.ilike.%${search}%,business_registration_number.ilike.%${search}%`)
    }

    // 상태 필터 추가
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      query = query.eq('is_active', isActive === 'true')
    }

    // 정렬 추가
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // 페이지네이션 추가
    query = query.range(offset, offset + limit - 1)

    const { data: suppliers, error, count } = await query

    if (error) {
      console.error('Suppliers fetch error:', error)
      return NextResponse.json({ error: '공급업체 정보를 불러오는데 실패했습니다.' }, { status: 500 })
    }

    // 전체 개수 조회 (페이지네이션용)
    let countQuery = supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true })

    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,contact_person.ilike.%${search}%,email.ilike.%${search}%,business_registration_number.ilike.%${search}%`)
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      countQuery = countQuery.eq('is_active', isActive === 'true')
    }

    const { count: totalCount } = await countQuery

    return NextResponse.json({
      suppliers: suppliers || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Suppliers API error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      business_registration_number,
      contact_person,
      email,
      phone,
      address,
      postal_code,
      website,
      payment_terms,
      lead_time_days,
      quality_rating,
      notes,
      is_active = true
    } = body

    // 필수 필드 검증
    if (!name) {
      return NextResponse.json({ error: '공급업체명은 필수입니다.' }, { status: 400 })
    }

    // 이메일 형식 검증
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다.' }, { status: 400 })
    }

    // 품질 평가 검증
    if (quality_rating && (quality_rating < 1 || quality_rating > 5)) {
      return NextResponse.json({ error: '품질 평가는 1-5 사이의 값이어야 합니다.' }, { status: 400 })
    }

    // 납기일수 검증
    if (lead_time_days && lead_time_days < 0) {
      return NextResponse.json({ error: '납기일수는 0 이상이어야 합니다.' }, { status: 400 })
    }

    // 사업자번호 중복 체크
    if (business_registration_number) {
      const { data: existingSupplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('business_registration_number', business_registration_number)
        .single()

      if (existingSupplier) {
        return NextResponse.json({ error: '이미 등록된 사업자번호입니다.' }, { status: 400 })
      }
    }

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert({
        name,
        business_registration_number: business_registration_number || null,
        contact_person: contact_person || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        postal_code: postal_code || null,
        website: website || null,
        payment_terms: payment_terms || null,
        lead_time_days: lead_time_days || 0,
        quality_rating: quality_rating || null,
        notes: notes || null,
        is_active,
        created_by: user.id,
        updated_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Supplier creation error:', error)
      return NextResponse.json({ error: '공급업체 생성에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ supplier }, { status: 201 })

  } catch (error) {
    console.error('Supplier creation API error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}