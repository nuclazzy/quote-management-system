import { Database } from './database';

// Database types - 새로운 스키마에 맞게 업데이트
export type Quote = Database['public']['Tables']['quotes']['Row'];
export type QuoteInsert = Database['public']['Tables']['quotes']['Insert'];
export type QuoteUpdate = Database['public']['Tables']['quotes']['Update'];

export type QuoteItem = Database['public']['Tables']['quote_items']['Row'];
export type QuoteItemInsert =
  Database['public']['Tables']['quote_items']['Insert'];
export type QuoteItemUpdate =
  Database['public']['Tables']['quote_items']['Update'];

export type Client = Database['public']['Tables']['clients']['Row'];
export type ClientInsert = Database['public']['Tables']['clients']['Insert'];
export type ClientUpdate = Database['public']['Tables']['clients']['Update'];

export type Supplier = Database['public']['Tables']['suppliers']['Row'];
export type SupplierInsert =
  Database['public']['Tables']['suppliers']['Insert'];
export type SupplierUpdate =
  Database['public']['Tables']['suppliers']['Update'];

export type Item = Database['public']['Tables']['items']['Row'];
export type ItemInsert = Database['public']['Tables']['items']['Insert'];
export type ItemUpdate = Database['public']['Tables']['items']['Update'];

export type Project = Database['public']['Tables']['projects']['Row'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

export type QuoteSummary = Database['public']['Views']['quote_summary']['Row'];
export type ProjectStatusSummary =
  Database['public']['Views']['project_status_summary']['Row'];

// Business logic types - 단순화된 구조
export interface QuoteFormData {
  quote_number?: string;
  title: string;
  description?: string;
  client_id: string;
  quote_date?: string;
  valid_until?: string;
  status?: Quote['status'];
  quote_type?: Quote['quote_type'];
  payment_terms?: string;
  delivery_terms?: string;
  special_terms?: string;
  internal_notes?: string;
  expected_order_date?: string;
  delivery_location?: string;
  warranty_period?: number;
  items: QuoteItemFormData[];
}

export interface QuoteItemFormData {
  id?: string;
  item_id?: string;
  item_name: string;
  item_description?: string;
  item_sku?: string;
  specifications?: any;
  quantity: number;
  unit?: string;
  unit_price: number;
  cost_price?: number;
  supplier_id?: string;
  supplier_name?: string;
  discount_rate?: number;
  discount_amount?: number;
  category?: string;
  sort_order?: number;
  is_optional?: boolean;
  lead_time_days?: number;
  delivery_terms?: string;
  notes?: string;
}

// Complete quote with all relations - 단순화된 구조
export interface QuoteWithDetails extends Quote {
  items: QuoteItemWithDetails[];
  client?: Client;
  project?: Project;
}

export interface QuoteItemWithDetails extends QuoteItem {
  item?: Item;
  supplier?: Supplier;
}

// Filter and search types
export interface QuoteFilter {
  status?: Quote['status'][];
  client_id?: string[];
  quote_type?: Quote['quote_type'][];
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  search?: string;
  created_by?: string[];
  assigned_to?: string[];
}

// Calculation types
export interface QuoteCalculation {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  totalCostPrice: number;
  profitAmount: number;
  profitMargin: number;
}

// Quote revision types
export interface QuoteRevision {
  version: number;
  created_at: string;
  changes: string[];
  created_by?: string;
}

// Export/Import types
export interface QuoteExportData {
  quote: Quote;
  items: QuoteItemWithDetails[];
  totals: QuoteCalculation;
  client?: Client;
}
