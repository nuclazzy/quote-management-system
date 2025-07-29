import { supabase } from '../supabase/client'
import type {
  Quote,
  QuoteInsert,
  QuoteUpdate,
  QuoteWithDetails,
  QuoteFormData,
  QuoteFilter,
  Customer,
  Supplier,
  MasterItem,
  QuoteCalculation,
} from '@/types'

export class QuoteService {
  /**
   * 견적서 목록 조회 (필터 적용)
   */
  static async getQuotes(filter?: QuoteFilter, page = 1, perPage = 20) {
    let query = supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*)
      `)
      .order('created_at', { ascending: false })

    // 필터 적용
    if (filter) {
      if (filter.status?.length) {
        query = query.in('status', filter.status)
      }
      if (filter.customer_id?.length) {
        query = query.in('customer_id', filter.customer_id)
      }
      if (filter.date_from) {
        query = query.gte('issue_date', filter.date_from)
      }
      if (filter.date_to) {
        query = query.lte('issue_date', filter.date_to)
      }
      if (filter.amount_min) {
        query = query.gte('total_amount', filter.amount_min)
      }
      if (filter.amount_max) {
        query = query.lte('total_amount', filter.amount_max)
      }
      if (filter.search) {
        query = query.or(`project_title.ilike.%${filter.search}%,quote_number.ilike.%${filter.search}%,customer_name_snapshot.ilike.%${filter.search}%`)
      }
      if (filter.created_by?.length) {
        query = query.in('created_by', filter.created_by)
      }
    }

    // 페이지네이션
    const from = (page - 1) * perPage
    const to = from + perPage - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      throw new Error(`견적서 목록 조회 실패: ${error.message}`)
    }

    return {
      data: data || [],
      count: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage)
    }
  }

  /**
   * 견적서 상세 조회 (모든 관련 데이터 포함)
   */
  static async getQuoteWithDetails(id: string): Promise<QuoteWithDetails> {
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*),
        groups:quote_groups(
          *,
          items:quote_items(
            *,
            details:quote_details(
              *,
              supplier:suppliers(*)
            )
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      throw new Error(`견적서 조회 실패: ${error.message}`)
    }

    if (!data) {
      throw new Error('견적서를 찾을 수 없습니다.')
    }

    return data as QuoteWithDetails
  }

  /**
   * 견적서 생성
   */
  static async createQuote(formData: QuoteFormData): Promise<string> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('로그인이 필요합니다.')
    }

    // 견적서 번호 생성
    const quoteNumber = await this.generateQuoteNumber()

    // 트랜잭션으로 견적서와 관련 데이터 모두 생성
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        quote_number: quoteNumber,
        project_title: formData.project_title,
        customer_id: formData.customer_id,
        customer_name_snapshot: formData.customer_name_snapshot,
        issue_date: formData.issue_date,
        status: formData.status,
        vat_type: formData.vat_type,
        discount_amount: formData.discount_amount,
        agency_fee_rate: formData.agency_fee_rate,
        notes: formData.notes,
        created_by: user.user.id,
      })
      .select()
      .single()

    if (quoteError) {
      throw new Error(`견적서 생성 실패: ${quoteError.message}`)
    }

    // 그룹, 품목, 세부내용 생성
    await this.createQuoteStructure(quote.id, formData.groups)

    // 총액 계산 후 업데이트
    await this.updateQuoteTotal(quote.id)

    return quote.id
  }

  /**
   * 견적서 수정 (새 버전 생성)
   */
  static async updateQuote(id: string, formData: QuoteFormData): Promise<string> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('로그인이 필요합니다.')
    }

    // 기존 견적서 조회
    const { data: originalQuote, error: fetchError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !originalQuote) {
      throw new Error('원본 견적서를 찾을 수 없습니다.')
    }

    // 새 버전 생성
    const { data: newQuote, error: createError } = await supabase
      .from('quotes')
      .insert({
        quote_number: originalQuote.quote_number,
        project_title: formData.project_title,
        customer_id: formData.customer_id,
        customer_name_snapshot: formData.customer_name_snapshot,
        issue_date: formData.issue_date,
        status: formData.status,
        vat_type: formData.vat_type,
        discount_amount: formData.discount_amount,
        agency_fee_rate: formData.agency_fee_rate,
        notes: formData.notes,
        version: originalQuote.version + 1,
        parent_quote_id: originalQuote.parent_quote_id || originalQuote.id,
        created_by: user.user.id,
      })
      .select()
      .single()

    if (createError) {
      throw new Error(`견적서 수정 실패: ${createError.message}`)
    }

    // 새 버전의 구조 생성
    await this.createQuoteStructure(newQuote.id, formData.groups)

    // 총액 계산 후 업데이트
    await this.updateQuoteTotal(newQuote.id)

    return newQuote.id
  }

  /**
   * 견적서 구조 생성 (그룹 > 품목 > 세부내용)
   */
  private static async createQuoteStructure(quoteId: string, groups: QuoteFormData['groups']) {
    for (const [groupIndex, group] of groups.entries()) {
      // 그룹 생성
      const { data: createdGroup, error: groupError } = await supabase
        .from('quote_groups')
        .insert({
          quote_id: quoteId,
          name: group.name,
          sort_order: groupIndex,
          include_in_fee: group.include_in_fee,
        })
        .select()
        .single()

      if (groupError) {
        throw new Error(`그룹 생성 실패: ${groupError.message}`)
      }

      // 품목 생성
      for (const [itemIndex, item] of group.items.entries()) {
        const { data: createdItem, error: itemError } = await supabase
          .from('quote_items')
          .insert({
            quote_group_id: createdGroup.id,
            name: item.name,
            sort_order: itemIndex,
            include_in_fee: item.include_in_fee,
          })
          .select()
          .single()

        if (itemError) {
          throw new Error(`품목 생성 실패: ${itemError.message}`)
        }

        // 세부내용 생성
        for (const detail of item.details) {
          const { error: detailError } = await supabase
            .from('quote_details')
            .insert({
              quote_item_id: createdItem.id,
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
            })

          if (detailError) {
            throw new Error(`세부내용 생성 실패: ${detailError.message}`)
          }
        }
      }
    }
  }

  /**
   * 견적서 총액 계산 및 업데이트 (DB 함수 사용)
   */
  static async updateQuoteTotal(quoteId: string) {
    try {
      // calculate_quote_total 함수를 호출하여 정확한 계산
      const { data, error } = await supabase
        .rpc('calculate_quote_total', { quote_id_param: quoteId })

      if (error) {
        console.error('총액 계산 실패:', error)
        return
      }

      if (data && data.length > 0) {
        const calc = data[0]
        
        // 견적서 총액 업데이트
        const { error: updateError } = await supabase
          .from('quotes')
          .update({ total_amount: calc.total_amount })
          .eq('id', quoteId)

        if (updateError) {
          console.error('총액 업데이트 실패:', updateError)
        }
      }
    } catch (error) {
      console.error('견적서 총액 업데이트 오류:', error)
    }
  }

  /**
   * 견적서 번호 생성
   */
  private static async generateQuoteNumber(): Promise<string> {
    const today = new Date()
    const year = today.getFullYear()
    const prefix = `QUOTE-${year}-`

    // 같은 연도의 마지막 견적서 번호 조회
    const { data, error } = await supabase
      .from('quotes')
      .select('quote_number')
      .like('quote_number', `${prefix}%`)
      .order('quote_number', { ascending: false })
      .limit(1)

    let nextNumber = 1
    if (!error && data && data.length > 0) {
      const lastNumber = data[0].quote_number.replace(prefix, '')
      nextNumber = parseInt(lastNumber) + 1
    }

    return `${prefix}${nextNumber.toString().padStart(3, '0')}`
  }

  /**
   * 고객사 목록 조회
   */
  static async getCustomers(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      throw new Error(`고객사 목록 조회 실패: ${error.message}`)
    }

    return data || []
  }

  /**
   * 공급처 목록 조회
   */
  static async getSuppliers(): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      throw new Error(`공급처 목록 조회 실패: ${error.message}`)
    }

    return data || []
  }

  /**
   * 마스터 품목 목록 조회
   */
  static async getMasterItems(): Promise<MasterItem[]> {
    const { data, error } = await supabase
      .from('master_items')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      throw new Error(`마스터 품목 목록 조회 실패: ${error.message}`)
    }

    return data || []
  }

  /**
   * 견적서 계산 (DB 함수와 정확히 일치)
   */
  static calculateQuote(formData: QuoteFormData): QuoteCalculation {
    let subtotal = 0
    let feeApplicableAmount = 0
    let totalCostPrice = 0

    // 각 세부내용의 금액 계산
    formData.groups.forEach(group => {
      group.items.forEach(item => {
        item.details.forEach(detail => {
          // 서비스 항목: 수량 × 단가
          // 일반 항목: 수량 × 일수 × 단가
          const detailAmount = detail.is_service 
            ? detail.quantity * detail.unit_price
            : detail.quantity * (detail.days || 1) * detail.unit_price

          subtotal += detailAmount
          
          // 원가는 서비스/일반 관계없이 수량만 적용
          totalCostPrice += detail.cost_price * detail.quantity

          // 수수료 적용 대상 금액 계산
          if (group.include_in_fee && item.include_in_fee) {
            feeApplicableAmount += detailAmount
          }
        })
      })
    })

    // 대행수수료 계산
    const agencyFee = feeApplicableAmount * (formData.agency_fee_rate / 100)

    // 할인 전 순액 계산 (소계 + 수수료)
    let netAmount = subtotal + agencyFee

    // 할인 적용 후 VAT 전 금액
    netAmount = netAmount - formData.discount_amount

    // VAT 계산 (DB와 정확히 일치하는 로직)
    let vatAmount = 0
    let finalTotal = 0
    
    if (formData.vat_type === 'exclusive') {
      // VAT 별도세: VAT 전 금액에 10% 추가
      vatAmount = netAmount * 0.1
      finalTotal = netAmount + vatAmount
    } else {
      // VAT 포함세: 순액이 최종 금액
      finalTotal = netAmount
      vatAmount = finalTotal / 11  // 포함세에서 VAT 역산 (11분의 1)
    }

    // 수익성 계산
    const profitAmount = finalTotal - totalCostPrice
    const profitMargin = finalTotal > 0 ? (profitAmount / finalTotal) * 100 : 0

    return {
      subtotal,
      feeApplicableAmount,
      agencyFee,
      totalBeforeVat: netAmount,  // 할인 후 VAT 전 금액
      vatAmount,
      totalAfterVat: finalTotal,
      finalTotal,
      totalCostPrice,
      profitAmount,
      profitMargin,
    }
  }
}