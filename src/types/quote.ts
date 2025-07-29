import { Database } from './database'

// Database types
export type Quote = Database['public']['Tables']['quotes']['Row']
export type QuoteInsert = Database['public']['Tables']['quotes']['Insert']
export type QuoteUpdate = Database['public']['Tables']['quotes']['Update']

export type QuoteGroup = Database['public']['Tables']['quote_groups']['Row']
export type QuoteGroupInsert = Database['public']['Tables']['quote_groups']['Insert']
export type QuoteGroupUpdate = Database['public']['Tables']['quote_groups']['Update']

export type QuoteItem = Database['public']['Tables']['quote_items']['Row']
export type QuoteItemInsert = Database['public']['Tables']['quote_items']['Insert']
export type QuoteItemUpdate = Database['public']['Tables']['quote_items']['Update']

export type QuoteDetail = Database['public']['Tables']['quote_details']['Row']
export type QuoteDetailInsert = Database['public']['Tables']['quote_details']['Insert']
export type QuoteDetailUpdate = Database['public']['Tables']['quote_details']['Update']

export type Customer = Database['public']['Tables']['customers']['Row']
export type Supplier = Database['public']['Tables']['suppliers']['Row']
export type MasterItem = Database['public']['Tables']['master_items']['Row']

export type QuoteTotal = Database['public']['Views']['quote_totals']['Row']

// Business logic types
export interface QuoteFormData {
  quote_number: string
  project_title: string
  customer_id?: string
  customer_name_snapshot: string
  issue_date: string
  status: Quote['status']
  vat_type: Quote['vat_type']
  discount_amount: number
  agency_fee_rate: number
  notes?: string
  groups: QuoteGroupFormData[]
}

export interface QuoteGroupFormData {
  id?: string
  name: string
  sort_order: number
  include_in_fee: boolean
  items: QuoteItemFormData[]
}

export interface QuoteItemFormData {
  id?: string
  name: string
  sort_order: number
  include_in_fee: boolean
  details: QuoteDetailFormData[]
}

export interface QuoteDetailFormData {
  id?: string
  name: string
  description?: string
  quantity: number
  days: number
  unit: string
  unit_price: number
  is_service: boolean
  cost_price: number
  supplier_id?: string
  supplier_name_snapshot?: string
}

// Complete quote with all relations
export interface QuoteWithDetails extends Quote {
  groups: QuoteGroupWithDetails[]
  customer?: Customer
}

export interface QuoteGroupWithDetails extends QuoteGroup {
  items: QuoteItemWithDetails[]
}

export interface QuoteItemWithDetails extends QuoteItem {
  details: QuoteDetailWithDetails[]
}

export interface QuoteDetailWithDetails extends QuoteDetail {
  supplier?: Supplier
}

// Filter and search types
export interface QuoteFilter {
  status?: Quote['status'][]
  customer_id?: string[]
  date_from?: string
  date_to?: string
  amount_min?: number
  amount_max?: number
  search?: string
  created_by?: string[]
}

// Calculation types
export interface QuoteCalculation {
  subtotal: number
  feeApplicableAmount: number
  agencyFee: number
  totalBeforeVat: number
  vatAmount: number
  totalAfterVat: number
  finalTotal: number
  totalCostPrice: number
  profitAmount: number
  profitMargin: number
}

// Quote revision types
export interface QuoteRevision {
  version: number
  created_at: string
  changes: string[]
  created_by?: string
}

// Export/Import types
export interface QuoteExportData {
  quote: Quote
  groups: QuoteGroupWithDetails[]
  totals: QuoteCalculation
}