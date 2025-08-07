import {
  createDirectApi,
  DirectQueryBuilder,
} from '@/lib/api/direct-integration';

interface QuoteGroup {
  id: string;
  name: string;
  include_in_fee: boolean;
  items: QuoteItem[];
}

interface QuoteItem {
  id: string;
  name: string;
  include_in_fee: boolean;
  details: QuoteDetail[];
}

interface QuoteDetail {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  days: number;
  unit: string;
  unit_price: number;
  is_service: boolean;
  cost_price: number;
  supplier_id?: string;
  supplier_name_snapshot?: string;
}

interface Quote {
  id: string;
  quote_number: string;
  project_title: string;
  customer_id?: string;
  customer_name_snapshot: string;
  vat_type: string;
  discount_amount: number;
  agency_fee_rate: number;
  notes?: string;
  created_by: string;
  groups: QuoteGroup[];
}

// POST /api/quotes/[id]/copy - 최적화된 견적서 복사
export const POST = createDirectApi(
  async ({ supabase, user, body }, { params }: { params: { id: string } }) => {
    const {
      project_title,
      customer_id,
      customer_name_snapshot,
      copy_structure_only = false,
    } = body;

    if (!project_title?.trim()) {
      throw new Error('프로젝트명을 입력해주세요.');
    }

    const queryBuilder = new DirectQueryBuilder(supabase, 'quotes');

    // 원본 견적서 조회 및 권한 확인
    const sourceQuote = await queryBuilder.findOne<Quote>(params.id, `
      *,
      groups:quote_groups(
        id, name, include_in_fee, sort_order,
        items:quote_items(
          id, name, include_in_fee, sort_order,
          details:quote_details(
            id, name, description, quantity, days, unit, unit_price,
            is_service, cost_price, supplier_id, supplier_name_snapshot, sort_order
          )
        )
      )
    `);

    if (!sourceQuote) {
      throw new Error('원본 견적서를 찾을 수 없습니다.');
    }

    // 권한 확인
    const profileQuery = new DirectQueryBuilder(supabase, 'profiles');
    const userProfile = await profileQuery.findOne(user.id, 'role');

    if (userProfile?.role === 'member' && sourceQuote.created_by !== user.id) {
      throw new Error('해당 견적서를 복사할 권한이 없습니다.');
    }

    // 4-Tier 견적서 복사를 위한 RPC 호출
    const { data: result, error } = await supabase.rpc('copy_quote_4tier', {
      p_source_quote_id: params.id,
      p_project_title: project_title,
      p_customer_id: customer_id || null,
      p_customer_name_snapshot: customer_name_snapshot || '',
      p_copy_structure_only: copy_structure_only,
      p_created_by: user.id
    });

    if (error) {
      console.error('견적서 복사 오류:', error);
      throw new Error('견적서 복사에 실패했습니다.');
    }

    // 복사된 견적서 조회
    const newQuote = await queryBuilder.findOne<Quote>(result.quote_id, `
      id, quote_number, project_title, customer_name_snapshot, status, created_at
    `);

    return {
      message: `견적서가 성공적으로 복사되었습니다. ${copy_structure_only ? '(구조만 복사)' : '(전체 복사)'}`,
      quote: newQuote,
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);
