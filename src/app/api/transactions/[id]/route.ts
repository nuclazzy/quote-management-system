import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateTransactionSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'issue']).optional(),
  tax_invoice_status: z.enum(['not_issued', 'issued', 'received']).optional(),
  notes: z.string().optional(),
  partner_name: z.string().optional(),
  item_name: z.string().optional(),
  amount: z.number().positive().optional(),
  due_date: z.string().nullable().optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const transactionId = params.id;
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 거래 정보 조회
    const { data: transaction, error } = await supabase
      .from('transactions')
      .select(`
        *,
        projects!inner(id, name, quotes!inner(customer_name_snapshot))
      `)
      .eq('id', transactionId)
      .single();

    if (error || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ transaction });

  } catch (error) {
    console.error('Transaction GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const transactionId = params.id;
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 요청 데이터 검증
    const body = await request.json();
    const validatedData = updateTransactionSchema.parse(body);

    // 거래 존재 확인
    const { data: existingTransaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError || !existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // 거래 업데이트
    const { data: transaction, error: updateError } = await supabase
      .from('transactions')
      .update(validatedData)
      .eq('id', transactionId)
      .select(`
        *,
        projects!inner(id, name)
      `)
      .single();

    if (updateError) {
      console.error('Transaction update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update transaction' },
        { status: 500 }
      );
    }

    // 상태 변경 시 알림 생성
    if (validatedData.status && validatedData.status !== existingTransaction.status) {
      const statusText = {
        'pending': '대기',
        'processing': '진행중',
        'completed': '완료',
        'issue': '문제'
      }[validatedData.status];

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          message: `거래 "${existingTransaction.item_name}"의 상태가 "${statusText}"로 변경되었습니다.`,
          link_url: `/projects/${existingTransaction.project_id}`,
          notification_type: validatedData.status === 'completed' ? 'general' : 
                           validatedData.status === 'issue' ? 'issue' : 'general'
        });

      if (notificationError) {
        console.error('Notification creation error:', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      transaction
    });

  } catch (error) {
    console.error('Transaction PATCH error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const transactionId = params.id;
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 거래 존재 확인
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // 완료된 거래는 삭제 불가
    if (transaction.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot delete completed transaction' },
        { status: 400 }
      );
    }

    // 거래 삭제
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (deleteError) {
      console.error('Transaction delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete transaction' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully'
    });

  } catch (error) {
    console.error('Transaction DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}