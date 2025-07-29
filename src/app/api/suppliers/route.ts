import { NextRequest } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { withAuth } from '../lib/middleware/auth'
import { withErrorHandler } from '../lib/middleware/error-handler'
import { withValidation, withQueryValidation } from '../lib/middleware/validation'
import { withRateLimit, RateLimitPresets } from '../lib/middleware/rate-limit'
import { 
  createSuccessResponse, 
  createPaginatedResponse, 
  createCreatedResponse,
  createMethodNotAllowedResponse 
} from '../lib/utils/response'
import { SupplierSchema, ListQuerySchema } from '../lib/schemas/common'
import type { Database } from '@/types/database'
import type { AuthenticatedRequest } from '../lib/middleware/auth'

/**
 * GET /api/suppliers - 공급업체 목록 조회
 */
async function handleGet(req: AuthenticatedRequest, query: any) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { page, per_page, sort_by, sort_order, search, is_active } = query

  let queryBuilder = supabase
    .from('suppliers')
    .select('*', { count: 'exact' })

  // 검색 조건 적용
  if (search) {
    queryBuilder = queryBuilder.or(`name.ilike.%${search}%,contact_person.ilike.%${search}%,email.ilike.%${search}%`)
  }

  // 활성/비활성 필터
  if (is_active !== undefined) {
    queryBuilder = queryBuilder.eq('is_active', is_active)
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
    throw new Error(`공급업체 목록 조회 실패: ${error.message}`)
  }

  return createPaginatedResponse(
    data || [],
    {
      page,
      per_page,
      total_count: count || 0
    },
    '공급업체 목록을 성공적으로 조회했습니다.'
  )
}

/**
 * POST /api/suppliers - 공급업체 생성
 */
async function handlePost(req: AuthenticatedRequest, validatedData: any) {
  const supabase = createRouteHandlerClient<Database>({ cookies })

  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      ...validatedData,
      created_by: req.user.id
    })
    .select()
    .single()

  if (error) {
    // 중복 체크
    if (error.code === '23505') {
      throw new Error('이미 존재하는 공급업체입니다.')
    }
    throw new Error(`공급업체 생성 실패: ${error.message}`)
  }

  return createCreatedResponse(data, '공급업체가 성공적으로 생성되었습니다.')
}

/**
 * 메서드별 핸들러 래핑
 */
const getHandler = withAuth(
  withRateLimit(
    RateLimitPresets.standard,
    withQueryValidation(
      ListQuerySchema,
      handleGet
    )
  )
)

const postHandler = withAuth(
  withRateLimit(
    RateLimitPresets.standard,
    withValidation(
      SupplierSchema,
      handlePost
    )
  )
)

/**
 * 라우트 핸들러
 */
export const GET = withErrorHandler(getHandler)
export const POST = withErrorHandler(postHandler)

// 허용되지 않는 메서드에 대한 응답
export async function PUT() {
  return createMethodNotAllowedResponse(['GET', 'POST'])
}

export async function PATCH() {
  return createMethodNotAllowedResponse(['GET', 'POST'])
}

export async function DELETE() {
  return createMethodNotAllowedResponse(['GET', 'POST'])
}