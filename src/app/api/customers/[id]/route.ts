import { NextRequest } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { withAuth } from '../../lib/middleware/auth'
import { withErrorHandler } from '../../lib/middleware/error-handler'
import { withValidation } from '../../lib/middleware/validation'
import { withRateLimit, RateLimitPresets } from '../../lib/middleware/rate-limit'
import { 
  createSuccessResponse, 
  createUpdatedResponse,
  createDeletedResponse,
  createNotFoundResponse,
  createMethodNotAllowedResponse 
} from '../../lib/utils/response'
import { CustomerSchema } from '../../lib/schemas/common'
import { extractIdFromPath } from '../../lib/utils/helpers'
import { NotFoundError } from '../../lib/middleware/error-handler'
import type { Database } from '@/types/database'
import type { AuthenticatedRequest } from '../../lib/middleware/auth'

/**
 * GET /api/customers/[id] - 고객사 상세 조회
 */
async function handleGet(req: AuthenticatedRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const customerId = extractIdFromPath(req)
  
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new NotFoundError('고객사')
    }
    throw new Error(`고객사 조회 실패: ${error.message}`)
  }

  return createSuccessResponse(data, '고객사 정보를 성공적으로 조회했습니다.')
}

/**
 * PUT /api/customers/[id] - 고객사 수정
 */
async function handlePut(req: AuthenticatedRequest, validatedData: any) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const customerId = extractIdFromPath(req)
  
  const { data, error } = await supabase
    .from('customers')
    .update({
      ...validatedData,
      updated_at: new Date().toISOString()
    })
    .eq('id', customerId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new NotFoundError('고객사')
    }
    if (error.code === '23505') {
      throw new Error('이미 존재하는 고객사 정보입니다.')
    }
    throw new Error(`고객사 수정 실패: ${error.message}`)
  }

  return createUpdatedResponse(data, '고객사 정보가 성공적으로 수정되었습니다.')
}

/**
 * DELETE /api/customers/[id] - 고객사 삭제 (논리 삭제)
 */
async function handleDelete(req: AuthenticatedRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const customerId = extractIdFromPath(req)
  
  // 해당 고객사를 사용하는 견적서가 있는지 확인
  const { data: quotes, error: quotesError } = await supabase
    .from('quotes')
    .select('id')
    .eq('customer_id', customerId)
    .limit(1)

  if (quotesError) {
    throw new Error(`고객사 사용 여부 확인 실패: ${quotesError.message}`)
  }

  if (quotes && quotes.length > 0) {
    // 사용 중인 고객사는 비활성화만 가능
    const { data, error } = await supabase
      .from('customers')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('고객사')
      }
      throw new Error(`고객사 비활성화 실패: ${error.message}`)
    }

    return createUpdatedResponse(
      data, 
      '견적서에서 사용 중인 고객사는 삭제할 수 없어 비활성화되었습니다.'
    )
  } else {
    // 사용하지 않는 고객사는 완전 삭제
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId)

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('고객사')
      }
      throw new Error(`고객사 삭제 실패: ${error.message}`)
    }

    return createDeletedResponse('고객사가 성공적으로 삭제되었습니다.')
  }
}

/**
 * 메서드별 핸들러 래핑
 */
const getHandler = withAuth(
  withRateLimit(
    RateLimitPresets.standard,
    handleGet
  )
)

const putHandler = withAuth(
  withRateLimit(
    RateLimitPresets.standard,
    withValidation(
      CustomerSchema,
      handlePut
    )
  )
)

const deleteHandler = withAuth(
  withRateLimit(
    RateLimitPresets.standard,
    handleDelete
  ),
  { requireAdmin: true } // 고객사 삭제는 관리자만 가능
)

/**
 * 라우트 핸들러
 */
export const GET = withErrorHandler(getHandler)
export const PUT = withErrorHandler(putHandler)
export const DELETE = withErrorHandler(deleteHandler)

// 허용되지 않는 메서드에 대한 응답
export async function POST() {
  return createMethodNotAllowedResponse(['GET', 'PUT', 'DELETE'])
}

export async function PATCH() {
  return createMethodNotAllowedResponse(['GET', 'PUT', 'DELETE'])
}