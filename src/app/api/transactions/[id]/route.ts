import {
  createDirectApi,
  DirectQueryBuilder,
} from '@/lib/api/direct-integration';
import { z } from 'zod';

const updateTransactionSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'issue']).optional(),
  tax_invoice_status: z.enum(['not_issued', 'issued', 'received']).optional(),
  notes: z.string().optional(),
  partner_name: z.string().optional(),
  item_name: z.string().optional(),
  amount: z.number().positive().optional(),
  due_date: z.string().nullable().optional(),
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

// GET /api/transactions/[id] - 최적화된 거래 상세 조회
export const GET = createDirectApi(
  async ({ supabase }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'transactions');
    
    const transaction = await queryBuilder.findOne<Transaction>(params.id, `
      *,
      projects!inner(id, name, quotes!inner(customer_name_snapshot))
    `);
    
    if (!transaction) {
      throw new Error('거래를 찾을 수 없습니다.');
    }

    return { transaction };
  },
  { requireAuth: true, enableLogging: true }
);

// PATCH /api/transactions/[id] - 최적화된 거래 수정
export const PATCH = createDirectApi(
  async ({ supabase, user, body }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'transactions');
    
    // 스키마 검증
    let validatedData;
    try {
      validatedData = updateTransactionSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`입력 데이터가 유효하지 않습니다: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }

    // 기존 거래 확인
    const existingTransaction = await queryBuilder.findOne<Transaction>(params.id);
    if (!existingTransaction) {
      throw new Error('거래를 찾을 수 없습니다.');
    }

    // 거래 업데이트
    const transaction = await queryBuilder.update<Transaction>(params.id, validatedData, `
      *,
      projects!inner(id, name)
    `);

    // 상태 변경 시 알림 생성 (비동기)
    if (validatedData.status && validatedData.status !== existingTransaction.status) {
      const statusText = {
        pending: '대기',
        processing: '진행중',
        completed: '완료',
        issue: '문제',
      }[validatedData.status];

      const notificationQuery = new DirectQueryBuilder(supabase, 'notifications');
      try {
        await notificationQuery.create({
          user_id: user.id,
          message: `거래 "${existingTransaction.item_name}"의 상태가 "${statusText}"로 변경되었습니다.`,
          link_url: `/projects/${existingTransaction.project_id}`,
          notification_type: validatedData.status === 'completed' ? 'general' : 
                           validatedData.status === 'issue' ? 'issue' : 'general',
          is_read: false,
        });
      } catch (notificationError) {
        console.error('Notification creation error:', notificationError);
        // 알림 생성 실패는 무시하고 계속 진행
      }
    }

    return {
      success: true,
      message: '거래가 성공적으로 수정되었습니다.',
      transaction,
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);

// DELETE /api/transactions/[id] - 최적화된 거래 삭제
export const DELETE = createDirectApi(
  async ({ supabase }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'transactions');
    
    // 기존 거래 확인
    const existingTransaction = await queryBuilder.findOne<Transaction>(params.id);
    if (!existingTransaction) {
      throw new Error('거래를 찾을 수 없습니다.');
    }

    // 완료된 거래는 삭제 불가
    if (existingTransaction.status === 'completed') {
      throw new Error('완료된 거래는 삭제할 수 없습니다.');
    }

    // 거래 삭제
    await queryBuilder.delete(params.id);

    return {
      success: true,
      message: '거래가 성공적으로 삭제되었습니다.',
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);