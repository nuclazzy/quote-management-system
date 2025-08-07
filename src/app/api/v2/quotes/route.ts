import {
  createDirectApi,
  DirectQueryBuilder,
  createPaginatedResponse,
  parsePagination,
  parseSort,
} from '@/lib/api/direct-integration';

// POST /api/v2/quotes - 최적화된 견적서 생성 (v2 구조 + 스냅샷)
export const POST = createDirectApi(
  async ({ supabase, user, body }) => {
    // 필수 필드 검증
    if (!body.project_title?.trim()) {
      throw new Error('프로젝트명을 입력해주세요.');
    }

    // 스냅샷 생성
    const quoteSnapshot = await createQuoteSnapshot(body.groups || [], supabase);

    const queryBuilder = new DirectQueryBuilder(supabase, 'quotes');
    
    // 견적서 생성
    const quoteData = await queryBuilder.create({
      // 기본 견적서 정보
      project_title: body.project_title,
      customer_id: body.customer_id || null,
      customer_name_snapshot: body.customer_name_snapshot || '',
      issue_date: body.issue_date || new Date().toISOString().split('T')[0],
      status: body.status || 'draft',
      vat_type: body.vat_type || 'exclusive',
      discount_amount: body.discount_amount || 0,
      agency_fee_rate: body.agency_fee_rate || 0,
      version: 1,
      created_by: user.id,
      
      // 새로운 구조 (모션센스)
      name: body.name || body.project_title,
      items: body.items || [],
      include_in_fee: body.include_in_fee || false,
      
      // 핵심: 스냅샷 생성 및 저장
      quote_snapshot: quoteSnapshot,
    });

    return {
      message: '견적서가 성공적으로 생성되었습니다.',
      quote: quoteData,
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);

// GET /api/v2/quotes - 최적화된 견적서 목록 조회 (v2 구조)
export const GET = createDirectApi(
  async ({ supabase, searchParams }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'quotes');
    const pagination = parsePagination(searchParams);
    const sort = parseSort(searchParams, ['created_at', 'updated_at', 'issue_date', 'name']);
    
    // 필터 파라미터
    const status = searchParams.get('status');
    const customer_id = searchParams.get('customer_id');
    const search = searchParams.get('search');

    // WHERE 조건
    const where: Record<string, any> = {};
    
    // 상태 필터
    if (status) {
      const validStatuses = ['draft', 'sent', 'accepted', 'revised', 'canceled'];
      if (validStatuses.includes(status)) {
        where.status = status;
      }
    }
    
    // 고객 필터
    if (customer_id) {
      where.customer_id = customer_id;
    }

    // 검색 조건
    const searchCondition = search ? {
      fields: ['name', 'quote_number', 'project_title'],
      term: search.trim()
    } : undefined;

    const { data: quotes, count } = await queryBuilder.findMany({
      select: `
        id,
        quote_number,
        name,
        project_title,
        items,
        include_in_fee,
        quote_snapshot,
        status,
        total_amount,
        issue_date,
        created_at,
        updated_at,
        customer_id,
        customer_name_snapshot
      `,
      where,
      search: searchCondition,
      sort,
      pagination
    });

    return createPaginatedResponse(quotes, count, pagination.page, pagination.limit);
  },
  { requireAuth: true, enableLogging: true }
);

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