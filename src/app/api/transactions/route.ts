import { NextRequest, NextResponse } from 'next/server';

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
}

// Mock 데이터
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    project_id: 'proj-1',
    type: 'income',
    partner_name: '삼성전자',
    item_name: '센서 개발 프로젝트',
    amount: 50000000,
    due_date: '2024-02-28',
    status: 'completed',
    tax_invoice_status: 'issued',
    notes: '1차 계약금',
    created_at: '2024-01-15T10:00:00Z',
    created_by: 'static'
  },
  {
    id: '2',
    project_id: 'proj-1',
    type: 'expense',
    partner_name: 'ABC 부품상사',
    item_name: '센서 부품 구매',
    amount: 15000000,
    due_date: '2024-02-15',
    status: 'processing',
    tax_invoice_status: 'received',
    notes: '부품 대금',
    created_at: '2024-01-20T14:30:00Z',
    created_by: 'static'
  },
  {
    id: '3',
    project_id: 'proj-2',
    type: 'income',
    partner_name: 'LG전자',
    item_name: '컨설팅 서비스',
    amount: 30000000,
    due_date: '2024-03-31',
    status: 'pending',
    tax_invoice_status: 'not_issued',
    notes: '2차 프로젝트',
    created_at: '2024-02-01T09:00:00Z',
    created_by: 'static'
  }
];

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

    // 정렬 (최신순)
    transactions.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({
      success: true,
      data: { transactions },
      meta: {
        total: transactions.length,
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