import {
  createDirectApi,
  DirectQueryBuilder,
} from '@/lib/api/direct-integration';
import { z } from 'zod';

const createTransactionSchema = z.object({
  project_id: z.string().uuid(),
  type: z.enum(['income', 'expense']),
  partner_name: z.string().min(1),
  item_name: z.string().min(1),
  amount: z.number().positive(),
  due_date: z.string().optional(),
  notes: z.string().optional(),
});

interface Transaction {
  id: string;
  project_id: string;
  type: 'income' | 'expense';
  partner_name: string;
  item_name: string;
  amount: number;
  due_date?: string;
  status: 'pending' | 'processing' | 'completed' | 'issue';
  tax_invoice_status: 'not_issued' | 'issued' | 'received';
  notes?: string;
  created_at: string;
  created_by: string;
}

// GET /api/transactions - 최적화된 거래 목록 조회
export const GET = createDirectApi(
  async ({ supabase, searchParams }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'transactions');
    
    // 필터링
    const filters: Record<string, any> = {};
    
    const projectId = searchParams.get('project_id');
    if (projectId) {
      filters.project_id = projectId;
    }
    
    const status = searchParams.get('status');
    if (status && ['pending', 'processing', 'completed', 'issue'].includes(status)) {
      filters.status = status;
    }
    
    const type = searchParams.get('type');
    if (type && ['income', 'expense'].includes(type)) {
      filters.type = type;
    }

    // 날짜 범위 필터는 별도 처리
    const dueDateFrom = searchParams.get('due_date_from');
    const dueDateTo = searchParams.get('due_date_to');

    // 최적화된 단일 쿼리
    const { data: transactions } = await queryBuilder.findMany<Transaction>({
      select: `
        *,
        projects!inner(id, name, quotes!inner(customer_name_snapshot))
      `,
      where: filters,
      sort: { field: 'created_at', direction: 'desc' },
      pagination: { page: 1, limit: 1000 }, // 거래 내역은 많지 않을 것으로 예상
    });

    // 날짜 범위 필터링 (후처리)
    let filteredTransactions = transactions;
    if (dueDateFrom || dueDateTo) {
      filteredTransactions = transactions.filter((transaction) => {
        if (!transaction.due_date) return false;
        const dueDate = new Date(transaction.due_date);
        if (dueDateFrom && dueDate < new Date(dueDateFrom)) return false;
        if (dueDateTo && dueDate > new Date(dueDateTo)) return false;
        return true;
      });
    }

    return { transactions: filteredTransactions };
  },
  { requireAuth: true, enableLogging: true, enableCaching: true }
);

// POST /api/transactions - 최적화된 거래 생성
export const POST = createDirectApi(
  async ({ supabase, user, body }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'transactions');
    
    // 스키마 검증
    let validatedData;
    try {
      validatedData = createTransactionSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`입력 데이터가 유효하지 않습니다: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }

    // 프로젝트 존재 확인
    const projectQuery = new DirectQueryBuilder(supabase, 'projects');
    const project = await projectQuery.findOne(validatedData.project_id);
    
    if (!project) {
      throw new Error('존재하지 않는 프로젝트입니다.');
    }

    // 거래 데이터 준비
    const transactionData = {
      ...validatedData,
      status: 'pending' as const,
      tax_invoice_status: 'not_issued' as const,
      created_by: user.id,
    };

    // 거래 생성
    const transaction = await queryBuilder.create<Transaction>(transactionData);

    // 알림 생성 (비동기, 실패해도 거래 생성은 성공으로 처리)
    const notificationQuery = new DirectQueryBuilder(supabase, 'notifications');
    try {
      await notificationQuery.create({
        user_id: user.id,
        message: `새로운 ${validatedData.type === 'income' ? '수입' : '지출'} 거래가 등록되었습니다: ${validatedData.item_name}`,
        link_url: `/projects/${validatedData.project_id}`,
        notification_type: 'general',
        is_read: false,
      });
    } catch (notificationError) {
      console.error('Notification creation error:', notificationError);
      // 알림 생성 실패는 무시하고 계속 진행
    }

    return {
      success: true,
      message: '거래가 성공적으로 등록되었습니다.',
      transaction,
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);
