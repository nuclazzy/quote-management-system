// 모션센스 견적서 시스템 타입 정의

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  memo?: string;
  is_active: boolean;
}

export interface MasterItem {
  id: string;
  name: string;
  description?: string;
  default_unit_price: number;
  default_unit: string;
  category_id?: string;
  is_active: boolean;
}

export interface QuoteTemplate {
  id: string;
  name: string;
  template_data: {
    groups: QuoteGroupTemplate[];
  };
  created_by?: string;
  is_active: boolean;
}

export interface QuoteGroupTemplate {
  name: string;
  include_in_fee: boolean;
  items: QuoteItemTemplate[];
}

export interface QuoteItemTemplate {
  name: string;
  include_in_fee: boolean;
  details: QuoteDetailTemplate[];
}

export interface QuoteDetailTemplate {
  name: string;
  quantity: number;
  days: number;
  unit_price: number;
}

// 실제 견적서 데이터 구조
export interface MotionsenseQuote {
  id?: string;
  quote_number?: string;
  project_title: string;
  customer_id: string;
  customer_name_snapshot?: string;
  issue_date: string;
  status: 'draft' | 'sent' | 'accepted' | 'revised' | 'canceled';
  vat_type: 'exclusive' | 'inclusive';
  discount_amount: number;
  agency_fee_rate: number;
  version: number;
  parent_quote_id?: string;
  created_by?: string;
  total_amount?: number;
  groups: QuoteGroup[];
}

export interface QuoteGroup {
  id?: string;
  quote_id?: string;
  name: string;
  sort_order: number;
  include_in_fee: boolean;
  items: QuoteItem[];
}

export interface QuoteItem {
  id?: string;
  quote_group_id?: string;
  name: string;
  sort_order: number;
  include_in_fee: boolean;
  details: QuoteDetail[];
}

export interface QuoteDetail {
  id?: string;
  quote_item_id?: string;
  
  // 스냅샷된 품목 정보
  name: string;
  description?: string;
  quantity: number;
  days: number;
  unit: string;
  unit_price: number;
  
  // 원가 관리
  is_service: boolean;
  cost_price: number;
  supplier_id?: string;
  supplier_name_snapshot?: string;
  
  // 계산된 필드
  subtotal?: number; // quantity * days * unit_price
  profit_margin?: number; // (unit_price - cost_price) / unit_price * 100
}

// 견적서 계산 결과
export interface QuoteCalculation {
  // 그룹별 합계
  groups: Array<{
    name: string;
    subtotal: number;
    include_in_fee: boolean;
  }>;
  
  // 전체 합계
  subtotal: number; // 모든 항목 합계
  fee_applicable_amount: number; // 수수료 적용 대상 금액
  agency_fee: number; // 대행 수수료
  total_before_vat: number; // 부가세 전 총액
  vat_amount: number; // 부가세
  discount_amount: number; // 할인 금액
  final_total: number; // 최종 총액
  
  // 수익률 정보
  total_cost: number; // 총 원가
  total_profit: number; // 총 수익
  profit_margin_percentage: number; // 수익률 (%)
}

export interface QuoteFormData extends MotionsenseQuote {
  // 추가 폼 상태
  show_cost_management: boolean; // 내부 원가 관리 스위치
  auto_save_enabled: boolean; // 자동 저장 활성화
  template_id?: string; // 사용된 템플릿 ID
}