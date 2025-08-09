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

// 견적서 기반 정산 데이터 - 실제 견적서에서 생성된 거래 내역
const MOCK_TRANSACTIONS: Transaction[] = [
  // 견적서 Q-2024-001 기반: 삼성전자 Galaxy S25 카메라 모듈 (승인완료 → 계약체결)
  {
    id: '1',
    project_id: 'quote-samsung-s25',
    type: 'income',
    partner_name: '삼성전자',
    item_name: 'Galaxy S25 카메라 모듈 공급계약',
    project_name: 'Galaxy S25 Camera Module Development Project',
    business_type: '전자제품 제조',
    amount: 49676000000,  // 견적서 총액과 동일
    due_date: '2025-01-15',
    status: 'completed',  // 견적서 승인 완료 → 계약 성사 → 1차 결제 완료
    tax_invoice_status: 'issued',
    commission_rate: 3.5,
    commission_amount: 1738660000,  // 49,676,000,000 * 3.5%
    payment_method: '계좌이체 (3회 분할)',
    contract_period: '2024.12-2025.06 (6개월)',
    milestone: '1차 계약금 입금 완료',
    notes: '견적서 Q-2024-001 승인 후 정식 계약, 1차 계약금 입금 완료 (30%)',
    created_at: '2024-12-02T10:00:00Z',
    created_by: 'user_001',
    updated_at: '2024-12-15T14:30:00Z'
  },

  // 견적서 Q-2024-002 기반: 카카오 AI 챗봇 시스템 (검토중)
  {
    id: '7',
    project_id: 'quote-kakao-ai-chatbot',
    type: 'income',
    partner_name: '카카오',
    item_name: 'KakaoTalk AI 챗봇 시스템 구축',
    project_name: 'KakaoTalk Business AI Assistant Platform',
    business_type: 'IT 플랫폼',
    amount: 715000000,  // 견적서 총액
    due_date: '2025-01-30',
    status: 'processing',  // 견적서 검토 중
    tax_invoice_status: 'not_issued',
    commission_rate: 4.5,
    commission_amount: 32175000,  // 715,000,000 * 4.5%
    payment_method: '계좌이체 (3회 분할)',
    contract_period: '2025.01-2025.08 (8개월)',
    milestone: '견적서 기술 검토 진행 중',
    notes: '견적서 Q-2024-002 under_review 상태, AI 모델 성능 검증 중',
    created_at: '2024-12-20T16:00:00Z',
    created_by: 'user_002'
  },

  // 견적서 Q-2024-003 기반: 현대자동차 ADAS 시스템 (제출완료)
  {
    id: '5',
    project_id: 'quote-hyundai-adas',
    type: 'income',
    partner_name: '현대자동차',
    item_name: '차세대 ADAS 시스템 개발',
    project_name: 'Next-Generation Advanced Driver Assistance Systems',
    business_type: '자동차 제조',
    amount: 2216160000,  // 견적서 총액
    due_date: '2025-03-15',
    status: 'pending',  // 견적서 제출 상태
    tax_invoice_status: 'not_issued',
    commission_rate: 2.8,
    commission_amount: 62052480,  // 2,216,160,000 * 2.8%
    payment_method: '계좌이체 (4회 분할)',
    contract_period: '2025.01-2025.12 (12개월)',
    milestone: '견적서 검토 중',
    notes: '견적서 Q-2024-003 제출 완료, 기술팀 검토 중, 성능 테스트 10만km 포함',
    created_at: '2024-12-18T16:45:00Z',
    created_by: 'user_001'
  },

  // 견적서 Q-2024-004 기반: LG화학 배터리 기술 라이센싱 (드래프트)
  {
    id: '3',
    project_id: 'quote-lg-battery-tech',
    type: 'income',
    partner_name: 'LG화학',
    item_name: '차세대 리튬배터리 기술 라이센싱',
    project_name: 'Next-Gen Lithium Battery Technology Licensing',
    business_type: '화학공업',
    amount: 1320000000,  // 견적서 총액 (VAT 포함)
    due_date: '2025-02-28',
    status: 'pending',  // 견적서 아직 draft 상태
    tax_invoice_status: 'not_issued',
    commission_rate: 5.0,
    commission_amount: 66000000,  // 1,320,000,000 * 5%
    payment_method: '계좌이체 (2회 분할)',
    contract_period: '2025.01-2026.12 (24개월)',
    milestone: '견적서 승인 대기 중',
    notes: '견적서 Q-2024-004 draft 상태, 특허 출원 완료 후 로열티 별도 협의',
    created_at: '2024-12-10T11:15:00Z',
    created_by: 'user_003'
  },

  // 견적서 Q-2024-005 기반: 신한은행 블록체인 플랫폼 (만료)
  {
    id: '4',
    project_id: 'quote-shinhan-blockchain',
    type: 'income',
    partner_name: '신한은행',
    item_name: '디지털 화폐 플랫폼 구축',
    project_name: 'Digital Currency Platform Development',
    business_type: '금융업',
    amount: 1078000000,  // 견적서 총액
    due_date: '2024-12-15',
    status: 'issue',  // 견적서 만료로 이슈 상태
    tax_invoice_status: 'not_issued',
    commission_rate: 3.0,
    commission_amount: 32340000,
    payment_method: '4회 분할결제 (분기별)',
    contract_period: '2024.10-2025.03 (6개월)',
    milestone: '견적서 만료로 재협상 필요',
    notes: '견적서 Q-2024-005 유효기간 만료 (2024.12.15), 금융감독원 승인 지연으로 재협상 중',
    created_at: '2024-10-15T14:20:00Z',
    created_by: 'user_004'
  },

  // 프로젝트 관련 외주/구매 비용들
  // 삼성전자 프로젝트 - 소니 센서 구매
  {
    id: '2',
    project_id: 'quote-samsung-s25',
    type: 'expense',
    partner_name: '소니 반도체 솔루션즈',
    item_name: '64MP 카메라 센서 구매',
    project_name: 'Galaxy S25 Camera Module - 센서 조달',
    business_type: '반도체 제조',
    amount: 32000000000,  // 원가: 32,000원 * 1,000,000개
    due_date: '2024-12-30',
    status: 'completed',  // 부품 납품 완료
    tax_invoice_status: 'received',
    commission_rate: 0,  // 구매 건은 수수료 없음
    commission_amount: 0,
    payment_method: '60일 어음',
    contract_period: '2024.12-2025.02 (3개월)',
    milestone: '센서 납품 완료',
    notes: '견적서 Q-2024-001 프로젝트용 센서 조달, 품질검사 완료',
    created_at: '2024-12-01T15:00:00Z',
    created_by: 'user_001',
    updated_at: '2024-12-30T16:00:00Z'
  },

  // 현대자동차 프로젝트 - NVIDIA 모듈 구매
  {
    id: '6',
    project_id: 'quote-hyundai-adas',
    type: 'expense',
    partner_name: 'NVIDIA Korea',
    item_name: '센서 융합 모듈 구매',
    project_name: 'ADAS 프로젝트용 NVIDIA Orin 모듈',
    business_type: 'GPU/AI 칩셋',
    amount: 420000000,  // 4,200원 * 100,000개 (할인 후)
    due_date: '2025-01-30',
    status: 'processing',  // 납품 진행 중
    tax_invoice_status: 'received',
    commission_rate: 0,
    commission_amount: 0,
    payment_method: '30일 계좌이체',
    contract_period: '2024.12-2025.03 (4개월)',
    milestone: '부품 납품 진행 중',
    notes: '견적서 Q-2024-003 관련 부품 조달, 차량급 인증 완료 제품',
    created_at: '2024-12-18T17:00:00Z',
    created_by: 'user_001'
  },

  // 카카오 프로젝트 - AWS 인프라 비용
  {
    id: '8',
    project_id: 'quote-kakao-ai-chatbot',
    type: 'expense',
    partner_name: '아마존웹서비스코리아',
    item_name: 'AWS 클라우드 인프라 서비스',
    project_name: 'AI 챗봇 운영 인프라',
    business_type: '클라우드 서비스',
    amount: 140000000,  // 견적서 원가 (200M * 70%)
    due_date: '2025-01-31',
    status: 'processing',  // 인프라 구축 중
    tax_invoice_status: 'received',
    commission_rate: 0,
    commission_amount: 0,
    payment_method: '월별 자동결제',
    contract_period: '2024.12-2025.08 (9개월)',
    milestone: '인프라 구축 50% 완료',
    notes: '견적서 Q-2024-002 관련 인프라 비용, EC2/RDS/ElastiCache 포함',
    created_at: '2024-12-20T18:00:00Z',
    created_by: 'user_002'
  },

  // 기타 일반적인 운영비 (견적서와 연관되지 않은 거래들)
  {
    id: '9',
    project_id: 'general-ops-001',
    type: 'expense',
    partner_name: '한국전력공사',
    item_name: '사무실 전력 공급',
    project_name: '일반 운영비',
    business_type: '전력 공급',
    amount: 15000000,
    due_date: '2024-12-31',
    status: 'processing',
    tax_invoice_status: 'received',
    payment_method: '자동이체',
    contract_period: '2024.01-2024.12',
    milestone: '연간 전력 공급',
    notes: '본사 사무실 전력비',
    created_at: '2024-01-01T00:00:00Z',
    created_by: 'user_admin'
  },

  {
    id: '10',
    project_id: 'general-ops-002',
    type: 'expense',
    partner_name: '현대건설',
    item_name: '사무실 임대료',
    project_name: '일반 운영비',
    business_type: '건설업',
    amount: 180000000,
    due_date: '2025-01-31',
    status: 'pending',
    tax_invoice_status: 'not_issued',
    payment_method: '월별 자동이체',
    contract_period: '2025.01-2025.12',
    milestone: '연간 임대계약',
    notes: '보증금 별도 1억원 예치',
    created_at: '2024-12-05T14:30:00Z',
    created_by: 'user_admin'
  },

  {
    id: '11',
    project_id: 'rd-internal-001',
    type: 'income',
    partner_name: '네이버',
    item_name: '검색 알고리즘 개선',
    project_name: 'AI 검색 고도화',
    business_type: 'IT 플랫폼',
    amount: 850000000,
    due_date: '2024-11-30',
    status: 'completed',
    tax_invoice_status: 'issued',
    commission_rate: 4.0,
    commission_amount: 34000000,
    payment_method: '계좌이체 (완료)',
    contract_period: '2024.07-2024.11',
    milestone: '프로젝트 완료',
    notes: '성공적 도입으로 추가 계약 논의 중',
    created_at: '2024-07-10T09:00:00Z',
    created_by: 'user_005',
    updated_at: '2024-11-30T18:00:00Z'
  },

  {
    id: '12',
    project_id: 'licensing-001',
    type: 'income',
    partner_name: '포스코',
    item_name: '스마트 팩토리 솔루션',
    project_name: '철강 생산 자동화',
    business_type: '제철업',
    amount: 1200000000,
    due_date: '2024-10-15',
    status: 'completed',
    tax_invoice_status: 'issued',
    commission_rate: 3.2,
    commission_amount: 38400000,
    payment_method: '계좌이체 (완료)',
    contract_period: '2024.03-2024.10',
    milestone: '프로젝트 완료',
    notes: '공정 효율 15% 개선 달성',
    created_at: '2024-03-10T10:00:00Z',
    created_by: 'user_006',
    updated_at: '2024-10-15T17:30:00Z'
  },

  // 문제 상황들
  {
    id: '22',
    project_id: 'issue-project-001',
    type: 'income',
    partner_name: '우리은행',
    item_name: '인터넷뱅킹 보안 강화',
    project_name: '차세대 보안 시스템',
    business_type: '금융업',
    amount: 780000000,
    due_date: '2024-11-30',
    status: 'issue',
    tax_invoice_status: 'not_issued',
    commission_rate: 4.0,
    commission_amount: 31200000,
    payment_method: '계좌이체 (지연)',
    contract_period: '2024.08-2024.11',
    milestone: '보안 인증 지연',
    notes: '금융감독원 승인 대기로 일정 지연',
    created_at: '2024-08-15T09:25:00Z',
    created_by: 'user_021'
  },

  {
    id: '23',
    project_id: 'issue-project-002',
    type: 'income',
    partner_name: '쿠팡',
    item_name: '물류센터 자동화 시스템',
    project_name: 'Warehouse Automation System',
    business_type: '물류/이커머스',
    amount: 950000000,
    due_date: '2024-09-30',
    status: 'issue',
    tax_invoice_status: 'issued',
    commission_rate: 4.8,
    commission_amount: 45600000,
    payment_method: '계좌이체 (분쟁)',
    contract_period: '2024.06-2024.11',
    milestone: '기능 구현 불완전',
    notes: '요구사항 불일치로 기능 수정 중',
    created_at: '2024-06-25T11:00:00Z',
    created_by: 'user_024'
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