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
  // 확장 필드들
  commission_rate?: number; // 대행수수료 비율 (%)
  commission_amount?: number; // 대행수수료 금액
  project_name?: string; // 프로젝트명
  business_type?: string; // 업종
  payment_method?: string; // 결제방식
  contract_period?: string; // 계약기간
  milestone?: string; // 마일스톤
}

// 견적서 기반 정산 데이터 - 빈 데이터로 초기화
const MOCK_TRANSACTIONS: Map<string, Transaction> = new Map();

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
      commission_rate: body.commission_rate !== undefined ? Number(body.commission_rate) : transaction.commission_rate,
      commission_amount: body.commission_amount !== undefined ? Number(body.commission_amount) : transaction.commission_amount,
      project_name: body.project_name || transaction.project_name,
      business_type: body.business_type || transaction.business_type,
      payment_method: body.payment_method || transaction.payment_method,
      contract_period: body.contract_period || transaction.contract_period,
      milestone: body.milestone || transaction.milestone,
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

    // 견적서 기반 거래는 삭제 제한
    if (transaction.project_id.startsWith('quote-')) {
      return NextResponse.json(
        {
          success: false,
          error: { message: '견적서 기반 거래는 삭제할 수 없습니다. 견적서에서 관리해주세요.' },
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