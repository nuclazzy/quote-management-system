import { BaseService, ServiceResponse, PaginationParams, PaginationResponse } from './base-service';

export interface Quote {
  id: string;
  quote_number: string;
  title: string;
  project_id?: string;
  client_id?: string;
  quote_date: string;
  valid_from?: string;
  valid_until?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  notes?: string;
  internal_notes?: string;
  terms?: string;
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  version?: number;
  parent_quote_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  project?: any;
  client?: any;
  quote_groups?: QuoteGroup[];
}

export interface QuoteGroup {
  id: string;
  quote_id: string;
  name: string;
  description?: string;
  sort_order: number;
  include_in_fee: boolean;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
  quote_items_motionsense?: QuoteItemMotionsense[];
}

export interface QuoteItemMotionsense {
  id: string;
  quote_group_id: string;
  item_id?: string;
  name: string;
  custom_description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  sort_order: number;
  include_in_fee: boolean;
  is_optional: boolean;
  parent_item_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  item?: any;
  quote_details?: QuoteDetail[];
}

export interface QuoteDetail {
  id: string;
  quote_item_id: string;
  name: string;
  description?: string;
  quantity: number;
  days?: number;
  unit?: string;
  unit_price: number;
  is_service: boolean;
  cost_price?: number;
  supplier_id?: string;
  supplier_name_snapshot?: string;
  subtotal: number;
  notes?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface QuoteFormData {
  title: string;
  project_id?: string;
  client_id?: string;
  quote_date: string;
  valid_from?: string;
  valid_until?: string;
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  notes?: string;
  internal_notes?: string;
  terms?: string;
  tax_rate?: number;
  discount_amount?: number;
  groups: Array<{
    name: string;
    description?: string;
    include_in_fee: boolean;
    items: Array<{
      name: string;
      custom_description?: string;
      quantity: number;
      unit_price: number;
      tax_rate?: number;
      include_in_fee: boolean;
      is_optional?: boolean;
      details: Array<{
        name: string;
        description?: string;
        quantity: number;
        days?: number;
        unit?: string;
        unit_price: number;
        is_service: boolean;
        cost_price?: number;
        supplier_id?: string;
        supplier_name_snapshot?: string;
      }>;
    }>;
  }>;
}

export interface QuoteFilter {
  status?: string[];
  client_id?: string[];
  project_id?: string[];
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  search?: string;
  created_by?: string[];
}

export interface QuoteCalculation {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  totalCostPrice: number;
  profitAmount: number;
  profitMargin: number;
}

export class QuoteService extends BaseService {
  // 견적서 목록 조회
  async getQuotes(filter?: QuoteFilter, page = 1, perPage = 20): Promise<ServiceResponse<{
    data: Quote[];
    count: number;
    page: number;
    per_page: number;
    total_pages: number;
  }>> {
    try {
      await this.getUser();

      let query = this.supabase
        .from('quotes')
        .select(
          `
          *,
          client:clients(*),
          project:projects(*)
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false });

      // 필터 적용
      if (filter) {
        if (filter.status?.length) {
          query = query.in('status', filter.status);
        }
        if (filter.client_id?.length) {
          query = query.in('client_id', filter.client_id);
        }
        if (filter.project_id?.length) {
          query = query.in('project_id', filter.project_id);
        }
        if (filter.date_from) {
          query = query.gte('quote_date', filter.date_from);
        }
        if (filter.date_to) {
          query = query.lte('quote_date', filter.date_to);
        }
        if (filter.amount_min) {
          query = query.gte('total_amount', filter.amount_min);
        }
        if (filter.amount_max) {
          query = query.lte('total_amount', filter.amount_max);
        }
        if (filter.search) {
          query = query.or(
            `title.ilike.%${filter.search}%,quote_number.ilike.%${filter.search}%`
          );
        }
        if (filter.created_by?.length) {
          query = query.in('created_by', filter.created_by);
        }
      }

      // 페이지네이션
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        return this.handleError(error);
      }

      return {
        data: {
          data: data || [],
          count: count || 0,
          page,
          per_page: perPage,
          total_pages: Math.ceil((count || 0) / perPage),
        }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 견적서 상세 조회 (4-tier 구조 포함)
  async getQuoteWithDetails(id: string): Promise<ServiceResponse<Quote>> {
    try {
      await this.getUser();

      // 견적서 기본 정보 조회
      const { data: quote, error: quoteError } = await this.supabase
        .from('quotes')
        .select(`
          *,
          project:projects(id, name),
          client:clients(id, name, business_registration_number, contact_person, phone, email, address)
        `)
        .eq('id', id)
        .single();

      if (quoteError) {
        return this.handleError(quoteError);
      }

      // 그룹 조회
      const { data: groups, error: groupsError } = await this.supabase
        .from('quote_groups')
        .select('*')
        .eq('quote_id', id)
        .order('sort_order', { ascending: true });

      if (groupsError) {
        return this.handleError(groupsError);
      }

      // 각 그룹의 아이템 조회
      for (const group of groups || []) {
        const { data: items, error: itemsError } = await this.supabase
          .from('quote_items_motionsense')
          .select(`
            *,
            item:items(id, name, description, unit_price, unit, category, specifications)
          `)
          .eq('quote_group_id', group.id)
          .order('sort_order', { ascending: true });

        if (itemsError) {
          return this.handleError(itemsError);
        }

        // 각 아이템의 상세 조회
        for (const item of items || []) {
          const { data: details, error: detailsError } = await this.supabase
            .from('quote_details')
            .select('*')
            .eq('quote_item_id', item.id)
            .order('sort_order', { ascending: true });

          if (detailsError) {
            return this.handleError(detailsError);
          }

          item.quote_details = details || [];
        }

        group.quote_items_motionsense = items || [];
      }

      quote.quote_groups = groups || [];

      return { data: quote };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 견적서 생성
  async createQuote(formData: QuoteFormData): Promise<ServiceResponse<string>> {
    try {
      const user = await this.getUser();

      // 견적서 번호 생성
      const quoteNumber = await this.generateQuoteNumber();

      // 트랜잭션으로 견적서와 관련 데이터 모두 생성
      const { data: quote, error: quoteError } = await this.supabase
        .from('quotes')
        .insert({
          quote_number: quoteNumber,
          title: formData.title,
          client_id: formData.client_id || null,
          project_id: formData.project_id || null,
          quote_date: formData.quote_date,
          valid_from: formData.valid_from || null,
          valid_until: formData.valid_until || null,
          status: formData.status || 'draft',
          tax_rate: formData.tax_rate || 10,
          discount_amount: formData.discount_amount || 0,
          notes: formData.notes || null,
          internal_notes: formData.internal_notes || null,
          terms: formData.terms || null,
          currency: 'KRW',
          created_by: user.id,
          updated_by: user.id,
        })
        .select()
        .single();

      if (quoteError) {
        return this.handleError(quoteError);
      }

      // 그룹, 품목, 세부내용 생성
      await this.createQuoteStructure(quote.id, formData.groups);

      // 총액 계산 후 업데이트
      await this.updateQuoteTotal(quote.id);

      return { data: quote.id };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 견적서 수정 (새 버전 생성)
  async updateQuote(id: string, formData: QuoteFormData): Promise<ServiceResponse<string>> {
    try {
      const user = await this.getUser();

      // 기존 견적서 조회
      const { data: originalQuote, error: fetchError } = await this.supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !originalQuote) {
        return this.handleError(new Error('원본 견적서를 찾을 수 없습니다.'));
      }

      // 새 버전 생성
      const { data: newQuote, error: createError } = await this.supabase
        .from('quotes')
        .insert({
          quote_number: originalQuote.quote_number,
          title: formData.title,
          client_id: formData.client_id || null,
          project_id: formData.project_id || null,
          quote_date: formData.quote_date,
          valid_from: formData.valid_from || null,
          valid_until: formData.valid_until || null,
          status: formData.status || 'draft',
          tax_rate: formData.tax_rate || 10,
          discount_amount: formData.discount_amount || 0,
          notes: formData.notes || null,
          internal_notes: formData.internal_notes || null,
          terms: formData.terms || null,
          currency: 'KRW',
          version: (originalQuote.version || 1) + 1,
          parent_quote_id: originalQuote.parent_quote_id || originalQuote.id,
          created_by: user.id,
          updated_by: user.id,
        })
        .select()
        .single();

      if (createError) {
        return this.handleError(createError);
      }

      // 새 버전의 구조 생성
      await this.createQuoteStructure(newQuote.id, formData.groups);

      // 총액 계산 후 업데이트
      await this.updateQuoteTotal(newQuote.id);

      return { data: newQuote.id };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 견적서 삭제
  async deleteQuote(id: string): Promise<ServiceResponse<void>> {
    try {
      const user = await this.getUser();
      const profile = await this.getUserProfile(user.id);

      // 권한 확인
      if (!['super_admin', 'admin'].includes(profile.role)) {
        return {
          error: 'Insufficient permissions',
          status: 403
        };
      }

      const { error } = await this.supabase
        .from('quotes')
        .delete()
        .eq('id', id);

      if (error) {
        return this.handleError(error);
      }

      return { data: undefined };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 견적서 복사
  async duplicateQuote(id: string): Promise<ServiceResponse<string>> {
    try {
      const user = await this.getUser();

      // 원본 견적서 전체 조회
      const originalResult = await this.getQuoteWithDetails(id);
      if (originalResult.error) {
        return originalResult as ServiceResponse<string>;
      }

      const original = originalResult.data!;

      // 새 견적서 번호 생성
      const quoteNumber = await this.generateQuoteNumber();

      // 견적서 복사
      const { data: newQuote, error: quoteError } = await this.supabase
        .from('quotes')
        .insert({
          quote_number: quoteNumber,
          title: `${original.title} (복사본)`,
          client_id: original.client_id,
          project_id: original.project_id,
          quote_date: new Date().toISOString().split('T')[0],
          valid_from: new Date().toISOString().split('T')[0],
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'draft',
          tax_rate: original.tax_rate,
          discount_amount: original.discount_amount,
          notes: original.notes,
          internal_notes: original.internal_notes,
          terms: original.terms,
          currency: original.currency,
          created_by: user.id,
          updated_by: user.id,
        })
        .select()
        .single();

      if (quoteError) {
        return this.handleError(quoteError);
      }

      // 그룹 및 하위 항목 복사
      if (original.quote_groups && original.quote_groups.length > 0) {
        await this.copyQuoteGroups(original.quote_groups, newQuote.id);
      }

      // 총액 계산 후 업데이트
      await this.updateQuoteTotal(newQuote.id);

      return { data: newQuote.id };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 견적서 상태 변경
  async updateQuoteStatus(id: string, status: Quote['status']): Promise<ServiceResponse<Quote>> {
    try {
      const user = await this.getUser();

      const { data: quote, error } = await this.supabase
        .from('quotes')
        .update({
          status,
          updated_by: user.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return this.handleError(error);
      }

      return { data: quote };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 견적서 계산
  calculateQuote(groups: QuoteFormData['groups']): QuoteCalculation {
    let subtotal = 0;
    let totalCostPrice = 0;

    // 각 그룹의 항목들 계산
    for (const group of groups) {
      for (const item of group.items) {
        const itemTotal = item.quantity * item.unit_price;
        subtotal += itemTotal;

        // 세부사항의 원가 계산
        for (const detail of item.details) {
          totalCostPrice += (detail.cost_price || 0) * detail.quantity;
        }
      }
    }

    // 기본 10% VAT 계산
    const taxAmount = subtotal * 0.1;
    const discountAmount = 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    // 수익성 계산
    const profitAmount = totalAmount - totalCostPrice;
    const profitMargin = totalAmount > 0 ? (profitAmount / totalAmount) * 100 : 0;

    return {
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      totalCostPrice,
      profitAmount,
      profitMargin,
    };
  }

  // Private helper methods
  private async generateQuoteNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const prefix = `Q${year}${month}`;

    // 같은 연도의 마지막 견적서 번호 조회
    const { data, error } = await this.supabase
      .from('quotes')
      .select('quote_number')
      .like('quote_number', `${prefix}%`)
      .order('quote_number', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (!error && data && data.length > 0) {
      const lastNumber = data[0].quote_number.replace(prefix, '');
      nextNumber = parseInt(lastNumber) + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  private async createQuoteStructure(
    quoteId: string,
    groups: QuoteFormData['groups']
  ): Promise<void> {
    for (const [groupIndex, group] of groups.entries()) {
      // 그룹 생성
      const { data: createdGroup, error: groupError } = await this.supabase
        .from('quote_groups')
        .insert({
          quote_id: quoteId,
          name: group.name,
          description: group.description || null,
          sort_order: groupIndex,
          include_in_fee: group.include_in_fee,
        })
        .select()
        .single();

      if (groupError) {
        throw new Error(`그룹 생성 실패: ${groupError.message}`);
      }

      // 품목 생성
      for (const [itemIndex, item] of group.items.entries()) {
        const { data: createdItem, error: itemError } = await this.supabase
          .from('quote_items_motionsense')
          .insert({
            quote_group_id: createdGroup.id,
            name: item.name,
            custom_description: item.custom_description || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.quantity * item.unit_price,
            tax_rate: item.tax_rate || 0,
            sort_order: itemIndex,
            include_in_fee: item.include_in_fee,
            is_optional: item.is_optional || false,
          })
          .select()
          .single();

        if (itemError) {
          throw new Error(`품목 생성 실패: ${itemError.message}`);
        }

        // 세부내용 생성
        for (const [detailIndex, detail] of item.details.entries()) {
          const { error: detailError } = await this.supabase
            .from('quote_details')
            .insert({
              quote_item_id: createdItem.id,
              name: detail.name,
              description: detail.description || null,
              quantity: detail.quantity,
              days: detail.days || null,
              unit: detail.unit || null,
              unit_price: detail.unit_price,
              is_service: detail.is_service,
              cost_price: detail.cost_price || null,
              supplier_id: detail.supplier_id || null,
              supplier_name_snapshot: detail.supplier_name_snapshot || null,
              subtotal: detail.quantity * detail.unit_price,
              sort_order: detailIndex,
            });

          if (detailError) {
            throw new Error(`세부내용 생성 실패: ${detailError.message}`);
          }
        }
      }
    }
  }

  private async updateQuoteTotal(quoteId: string): Promise<void> {
    try {
      // calculate_quote_total 함수를 호출하여 정확한 계산
      const { data, error } = await this.supabase.rpc('calculate_quote_total', {
        quote_id_param: quoteId,
      });

      if (error) {
        console.error('총액 계산 실패:', error);
        return;
      }

      if (data && data.length > 0) {
        const calc = data[0];

        // 견적서 총액 업데이트
        const { error: updateError } = await this.supabase
          .from('quotes')
          .update({ 
            subtotal: calc.subtotal || 0,
            tax_amount: calc.tax_amount || 0,
            total_amount: calc.total_amount || 0
          })
          .eq('id', quoteId);

        if (updateError) {
          console.error('총액 업데이트 실패:', updateError);
        }
      }
    } catch (error) {
      console.error('견적서 총액 업데이트 오류:', error);
    }
  }

  private async copyQuoteGroups(originalGroups: QuoteGroup[], newQuoteId: string): Promise<void> {
    for (const group of originalGroups) {
      // 그룹 복사
      const { data: newGroup, error: groupError } = await this.supabase
        .from('quote_groups')
        .insert({
          quote_id: newQuoteId,
          name: group.name,
          description: group.description,
          sort_order: group.sort_order,
          include_in_fee: group.include_in_fee,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // 아이템 복사
      if (group.quote_items_motionsense) {
        for (const item of group.quote_items_motionsense) {
          const { data: newItem, error: itemError } = await this.supabase
            .from('quote_items_motionsense')
            .insert({
              quote_group_id: newGroup.id,
              item_id: item.item_id,
              name: item.name,
              custom_description: item.custom_description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              tax_rate: item.tax_rate,
              sort_order: item.sort_order,
              include_in_fee: item.include_in_fee,
              is_optional: item.is_optional,
              parent_item_id: item.parent_item_id,
              notes: item.notes,
            })
            .select()
            .single();

          if (itemError) throw itemError;

          // 상세 복사
          if (item.quote_details) {
            for (const detail of item.quote_details) {
              const { error: detailError } = await this.supabase
                .from('quote_details')
                .insert({
                  quote_item_id: newItem.id,
                  name: detail.name,
                  description: detail.description,
                  quantity: detail.quantity,
                  days: detail.days,
                  unit: detail.unit,
                  unit_price: detail.unit_price,
                  is_service: detail.is_service,
                  cost_price: detail.cost_price,
                  supplier_id: detail.supplier_id,
                  supplier_name_snapshot: detail.supplier_name_snapshot,
                  subtotal: detail.subtotal,
                  sort_order: detail.sort_order,
                });

              if (detailError) throw detailError;
            }
          }
        }
      }
    }
  }

  // 고객사 목록 조회
  async getClients(): Promise<ServiceResponse<any[]>> {
    try {
      const { data, error } = await this.supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        return this.handleError(error);
      }

      return { data: data || [] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 공급처 목록 조회
  async getSuppliers(): Promise<ServiceResponse<any[]>> {
    try {
      const { data, error } = await this.supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        return this.handleError(error);
      }

      return { data: data || [] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 마스터 품목 목록 조회
  async getMasterItems(): Promise<ServiceResponse<any[]>> {
    try {
      const { data, error } = await this.supabase
        .from('items')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        return this.handleError(error);
      }

      return { data: data || [] };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// 싱글톤 인스턴스
export const quoteService = new QuoteService();