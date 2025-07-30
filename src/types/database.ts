// Database types for optimized schema
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name?: string
          role: 'super_admin' | 'admin' | 'user'
          department?: string
          position?: string
          phone?: string
          is_active: boolean
          last_login_at?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string
          role?: 'super_admin' | 'admin' | 'user'
          department?: string
          position?: string
          phone?: string
          is_active?: boolean
          last_login_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'super_admin' | 'admin' | 'user'
          department?: string
          position?: string
          phone?: string
          is_active?: boolean
          last_login_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      permissions: {
        Row: {
          id: string
          name: string
          description?: string
          resource: string
          action: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          resource: string
          action: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          resource?: string
          action?: string
          created_at?: string
        }
      }
      user_permissions: {
        Row: {
          id: string
          user_id: string
          permission_id: string
          granted_by?: string
          granted_at: string
        }
        Insert: {
          id?: string
          user_id: string
          permission_id: string
          granted_by?: string
          granted_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          permission_id?: string
          granted_by?: string
          granted_at?: string
        }
      }
      // customers 테이블 제거됨 - clients 테이블로 통합
      clients: {
        Row: {
          id: string
          name: string
          business_registration_number?: string
          contact_person?: string
          email?: string
          phone?: string
          address?: string
          postal_code?: string
          website?: string
          notes?: string
          tax_invoice_email?: string
          industry_type?: string
          company_size?: 'startup' | 'small' | 'medium' | 'large'
          credit_rating?: number
          payment_terms_days?: number
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string
          updated_by?: string
        }
        Insert: {
          id?: string
          name: string
          business_registration_number?: string
          contact_person?: string
          email?: string
          phone?: string
          address?: string
          postal_code?: string
          website?: string
          notes?: string
          tax_invoice_email?: string
          industry_type?: string
          company_size?: 'startup' | 'small' | 'medium' | 'large'
          credit_rating?: number
          payment_terms_days?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by: string
          updated_by?: string
        }
        Update: {
          id?: string
          name?: string
          business_registration_number?: string
          contact_person?: string
          email?: string
          phone?: string
          address?: string
          postal_code?: string
          website?: string
          notes?: string
          tax_invoice_email?: string
          industry_type?: string
          company_size?: 'startup' | 'small' | 'medium' | 'large'
          credit_rating?: number
          payment_terms_days?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          business_registration_number?: string
          contact_person?: string
          email?: string
          phone?: string
          address?: string
          postal_code?: string
          website?: string
          payment_terms?: string
          lead_time_days?: number
          quality_rating?: number
          tax_invoice_email?: string
          industry_type?: string
          bank_account?: string
          bank_name?: string
          notes?: string
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string
          updated_by?: string
        }
        Insert: {
          id?: string
          name: string
          business_registration_number?: string
          contact_person?: string
          email?: string
          phone?: string
          address?: string
          postal_code?: string
          website?: string
          payment_terms?: string
          lead_time_days?: number
          quality_rating?: number
          tax_invoice_email?: string
          industry_type?: string
          bank_account?: string
          bank_name?: string
          notes?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by: string
          updated_by?: string
        }
        Update: {
          id?: string
          name?: string
          business_registration_number?: string
          contact_person?: string
          email?: string
          phone?: string
          address?: string
          postal_code?: string
          website?: string
          payment_terms?: string
          lead_time_days?: number
          quality_rating?: number
          tax_invoice_email?: string
          industry_type?: string
          bank_account?: string
          bank_name?: string
          notes?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
        }
      }
      items: {
        Row: {
          id: string
          sku: string
          name: string
          description?: string
          category_id?: string
          supplier_id?: string
          unit: string
          unit_price: number
          cost_price?: number
          stock_quantity?: number
          minimum_stock?: number
          maximum_stock?: number
          safety_stock?: number
          reorder_point?: number
          specifications?: any
          image_urls?: string[]
          barcode?: string
          weight?: number
          dimensions?: any
          warranty_months?: number
          hs_code?: string
          origin_country?: string
          tax_type?: 'taxable' | 'zero_rated' | 'exempt'
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string
          updated_by?: string
        }
        Insert: {
          id?: string
          sku: string
          name: string
          description?: string
          category_id?: string
          supplier_id?: string
          unit?: string
          unit_price?: number
          cost_price?: number
          stock_quantity?: number
          minimum_stock?: number
          maximum_stock?: number
          safety_stock?: number
          reorder_point?: number
          specifications?: any
          image_urls?: string[]
          barcode?: string
          weight?: number
          dimensions?: any
          warranty_months?: number
          hs_code?: string
          origin_country?: string
          tax_type?: 'taxable' | 'zero_rated' | 'exempt'
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by: string
          updated_by?: string
        }
        Update: {
          id?: string
          sku?: string
          name?: string
          description?: string
          category_id?: string
          supplier_id?: string
          unit?: string
          unit_price?: number
          cost_price?: number
          stock_quantity?: number
          minimum_stock?: number
          maximum_stock?: number
          safety_stock?: number
          reorder_point?: number
          specifications?: any
          image_urls?: string[]
          barcode?: string
          weight?: number
          dimensions?: any
          warranty_months?: number
          hs_code?: string
          origin_country?: string
          tax_type?: 'taxable' | 'zero_rated' | 'exempt'
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
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
          title: string
          description?: string
          client_id: string
          business_registration_number?: string
          assigned_to?: string
          status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired'
          quote_date: string
          valid_until?: string
          subtotal_amount: number
          tax_rate: number
          tax_amount: number
          discount_rate: number
          discount_amount: number
          total_amount: number
          currency: string
          payment_terms?: string
          delivery_terms?: string
          special_terms?: string
          internal_notes?: string
          quote_type: 'standard' | 'framework' | 'service_only' | 'goods_only'
          expected_order_date?: string
          delivery_location?: string
          warranty_period?: number
          approval_requested_at?: string
          approved_at?: string
          approved_by?: string
          rejected_at?: string
          rejected_by?: string
          rejection_reason?: string
          submitted_at?: string
          submitted_by?: string
          review_notes?: string
          version: number
          parent_quote_id?: string
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string
          updated_by?: string
        }
        Insert: {
          id?: string
          quote_number?: string
          title: string
          description?: string
          client_id: string
          business_registration_number?: string
          assigned_to?: string
          status?: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired'
          quote_date?: string
          valid_until?: string
          subtotal_amount?: number
          tax_rate?: number
          tax_amount?: number
          discount_rate?: number
          discount_amount?: number
          total_amount?: number
          currency?: string
          payment_terms?: string
          delivery_terms?: string
          special_terms?: string
          internal_notes?: string
          quote_type?: 'standard' | 'framework' | 'service_only' | 'goods_only'
          expected_order_date?: string
          delivery_location?: string
          warranty_period?: number
          approval_requested_at?: string
          approved_at?: string
          approved_by?: string
          rejected_at?: string
          rejected_by?: string
          rejection_reason?: string
          submitted_at?: string
          submitted_by?: string
          review_notes?: string
          version?: number
          parent_quote_id?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by: string
          updated_by?: string
        }
        Update: {
          id?: string
          quote_number?: string
          title?: string
          description?: string
          client_id?: string
          business_registration_number?: string
          assigned_to?: string
          status?: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired'
          quote_date?: string
          valid_until?: string
          subtotal_amount?: number
          tax_rate?: number
          tax_amount?: number
          discount_rate?: number
          discount_amount?: number
          total_amount?: number
          currency?: string
          payment_terms?: string
          delivery_terms?: string
          special_terms?: string
          internal_notes?: string
          quote_type?: 'standard' | 'framework' | 'service_only' | 'goods_only'
          expected_order_date?: string
          delivery_location?: string
          warranty_period?: number
          approval_requested_at?: string
          approved_at?: string
          approved_by?: string
          rejected_at?: string
          rejected_by?: string
          rejection_reason?: string
          submitted_at?: string
          submitted_by?: string
          review_notes?: string
          version?: number
          parent_quote_id?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
        }
      }
      // 기존 복잡한 4단계 구조 제거 - 단순화된 quote_items로 통합
      quote_items: {
        Row: {
          id: string
          quote_id: string
          item_id?: string
          item_name: string
          item_description?: string
          item_sku?: string
          specifications?: any
          quantity: number
          unit: string
          unit_price: number
          cost_price?: number
          supplier_id?: string
          supplier_name?: string
          discount_rate?: number
          discount_amount?: number
          line_total: number
          category?: string
          sort_order?: number
          is_optional?: boolean
          lead_time_days?: number
          delivery_terms?: string
          notes?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          quote_id: string
          item_id?: string
          item_name: string
          item_description?: string
          item_sku?: string
          specifications?: any
          quantity: number
          unit?: string
          unit_price: number
          cost_price?: number
          supplier_id?: string
          supplier_name?: string
          discount_rate?: number
          discount_amount?: number
          line_total?: number
          category?: string
          sort_order?: number
          is_optional?: boolean
          lead_time_days?: number
          delivery_terms?: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          quote_id?: string
          item_id?: string
          item_name?: string
          item_description?: string
          item_sku?: string
          specifications?: any
          quantity?: number
          unit?: string
          unit_price?: number
          cost_price?: number
          supplier_id?: string
          supplier_name?: string
          discount_rate?: number
          discount_amount?: number
          line_total?: number
          category?: string
          sort_order?: number
          is_optional?: boolean
          lead_time_days?: number
          delivery_terms?: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          project_number: string
          name: string
          description?: string
          client_id: string
          quote_id?: string
          project_manager_id?: string
          status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
          progress_percentage?: number
          planned_start_date?: string
          planned_end_date?: string
          actual_start_date?: string
          actual_end_date?: string
          contract_amount?: number
          budget_amount?: number
          actual_cost?: number
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          project_type?: string
          notes?: string
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string
          updated_by?: string
        }
        Insert: {
          id?: string
          project_number?: string
          name: string
          description?: string
          client_id: string
          quote_id?: string
          project_manager_id?: string
          status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
          progress_percentage?: number
          planned_start_date?: string
          planned_end_date?: string
          actual_start_date?: string
          actual_end_date?: string
          contract_amount?: number
          budget_amount?: number
          actual_cost?: number
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          project_type?: string
          notes?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by: string
          updated_by?: string
        }
        Update: {
          id?: string
          project_number?: string
          name?: string
          description?: string
          client_id?: string
          quote_id?: string
          project_manager_id?: string
          status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
          progress_percentage?: number
          planned_start_date?: string
          planned_end_date?: string
          actual_start_date?: string
          actual_end_date?: string
          contract_amount?: number
          budget_amount?: number
          actual_cost?: number
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          project_type?: string
          notes?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
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
          read_at?: string
          entity_type?: string
          entity_id?: string
          priority: 'low' | 'normal' | 'high' | 'urgent'
          expires_at?: string
          action_required?: boolean
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
          read_at?: string
          entity_type?: string
          entity_id?: string
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          expires_at?: string
          action_required?: boolean
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
          read_at?: string
          entity_type?: string
          entity_id?: string
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          expires_at?: string
          action_required?: boolean
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
      quote_summary: {
        Row: {
          id: string
          quote_number: string
          title: string
          client_id: string
          client_name: string
          status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired'
          quote_date: string
          valid_until?: string
          total_amount: number
          item_count: number
          calculated_total: number
          created_by: string
          created_by_name: string
          created_at: string
        }
      }
      project_status_summary: {
        Row: {
          id: string
          project_number: string
          name: string
          client_id: string
          client_name: string
          status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
          progress_percentage?: number
          contract_amount?: number
          actual_cost?: number
          remaining_budget?: number
          planned_start_date?: string
          planned_end_date?: string
          project_manager_id?: string
          project_manager_name?: string
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