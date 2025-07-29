import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const per_page = Math.min(parseInt(searchParams.get('per_page') || '10'), 100)
    const search = searchParams.get('search')
    const is_active = searchParams.get('is_active')
    const sort_by = searchParams.get('sort_by') || 'created_at'
    const sort_order = searchParams.get('sort_order') || 'desc'

    let queryBuilder = supabase
      .from('suppliers')
      .select('*', { count: 'exact' })

    // 검색 조건 적용
    if (search) {
      queryBuilder = queryBuilder.or(`name.ilike.%${search}%,contact_person.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // 활성/비활성 필터
    if (is_active !== null && is_active !== undefined) {
      queryBuilder = queryBuilder.eq('is_active', is_active === 'true')
    }

    // 정렬
    const validSortFields = ['name', 'created_at', 'updated_at']
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at'
    queryBuilder = queryBuilder.order(sortField, { ascending: sort_order === 'asc' })

    // 페이지네이션
    const from = (page - 1) * per_page
    const to = from + per_page - 1
    queryBuilder = queryBuilder.range(from, to)

    const { data, error, count } = await queryBuilder

    if (error) {
      console.error('Error fetching suppliers:', error)
      return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
    }

    return NextResponse.json({
      suppliers: data || [],
      pagination: {
        page,
        per_page,
        total_count: count || 0,
        total_pages: Math.ceil((count || 0) / per_page)
      }
    })
  } catch (error) {
    console.error('Error in suppliers GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      contact_person,
      email,
      phone,
      address,
      tax_number,
      payment_terms,
      notes,
      is_active = true
    } = body

    // Validate required fields
    if (!name || !contact_person || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: name, contact_person, email' },
        { status: 400 }
      )
    }

    // Check if supplier with same name already exists
    const { data: existingSupplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('name', name)
      .single()

    if (existingSupplier) {
      return NextResponse.json(
        { error: 'Supplier with this name already exists' },
        { status: 400 }
      )
    }

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert({
        name,
        contact_person,
        email,
        phone: phone || null,
        address: address || null,
        tax_number: tax_number || null,
        payment_terms: payment_terms || null,
        notes: notes || null,
        is_active,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating supplier:', error)
      return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
    }

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    console.error('Error in suppliers POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}