import { NextRequest } from 'next/server';
import { withAuth } from '../lib/base';
import { createSuccessResponse, createErrorResponse } from '../lib/utils/response';
import { ValidationError, BusinessError } from '../lib/middleware/error-handler';
import { withTransaction } from '@/lib/database/transaction';
import { createApiError } from '@/lib/api/client';

// 모션센스 견적서 데이터 타입 정의
interface MotionsenseQuoteDetail {
  name: string;
  description: string;
  quantity: number;
  days: number;
  unit: string;
  unit_price: number;
  is_service: boolean;
  cost_price: number;
  supplier_id?: string;
  supplier_name_snapshot: string;
}

interface MotionsenseQuoteItem {
  name: string;
  details: MotionsenseQuoteDetail[];
}

interface MotionsenseQuoteGroup {
  name: string;
  include_in_fee: boolean;
  items: MotionsenseQuoteItem[];
}

interface MotionsenseQuoteData {
  project_info: {
    name: string;
    client_name: string;
    issue_date: string;
    due_date: string;
  };
  groups: MotionsenseQuoteGroup[];
  agency_fee_rate: number;
  discount_amount: number;
  vat_type: 'exclusive' | 'inclusive';
  show_cost_management: boolean;
  calculation: {
    subtotal: number;
    fee_applicable_amount: number;
    fee_excluded_amount: number;
    agency_fee: number;
    pre_discount_total: number;
    final_amount: number;
    vat_amount: number;
    total_with_vat: number;
  };
}

// 데이터 검증 함수
function validateMotionsenseQuoteData(data: any): MotionsenseQuoteData {
  if (!data.project_info?.name?.trim()) {
    throw new ValidationError('프로젝트명을 입력해주세요.');
  }

  if (!data.groups || !Array.isArray(data.groups) || data.groups.length === 0) {
    throw new ValidationError('최소 하나 이상의 그룹을 추가해주세요.');
  }

  // 그룹 검증
  data.groups.forEach((group: any, groupIndex: number) => {
    if (!group.name?.trim()) {
      throw new ValidationError(`그룹 ${groupIndex + 1}의 이름을 입력해주세요.`);
    }

    if (!group.items || !Array.isArray(group.items)) {
      group.items = [];
    }

    // 아이템 검증
    group.items.forEach((item: any, itemIndex: number) => {
      if (!item.name?.trim()) {
        throw new ValidationError(`그룹 ${groupIndex + 1}, 항목 ${itemIndex + 1}의 이름을 입력해주세요.`);
      }

      if (!item.details || !Array.isArray(item.details)) {
        item.details = [];
      }

      // 세부 항목 검증
      item.details.forEach((detail: any, detailIndex: number) => {
        if (!detail.name?.trim()) {
          throw new ValidationError(`그룹 ${groupIndex + 1}, 항목 ${itemIndex + 1}, 세부항목 ${detailIndex + 1}의 이름을 입력해주세요.`);
        }

        if (typeof detail.quantity !== 'number' || detail.quantity <= 0) {
          throw new ValidationError(`그룹 ${groupIndex + 1}, 항목 ${itemIndex + 1}, 세부항목 ${detailIndex + 1}의 수량을 올바르게 입력해주세요.`);
        }

        if (typeof detail.unit_price !== 'number' || detail.unit_price < 0) {
          throw new ValidationError(`그룹 ${groupIndex + 1}, 항목 ${itemIndex + 1}, 세부항목 ${detailIndex + 1}의 단가를 올바르게 입력해주세요.`);
        }
      });
    });
  });

  return data as MotionsenseQuoteData;
}

// 트랜잭션을 사용한 견적서 저장 함수
async function saveMotionsenseQuoteWithSnapshots(supabase: any, data: MotionsenseQuoteData, userId: string) {
  return withTransaction(supabase, async (ctx) => {
    try {
      // 견적서 기본 정보 생성
      const quoteInsertData = {
        quote_number: `MS-${Date.now()}`, // 임시 번호 생성
        project_title: data.project_info.name,
        customer_name: data.project_info.client_name,
        customer_name_snapshot: data.project_info.client_name, // 스냅샷
        issue_date: data.project_info.issue_date,
        due_date: data.project_info.due_date,
        status: 'draft',
        total_amount: data.calculation.total_with_vat,
        vat_type: data.vat_type,
        discount_amount: data.discount_amount,
        agency_fee_rate: data.agency_fee_rate,
        version: 1,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 1. 견적서 헤더 생성
      const { data: quoteData, error: quoteError } = await ctx.supabase
        .from('quotes')
        .insert(quoteInsertData)
        .select('id')
        .single();

      if (quoteError || !quoteData) {
        throw createApiError(
          `견적서 헤더 저장 실패: ${quoteError?.message || '알 수 없는 오류'}`,
          500,
          'QUOTE_HEADER_ERROR',
          quoteError
        );
      }

      const quoteId = quoteData.id;

      // 2. 그룹, 항목, 세부내용을 순차적으로 생성 (스냅샷 포함)
      for (let groupIndex = 0; groupIndex < data.groups.length; groupIndex++) {
        const group = data.groups[groupIndex];

        // 그룹 생성
        const { data: groupData, error: groupError } = await ctx.supabase
          .from('quote_groups')
          .insert({
            quote_id: quoteId,
            name: group.name,
            sort_order: groupIndex,
            include_in_fee: group.include_in_fee,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (groupError || !groupData) {
          throw createApiError(
            `그룹 ${groupIndex + 1} 저장 실패: ${groupError?.message || '알 수 없는 오류'}`,
            500,
            'QUOTE_GROUP_ERROR',
            groupError
          );
        }

        const groupId = groupData.id;

        // 항목 생성
        for (let itemIndex = 0; itemIndex < group.items.length; itemIndex++) {
          const item = group.items[itemIndex];

          const { data: itemData, error: itemError } = await ctx.supabase
            .from('quote_items_motionsense')
            .insert({
              quote_group_id: groupId,
              name: item.name,
              sort_order: itemIndex,
              created_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (itemError || !itemData) {
            throw createApiError(
              `그룹 ${groupIndex + 1}, 항목 ${itemIndex + 1} 저장 실패: ${itemError?.message || '알 수 없는 오류'}`,
              500,
              'QUOTE_ITEM_ERROR',
              itemError
            );
          }

          const itemId = itemData.id;

          // 세부내용 생성 (스냅샷 데이터 포함)
          if (item.details && item.details.length > 0) {
            const detailsToInsert = item.details.map((detail, detailIndex) => ({
              quote_item_id: itemId,
              // 스냅샷된 마스터 품목 데이터
              name: detail.name,
              description: detail.description || '',
              unit: detail.unit || '개',
              unit_price: detail.unit_price,
              // 현재 입력값
              quantity: detail.quantity,
              days: detail.days || 1,
              is_service: detail.is_service || false,
              cost_price: detail.cost_price || 0,
              supplier_id: detail.supplier_id || null,
              supplier_name_snapshot: detail.supplier_name_snapshot || '', // 공급업체 스냅샷
              sort_order: detailIndex,
              created_at: new Date().toISOString(),
            }));

            const { error: detailsError } = await ctx.supabase
              .from('quote_details')
              .insert(detailsToInsert);

            if (detailsError) {
              throw createApiError(
                `그룹 ${groupIndex + 1}, 항목 ${itemIndex + 1}의 세부내용 저장 실패: ${detailsError.message}`,
                500,
                'QUOTE_DETAILS_ERROR',
                detailsError
              );
            }
          }
        }
      }

      return { quoteId, success: true };
    } catch (error) {
      console.error('견적서 트랜잭션 저장 중 오류:', error);
      
      // 이미 ApiError인 경우 그대로 throw
      if (error instanceof Error && error.name === 'ApiError') {
        throw error;
      }
      
      // 그 외의 경우 BusinessError로 래핑
      throw new BusinessError('견적서 저장 중 예상치 못한 오류가 발생했습니다.');
    }
  });
}

// POST /api/motionsense-quotes - 모션센스 견적서 생성
export async function POST(request: NextRequest) {
  return withAuth(request, async ({ user, supabase }) => {
    try {
      const body = await request.json();
      
      // 데이터 검증
      const validatedData = validateMotionsenseQuoteData(body);

      // 트랜잭션을 사용한 견적서 저장
      const result = await saveMotionsenseQuoteWithSnapshots(
        supabase,
        validatedData,
        user.id
      );

      return createSuccessResponse({
        id: result.quoteId,
        message: '견적서가 성공적으로 저장되었습니다.',
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('견적서 생성 실패:', error);
      
      // ValidationError 처리
      if (error instanceof ValidationError) {
        return createErrorResponse({
          error: error.message,
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        }, 400);
      }
      
      // BusinessError 처리
      if (error instanceof BusinessError) {
        return createErrorResponse({
          error: error.message,
          code: 'BUSINESS_ERROR',
          timestamp: new Date().toISOString(),
        }, 500);
      }

      // ApiError 처리 (트랜잭션에서 발생)
      if (error instanceof Error && error.name === 'ApiError') {
        const apiError = error as any;
        return createErrorResponse({
          error: apiError.message,
          code: apiError.code || 'TRANSACTION_ERROR',
          details: apiError.details,
          timestamp: new Date().toISOString(),
        }, apiError.status || 500);
      }

      // 예상치 못한 에러
      return createErrorResponse({
        error: '견적서 저장 중 예상치 못한 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
      }, 500);
    }
  });
}