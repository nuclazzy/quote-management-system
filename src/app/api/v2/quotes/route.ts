import { NextRequest } from 'next/server';
import {
  withAuth,
  parseSearchParams,
  validateRequestBody,
  extractFilterParams,
  validateUUID,
  sanitizeString,
  callRPC,
  createPaginatedApiResponse,
  ApiErrors,
} from '../../lib/base';
import { createSuccessResponse } from '../../lib/utils/response';
import {
  BusinessError,
  ValidationError,
} from '../../lib/middleware/error-handler';

// POST /api/v2/quotes - 새로운 견적서 생성 (모션센스 구조 + 스냅샷)
export async function POST(request: NextRequest) {
  return withAuth(request, async ({ user, supabase }) => {
    const requestBody = await validateRequestBody(request);
    
    const client = supabase;
    
    try {
      // 트랜잭션 시작
      const { data: quoteData, error: quoteError } = await client
        .from('quotes')
        .insert({
          // 기본 견적서 정보
          project_title: requestBody.project_title,
          customer_id: requestBody.customer_id,
          customer_name_snapshot: requestBody.customer_name_snapshot,
          issue_date: requestBody.issue_date,
          status: requestBody.status || 'draft',
          vat_type: requestBody.vat_type || 'exclusive',
          discount_amount: requestBody.discount_amount || 0,
          agency_fee_rate: requestBody.agency_fee_rate || 0,
          version: 1,
          created_by: user.id,
          
          // 새로운 구조 (모션센스)
          name: requestBody.name,
          items: requestBody.items,
          include_in_fee: requestBody.include_in_fee,
          
          // 🔑 핵심: 스냅샷 생성 및 저장
          quote_snapshot: await createQuoteSnapshot(requestBody.groups, client),
        })
        .select('*')
        .single();

      if (quoteError) {
        throw new BusinessError(`견적서 생성 실패: ${quoteError.message}`);
      }

      return createSuccessResponse(quoteData, 201);
    } catch (error) {
      console.error('견적서 생성 중 오류:', error);
      throw error;
    }
  });
}

// GET /api/v2/quotes - 견적서 목록 조회 (새로운 구조)
export async function GET(request: NextRequest) {
  return withAuth(request, async ({ user, supabase }) => {
    const { page, limit, sortBy, sortOrder, offset } = parseSearchParams(request);
    
    const allowedFilters = ['status', 'customer_id', 'search'];
    const filters = extractFilterParams(request, allowedFilters);

    let query = supabase.from('quotes').select(
      `
        id,
        quote_number,
        name,
        items,
        include_in_fee,
        quote_snapshot,
        status,
        total_amount,
        issue_date,
        created_at,
        updated_at,
        customers!inner(id, name),
        projects(id, name),
        profiles!quotes_created_by_fkey(id, full_name)
      `,
      { count: 'exact' }
    );

    // 필터 적용
    if (filters.status) {
      const validStatuses = ['draft', 'sent', 'accepted', 'revised', 'canceled'];
      if (validStatuses.includes(filters.status)) {
        query = query.eq('status', filters.status);
      }
    }

    if (filters.customer_id) {
      const customerId = validateUUID(filters.customer_id, '고객 ID');
      query = query.eq('customer_id', customerId);
    }

    if (filters.search) {
      const searchTerm = sanitizeString(filters.search, 100);
      query = query.or(
        `name.ilike.%${searchTerm}%,quote_number.ilike.%${searchTerm}%`
      );
    }

    // 정렬 및 페이지네이션
    const validSortFields = ['created_at', 'updated_at', 'issue_date', 'name'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    query = query
      .order(safeSortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new BusinessError(`견적서 목록 조회 실패: ${error.message}`);
    }

    return createPaginatedApiResponse(data || [], count || 0, page, limit);
  });
}

/**
 * 🔑 핵심 함수: 견적서 스냅샷 생성
 * 마스터 데이터의 현재 상태를 완전히 복사하여 저장
 */
async function createQuoteSnapshot(groups: any[], supabaseClient: any) {
  try {
    // 1. 모든 그룹의 모든 아이템에서 마스터 데이터 ID 추출
    const masterItemIds = new Set<string>();
    const supplierIds = new Set<string>();

    groups.forEach(group => {
      group.items?.forEach((item: any) => {
        item.details?.forEach((detail: any) => {
          if (detail.item_id) masterItemIds.add(detail.item_id);
          if (detail.supplier_id) supplierIds.add(detail.supplier_id);
        });
      });
    });

    // 2. 마스터 데이터 일괄 조회 (성능 최적화)
    const [masterItems, suppliers] = await Promise.all([
      masterItemIds.size > 0 
        ? supabaseClient
            .from('items')
            .select('*')
            .in('id', Array.from(masterItemIds))
        : { data: [], error: null },
      supplierIds.size > 0
        ? supabaseClient
            .from('suppliers')
            .select('*')
            .in('id', Array.from(supplierIds))
        : { data: [], error: null }
    ]);

    if (masterItems.error || suppliers.error) {
      throw new Error('마스터 데이터 조회 실패');
    }

    // 3. 스냅샷 데이터 생성 (메모리에서 처리)
    const itemLookup = new Map(masterItems.data?.map(item => [item.id, item]) || []);
    const supplierLookup = new Map(suppliers.data?.map(supplier => [supplier.id, supplier]) || []);

    const snapshotGroups = groups.map(group => ({
      ...group,
      items: group.items?.map((item: any) => ({
        ...item,
        details: item.details?.map((detail: any) => {
          const masterItem = itemLookup.get(detail.item_id);
          const supplier = supplierLookup.get(detail.supplier_id);

          return {
            ...detail,
            // 🔑 스냅샷 필드들
            name_snapshot: masterItem?.name || detail.name,
            description_snapshot: masterItem?.description || detail.description,
            unit_price_snapshot: masterItem?.default_unit_price || detail.unit_price,
            cost_price_snapshot: masterItem?.cost_price || detail.cost_price,
            supplier_name_snapshot: supplier?.name || detail.supplier_name,
            // 스냅샷 생성 시점 기록
            snapshot_created_at: new Date().toISOString(),
          };
        }) || []
      })) || []
    }));

    return {
      groups: snapshotGroups,
      snapshot_metadata: {
        created_at: new Date().toISOString(),
        master_items_count: masterItemIds.size,
        suppliers_count: supplierIds.size,
        version: '1.0'
      }
    };

  } catch (error) {
    console.error('스냅샷 생성 중 오류:', error);
    throw new BusinessError('견적서 스냅샷 생성 실패');
  }
}