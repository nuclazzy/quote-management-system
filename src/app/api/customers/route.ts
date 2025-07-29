import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// GET /api/customers - 고객 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    
    let query = supabase
      .from('customers')
      .select(`
        *,
        profiles!customers_created_by_fkey(id, full_name)
      `, { count: 'exact' })
    
    // 필터 적용
    if (status) {
      query = query.eq('status', status)
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,contact_person.ilike.%${search}%`)
    }
    
    // 정렬 및 페이지네이션
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, page * limit - 1)
    
    const { data: customers, error, count } = await query
    
    if (error) {
      console.error('Error fetching customers:', error)
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
    }
    
    return NextResponse.json({
      customers: customers || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('GET /api/customers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/customers - 새 고객 생성
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
      email,
      phone,
      address,
      contact_person,
      tax_number,
      payment_terms,
      notes,
      status = 'active'
    } = body
    
    // Validate required fields
    if (!name || !email || !contact_person) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, contact_person' },
        { status: 400 }
      )
    }
    
    // 고객명 중복 검사 (같은 회사 내에서)
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('name', name)
      .single()
    
    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Customer with this name already exists' },
        { status: 400 }
      )
    }
    
    // 새 고객 생성
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        name,
        email,
        phone: phone || null,
        address: address || null,
        contact_person,
        tax_number: tax_number || null,
        payment_terms: payment_terms || null,
        notes: notes || null,
        status,
        created_by: user.id
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating customer:', error)
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
    }
    
    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error('POST /api/customers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}