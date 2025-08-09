import {
  createDirectApi,
  DirectQueryBuilder,
  parsePagination,
  parseSort,
  createPaginatedResponse,
} from '@/lib/api/direct-integration';
import { MOCK_QUOTES, MOCK_CLIENTS } from '@/data/mock-quotes';
import { NextRequest, NextResponse } from 'next/server';

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

// GET /api/quotes - StaticAuth Mock 견적서 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 필터링
    let quotes = [...MOCK_QUOTES];
    
    const status = searchParams.get('status');
    if (status) {
      quotes = quotes.filter(q => q.status === status);
    }
    
    const clientId = searchParams.get('client_id');
    if (clientId) {
      quotes = quotes.filter(q => q.client_id === clientId);
    }
    
    const search = searchParams.get('search');
    if (search) {
      const searchTerm = search.toLowerCase();
      quotes = quotes.filter(q => 
        q.title.toLowerCase().includes(searchTerm) ||
        q.quote_number.toLowerCase().includes(searchTerm) ||
        q.client_name.toLowerCase().includes(searchTerm)
      );
    }
    
    // 날짜 필터
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    
    if (fromDate || toDate) {
      quotes = quotes.filter((quote) => {
        const quoteDate = new Date(quote.created_at);
        if (fromDate && quoteDate < new Date(fromDate)) return false;
        if (toDate && quoteDate > new Date(toDate)) return false;
        return true;
      });
    }
    
    // 정렬 (최신순)
    quotes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // 클라이언트 정보 추가
    const quotesWithClient = quotes.map(quote => {
      const client = MOCK_CLIENTS.find(c => c.id === quote.client_id);
      return {
        ...quote,
        client: client ? { id: client.id, name: client.name } : null,
        creator: { id: 'user_001', full_name: '관리자' }
      };
    });

    return NextResponse.json({
      success: true,
      data: quotesWithClient,
      meta: {
        total: quotesWithClient.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : '견적서 목록 조회에 실패했습니다.' 
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}

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

    // 견적서 번호 자동 생성 (더 안전한 방식)
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    // RPC 함수를 사용한 원자적 견적서 번호 생성
    const { data: quoteNumberResult, error: numberError } = await supabase.rpc('generate_quote_number', {
      p_date_prefix: today
    });
    
    let quoteNumber = `Q${today}001`; // 기본값
    if (!numberError && quoteNumberResult) {
      quoteNumber = quoteNumberResult;
    } else {
      // 폴백: 기존 방식
      const { data: lastQuote } = await supabase
        .from('quotes')
        .select('quote_number')
        .like('quote_number', `Q${today}%`)
        .order('quote_number', { ascending: false })
        .limit(1)
        .single();
      
      if (lastQuote?.quote_number) {
        const lastSequence = parseInt(lastQuote.quote_number.slice(-3));
        if (!isNaN(lastSequence)) {
          const nextSequence = lastSequence + 1;
          quoteNumber = `Q${today}${nextSequence.toString().padStart(3, '0')}`;
        }
      }
    }

    // 금액 계산 (클라이언트에서 전송된 값 검증)
    const subtotalAmount = Math.max(0, Number(body.subtotal_amount) || 0);
    const taxRate = Math.max(0, Math.min(100, Number(body.tax_rate) || 10));
    const taxAmount = Math.round(subtotalAmount * taxRate / 100);
    const discountRate = Math.max(0, Math.min(100, Number(body.discount_rate) || 0));
    const discountAmount = Math.round(subtotalAmount * discountRate / 100);
    const totalAmount = subtotalAmount + taxAmount - discountAmount;

    // 4-Tier 견적서 생성을 위한 RPC 호출
    const { data: quoteResult, error: quoteError } = await supabase.rpc('create_quote_4tier', {
      p_quote_data: {
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
      },
      p_quote_groups: body.quote_groups || [],
    });

    if (quoteError) {
      console.error('Quote creation error:', quoteError);
      throw new Error('견적서 생성 중 오류가 발생했습니다.');
    }

    // 생성된 견적서 정보 조회
    const queryBuilder = new DirectQueryBuilder(supabase, 'quotes');
    const createdQuote = await queryBuilder.findOne<Quote>(quoteResult.quote_id, `
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
    `);

    return {
      message: `견적서 ${quoteNumber}가 성공적으로 생성되었습니다.`,
      quote: createdQuote,
      quote_id: quoteResult.quote_id,
    };
  },
  {
    requireAuth: true,
    requiredRole: 'member',
    enableLogging: true,
  }
);