import { NextRequest } from 'next/server'
import { withAuth } from '../../../lib/middleware/auth'
import { withErrorHandler } from '../../../lib/middleware/error-handler'
import { withValidation } from '../../../lib/middleware/validation'
import { withRateLimit, RateLimitPresets } from '../../../lib/middleware/rate-limit'
import { 
  createCreatedResponse,
  createNotFoundResponse,
  createForbiddenResponse,
  createMethodNotAllowedResponse 
} from '../../../lib/utils/response'
import { QuoteCopySchema } from '../../../lib/schemas/quote'
import { QuoteService } from '@/lib/services/quote-service'
import { extractIdFromPath } from '../../../lib/utils/helpers'
import { NotFoundError, ForbiddenError } from '../../../lib/middleware/error-handler'
import type { AuthenticatedRequest } from '../../../lib/middleware/auth'

/**
 * POST /api/quotes/[id]/copy - 견적서 복사
 */
async function handlePost(req: AuthenticatedRequest, validatedData: any) {
  const sourceQuoteId = extractIdFromPath(req)
  
  try {
    // 원본 견적서 조회 및 권한 확인
    const sourceQuote = await QuoteService.getQuoteWithDetails(sourceQuoteId)
    
    if (req.user.role === 'member' && sourceQuote.created_by !== req.user.id) {
      throw new ForbiddenError('해당 견적서를 복사할 권한이 없습니다.')
    }

    const { project_title, customer_id, customer_name_snapshot, copy_structure_only } = validatedData

    // 복사할 데이터 구성
    const copyData = {
      project_title,
      customer_id,
      customer_name_snapshot,
      issue_date: new Date().toISOString().split('T')[0],
      status: 'draft' as const,
      vat_type: sourceQuote.vat_type,
      discount_amount: copy_structure_only ? 0 : sourceQuote.discount_amount,
      agency_fee_rate: copy_structure_only ? 0 : sourceQuote.agency_fee_rate,
      notes: copy_structure_only ? undefined : sourceQuote.notes,
      groups: sourceQuote.groups.map(group => ({
        name: group.name,
        include_in_fee: group.include_in_fee,
        items: group.items.map(item => ({
          name: item.name,
          include_in_fee: item.include_in_fee,
          details: item.details.map(detail => ({
            name: detail.name,
            description: detail.description,
            quantity: copy_structure_only ? 1 : detail.quantity,
            days: copy_structure_only ? 1 : detail.days,
            unit: detail.unit,
            unit_price: copy_structure_only ? 0 : detail.unit_price,
            is_service: detail.is_service,
            cost_price: copy_structure_only ? 0 : detail.cost_price,
            supplier_id: copy_structure_only ? undefined : detail.supplier_id,
            supplier_name_snapshot: copy_structure_only ? undefined : detail.supplier_name_snapshot,
          }))
        }))
      }))
    }

    // 새 견적서 생성
    const newQuoteId = await QuoteService.createQuote(copyData)
    
    // 생성된 견적서 조회
    const newQuote = await QuoteService.getQuoteWithDetails(newQuoteId)

    return createCreatedResponse(
      newQuote,
      `견적서가 성공적으로 복사되었습니다. ${copy_structure_only ? '(구조만 복사)' : '(전체 복사)'}`
    )
  } catch (error) {
    if (error instanceof Error && error.message.includes('찾을 수 없습니다')) {
      throw new NotFoundError('원본 견적서')
    }
    throw error
  }
}

/**
 * 메서드별 핸들러 래핑
 */
const postHandler = withAuth(
  withRateLimit(
    RateLimitPresets.standard,
    withValidation(
      QuoteCopySchema,
      handlePost
    )
  )
)

/**
 * 라우트 핸들러
 */
export const POST = withErrorHandler(postHandler)

// 허용되지 않는 메서드에 대한 응답
export async function GET() {
  return createMethodNotAllowedResponse(['POST'])
}

export async function PUT() {
  return createMethodNotAllowedResponse(['POST'])
}

export async function PATCH() {
  return createMethodNotAllowedResponse(['POST'])
}

export async function DELETE() {
  return createMethodNotAllowedResponse(['POST'])
}