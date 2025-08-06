import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const convertToProjectSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  settlement_schedule: z
    .array(
      z.object({
        amount: z.number(),
        due_date: z.string(),
        description: z.string(),
      })
    )
    .optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const quoteId = params.id;

    // 현재 사용자 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 요청 데이터 검증
    const body = await request.json();
    const validatedData = convertToProjectSchema.parse(body);

    // 견적서 정보 조회
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(
        `
        *,
        customers!inner(id, name),
        quote_groups(
          id,
          name,
          include_in_fee,
          quote_items(
            id,
            name,
            include_in_fee,
            quote_details(
              id,
              name,
              quantity,
              days,
              unit_price,
              cost_price,
              is_service,
              supplier_id,
              supplier_name_snapshot
            )
          )
        )
      `
      )
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // 견적서 상태 확인 (accepted 상태만 프로젝트로 전환 가능)
    if (quote.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Only accepted quotes can be converted to projects' },
        { status: 400 }
      );
    }

    // 이미 프로젝트로 전환되었는지 확인
    const { data: existingProject } = await supabase
      .from('projects')
      .select('id')
      .eq('quote_id', quoteId)
      .single();

    if (existingProject) {
      return NextResponse.json(
        { error: 'Quote has already been converted to a project' },
        { status: 400 }
      );
    }

    // 매출과 원가 계산
    let totalRevenue = 0;
    let totalCost = 0;

    quote.quote_groups?.forEach((group: any) => {
      group.quote_items?.forEach((item: any) => {
        item.quote_details?.forEach((detail: any) => {
          const itemTotal = detail.quantity * detail.days * detail.unit_price;
          const itemCost = detail.quantity * detail.days * detail.cost_price;

          if (group.include_in_fee && item.include_in_fee) {
            totalRevenue += itemTotal;
          }
          totalCost += itemCost;
        });
      });
    });

    // 수수료 적용
    const feeApplicableAmount = totalRevenue;
    const agencyFee = feeApplicableAmount * (quote.agency_fee_rate / 100);
    totalRevenue = feeApplicableAmount - agencyFee;

    // 할인 적용
    totalRevenue -= quote.discount_amount || 0;

    // 프로젝트 생성
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        quote_id: quoteId,
        name: quote.project_title,
        total_revenue: totalRevenue,
        total_cost: totalCost,
        status: 'active',
        start_date: validatedData.start_date,
        end_date: validatedData.end_date,
        created_by: user.id,
      })
      .select()
      .single();

    if (projectError) {
      console.error('Project creation error:', projectError);
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }

    // 정산 스케줄이 제공된 경우 거래 생성
    if (
      validatedData.settlement_schedule &&
      validatedData.settlement_schedule.length > 0
    ) {
      const transactions = validatedData.settlement_schedule.map(
        (schedule) => ({
          project_id: project.id,
          type: 'income' as const,
          partner_name: quote.customers.name,
          item_name: schedule.description,
          amount: schedule.amount,
          due_date: schedule.due_date,
          status: 'pending' as const,
          tax_invoice_status: 'not_issued' as const,
          created_by: user.id,
        })
      );

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert(transactions);

      if (transactionError) {
        console.error('Transaction creation error:', transactionError);
        // 프로젝트는 생성되었지만 거래 생성에 실패한 경우 경고만 로그
      }
    } else {
      // 기본 정산 스케줄: 전체 금액을 한 번에
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          project_id: project.id,
          type: 'income',
          partner_name: quote.customers.name,
          item_name: `${quote.project_title} - 프로젝트 수익`,
          amount: totalRevenue,
          due_date:
            validatedData.end_date ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0], // 30일 후
          status: 'pending',
          tax_invoice_status: 'not_issued',
          created_by: user.id,
        });

      if (transactionError) {
        console.error('Transaction creation error:', transactionError);
      }
    }

    // 비용 항목들도 거래로 생성
    const expenseTransactions = [];
    quote.quote_groups?.forEach((group: any) => {
      group.quote_items?.forEach((item: any) => {
        item.quote_details?.forEach((detail: any) => {
          if (!detail.is_service && detail.cost_price > 0) {
            const totalCostForItem =
              detail.quantity * detail.days * detail.cost_price;
            expenseTransactions.push({
              project_id: project.id,
              type: 'expense' as const,
              partner_name: detail.supplier_name_snapshot || '미정',
              item_name: detail.name,
              amount: totalCostForItem,
              status: 'pending' as const,
              tax_invoice_status: 'not_issued' as const,
              created_by: user.id,
            });
          }
        });
      });
    });

    if (expenseTransactions.length > 0) {
      const { error: expenseError } = await supabase
        .from('transactions')
        .insert(expenseTransactions);

      if (expenseError) {
        console.error('Expense transaction creation error:', expenseError);
      }
    }

    // Notification removed - no longer needed
    // Previously notified on project creation

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        total_revenue: project.total_revenue,
        total_cost: project.total_cost,
        status: project.status,
      },
    });
  } catch (error) {
    console.error('Convert to project error:', error);

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
