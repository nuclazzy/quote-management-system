import { NextRequest } from 'next/server';
import { withAuth } from '@/app/api/lib/middleware/auth';
import { withErrorHandler } from '@/app/api/lib/middleware/error-handler';
import { withValidation } from '@/app/api/lib/middleware/validation';
import {
  withRateLimit,
  RateLimitPresets,
} from '@/app/api/lib/middleware/rate-limit';
import {
  createUpdatedResponse,
  createNotFoundResponse,
  createForbiddenResponse,
  createMethodNotAllowedResponse,
} from '@/app/api/lib/utils/response';
import { QuoteStatusUpdateSchema } from '@/app/api/lib/schemas/quote';
import { QuoteService } from '@/lib/services/quote-service';
import { extractIdFromPath } from '@/app/api/lib/utils/helpers';
import {
  NotFoundError,
  ForbiddenError,
} from '@/app/api/lib/middleware/error-handler';
import type { AuthenticatedRequest } from '@/app/api/lib/middleware/auth';

/**
 * PATCH /api/quotes/[id]/status - 견적서 상태 변경
 */
async function handlePatch(req: AuthenticatedRequest, validatedData: any) {
  const quoteId = extractIdFromPath(req);

  // 기존 견적서 조회 및 권한 확인
  try {
    const existingQuote = await QuoteService.getQuoteWithDetails(quoteId);

    if (
      req.user.role === 'member' &&
      existingQuote.created_by !== req.user.id
    ) {
      throw new ForbiddenError('해당 견적서의 상태를 변경할 권한이 없습니다.');
    }

    // 상태 변경 비즈니스 로직 검증
    const { status, notes } = validatedData;

    // 상태 변경 규칙 검증
    if (!isValidStatusTransition(existingQuote.status, status)) {
      throw new ForbiddenError(
        `${existingQuote.status}에서 ${status}로 상태 변경이 불가능합니다.`
      );
    }

    // 데이터베이스 함수를 통한 상태 변경
    const { data, error } = await req.supabase.rpc('update_quote_status', {
      p_quote_id: quoteId,
      p_new_status: status,
      p_notes: notes,
    });

    if (error || !data || data.length === 0 || !data[0].success) {
      const errorMessage =
        data && data.length > 0 ? data[0].message : error.message;
      throw new Error(errorMessage);
    }

    // 변경된 견적서 조회
    const updatedQuote = await QuoteService.getQuoteWithDetails(quoteId);

    return createUpdatedResponse(
      updatedQuote,
      `견적서 상태가 ${status}로 변경되었습니다.`
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('찾을 수 없습니다')) {
      throw new NotFoundError('견적서');
    }
    throw error;
  }
}

/**
 * 상태 변경 유효성 검사 (강화된 비즈니스 로직)
 */
function isValidStatusTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  const transitions: Record<string, string[]> = {
    draft: ['sent', 'canceled'],
    sent: ['accepted', 'revised', 'canceled'],
    revised: ['sent', 'canceled'], // revised에서 accepted로 바로 가지 못하도록 수정
    accepted: ['completed'], // accepted 후에는 완료만 가능 (취소 불가)
    completed: [], // 완료된 견적서는 상태 변경 불가
    canceled: [], // 취소된 견적서는 상태 변경 불가
  };

  return transitions[currentStatus]?.includes(newStatus) || false;
}

/**
 * 메서드별 핸들러 래핑
 */
const patchHandler = withAuth(
  withRateLimit(
    RateLimitPresets.standard,
    withValidation(QuoteStatusUpdateSchema, handlePatch)
  )
);

/**
 * 라우트 핸들러
 */
export const PATCH = withErrorHandler(patchHandler);

// 허용되지 않는 메서드에 대한 응답
export async function GET() {
  return createMethodNotAllowedResponse(['PATCH']);
}

export async function POST() {
  return createMethodNotAllowedResponse(['PATCH']);
}

export async function PUT() {
  return createMethodNotAllowedResponse(['PATCH']);
}

export async function DELETE() {
  return createMethodNotAllowedResponse(['PATCH']);
}
