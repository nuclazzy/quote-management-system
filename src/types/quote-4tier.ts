// 4단계 견적서 구조 타입 정의
// quotes → quote_groups → quote_items → quote_details

import { Database } from './database';

// 데이터베이스 타입 추출
export type QuoteGroup = Database['public']['Tables']['quote_groups']['Row'];
export type QuoteGroupInsert = Database['public']['Tables']['quote_groups']['Insert'];
export type QuoteGroupUpdate = Database['public']['Tables']['quote_groups']['Update'];

export type QuoteItem = Database['public']['Tables']['quote_items_motionsense']['Row'];
export type QuoteItemInsert = Database['public']['Tables']['quote_items_motionsense']['Insert'];
export type QuoteItemUpdate = Database['public']['Tables']['quote_items_motionsense']['Update'];

export type QuoteDetail = Database['public']['Tables']['quote_details']['Row'];
export type QuoteDetailInsert = Database['public']['Tables']['quote_details']['Insert'];
export type QuoteDetailUpdate = Database['public']['Tables']['quote_details']['Update'];

export type Quote = Database['public']['Tables']['quotes']['Row'];
export type QuoteInsert = Database['public']['Tables']['quotes']['Insert'];
export type QuoteUpdate = Database['public']['Tables']['quotes']['Update'];

// 마스터 품목 (스냅샷 원본)
export type MasterItem = Database['public']['Tables']['master_items']['Row'];

// 중첩된 구조의 견적서 타입
export interface QuoteWithStructure extends Quote {
  groups: QuoteGroupWithItems[];
}

export interface QuoteGroupWithItems extends QuoteGroup {
  items: QuoteItemWithDetails[];
}

export interface QuoteItemWithDetails extends QuoteItem {
  details: QuoteDetail[];
}

// 견적서 작성용 폼 데이터 타입
export interface QuoteFormData {
  // 기본 정보
  project_title: string;
  customer_name_snapshot: string;
  issue_date: string;
  
  // 견적 설정
  agency_fee_rate: number;
  discount_amount: number;
  vat_type: 'exclusive' | 'inclusive';
  show_cost_management: boolean;
  
  // 4단계 구조
  groups: QuoteFormGroup[];
}

export interface QuoteFormGroup {
  id?: string;
  name: string;
  sort_order: number;
  include_in_fee: boolean;
  items: QuoteFormItem[];
}

export interface QuoteFormItem {
  id?: string;
  name: string;
  sort_order: number;
  include_in_fee: boolean;
  details: QuoteFormDetail[];
}

export interface QuoteFormDetail {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  days: number;
  unit: string;
  unit_price: number;
  is_service: boolean;
  cost_price: number;
  supplier_id?: string;
  supplier_name_snapshot?: string;
  master_item_id?: string; // 스냅샷 원본 참조
  sort_order: number;
}

// 견적서 계산 결과 타입
export interface QuoteCalculation {
  subtotal: number;
  fee_applicable_amount: number;
  fee_excluded_amount: number;
  agency_fee: number;
  discount_amount: number;
  vat_amount: number;
  final_total: number;
  total_cost: number;
  total_profit: number;
  profit_margin_percentage: number;
  
  // 그룹별 계산 결과
  groups: QuoteGroupCalculation[];
}

export interface QuoteGroupCalculation {
  id: string;
  name: string;
  include_in_fee: boolean;
  subtotal: number;
  cost_total: number;
  profit: number;
  profit_margin: number;
  
  // 품목별 계산 결과
  items: QuoteItemCalculation[];
}

export interface QuoteItemCalculation {
  id: string;
  name: string;
  include_in_fee: boolean;
  subtotal: number;
  cost_total: number;
  profit: number;
  
  // 세부내용별 계산 결과
  details: QuoteDetailCalculation[];
}

export interface QuoteDetailCalculation {
  id: string;
  name: string;
  quantity: number;
  days: number;
  unit_price: number;
  cost_price: number;
  subtotal: number;
  cost_total: number;
  profit: number;
}

// 마스터 품목 → 견적 세부내용 스냅샷 생성 타입
export interface MasterItemSnapshot {
  master_item_id: string;
  name: string;
  description?: string;
  unit: string;
  unit_price: number;
  cost_price?: number;
  supplier_id?: string;
  supplier_name_snapshot?: string;
}

// API 응답 타입
export interface CreateQuoteResponse {
  success: boolean;
  data?: {
    id: string;
    quote_number: string;
  };
  message?: string;
}

export interface QuoteCalculationResponse {
  success: boolean;
  data?: QuoteCalculation;
  message?: string;
}

// 견적서 상태 타입
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'revised' | 'canceled';

// 필터 타입
export interface QuoteFilter {
  status?: QuoteStatus[];
  client_id?: string[];
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  search?: string;
}