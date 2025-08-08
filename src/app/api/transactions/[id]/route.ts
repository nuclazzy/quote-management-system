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
  updated_at?: string;
}

// Mock 데이터 저장소 (실제로는 localStorage 또는 다른 저장소 사용)
const MOCK_TRANSACTIONS: Map<string, Transaction> = new Map([
  ['1', {
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
  }],
  ['2', {
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
  }],
  ['3', {
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
  }]
]);

// GET /api/transactions/[id] - StaticAuth 거래 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transaction = MOCK_TRANSACTIONS.get(params.id);
    
    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          error: { message: '거래를 찾을 수 없습니다.' },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { transaction },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : '거래 조회에 실패했습니다.' 
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}

// PATCH /api/transactions/[id] - StaticAuth 거래 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const transaction = MOCK_TRANSACTIONS.get(params.id);
    
    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          error: { message: '거래를 찾을 수 없습니다.' },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 404 }
      );
    }

    // 업데이트 가능한 필드만 수정
    const updatedTransaction: Transaction = {
      ...transaction,
      status: body.status || transaction.status,
      tax_invoice_status: body.tax_invoice_status || transaction.tax_invoice_status,
      notes: body.notes !== undefined ? body.notes : transaction.notes,
      partner_name: body.partner_name || transaction.partner_name,
      item_name: body.item_name || transaction.item_name,
      amount: body.amount !== undefined ? Number(body.amount) : transaction.amount,
      due_date: body.due_date !== undefined ? body.due_date : transaction.due_date,
      updated_at: new Date().toISOString(),
    };

    // Mock 데이터 업데이트
    MOCK_TRANSACTIONS.set(params.id, updatedTransaction);

    // 상태 변경 로그 (실제로는 알림 시스템과 연동)
    if (body.status && body.status !== transaction.status) {
      console.log(`Transaction ${params.id} status changed from ${transaction.status} to ${body.status}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        message: '거래가 성공적으로 수정되었습니다.',
        transaction: updatedTransaction,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : '거래 수정에 실패했습니다.' 
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/transactions/[id] - StaticAuth 거래 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transaction = MOCK_TRANSACTIONS.get(params.id);
    
    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          error: { message: '거래를 찾을 수 없습니다.' },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 404 }
      );
    }

    // 완료된 거래는 삭제 불가
    if (transaction.status === 'completed') {
      return NextResponse.json(
        {
          success: false,
          error: { message: '완료된 거래는 삭제할 수 없습니다.' },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    // Mock 데이터에서 삭제
    MOCK_TRANSACTIONS.delete(params.id);

    return NextResponse.json({
      success: true,
      data: {
        message: '거래가 성공적으로 삭제되었습니다.',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : '거래 삭제에 실패했습니다.' 
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}