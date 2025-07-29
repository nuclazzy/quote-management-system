import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createTransactionSchema = z.object({
  project_id: z.string().uuid(),
  type: z.enum(['income', 'expense']),
  partner_name: z.string().min(1),
  item_name: z.string().min(1),
  amount: z.number().positive(),
  due_date: z.string().optional(),
  notes: z.string().optional()
});

const updateTransactionSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'issue']).optional(),
  tax_invoice_status: z.enum(['not_issued', 'issued', 'received']).optional(),
  notes: z.string().optional()
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const dueDateFrom = searchParams.get('due_date_from');
    const dueDateTo = searchParams.get('due_date_to');

    let query = supabase
      .from('transactions')
      .select(`
        *,
        projects!inner(id, name, quotes!inner(customer_name_snapshot))
      `)
      .order('created_at', { ascending: false });

    // 필터 적용
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (dueDateFrom) {
      query = query.gte('due_date', dueDateFrom);
    }
    if (dueDateTo) {
      query = query.lte('due_date', dueDateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ transactions: data });

  } catch (error) {
    console.error('Transactions GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
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
    const validatedData = createTransactionSchema.parse(body);

    // 프로젝트 존재 확인
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', validatedData.project_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // 거래 생성
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        ...validatedData,
        status: 'pending',
        tax_invoice_status: 'not_issued',
        created_by: user.id
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      return NextResponse.json(
        { error: 'Failed to create transaction' },
        { status: 500 }
      );
    }

    // 알림 생성
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        message: `새로운 ${validatedData.type === 'income' ? '수입' : '지출'} 거래가 등록되었습니다: ${validatedData.item_name}`,
        link_url: `/projects/${validatedData.project_id}`,
        notification_type: 'general'
      });

    if (notificationError) {
      console.error('Notification creation error:', notificationError);
    }

    return NextResponse.json({
      success: true,
      transaction
    });

  } catch (error) {
    console.error('Transactions POST error:', error);
    
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