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

// 견적서 기반 정산 데이터 - 개별 거래 조회용 Map 구조
const MOCK_TRANSACTIONS: Map<string, Transaction> = new Map([
  // 견적서 Q-2024-001: 삼성전자 Galaxy S25 (승인완료 → 계약체결)
  ['1', {
    id: '1',
    project_id: 'quote-samsung-s25',
    type: 'income',
    partner_name: '삼성전자',
    item_name: 'Galaxy S25 카메라 모듈 공급계약',
    project_name: 'Galaxy S25 Camera Module Development Project',
    business_type: '전자제품 제조',
    amount: 49676000000,
    due_date: '2025-01-15',
    status: 'completed',
    tax_invoice_status: 'issued',
    commission_rate: 3.5,
    commission_amount: 1738660000,
    payment_method: '계좌이체 (3회 분할)',
    contract_period: '2024.12-2025.06 (6개월)',
    milestone: '1차 계약금 입금 완료',
    notes: '견적서 Q-2024-001 승인 후 정식 계약, 1차 계약금 입금 완료 (30%)',
    created_at: '2024-12-02T10:00:00Z',
    created_by: 'user_001',
    updated_at: '2024-12-15T14:30:00Z'
  }],
  
  // 외부 구매: 소니 센서 (삼성 프로젝트용)
  ['2', {
    id: '2',
    project_id: 'quote-samsung-s25',
    type: 'expense',
    partner_name: '소니 반도체 솔루션즈',
    item_name: '64MP 카메라 센서 구매',
    project_name: 'Galaxy S25 Camera Module - 센서 조달',
    business_type: '반도체 제조',
    amount: 32000000000,
    due_date: '2024-12-30',
    status: 'completed',
    tax_invoice_status: 'received',
    commission_rate: 0,
    commission_amount: 0,
    payment_method: '60일 어음',
    contract_period: '2024.12-2025.02 (3개월)',
    milestone: '센서 납품 완료',
    notes: '견적서 Q-2024-001 프로젝트용 센서 조달, 품질검사 완료',
    created_at: '2024-12-01T15:00:00Z',
    created_by: 'user_001',
    updated_at: '2024-12-30T16:00:00Z'
  }],

  // 견적서 Q-2024-004: LG화학 배터리 기술 (드래프트)
  ['3', {
    id: '3',
    project_id: 'quote-lg-battery-tech',
    type: 'income',
    partner_name: 'LG화학',
    item_name: '차세대 리튬배터리 기술 라이센싱',
    project_name: 'Next-Gen Lithium Battery Technology Licensing',
    business_type: '화학공업',
    amount: 1320000000,
    due_date: '2025-02-28',
    status: 'pending',
    tax_invoice_status: 'not_issued',
    commission_rate: 5.0,
    commission_amount: 66000000,
    payment_method: '계좌이체 (2회 분할)',
    contract_period: '2025.01-2026.12 (24개월)',
    milestone: '견적서 승인 대기 중',
    notes: '견적서 Q-2024-004 draft 상태, 특허 출원 완료 후 로열티 별도 협의',
    created_at: '2024-12-10T11:15:00Z',
    created_by: 'user_003'
  }],

  // 견적서 Q-2024-005: 신한은행 블록체인 (만료)
  ['4', {
    id: '4',
    project_id: 'quote-shinhan-blockchain',
    type: 'income',
    partner_name: '신한은행',
    item_name: '디지털 화폐 플랫폼 구축',
    project_name: 'Digital Currency Platform Development',
    business_type: '금융업',
    amount: 1078000000,
    due_date: '2024-12-15',
    status: 'issue',
    tax_invoice_status: 'not_issued',
    commission_rate: 3.0,
    commission_amount: 32340000,
    payment_method: '4회 분할결제 (분기별)',
    contract_period: '2024.10-2025.03 (6개월)',
    milestone: '견적서 만료로 재협상 필요',
    notes: '견적서 Q-2024-005 유효기간 만료 (2024.12.15), 금융감독원 승인 지연으로 재협상 중',
    created_at: '2024-10-15T14:20:00Z',
    created_by: 'user_004'
  }],

  // 견적서 Q-2024-003: 현대자동차 ADAS (제출완료)
  ['5', {
    id: '5',
    project_id: 'quote-hyundai-adas',
    type: 'income',
    partner_name: '현대자동차',
    item_name: '차세대 ADAS 시스템 개발',
    project_name: 'Next-Generation Advanced Driver Assistance Systems',
    business_type: '자동차 제조',
    amount: 2216160000,
    due_date: '2025-03-15',
    status: 'pending',
    tax_invoice_status: 'not_issued',
    commission_rate: 2.8,
    commission_amount: 62052480,
    payment_method: '계좌이체 (4회 분할)',
    contract_period: '2025.01-2025.12 (12개월)',
    milestone: '견적서 검토 중',
    notes: '견적서 Q-2024-003 제출 완료, 기술팀 검토 중, 성능 테스트 10만km 포함',
    created_at: '2024-12-18T16:45:00Z',
    created_by: 'user_001'
  }],

  // 현대자동차 프로젝트 - NVIDIA 모듈 구매
  ['6', {
    id: '6',
    project_id: 'quote-hyundai-adas',
    type: 'expense',
    partner_name: 'NVIDIA Korea',
    item_name: '센서 융합 모듈 구매',
    project_name: 'ADAS 프로젝트용 NVIDIA Orin 모듈',
    business_type: 'GPU/AI 칩셋',
    amount: 420000000,
    due_date: '2025-01-30',
    status: 'processing',
    tax_invoice_status: 'received',
    commission_rate: 0,
    commission_amount: 0,
    payment_method: '30일 계좌이체',
    contract_period: '2024.12-2025.03 (4개월)',
    milestone: '부품 납품 진행 중',
    notes: '견적서 Q-2024-003 관련 부품 조달, 차량급 인증 완료 제품',
    created_at: '2024-12-18T17:00:00Z',
    created_by: 'user_001'
  }],

  // 견적서 Q-2024-002: 카카오 AI 챗봇 (검토중)
  ['7', {
    id: '7',
    project_id: 'quote-kakao-ai-chatbot',
    type: 'income',
    partner_name: '카카오',
    item_name: 'KakaoTalk AI 챗봇 시스템 구축',
    project_name: 'KakaoTalk Business AI Assistant Platform',
    business_type: 'IT 플랫폼',
    amount: 715000000,
    due_date: '2025-01-30',
    status: 'processing',
    tax_invoice_status: 'not_issued',
    commission_rate: 4.5,
    commission_amount: 32175000,
    payment_method: '계좌이체 (3회 분할)',
    contract_period: '2025.01-2025.08 (8개월)',
    milestone: '견적서 기술 검토 진행 중',
    notes: '견적서 Q-2024-002 under_review 상태, AI 모델 성능 검증 중',
    created_at: '2024-12-20T16:00:00Z',
    created_by: 'user_002'
  }],

  // 카카오 프로젝트 - AWS 인프라 비용
  ['8', {
    id: '8',
    project_id: 'quote-kakao-ai-chatbot',
    type: 'expense',
    partner_name: '아마존웹서비스코리아',
    item_name: 'AWS 클라우드 인프라 서비스',
    project_name: 'AI 챗봇 운영 인프라',
    business_type: '클라우드 서비스',
    amount: 140000000,
    due_date: '2025-01-31',
    status: 'processing',
    tax_invoice_status: 'received',
    commission_rate: 0,
    commission_amount: 0,
    payment_method: '월별 자동결제',
    contract_period: '2024.12-2025.08 (9개월)',
    milestone: '인프라 구축 50% 완료',
    notes: '견적서 Q-2024-002 관련 인프라 비용, EC2/RDS/ElastiCache 포함',
    created_at: '2024-12-20T18:00:00Z',
    created_by: 'user_002'
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