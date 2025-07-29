// Database types generated from Supabase schema
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name?: string
          role: 'admin' | 'member'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string
          role?: 'admin' | 'member'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'member'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          contact_person?: string
          phone?: string
          email?: string
          business_number?: string
          address?: string
          memo?: string
          is_active: boolean
          created_at: string
          updated_at: string
          created_by?: string
        }
        Insert: {
          id?: string
          name: string
          contact_person?: string
          phone?: string
          email?: string
          business_number?: string
          address?: string
          memo?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string
        }
        Update: {
          id?: string
          name?: string
          contact_person?: string
          phone?: string
          email?: string
          business_number?: string
          address?: string
          memo?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          contact_person?: string
          phone?: string
          email?: string
          memo?: string
          is_active: boolean
          created_at: string
          updated_at: string
          created_by?: string
        }
        Insert: {
          id?: string
          name: string
          contact_person?: string
          phone?: string
          email?: string
          memo?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string
        }
        Update: {
          id?: string
          name?: string
          contact_person?: string
          phone?: string
          email?: string
          memo?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
      master_items: {
        Row: {
          id: string
          name: string
          description?: string
          default_unit_price: number
          default_unit: string
          is_active: boolean
          created_at: string
          updated_at: string
          created_by?: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          default_unit_price?: number
          default_unit?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          default_unit_price?: number
          default_unit?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
      quote_templates: {
        Row: {
          id: string
          name: string
          template_data: any
          created_at: string
          updated_at: string
          created_by?: string
        }
        Insert: {
          id?: string
          name: string
          template_data: any
          created_at?: string
          updated_at?: string
          created_by?: string
        }
        Update: {
          id?: string
          name?: string
          template_data?: any
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
      quotes: {
        Row: {
          id: string
          quote_number: string
          project_title: string
          customer_id?: string
          customer_name_snapshot: string
          issue_date: string
          status: 'draft' | 'sent' | 'accepted' | 'revised' | 'canceled'
          total_amount: number
          vat_type: 'exclusive' | 'inclusive'
          discount_amount: number
          agency_fee_rate: number
          version: number
          parent_quote_id?: string
          notes?: string
          created_at: string
          updated_at: string
          created_by?: string
        }
        Insert: {
          id?: string
          quote_number: string
          project_title: string
          customer_id?: string
          customer_name_snapshot: string
          issue_date?: string
          status?: 'draft' | 'sent' | 'accepted' | 'revised' | 'canceled'
          total_amount?: number
          vat_type?: 'exclusive' | 'inclusive'
          discount_amount?: number
          agency_fee_rate?: number
          version?: number
          parent_quote_id?: string
          notes?: string
          created_at?: string
          updated_at?: string
          created_by?: string
        }
        Update: {
          id?: string
          quote_number?: string
          project_title?: string
          customer_id?: string
          customer_name_snapshot?: string
          issue_date?: string
          status?: 'draft' | 'sent' | 'accepted' | 'revised' | 'canceled'
          total_amount?: number
          vat_type?: 'exclusive' | 'inclusive'
          discount_amount?: number
          agency_fee_rate?: number
          version?: number
          parent_quote_id?: string
          notes?: string
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
      quote_groups: {
        Row: {
          id: string
          quote_id: string
          name: string
          sort_order: number
          include_in_fee: boolean
          created_at: string
        }
        Insert: {
          id?: string
          quote_id: string
          name: string
          sort_order?: number
          include_in_fee?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          quote_id?: string
          name?: string
          sort_order?: number
          include_in_fee?: boolean
          created_at?: string
        }
      }
      quote_items: {
        Row: {
          id: string
          quote_group_id: string
          name: string
          sort_order: number
          include_in_fee: boolean
          created_at: string
        }
        Insert: {
          id?: string
          quote_group_id: string
          name: string
          sort_order?: number
          include_in_fee?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          quote_group_id?: string
          name?: string
          sort_order?: number
          include_in_fee?: boolean
          created_at?: string
        }
      }
      quote_details: {
        Row: {
          id: string
          quote_item_id: string
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
          created_at: string
        }
        Insert: {
          id?: string
          quote_item_id: string
          name: string
          description?: string
          quantity?: number
          days?: number
          unit?: string
          unit_price?: number
          is_service?: boolean
          cost_price?: number
          supplier_id?: string
          supplier_name_snapshot?: string
          created_at?: string
        }
        Update: {
          id?: string
          quote_item_id?: string
          name?: string
          description?: string
          quantity?: number
          days?: number
          unit?: string
          unit_price?: number
          is_service?: boolean
          cost_price?: number
          supplier_id?: string
          supplier_name_snapshot?: string
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          quote_id: string
          name: string
          total_revenue: number
          total_cost: number
          status: 'active' | 'completed' | 'on_hold' | 'canceled'
          parent_project_id?: string
          start_date?: string
          end_date?: string
          created_at: string
          updated_at: string
          created_by?: string
        }
        Insert: {
          id?: string
          quote_id: string
          name: string
          total_revenue?: number
          total_cost?: number
          status?: 'active' | 'completed' | 'on_hold' | 'canceled'
          parent_project_id?: string
          start_date?: string
          end_date?: string
          created_at?: string
          updated_at?: string
          created_by?: string
        }
        Update: {
          id?: string
          quote_id?: string
          name?: string
          total_revenue?: number
          total_cost?: number
          status?: 'active' | 'completed' | 'on_hold' | 'canceled'
          parent_project_id?: string
          start_date?: string
          end_date?: string
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
      transactions: {
        Row: {
          id: string
          project_id: string
          type: 'income' | 'expense'
          partner_name: string
          item_name: string
          amount: number
          due_date?: string
          status: 'pending' | 'processing' | 'completed' | 'issue'
          tax_invoice_status: 'not_issued' | 'issued' | 'received'
          notes?: string
          created_at: string
          updated_at: string
          created_by?: string
        }
        Insert: {
          id?: string
          project_id: string
          type: 'income' | 'expense'
          partner_name: string
          item_name: string
          amount: number
          due_date?: string
          status?: 'pending' | 'processing' | 'completed' | 'issue'
          tax_invoice_status?: 'not_issued' | 'issued' | 'received'
          notes?: string
          created_at?: string
          updated_at?: string
          created_by?: string
        }
        Update: {
          id?: string
          project_id?: string
          type?: 'income' | 'expense'
          partner_name?: string
          item_name?: string
          amount?: number
          due_date?: string
          status?: 'pending' | 'processing' | 'completed' | 'issue'
          tax_invoice_status?: 'not_issued' | 'issued' | 'received'
          notes?: string
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
      project_expenses: {
        Row: {
          id: string
          project_id: string
          expense_date: string
          description: string
          amount: number
          receipt_url?: string
          created_at: string
          created_by?: string
        }
        Insert: {
          id?: string
          project_id: string
          expense_date?: string
          description: string
          amount: number
          receipt_url?: string
          created_at?: string
          created_by?: string
        }
        Update: {
          id?: string
          project_id?: string
          expense_date?: string
          description?: string
          amount?: number
          receipt_url?: string
          created_at?: string
          created_by?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'quote_created' | 'quote_approved' | 'quote_rejected' | 'quote_expiring' | 'project_created' | 'project_status_changed' | 'project_deadline_approaching' | 'settlement_due' | 'settlement_completed' | 'settlement_overdue' | 'system_user_joined' | 'system_permission_changed' | 'general'
          link_url?: string
          is_read: boolean
          entity_type?: string
          entity_id?: string
          priority: 'low' | 'normal' | 'high' | 'urgent'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: 'quote_created' | 'quote_approved' | 'quote_rejected' | 'quote_expiring' | 'project_created' | 'project_status_changed' | 'project_deadline_approaching' | 'settlement_due' | 'settlement_completed' | 'settlement_overdue' | 'system_user_joined' | 'system_permission_changed' | 'general'
          link_url?: string
          is_read?: boolean
          entity_type?: string
          entity_id?: string
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: 'quote_created' | 'quote_approved' | 'quote_rejected' | 'quote_expiring' | 'project_created' | 'project_status_changed' | 'project_deadline_approaching' | 'settlement_due' | 'settlement_completed' | 'settlement_overdue' | 'system_user_joined' | 'system_permission_changed' | 'general'
          link_url?: string
          is_read?: boolean
          entity_type?: string
          entity_id?: string
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          created_at?: string
        }
      }
      notification_settings: {
        Row: {
          id: string
          user_id: string
          quote_created: boolean
          quote_approved: boolean
          quote_rejected: boolean
          quote_expiring: boolean
          project_created: boolean
          project_status_changed: boolean
          project_deadline_approaching: boolean
          settlement_due: boolean
          settlement_completed: boolean
          settlement_overdue: boolean
          system_user_joined: boolean
          system_permission_changed: boolean
          email_notifications: boolean
          browser_notifications: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          quote_created?: boolean
          quote_approved?: boolean
          quote_rejected?: boolean
          quote_expiring?: boolean
          project_created?: boolean
          project_status_changed?: boolean
          project_deadline_approaching?: boolean
          settlement_due?: boolean
          settlement_completed?: boolean
          settlement_overdue?: boolean
          system_user_joined?: boolean
          system_permission_changed?: boolean
          email_notifications?: boolean
          browser_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          quote_created?: boolean
          quote_approved?: boolean
          quote_rejected?: boolean
          quote_expiring?: boolean
          project_created?: boolean
          project_status_changed?: boolean
          project_deadline_approaching?: boolean
          settlement_due?: boolean
          settlement_completed?: boolean
          settlement_overdue?: boolean
          system_user_joined?: boolean
          system_permission_changed?: boolean
          email_notifications?: boolean
          browser_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      quote_totals: {
        Row: {
          quote_id: string
          quote_number: string
          project_title: string
          customer_name_snapshot: string
          status: 'draft' | 'sent' | 'accepted' | 'revised' | 'canceled'
          vat_type: 'exclusive' | 'inclusive'
          discount_amount: number
          agency_fee_rate: number
          subtotal: number
          fee_applicable_amount: number
          total_cost_price: number
        }
      }
      project_profitability: {
        Row: {
          project_id: string
          project_name: string
          total_revenue: number
          total_cost: number
          actual_total_cost: number
          net_profit: number
          profit_margin_percent: number
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}