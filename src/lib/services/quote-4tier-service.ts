// 4단계 견적서 구조 서비스
// quotes → quote_groups → quote_items → quote_details

import { supabase } from '../supabase/client';
import type { 
  QuoteWithStructure,
  QuoteFormData,
  QuoteCalculation,
  CreateQuoteResponse,
  MasterItemSnapshot,
  QuoteFilter,
  QuoteStatus
} from '@/types/quote-4tier';

export class Quote4TierService {
  /**
   * 견적서 목록 조회 (필터 포함)
   */
  static async getQuotes(filter?: QuoteFilter) {
    let query = supabase
      .from('quotes')
      .select(`
        *,
        client:clients(id, name)
      `)
      .order('created_at', { ascending: false });

    if (filter) {
      if (filter.status?.length) {
        query = query.in('status', filter.status);
      }
      if (filter.client_id?.length) {
        query = query.in('client_id', filter.client_id);
      }
      if (filter.date_from) {
        query = query.gte('issue_date', filter.date_from);
      }
      if (filter.date_to) {
        query = query.lte('issue_date', filter.date_to);
      }
      if (filter.amount_min !== undefined) {
        query = query.gte('total_amount', filter.amount_min);
      }
      if (filter.amount_max !== undefined) {
        query = query.lte('total_amount', filter.amount_max);
      }
      if (filter.search) {
        query = query.or(
          `project_title.ilike.%${filter.search}%,customer_name_snapshot.ilike.%${filter.search}%,quote_number.ilike.%${filter.search}%`
        );
      }
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`견적서 목록 조회 실패: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 견적서 상세 조회 (4단계 구조 포함)
   */
  static async getQuoteById(id: string): Promise<QuoteWithStructure | null> {
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('id', id)
      .single();

    if (quoteError) {
      throw new Error(`견적서 조회 실패: ${quoteError.message}`);
    }

    if (!quote) return null;

    // 4단계 구조 조회
    const { data: groups, error: groupsError } = await supabase
      .from('quote_groups')
      .select(`
        *,
        items:quote_items(
          *,
          details:quote_details(*)
        )
      `)
      .eq('quote_id', id)
      .order('sort_order');

    if (groupsError) {
      throw new Error(`견적서 구조 조회 실패: ${groupsError.message}`);
    }

    return {
      ...quote,
      groups: groups || []
    };
  }

  /**
   * 견적서 생성 (4단계 구조)
   */
  static async createQuote(formData: QuoteFormData): Promise<CreateQuoteResponse> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('로그인이 필요합니다.');
    }

    try {
      // 1. 견적서 기본 정보 생성
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          project_title: formData.project_title,
          customer_name_snapshot: formData.customer_name_snapshot,
          issue_date: formData.issue_date,
          agency_fee_rate: formData.agency_fee_rate,
          discount_amount: formData.discount_amount,
          vat_type: formData.vat_type,
          status: 'draft' as QuoteStatus,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (quoteError) {
        throw new Error(`견적서 생성 실패: ${quoteError.message}`);
      }

      // 2. 그룹 생성
      for (const groupData of formData.groups) {
        const { data: group, error: groupError } = await supabase
          .from('quote_groups')
          .insert({
            quote_id: quote.id,
            name: groupData.name,
            sort_order: groupData.sort_order,
            include_in_fee: groupData.include_in_fee,
          })
          .select()
          .single();

        if (groupError) {
          throw new Error(`그룹 생성 실패: ${groupError.message}`);
        }

        // 3. 품목 생성
        for (const itemData of groupData.items) {
          const { data: item, error: itemError } = await supabase
            .from('quote_items')
            .insert({
              quote_group_id: group.id,
              name: itemData.name,
              sort_order: itemData.sort_order,
              include_in_fee: itemData.include_in_fee,
            })
            .select()
            .single();

          if (itemError) {
            throw new Error(`품목 생성 실패: ${itemError.message}`);
          }

          // 4. 세부내용 생성
          for (const detailData of itemData.details) {
            const { error: detailError } = await supabase
              .from('quote_details')
              .insert({
                quote_item_id: item.id,
                name: detailData.name,
                description: detailData.description,
                quantity: detailData.quantity,
                days: detailData.days,
                unit: detailData.unit,
                unit_price: detailData.unit_price,
                is_service: detailData.is_service,
                cost_price: detailData.cost_price,
                supplier_id: detailData.supplier_id,
                supplier_name_snapshot: detailData.supplier_name_snapshot,
                master_item_id: detailData.master_item_id,
                sort_order: detailData.sort_order,
              });

            if (detailError) {
              throw new Error(`세부내용 생성 실패: ${detailError.message}`);
            }
          }
        }
      }

      // 5. 총액 계산 및 업데이트
      const calculation = await this.calculateQuote(quote.id);
      
      await supabase
        .from('quotes')
        .update({ 
          total_amount: calculation.final_total 
        })
        .eq('id', quote.id);

      return {
        success: true,
        data: {
          id: quote.id,
          quote_number: quote.quote_number || '',
        }
      };

    } catch (error) {
      console.error('견적서 생성 중 오류:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '견적서 생성에 실패했습니다.'
      };
    }
  }

  /**
   * 견적서 계산 (4단계 구조 기반)
   */
  static async calculateQuote(quoteId: string): Promise<QuoteCalculation> {
    const { data, error } = await supabase
      .rpc('calculate_quote_total_4tier', { quote_id_param: quoteId });

    if (error) {
      throw new Error(`견적서 계산 실패: ${error.message}`);
    }

    if (!data || data.length === 0) {
      // 기본값 반환
      return {
        subtotal: 0,
        fee_applicable_amount: 0,
        fee_excluded_amount: 0,
        agency_fee: 0,
        discount_amount: 0,
        vat_amount: 0,
        final_total: 0,
        total_cost: 0,
        total_profit: 0,
        profit_margin_percentage: 0,
        groups: []
      };
    }

    const result = data[0];
    
    // 그룹별 세부 계산 정보도 조회
    const groups = await this.getQuoteGroupCalculations(quoteId);

    return {
      ...result,
      groups
    };
  }

  /**
   * 그룹별 계산 정보 조회
   */
  private static async getQuoteGroupCalculations(quoteId: string) {
    const { data: groups, error } = await supabase
      .from('quote_groups')
      .select(`
        *,
        items:quote_items(
          *,
          details:quote_details(*)
        )
      `)
      .eq('quote_id', quoteId)
      .order('sort_order');

    if (error) {
      throw new Error(`그룹별 계산 조회 실패: ${error.message}`);
    }

    return (groups || []).map(group => {
      let groupSubtotal = 0;
      let groupCostTotal = 0;

      const items = (group.items || []).map((item: any) => {
        let itemSubtotal = 0;
        let itemCostTotal = 0;

        const details = (item.details || []).map((detail: any) => {
          const detailSubtotal = detail.quantity * detail.days * detail.unit_price;
          const detailCostTotal = detail.quantity * detail.days * detail.cost_price;
          
          itemSubtotal += detailSubtotal;
          itemCostTotal += detailCostTotal;

          return {
            id: detail.id,
            name: detail.name,
            quantity: detail.quantity,
            days: detail.days,
            unit_price: detail.unit_price,
            cost_price: detail.cost_price,
            subtotal: detailSubtotal,
            cost_total: detailCostTotal,
            profit: detailSubtotal - detailCostTotal
          };
        });

        groupSubtotal += itemSubtotal;
        groupCostTotal += itemCostTotal;

        return {
          id: item.id,
          name: item.name,
          include_in_fee: item.include_in_fee,
          subtotal: itemSubtotal,
          cost_total: itemCostTotal,
          profit: itemSubtotal - itemCostTotal,
          details
        };
      });

      return {
        id: group.id,
        name: group.name,
        include_in_fee: group.include_in_fee,
        subtotal: groupSubtotal,
        cost_total: groupCostTotal,
        profit: groupSubtotal - groupCostTotal,
        profit_margin: groupSubtotal > 0 ? ((groupSubtotal - groupCostTotal) / groupSubtotal) * 100 : 0,
        items
      };
    });
  }

  /**
   * 마스터 품목에서 스냅샷 생성
   */
  static async createSnapshotFromMasterItem(masterItemId: string): Promise<MasterItemSnapshot> {
    const { data: masterItem, error } = await supabase
      .from('items')
      .select(`
        *,
        supplier:suppliers(id, name)
      `)
      .eq('id', masterItemId)
      .single();

    if (error || !masterItem) {
      throw new Error(`마스터 품목 조회 실패: ${error?.message || '품목을 찾을 수 없습니다'}`);
    }

    return {
      master_item_id: masterItem.id,
      name: masterItem.name,
      description: masterItem.description,
      unit: masterItem.unit || '개',
      unit_price: masterItem.unit_price || 0,
      cost_price: masterItem.cost_price || 0,
      supplier_id: masterItem.supplier_id,
      supplier_name_snapshot: masterItem.supplier?.name || '',
    };
  }

  /**
   * 견적서 상태 변경
   */
  static async updateQuoteStatus(quoteId: string, status: QuoteStatus) {
    const { error } = await supabase
      .from('quotes')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId);

    if (error) {
      throw new Error(`상태 변경 실패: ${error.message}`);
    }

    // accepted 상태로 변경 시 프로젝트 생성 로직 추가 가능
    if (status === 'accepted') {
      // TODO: 프로젝트 생성 및 정산 스케줄 설정
    }
  }

  /**
   * 견적서 삭제 (soft delete)
   */
  static async deleteQuote(quoteId: string) {
    const { error } = await supabase
      .from('quotes')
      .update({ 
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId);

    if (error) {
      throw new Error(`견적서 삭제 실패: ${error.message}`);
    }
  }
}