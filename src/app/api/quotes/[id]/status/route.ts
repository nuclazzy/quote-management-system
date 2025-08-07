import {
  createDirectApi,
  DirectQueryBuilder,
} from '@/lib/api/direct-integration';

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired';
  created_by: string;
  approved_at?: string;
  approved_by?: string;
  rejected_at?: string;
  rejected_by?: string;
  rejection_reason?: string;
}

// PATCH /api/quotes/[id]/status - 최적화된 견적서 상태 변경
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
    if (!existingQuote) {
      throw new Error('견적서를 찾을 수 없습니다.');
    }

    // 권한 확인
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userProfile?.role === 'member' && existingQuote.created_by !== user.id) {
      throw new Error('해당 견적서의 상태를 변경할 권한이 없습니다.');
    }

    // 상태 변경 규칙 검증 (단순화된 3단계)
    const statusTransitions: Record<string, string[]> = {
      'draft': ['submitted', 'approved', 'rejected'], // 임시저장 → 제출/승인/거부
      'submitted': ['under_review', 'approved', 'rejected'], // 제출 → 검토중/승인/거부
      'under_review': ['approved', 'rejected'], // 검토중 → 승인/거부
      'approved': ['expired'], // 승인 → 만료
      'rejected': ['draft'], // 거부 → 임시저장 (재검토)
      'expired': [], // 만료된 견적서는 상태 변경 불가
    };

    const allowedNextStatuses = statusTransitions[existingQuote.status] || [];
    if (!allowedNextStatuses.includes(body.status)) {
      throw new Error(`현재 상태(${existingQuote.status})에서 ${body.status}로 변경할 수 없습니다.`);
    }

    // 상태별 추가 데이터 준비
    const updateData: Partial<Quote> = {
      status: body.status,
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

    // 상태 업데이트 (RPC 함수 사용)
    const { data: result, error } = await supabase.rpc('update_quote_status', {
      p_quote_id: params.id,
      p_new_status: body.status,
      p_notes: body.notes || null,
      p_updated_by: user.id
    });

    if (error) {
      console.error('Quote status update error:', error);
      throw new Error('견적서 상태 변경 중 오류가 발생했습니다.');
    }

    // 업데이트된 견적서 조회
    const updatedQuote = await queryBuilder.findOne<Quote>(params.id, `
      id, quote_number, title, status, approved_at, rejected_at, rejection_reason
    `);

    return {
      message: `견적서 ${updatedQuote.quote_number}의 상태가 ${body.status}로 변경되었습니다.`,
      quote: updatedQuote,
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);