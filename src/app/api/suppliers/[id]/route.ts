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
import { SupplierSchema } from '../../lib/schemas/common'
import { extractIdFromPath } from '../../lib/utils/helpers'
import { NotFoundError } from '../../lib/middleware/error-handler'
import type { Database } from '@/types/database'
import type { AuthenticatedRequest } from '../../lib/middleware/auth'

/**
 * GET /api/suppliers/[id] - 공급업체 상세 조회
 */
async function handleGet(req: AuthenticatedRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const supplierId = extractIdFromPath(req)
  
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', supplierId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new NotFoundError('공급업체')
    }
    throw new Error(`공급업체 조회 실패: ${error.message}`)
  }

  return createSuccessResponse(data, '공급업체 정보를 성공적으로 조회했습니다.')
}

/**
 * PUT /api/suppliers/[id] - 공급업체 수정
 */
async function handlePut(req: AuthenticatedRequest, validatedData: any) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const supplierId = extractIdFromPath(req)
  
  const { data, error } = await supabase
    .from('suppliers')
    .update({
      ...validatedData,
      updated_at: new Date().toISOString()
    })
    .eq('id', supplierId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new NotFoundError('공급업체')
    }
    if (error.code === '23505') {
      throw new Error('이미 존재하는 공급업체 정보입니다.')
    }
    throw new Error(`공급업체 수정 실패: ${error.message}`)
  }

  return createUpdatedResponse(data, '공급업체 정보가 성공적으로 수정되었습니다.')
}

/**
 * DELETE /api/suppliers/[id] - 공급업체 삭제 (논리 삭제)
 */
async function handleDelete(req: AuthenticatedRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const supplierId = extractIdFromPath(req)
  
  // 해당 공급업체를 사용하는 견적서 세부내용이 있는지 확인
  const { data: quoteDetails, error: detailsError } = await supabase
    .from('quote_details')
    .select('id')
    .eq('supplier_id', supplierId)
    .limit(1)

  if (detailsError) {
    throw new Error(`공급업체 사용 여부 확인 실패: ${detailsError.message}`)
  }

  if (quoteDetails && quoteDetails.length > 0) {
    // 사용 중인 공급업체는 비활성화만 가능
    const { data, error } = await supabase
      .from('suppliers')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', supplierId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('공급업체')
      }
      throw new Error(`공급업체 비활성화 실패: ${error.message}`)
    }

    return createUpdatedResponse(
      data, 
      '견적서에서 사용 중인 공급업체는 삭제할 수 없어 비활성화되었습니다.'
    )
  } else {
    // 사용하지 않는 공급업체는 완전 삭제
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', supplierId)

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('공급업체')
      }
      throw new Error(`공급업체 삭제 실패: ${error.message}`)
    }

    return createDeletedResponse('공급업체가 성공적으로 삭제되었습니다.')
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
      SupplierSchema,
      handlePut
    )
  )
)

const deleteHandler = withAuth(
  withRateLimit(
    RateLimitPresets.standard,
    handleDelete
  ),
  { requireAdmin: true } // 공급업체 삭제는 관리자만 가능
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