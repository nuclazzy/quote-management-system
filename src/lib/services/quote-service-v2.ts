/**
 * 견적서 서비스 v2 - 새로운 모션센스 구조 + 스냅샷 지원
 * 기존 quote-service.ts를 대체할 새로운 서비스
 */

import { MotionsenseQuote, QuoteGroup, QuoteItem, QuoteDetail } from '@/types/motionsense-quote';
import { ApiResponse, PaginatedApiResponse } from '@/types/api';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

/**
 * 견적서 목록 조회 (새로운 구조)
 */
export async function fetchQuotes(params?: {
  page?: number;
  limit?: number;
  status?: string;
  customer_id?: string;
  search?: string;
}): Promise<PaginatedApiResponse<MotionsenseQuote>> {
  const searchParams = new URLSearchParams();
  
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.status) searchParams.set('status', params.status);
  if (params?.customer_id) searchParams.set('customer_id', params.customer_id);
  if (params?.search) searchParams.set('search', params.search);

  const response = await fetch(`/api/v2/quotes?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`견적서 목록 조회 실패: ${response.status}`);
  }

  return response.json();
}

/**
 * 견적서 상세 조회 (스냅샷 데이터 포함)
 */
export async function fetchQuoteById(id: string): Promise<ApiResponse<MotionsenseQuote>> {
  const response = await fetch(`/api/v2/quotes/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`견적서 조회 실패: ${response.status}`);
  }

  return response.json();
}

/**
 * 견적서 생성 (스냅샷 자동 생성)
 */
export async function createQuote(quoteData: Partial<MotionsenseQuote>): Promise<ApiResponse<MotionsenseQuote>> {
  const response = await fetch('/api/v2/quotes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(quoteData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || `견적서 생성 실패: ${response.status}`);
  }

  return response.json();
}

/**
 * 견적서 수정 (스냅샷 업데이트)
 */
export async function updateQuote(id: string, quoteData: Partial<MotionsenseQuote>): Promise<ApiResponse<MotionsenseQuote>> {
  const response = await fetch(`/api/v2/quotes/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(quoteData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || `견적서 수정 실패: ${response.status}`);
  }

  return response.json();
}

/**
 * 견적서 삭제
 */
export async function deleteQuote(id: string): Promise<ApiResponse<void>> {
  const response = await fetch(`/api/v2/quotes/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`견적서 삭제 실패: ${response.status}`);
  }

  return response.json();
}

/**
 * 견적서 계산 함수 (스냅샷 데이터 기반)
 */
export function calculateQuoteFromSnapshot(quote: MotionsenseQuote) {
  let subtotal = 0;
  let feeApplicableAmount = 0;
  let feeExcludedAmount = 0;
  let totalCost = 0;

  const groupCalculations = quote.groups.map(group => {
    let groupSubtotal = 0;
    let groupCost = 0;

    group.items.forEach(item => {
      item.details.forEach(detail => {
        const itemTotal = detail.quantity * detail.days * detail.unit_price;
        const itemCost = detail.quantity * detail.days * detail.cost_price;
        
        groupSubtotal += itemTotal;
        groupCost += itemCost;
      });
    });

    subtotal += groupSubtotal;
    totalCost += groupCost;

    if (group.include_in_fee) {
      feeApplicableAmount += groupSubtotal;
    } else {
      feeExcludedAmount += groupSubtotal;
    }

    return {
      name: group.name,
      subtotal: groupSubtotal,
      include_in_fee: group.include_in_fee,
    };
  });

  // 대행 수수료 계산
  const agencyFee = feeApplicableAmount * (quote.agency_fee_rate / 100);
  
  // 부가세 계산
  const totalBeforeVat = subtotal + agencyFee - quote.discount_amount;
  const vatAmount = quote.vat_type === 'exclusive' 
    ? totalBeforeVat * 0.1 
    : totalBeforeVat - (totalBeforeVat / 1.1);
  
  const finalTotal = quote.vat_type === 'exclusive' 
    ? totalBeforeVat + vatAmount 
    : totalBeforeVat;

  // 수익률 계산
  const totalProfit = subtotal - totalCost;
  const profitMarginPercentage = subtotal > 0 ? (totalProfit / subtotal) * 100 : 0;

  return {
    groups: groupCalculations,
    subtotal,
    fee_applicable_amount: feeApplicableAmount,
    fee_excluded_amount: feeExcludedAmount,
    agency_fee: agencyFee,
    total_before_vat: totalBeforeVat,
    vat_amount: vatAmount,
    discount_amount: quote.discount_amount,
    final_total: finalTotal,
    total_cost: totalCost,
    total_profit: totalProfit,
    profit_margin_percentage: profitMarginPercentage,
  };
}

/**
 * 마스터 데이터와 스냅샷 데이터 비교
 * 마스터 데이터가 변경되었는지 확인하는 유틸리티
 */
export async function compareWithMasterData(quote: MotionsenseQuote): Promise<{
  hasChanges: boolean;
  changes: Array<{
    type: 'item' | 'supplier';
    id: string;
    field: string;
    masterValue: any;
    snapshotValue: any;
  }>;
}> {
  const changes: any[] = [];
  
  // 모든 아이템 ID와 공급업체 ID 수집
  const itemIds = new Set<string>();
  const supplierIds = new Set<string>();
  
  quote.groups.forEach(group => {
    group.items.forEach(item => {
      item.details.forEach(detail => {
        if (detail.supplier_id) supplierIds.add(detail.supplier_id);
        // item_id가 있다면 추가 (스냅샷에는 없을 수 있음)
      });
    });
  });

  // 현재 마스터 데이터 조회
  const [items, suppliers] = await Promise.all([
    itemIds.size > 0 
      ? supabase.from('items').select('*').in('id', Array.from(itemIds))
      : { data: [], error: null },
    supplierIds.size > 0
      ? supabase.from('suppliers').select('*').in('id', Array.from(supplierIds))
      : { data: [], error: null }
  ]);

  if (items.error || suppliers.error) {
    throw new Error('마스터 데이터 조회 실패');
  }

  // 비교 로직 구현
  const supplierLookup = new Map(suppliers.data?.map(s => [s.id, s]) || []);
  
  quote.groups.forEach(group => {
    group.items.forEach(item => {
      item.details.forEach(detail => {
        if (detail.supplier_id) {
          const currentSupplier = supplierLookup.get(detail.supplier_id);
          if (currentSupplier && currentSupplier.name !== detail.supplier_name_snapshot) {
            changes.push({
              type: 'supplier',
              id: detail.supplier_id,
              field: 'name',
              masterValue: currentSupplier.name,
              snapshotValue: detail.supplier_name_snapshot,
            });
          }
        }
      });
    });
  });

  return {
    hasChanges: changes.length > 0,
    changes,
  };
}