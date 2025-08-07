import { NextRequest } from 'next/server';
import { createDirectApi, DirectQueryBuilder } from '@/lib/api/direct-integration';

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  project_title?: string;
  description?: string;
  client_id: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired';
  quote_date: string;
  valid_until?: string;
  subtotal_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  approved_at?: string;
  approved_by?: string;
  rejected_at?: string;
  rejected_by?: string;
  rejection_reason?: string;
}

// GET /api/quotes/[id] - 최적화된 견적서 상세 조회
export const GET = createDirectApi(
  async ({ supabase }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'quotes');
    
    const quote = await queryBuilder.findOne<Quote>(params.id, `
      *,
      client:clients!inner(id, name, business_registration_number, contact_person, email, phone),
      creator:profiles!quotes_created_by_fkey(id, full_name, email),
      quote_groups(
        id,
        name,
        sort_order,
        include_in_fee,
        quote_items_motionsense(
          id,
          name,
          sort_order,
          include_in_fee,
          quote_details(
            id,
            name,
            description,
            quantity,
            days,
            unit,
            unit_price,
            is_service,
            cost_price,
            supplier_name_snapshot,
            sort_order
          )
        )
      )
    `);
    
    if (!quote || !quote.is_active) {
      throw new Error('견적서를 찾을 수 없습니다.');
    }

    return quote;
  },
  { requireAuth: true, enableLogging: true }
);

// PUT /api/quotes/[id] - 최적화된 견적서 수정 (4-Tier 구조)
export const PUT = createDirectApi(
  async ({ supabase, user, body }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'quotes');
    
    // 입력 검증
    if (!body?.title?.trim()) {
      throw new Error('견적서 제목은 필수 항목입니다.');
    }
    
    // 기존 견적서 존재 확인
    const existingQuote = await queryBuilder.findOne<Quote>(params.id);
    if (!existingQuote || !existingQuote.is_active) {
      throw new Error('견적서를 찾을 수 없습니다.');
    }
    
    // 상태 검증 - 승인된 견적서는 수정 불가
    if (existingQuote.status === 'approved') {
      throw new Error('승인된 견적서는 수정할 수 없습니다.');
    }
    
    // 상태 검증 (필요한 경우)
    if (body.status) {
      const validStatuses = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'expired'];
      if (!validStatuses.includes(body.status)) {
        throw new Error('유효하지 않은 상태입니다.');
      }
    }

    // 금액 재계산 (클라이언트에서 전송된 값 검증)
    const subtotalAmount = body.subtotal_amount || existingQuote.subtotal_amount;
    const taxRate = Math.max(0, Math.min(100, body.tax_rate || existingQuote.tax_rate));
    const taxAmount = Math.round(subtotalAmount * taxRate / 100);
    const discountRate = Math.max(0, Math.min(100, body.discount_rate || 0));
    const discountAmount = Math.round(subtotalAmount * discountRate / 100);
    const totalAmount = subtotalAmount + taxAmount - discountAmount;

    // 트랜잭션 실행 (견적서 기본 정보 + 4-Tier 구조 업데이트)
    const { data: result, error } = await supabase.rpc('update_quote_4tier', {
      p_quote_id: params.id,
      p_quote_data: {
        title: body.title.trim(),
        project_title: body.project_title?.trim() || null,
        description: body.description?.trim() || null,
        status: body.status || existingQuote.status,
        valid_until: body.valid_until || existingQuote.valid_until,
        subtotal_amount: subtotalAmount,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        discount_rate: discountRate,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        payment_terms: body.payment_terms?.trim() || null,
        delivery_terms: body.delivery_terms?.trim() || null,
        special_terms: body.special_terms?.trim() || null,
        internal_notes: body.internal_notes?.trim() || null,
        updated_by: user.id,
      },
      p_quote_groups: body.quote_groups || [],
    });

    if (error) {
      console.error('Quote update error:', error);
      throw new Error('견적서 수정 중 오류가 발생했습니다.');
    }

    // 업데이트된 견적서 조회
    const updatedQuote = await queryBuilder.findOne<Quote>(params.id, `
      *,
      client:clients!inner(id, name),
      creator:profiles!quotes_created_by_fkey(id, full_name)
    `);

    return {
      message: `견적서 ${updatedQuote.quote_number}가 성공적으로 수정되었습니다.`,
      quote: updatedQuote,
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);

// DELETE /api/quotes/[id] - 최적화된 견적서 삭제 (소프트 삭제)
export const DELETE = createDirectApi(
  async ({ supabase, user }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'quotes');
    
    // 기존 견적서 확인
    const existingQuote = await queryBuilder.findOne<Quote>(params.id);
    if (!existingQuote || !existingQuote.is_active) {
      throw new Error('견적서를 찾을 수 없습니다.');
    }
    
    // 삭제 가능 여부 확인
    if (existingQuote.status === 'approved') {
      throw new Error('승인된 견적서는 삭제할 수 없습니다.');
    }

    // 프로젝트로 전환된 견적서 확인
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('quote_id', params.id)
      .limit(1);

    if (projects && projects.length > 0) {
      throw new Error('프로젝트로 전환된 견적서는 삭제할 수 없습니다.');
    }

    // 소프트 삭제 실행
    await queryBuilder.update(params.id, {
      is_active: false,
      updated_by: user.id,
    });

    return {
      message: `견적서 ${existingQuote.quote_number}가 성공적으로 삭제되었습니다.`,
    };
  },
  { requireAuth: true, requiredRole: 'admin', enableLogging: true }
);

// PATCH /api/quotes/[id] - 최적화된 견적서 상태 변경
export const PATCH = createDirectApi(
  async ({ supabase, user, body }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'quotes');
    
    if (!body?.status) {
      throw new Error('변경할 상태를 지정해주세요.');
    }

    // 상태 유효성 검사
    const validStatuses = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'expired'];
    if (!validStatuses.includes(body.status)) {
      throw new Error('유효하지 않은 상태입니다.');
    }

    // 기존 견적서 확인
    const existingQuote = await queryBuilder.findOne<Quote>(params.id);
    if (!existingQuote || !existingQuote.is_active) {
      throw new Error('견적서를 찾을 수 없습니다.');
    }

    // 상태 변경 규칙 검증
    const statusTransitions: Record<string, string[]> = {
      'draft': ['submitted'],
      'submitted': ['under_review', 'rejected'],
      'under_review': ['approved', 'rejected'],
      'approved': ['expired'],
      'rejected': ['draft'],
      'expired': [], // 만료된 견적서는 상태 변경 불가
    };

    const allowedNextStatuses = statusTransitions[existingQuote.status] || [];
    if (!allowedNextStatuses.includes(body.status)) {
      throw new Error(`현재 상태(${existingQuote.status})에서 ${body.status}로 변경할 수 없습니다.`);
    }

    // 상태별 추가 데이터 준비
    const updateData: Partial<Quote> = {
      status: body.status,
      updated_by: user.id,
    };

    // 승인 시 추가 정보
    if (body.status === 'approved') {
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by = user.id;
    }

    // 거부 시 추가 정보
    if (body.status === 'rejected') {
      updateData.rejected_at = new Date().toISOString();
      updateData.rejected_by = user.id;
      updateData.rejection_reason = body.rejection_reason?.trim() || null;
    }

    // 상태 업데이트
    const updatedQuote = await queryBuilder.update<Quote>(params.id, updateData, `
      id, quote_number, title, status, approved_at, rejected_at, rejection_reason
    `);

    return {
      message: `견적서 ${updatedQuote.quote_number}의 상태가 ${body.status}로 변경되었습니다.`,
      quote: updatedQuote,
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);