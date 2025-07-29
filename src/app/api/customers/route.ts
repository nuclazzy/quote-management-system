import { NextRequest } from 'next/server'
import { withAuth, createApiResponse, createApiError, parseSearchParams, validateRequestBody } from '@/lib/api/base'
import { validateCustomer } from '@/lib/api/validation'

// GET /api/customers - 고객 목록 조회
export async function GET(request: NextRequest) {
  return withAuth(request, async ({ user, supabase }) => {
    try {
      const { page, limit, sortBy, sortOrder } = parseSearchParams(request)
      const searchParams = request.nextUrl.searchParams
      
      // 필터링 옵션
      const status = searchParams.get('status')
      const search = searchParams.get('search')
      
      let query = supabase
        .from('customers')
        .select(`
          *,
          users!customers_created_by_fkey(id, full_name),
          _count: quotes(count)
        `)
        .eq('company_id', user.profile.company_id)
      
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
      
      const { data: customers, error } = await query
      
      if (error) {
        console.error('Error fetching customers:', error)
        return createApiError('Failed to fetch customers', 500)
      }
      
      // 총 개수 조회
      const { count: totalCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.profile.company_id)
      
      return createApiResponse({
        customers,
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit)
        }
      }, 'Customers fetched successfully')
    } catch (error) {
      console.error('GET /api/customers error:', error)
      return createApiError('Internal server error', 500)
    }
  })
}

// POST /api/customers - 새 고객 생성
export async function POST(request: NextRequest) {
  return withAuth(request, async ({ user, supabase }) => {
    try {
      const validatedData = await validateRequestBody(request, validateCustomer)
      
      // 고객명 중복 검사
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('company_id', user.profile.company_id)
        .eq('name', validatedData.name)
        .single()
      
      if (existingCustomer) {
        return createApiError('Customer with this name already exists', 400)
      }
      
      // 새 고객 생성
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          company_id: user.profile.company_id,
          name: validatedData.name,
          email: validatedData.email,
          phone: validatedData.phone,
          address: validatedData.address,
          contact_person: validatedData.contact_person,
          tax_number: validatedData.tax_number,
          payment_terms: validatedData.payment_terms,
          notes: validatedData.notes,
          status: validatedData.status,
          created_by: user.id
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error creating customer:', error)
        return createApiError('Failed to create customer', 500)
      }
      
      return createApiResponse(customer, 'Customer created successfully', 201)
    } catch (error) {
      console.error('POST /api/customers error:', error)
      if (error instanceof Error) {
        return createApiError(error.message, 400)
      }
      return createApiError('Internal server error', 500)
    }
  })
}