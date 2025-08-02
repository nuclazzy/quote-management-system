import { NextRequest } from 'next/server';
import {
  parseSearchParams,
  validateRequestBody,
  extractFilterParams,
  validateUUID,
  sanitizeString,
  callRPC,
  createPaginatedApiResponse,
  ApiErrors,
} from '../lib/base';
import { withAuth, requireRole } from '@/lib/auth/secure-middleware';
import { secureLog } from '@/lib/utils/secure-logger';
import { createSuccessResponse } from '../lib/utils/response';
import {
  BusinessError,
  ValidationError,
} from '../lib/middleware/error-handler';

// GET /api/quotes - 견적서 목록 조회
export async function GET(request: NextRequest) {
  return withAuth(request, async ({ user, supabase }) => {
    secureLog.apiRequest('GET', '/api/quotes', user.id);
    const { page, limit, sortBy, sortOrder, offset } =
      parseSearchParams(request);

    // 안전한 필터 파라미터 추출
    const allowedFilters = ['status', 'customer_id', 'search'];
    const filters = extractFilterParams(request, allowedFilters);

    // 기본 쿼리 구성 (company_id는 RLS로 자동 필터링됨)
    let query = supabase.from('quotes').select(
      `
        id,
        quote_number,
        title,
        status,
        total,
        issue_date,
        created_at,
        updated_at,
        customers!inner(id, name),
        projects(id, name),
        profiles!quotes_created_by_fkey(id, full_name)
      `,
      { count: 'exact' }
    );

    // 안전한 필터 적용
    if (filters.status) {
      // 상태는 enum 값이므로 화이트리스트 검증
      const validStatuses = [
        'draft',
        'sent',
        'accepted',
        'revised',
        'canceled',
      ];
      if (validStatuses.includes(filters.status)) {
        query = query.eq('status', filters.status);
      }
    }

    if (filters.customer_id) {
      try {
        const customerUUID = validateUUID(filters.customer_id, '고객 ID');
        query = query.eq('customer_id', customerUUID);
      } catch (error) {
        throw new ValidationError('잘못된 고객 ID 형식입니다.', {
          customer_id: filters.customer_id,
        });
      }
    }

    if (filters.search) {
      const searchTerm = sanitizeString(filters.search, 100);
      // 이스케이프된 검색어 사용
      query = query.or(
        `title.ilike.%${searchTerm}%,quote_number.ilike.%${searchTerm}%`
      );
    }

    // 정렬 및 페이지네이션
    const {
      data: quotes,
      error,
      count,
    } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching quotes:', error);
      throw new BusinessError(
        '견적서 목록 조회 중 오류가 발생했습니다.',
        500,
        'FETCH_QUOTES_ERROR'
      );
    }

    return createPaginatedApiResponse(
      quotes || [],
      count || 0,
      page,
      limit,
      '견적서 목록을 성공적으로 조회했습니다.'
    );
  });
}

// POST /api/quotes - 새 견적서 생성
export async function POST(request: NextRequest) {
  return withAuth(request, async ({ user, supabase }) => {
    secureLog.apiRequest('POST', '/api/quotes', user.id);
    // 요청 본문 검증
    const quoteData = await validateRequestBody(request, validateQuoteData);

    // RPC 함수를 통한 안전한 트랜잭션 실행
    const result = await callRPC<
      {
        quote_id: string;
        quote_number: string;
        success: boolean;
        message: string;
      }[]
    >(supabase, 'create_quote_transaction', {
      p_quote_data: quoteData,
    });

    // 결과 확인
    if (!result || result.length === 0) {
      throw new BusinessError(
        '견적서 생성 결과를 받을 수 없습니다.',
        500,
        'RPC_NO_RESULT'
      );
    }

    const [createResult] = result;

    if (!createResult.success) {
      throw new BusinessError(
        createResult.message || '견적서 생성에 실패했습니다.',
        400,
        'QUOTE_CREATION_FAILED'
      );
    }

    // 생성된 견적서 정보 조회
    const { data: createdQuote, error: fetchError } = await supabase
      .from('quotes')
      .select(
        `
        id,
        quote_number,
        title,
        status,
        total,
        subtotal,
        tax_amount,
        tax_rate,
        created_at,
        customers!inner(id, name),
        profiles!quotes_created_by_fkey(id, full_name)
      `
      )
      .eq('id', createResult.quote_id)
      .single();

    if (fetchError || !createdQuote) {
      console.error('Error fetching created quote:', fetchError);
      // 견적서는 생성되었지만 조회에 실패한 경우, 기본 정보만 반환
      return createSuccessResponse(
        {
          id: createResult.quote_id,
          quote_number: createResult.quote_number,
          message: createResult.message,
        },
        '견적서가 생성되었으나 상세 정보 조회에 실패했습니다.',
        201
      );
    }

    // 알림 생성 (백그라운드 실행)
    sendQuoteCreatedNotification(createResult.quote_id, user.id).catch(
      (error) => {
        console.error('Failed to send quote created notification:', error);
      }
    );

    return createSuccessResponse(createdQuote, createResult.message, 201);
  });
}

/**
 * 견적서 데이터 검증 함수
 */
function validateQuoteData(data: any) {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('잘못된 요청 데이터입니다.', { data });
  }

  // 필수 필드 검증
  const requiredFields = ['title', 'customer_id', 'quote_groups'];
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new ValidationError(`${field}는 필수 필드입니다.`, {
        missing_field: field,
      });
    }
  }

  // 데이터 타입 및 형식 검증
  const validatedData = {
    title: sanitizeString(data.title, 200),
    customer_id: validateUUID(data.customer_id, '고객 ID'),
    description: data.description
      ? sanitizeString(data.description, 1000)
      : null,
    project_id: data.project_id
      ? validateUUID(data.project_id, '프로젝트 ID')
      : null,
    tax_rate: data.tax_rate
      ? validateNumber(data.tax_rate, '세율', { min: 0, max: 100 })
      : 10,
    valid_until: data.valid_until || null,
    terms: data.terms ? sanitizeString(data.terms, 2000) : null,
    notes: data.notes ? sanitizeString(data.notes, 2000) : null,
    quote_groups: validateQuoteGroups(data.quote_groups),
  };

  return validatedData;
}

/**
 * 견적서 그룹 데이터 검증
 */
function validateQuoteGroups(groups: any[]) {
  if (!Array.isArray(groups) || groups.length === 0) {
    throw new ValidationError('최소 하나의 견적서 그룹이 필요합니다.', {
      groups,
    });
  }

  return groups.map((group, groupIndex) => {
    if (!group.title) {
      throw new ValidationError(`그룹 ${groupIndex + 1}의 제목이 필요합니다.`, {
        group_index: groupIndex,
      });
    }

    const validatedGroup = {
      title: sanitizeString(group.title, 200),
      sort_order: validateNumber(group.sort_order || 0, '정렬 순서', {
        integer: true,
        min: 0,
      }),
      quote_items: group.quote_items
        ? validateQuoteItems(group.quote_items, groupIndex)
        : [],
    };

    return validatedGroup;
  });
}

/**
 * 견적서 품목 데이터 검증
 */
function validateQuoteItems(items: any[], groupIndex: number) {
  if (!Array.isArray(items)) {
    throw new ValidationError(
      `그룹 ${groupIndex + 1}의 품목은 배열이어야 합니다.`,
      { group_index: groupIndex }
    );
  }

  return items.map((item, itemIndex) => {
    if (!item.item_name) {
      throw new ValidationError(
        `그룹 ${groupIndex + 1}, 품목 ${itemIndex + 1}의 이름이 필요합니다.`,
        { group_index: groupIndex, item_index: itemIndex }
      );
    }

    const validatedItem = {
      item_name: sanitizeString(item.item_name, 200),
      description: item.description
        ? sanitizeString(item.description, 1000)
        : null,
      quantity: validateNumber(item.quantity || 1, '수량', { min: 0 }),
      unit_price: validateNumber(item.unit_price || 0, '단가', { min: 0 }),
      supplier_id: item.supplier_id
        ? validateUUID(item.supplier_id, '공급업체 ID')
        : null,
      sort_order: validateNumber(item.sort_order || 0, '정렬 순서', {
        integer: true,
        min: 0,
      }),
      quote_item_details: item.quote_item_details
        ? validateQuoteItemDetails(
            item.quote_item_details,
            groupIndex,
            itemIndex
          )
        : [],
    };

    return validatedItem;
  });
}

/**
 * 견적서 품목 세부사항 검증
 */
function validateQuoteItemDetails(
  details: any[],
  groupIndex: number,
  itemIndex: number
) {
  if (!Array.isArray(details)) {
    throw new ValidationError(
      `그룹 ${groupIndex + 1}, 품목 ${itemIndex + 1}의 세부사항은 배열이어야 합니다.`,
      { group_index: groupIndex, item_index: itemIndex }
    );
  }

  return details.map((detail, detailIndex) => {
    if (!detail.detail_name) {
      throw new ValidationError(
        `그룹 ${groupIndex + 1}, 품목 ${itemIndex + 1}, 세부사항 ${detailIndex + 1}의 이름이 필요합니다.`,
        {
          group_index: groupIndex,
          item_index: itemIndex,
          detail_index: detailIndex,
        }
      );
    }

    return {
      detail_name: sanitizeString(detail.detail_name, 200),
      description: detail.description
        ? sanitizeString(detail.description, 1000)
        : null,
      quantity: validateNumber(detail.quantity || 1, '수량', { min: 0 }),
      unit_price: validateNumber(detail.unit_price || 0, '단가', { min: 0 }),
      sort_order: validateNumber(detail.sort_order || 0, '정렬 순서', {
        integer: true,
        min: 0,
      }),
    };
  });
}

/**
 * 견적서 생성 알림 전송 (백그라운드)
 */
async function sendQuoteCreatedNotification(quoteId: string, userId: string) {
  try {
    // TODO: 실제 알림 서비스 구현
    console.log(`Quote created notification: ${quoteId} by ${userId}`);
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}
