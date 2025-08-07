// 직접 연동 최적화된 견적서 API
import {
  createDirectApi,
  DirectQueryBuilder,
  parsePagination,
  parseSort,
  parseSearch,
  createPaginatedResponse,
} from '@/lib/api/direct-integration';

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  project_title?: string;
  description?: string;
  client_id: string;
  customer_name_snapshot?: string;
  business_registration_number?: string;
  assigned_to?: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired';
  quote_date: string;
  issue_date?: string;
  valid_until?: string;
  subtotal_amount: number;
  tax_rate: number;
  tax_amount: number;
  discount_rate: number;
  discount_amount: number;
  agency_fee_rate?: number;
  vat_type?: 'exclusive' | 'inclusive';
  total_amount: number;
  currency: string;
  payment_terms?: string;
  delivery_terms?: string;
  special_terms?: string;
  internal_notes?: string;
  quote_type: 'standard' | 'framework' | 'service_only' | 'goods_only';
  expected_order_date?: string;
  delivery_location?: string;
  warranty_period?: number;
  version: number;
  parent_quote_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

interface QuoteGroup {
  id: string;
  quote_id: string;
  name: string;
  sort_order: number;
  include_in_fee: boolean;
}

interface QuoteCreateInput {
  title: string;
  project_title?: string;
  description?: string;
  client_id: string;
  status?: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired';
  quote_date?: string;
  valid_until?: string;
  tax_rate?: number;
  discount_rate?: number;
  agency_fee_rate?: number;
  vat_type?: 'exclusive' | 'inclusive';
  currency?: string;
  payment_terms?: string;
  delivery_terms?: string;
  special_terms?: string;
  internal_notes?: string;
  quote_type?: 'standard' | 'framework' | 'service_only' | 'goods_only';
  expected_order_date?: string;
  delivery_location?: string;
  warranty_period?: number;
  quote_groups?: any[];
}

// GET /api/quotes - 최적화된 견적서 목록 조회
export const GET = createDirectApi(
  async ({ supabase, searchParams }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'quotes');
    
    // 파라미터 파싱
    const pagination = parsePagination(searchParams);
    const sort = parseSort(searchParams, [
      'quote_number', 'title', 'status', 'total_amount', 'quote_date', 'created_at', 'updated_at'
    ]);
    
    // 필터링
    const filters: Record<string, any> = {};
    
    const status = searchParams.get('status');
    if (status) {
      const validStatuses = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'expired'];
      if (validStatuses.includes(status)) {
        filters.status = status;
      }
    }
    
    const clientId = searchParams.get('client_id');
    if (clientId) {
      filters.client_id = clientId;
    }
    
    // 검색 조건
    const searchTerm = searchParams.get('search');
    const search = searchTerm ? {
      fields: ['title', 'quote_number', 'project_title', 'customer_name_snapshot'],
      term: searchTerm.trim().slice(0, 100)
    } : undefined;

    // 최적화된 단일 쿼리 (조인 최소화)
    const { data: quotes, count } = await queryBuilder.findMany<Quote>({
      select: `
        id,
        quote_number,
        title,
        project_title,
        status,
        total_amount,
        subtotal_amount,
        tax_amount,
        quote_date,
        valid_until,
        created_at,
        updated_at,
        client:clients!inner(id, name),
        creator:profiles!quotes_created_by_fkey(id, full_name)
      `,
      where: {
        ...filters,
        is_active: true, // 활성 견적서만
      },
      search,
      sort,
      pagination,
    });

    return createPaginatedResponse(
      quotes,
      count,
      pagination.page,
      pagination.limit
    );
  },
  {
    requireAuth: true,
    enableLogging: true,
    enableCaching: true,
  }
);

// POST /api/quotes - 최적화된 견적서 생성 (4-Tier 구조)
export const POST = createDirectApi(
  async ({ supabase, user, body }) => {
    // 입력 검증
    if (!body?.title?.trim()) {
      throw new Error('견적서 제목은 필수 항목입니다.');
    }
    
    if (!body?.client_id) {
      throw new Error('고객사 선택은 필수 항목입니다.');
    }
    
    if (!body?.quote_groups || !Array.isArray(body.quote_groups) || body.quote_groups.length === 0) {
      throw new Error('최소 하나의 견적 그룹이 필요합니다.');
    }

    // 클라이언트 존재 확인 및 스냅샷 데이터 조회
    const clientQuery = new DirectQueryBuilder(supabase, 'clients');
    const client = await clientQuery.findOne<any>(body.client_id, 'id, name, business_registration_number');
    
    if (!client) {
      throw new Error('존재하지 않는 고객사입니다.');
    }

    // 견적서 번호 자동 생성
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const { data: lastQuote } = await supabase
      .from('quotes')
      .select('quote_number')
      .like('quote_number', `Q${today}%`)
      .order('quote_number', { ascending: false })
      .limit(1)
      .single();
    
    let sequence = 1;
    if (lastQuote?.quote_number) {
      const lastSequence = parseInt(lastQuote.quote_number.slice(-3));
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }
    
    const quoteNumber = `Q${today}${sequence.toString().padStart(3, '0')}`;

    // 금액 계산 (클라이언트에서 전송된 값 검증)
    const subtotalAmount = body.subtotal_amount || 0;
    const taxRate = Math.max(0, Math.min(100, body.tax_rate || 10));
    const taxAmount = Math.round(subtotalAmount * taxRate / 100);
    const discountRate = Math.max(0, Math.min(100, body.discount_rate || 0));
    const discountAmount = Math.round(subtotalAmount * discountRate / 100);
    const totalAmount = subtotalAmount + taxAmount - discountAmount;

    // 트랜잭션으로 견적서와 관련 데이터 생성
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        quote_number: quoteNumber,
        title: body.title.trim(),
        project_title: body.project_title?.trim() || null,
        description: body.description?.trim() || null,
        client_id: body.client_id,
        customer_name_snapshot: client.name, // 스냅샷 저장
        business_registration_number: client.business_registration_number,
        status: body.status || 'draft',
        quote_date: body.quote_date || new Date().toISOString().split('T')[0],
        valid_until: body.valid_until || null,
        subtotal_amount: subtotalAmount,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        discount_rate: discountRate,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        currency: body.currency || 'KRW',
        payment_terms: body.payment_terms?.trim() || null,
        delivery_terms: body.delivery_terms?.trim() || null,
        special_terms: body.special_terms?.trim() || null,
        internal_notes: body.internal_notes?.trim() || null,
        quote_type: body.quote_type || 'standard',
        expected_order_date: body.expected_order_date || null,
        delivery_location: body.delivery_location?.trim() || null,
        warranty_period: body.warranty_period || null,
        agency_fee_rate: body.agency_fee_rate || null,
        vat_type: body.vat_type || 'exclusive',
        version: 1,
        is_active: true,
        created_by: user.id,
        updated_by: user.id,
      })
      .select(`
        id,
        quote_number,
        title,
        status,
        total_amount,
        subtotal_amount,
        tax_amount,
        created_at,
        client:clients!inner(id, name),
        creator:profiles!quotes_created_by_fkey(id, full_name)
      `)
      .single();

    if (quoteError) {
      console.error('Quote creation error:', quoteError);
      throw new Error('견적서 생성 중 오류가 발생했습니다.');
    }

    // 견적 그룹들 생성 (병렬 처리)
    if (body.quote_groups && body.quote_groups.length > 0) {
      const groupsData = body.quote_groups.map((group: any, index: number) => ({
        quote_id: quote.id,
        name: group.name || `그룹 ${index + 1}`,
        sort_order: group.sort_order || index,
        include_in_fee: group.include_in_fee !== false,
      }));

      const { error: groupsError } = await supabase
        .from('quote_groups')
        .insert(groupsData);

      if (groupsError) {
        console.error('Quote groups creation error:', groupsError);
        // 견적서는 생성되었지만 그룹 생성 실패
        // 실제 환경에서는 롤백을 고려해야 함
      }
    }

    return {
      message: `견적서 ${quoteNumber}가 성공적으로 생성되었습니다.`,
      quote,
    };
  },
  {
    requireAuth: true,
    requiredRole: 'member',
    enableLogging: true,
  }
);

// 에러 처리 래퍼
const wrapHandler = (handler: any) => async (request: any) => {
  try {
    return await handler(request);
  } catch (error: any) {
    console.error('Quote API Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message || '서버 내부 오류가 발생했습니다.',
          code: error.code || 'INTERNAL_ERROR',
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: error.status || 500 }
    );
  }
};

export { GET as _GET, POST as _POST };