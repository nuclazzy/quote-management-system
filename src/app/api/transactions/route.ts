import { NextRequest, NextResponse } from 'next/server';
import { MOCK_QUOTES, MOCK_CLIENTS, MOCK_SUPPLIERS, QUOTE_TO_TRANSACTION_MAPPING } from '@/data/mock-quotes';

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
  created_by?: string;
  updated_at?: string;
  // 확장 필드들
  commission_rate?: number;     // 대행수수료 비율 (%)
  commission_amount?: number;   // 대행수수료 금액
  project_name?: string;        // 프로젝트명
  business_type?: string;       // 업종
  payment_method?: string;      // 결제방식
  contract_period?: string;     // 계약기간
  milestone?: string;           // 마일스톤
}

// 견적서 기반 정산 데이터 - 빈 데이터로 초기화
const MOCK_TRANSACTIONS: Transaction[] = [];

// GET /api/transactions - StaticAuth 거래 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 필터링
    let transactions = [...MOCK_TRANSACTIONS];
    
    const projectId = searchParams.get('project_id');
    if (projectId) {
      transactions = transactions.filter(t => t.project_id === projectId);
    }
    
    const status = searchParams.get('status');
    if (status && ['pending', 'processing', 'completed', 'issue'].includes(status)) {
      transactions = transactions.filter(t => t.status === status as any);
    }
    
    const type = searchParams.get('type');
    if (type && ['income', 'expense'].includes(type)) {
      transactions = transactions.filter(t => t.type === type as any);
    }

    // 날짜 범위 필터
    const dueDateFrom = searchParams.get('due_date_from');
    const dueDateTo = searchParams.get('due_date_to');
    
    if (dueDateFrom || dueDateTo) {
      transactions = transactions.filter((transaction) => {
        if (!transaction.due_date) return false;
        const dueDate = new Date(transaction.due_date);
        if (dueDateFrom && dueDate < new Date(dueDateFrom)) return false;
        if (dueDateTo && dueDate > new Date(dueDateTo)) return false;
        return true;
      });
    }

    // 파트너 검색
    const partner = searchParams.get('partner');
    if (partner) {
      transactions = transactions.filter(t => 
        t.partner_name.toLowerCase().includes(partner.toLowerCase())
      );
    }

    // 정렬 (최신순)
    transactions.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({
      success: true,
      data: { transactions },
      meta: {
        total: transactions.length,
        quote_based: transactions.filter(t => t.project_id.startsWith('quote-')).length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : '거래 목록 조회에 실패했습니다.' 
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}

// POST /api/transactions - StaticAuth 거래 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 필수 필드 검증
    if (!body.project_id || !body.type || !body.partner_name || !body.item_name || !body.amount) {
      return NextResponse.json(
        {
          success: false,
          error: { 
            message: '필수 필드가 누락되었습니다.' 
          },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    // 타입 검증
    if (!['income', 'expense'].includes(body.type)) {
      return NextResponse.json(
        {
          success: false,
          error: { 
            message: '거래 유형이 올바르지 않습니다.' 
          },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    // 새 거래 생성
    const newTransaction: Transaction = {
      id: `t-${Date.now()}`,
      project_id: body.project_id,
      type: body.type,
      partner_name: body.partner_name,
      item_name: body.item_name,
      amount: Number(body.amount),
      due_date: body.due_date,
      status: body.status || 'pending',
      tax_invoice_status: body.tax_invoice_status || 'not_issued',
      notes: body.notes,
      commission_rate: body.commission_rate ? Number(body.commission_rate) : undefined,
      commission_amount: body.commission_amount ? Number(body.commission_amount) : undefined,
      project_name: body.project_name,
      business_type: body.business_type,
      payment_method: body.payment_method,
      contract_period: body.contract_period,
      milestone: body.milestone,
      created_at: new Date().toISOString(),
      created_by: 'static',
    };

    // Mock 데이터에 추가 (실제로는 localStorage 또는 다른 저장소 사용)
    MOCK_TRANSACTIONS.push(newTransaction);

    return NextResponse.json({
      success: true,
      data: {
        message: '거래가 성공적으로 등록되었습니다.',
        transaction: newTransaction,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : '거래 생성에 실패했습니다.' 
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}