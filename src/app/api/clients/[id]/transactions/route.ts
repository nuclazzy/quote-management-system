import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// GET /api/clients/[id]/transactions - 고객사별 거래 내역 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = params.id;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // 고객사 소유권 확인
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name')
      .eq('id', customerId)
      .eq('user_id', user.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found or access denied' },
        { status: 404 }
      );
    }

    // 견적서 조회
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select(`
        id,
        quote_number,
        status,
        total_amount,
        created_at,
        updated_at,
        project_name
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (quotesError) {
      console.error('Error fetching customer quotes:', quotesError);
    }

    // 프로젝트 조회
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        status,
        total_revenue,
        total_cost,
        profit_margin,
        start_date,
        end_date,
        created_at,
        updated_at
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (projectsError) {
      console.error('Error fetching customer projects:', projectsError);
    }

    // 거래 내역 조회 (프로젝트와 연결된)
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        id,
        project_id,
        type,
        partner_name,
        item_name,
        amount,
        status,
        tax_invoice_status,
        due_date,
        created_at,
        projects!inner(
          id,
          name,
          customer_id
        )
      `)
      .eq('projects.customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (transactionsError) {
      console.error('Error fetching customer transactions:', transactionsError);
    }

    // 통계 계산
    const stats = {
      totalQuotes: quotes?.length || 0,
      acceptedQuotes: quotes?.filter(q => q.status === 'accepted').length || 0,
      totalProjects: projects?.length || 0,
      activeProjects: projects?.filter(p => p.status === 'active').length || 0,
      completedProjects: projects?.filter(p => p.status === 'completed').length || 0,
      totalRevenue: projects?.reduce((sum, p) => sum + (p.total_revenue || 0), 0) || 0,
      totalCost: projects?.reduce((sum, p) => sum + (p.total_cost || 0), 0) || 0,
      totalProfit: 0,
      pendingTransactions: transactions?.filter(t => t.status === 'pending').length || 0,
      completedTransactions: transactions?.filter(t => t.status === 'completed').length || 0,
    };

    stats.totalProfit = stats.totalRevenue - stats.totalCost;

    // 최근 활동 (견적서, 프로젝트, 거래 통합)
    const recentActivities = [];

    // 견적서 활동
    quotes?.slice(0, 10).forEach(quote => {
      recentActivities.push({
        id: quote.id,
        type: 'quote',
        title: `견적서 ${quote.quote_number}`,
        status: quote.status,
        amount: quote.total_amount,
        date: quote.created_at,
        description: quote.project_name
      });
    });

    // 프로젝트 활동
    projects?.slice(0, 10).forEach(project => {
      recentActivities.push({
        id: project.id,
        type: 'project',
        title: project.name,
        status: project.status,
        amount: project.total_revenue,
        date: project.created_at,
        description: `수익률: ${project.profit_margin || 0}%`
      });
    });

    // 거래 활동
    transactions?.slice(0, 10).forEach(transaction => {
      recentActivities.push({
        id: transaction.id,
        type: 'transaction',
        title: transaction.item_name,
        status: transaction.status,
        amount: transaction.amount,
        date: transaction.created_at,
        description: `${transaction.type === 'income' ? '수입' : '지출'} - ${transaction.partner_name}`
      });
    });

    // 날짜순 정렬
    recentActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      customer: customer,
      stats,
      quotes: quotes || [],
      projects: projects || [],
      transactions: transactions || [],
      recentActivities: recentActivities.slice(0, 20) // 최근 20개 활동
    });

  } catch (error) {
    console.error('GET /api/clients/[id]/transactions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}