import {
  createDirectApi,
  DirectQueryBuilder,
} from '@/lib/api/direct-integration';

interface SettlementSchedule {
  amount: number;
  due_date: string;
  description: string;
}

interface ConvertToProjectBody {
  start_date?: string;
  end_date?: string;
  settlement_schedule?: SettlementSchedule[];
}

// POST /api/quotes/[id]/convert-to-project - 최적화된 견적서 → 프로젝트 전환
export const POST = createDirectApi(
  async ({ supabase, user, body }, { params }: { params: { id: string } }) => {
    const validatedData = body as ConvertToProjectBody;

    // RPC 함수를 사용한 견적서 → 프로젝트 전환
    const { data: result, error } = await supabase.rpc('convert_quote_to_project', {
      p_quote_id: params.id,
      p_user_id: user.id,
      p_start_date: validatedData.start_date || null,
      p_end_date: validatedData.end_date || null,
      p_settlement_schedule: validatedData.settlement_schedule || null
    });

    if (error) {
      console.error('견적서 → 프로젝트 전환 오류:', error);
      
      // 특정 오류 메시지 처리
      if (error.message.includes('not found')) {
        throw new Error('견적서를 찾을 수 없습니다.');
      } else if (error.message.includes('not accepted')) {
        throw new Error('승인된 견적서만 프로젝트로 전환할 수 있습니다.');
      } else if (error.message.includes('already converted')) {
        throw new Error('이미 프로젝트로 전환된 견적서입니다.');
      } else {
        throw new Error('프로젝트 전환에 실패했습니다.');
      }
    }

    // 생성된 프로젝트 정보 조회
    const projectQuery = new DirectQueryBuilder(supabase, 'projects');
    const project = await projectQuery.findOne(result.project_id, `
      id, name, total_revenue, total_cost, status, start_date, end_date, created_at
    `);

    return {
      message: '견적서가 성공적으로 프로젝트로 전환되었습니다.',
      project,
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);
