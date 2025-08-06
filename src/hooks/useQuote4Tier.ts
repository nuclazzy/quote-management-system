// 4단계 견적서 구조 React Hook
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Quote4TierService } from '@/lib/services/quote-4tier-service';
import type { 
  QuoteFormData, 
  QuoteFormGroup, 
  QuoteFormItem, 
  QuoteFormDetail,
  QuoteCalculation,
  MasterItemSnapshot
} from '@/types/quote-4tier';

interface UseQuote4TierOptions {
  autoCalculate?: boolean;
  debounceMs?: number;
}

export function useQuote4Tier(options: UseQuote4TierOptions = {}) {
  const { autoCalculate = true, debounceMs = 500 } = options;

  // 폼 데이터 상태
  const [formData, setFormData] = useState<QuoteFormData>({
    project_title: '',
    customer_name_snapshot: '',
    issue_date: new Date().toISOString().split('T')[0],
    agency_fee_rate: 0.15, // 기본 15%
    discount_amount: 0,
    vat_type: 'exclusive',
    show_cost_management: false,
    groups: []
  });

  // 계산 결과 상태
  const [calculation, setCalculation] = useState<QuoteCalculation>({
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
  });

  // 로딩 상태
  const [isCalculating, setIsCalculating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // 공급업체 목록 (원가 관리용)
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // 공급업체 목록 로드
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        // TODO: 공급업체 서비스에서 로드
        setSuppliers([]);
      } catch (error) {
        console.error('공급업체 목록 로드 실패:', error);
      }
    };
    loadSuppliers();
  }, []);

  // 폼 데이터 업데이트
  const updateFormData = useCallback((updates: Partial<QuoteFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  // 그룹 추가
  const addGroup = useCallback((name: string) => {
    const newGroup: QuoteFormGroup = {
      name,
      sort_order: formData.groups.length,
      include_in_fee: true,
      items: []
    };

    setFormData(prev => ({
      ...prev,
      groups: [...prev.groups, newGroup]
    }));
    setIsDirty(true);
  }, [formData.groups.length]);

  // 그룹 제거
  const removeGroup = useCallback((groupIndex: number) => {
    setFormData(prev => ({
      ...prev,
      groups: prev.groups.filter((_, index) => index !== groupIndex)
    }));
    setIsDirty(true);
  }, []);

  // 품목 추가
  const addItem = useCallback((groupIndex: number, name: string) => {
    setFormData(prev => {
      const newGroups = [...prev.groups];
      const newItem: QuoteFormItem = {
        name,
        sort_order: newGroups[groupIndex].items.length,
        include_in_fee: true,
        details: []
      };
      newGroups[groupIndex].items.push(newItem);
      return { ...prev, groups: newGroups };
    });
    setIsDirty(true);
  }, []);

  // 품목 제거
  const removeItem = useCallback((groupIndex: number, itemIndex: number) => {
    setFormData(prev => {
      const newGroups = [...prev.groups];
      newGroups[groupIndex].items = newGroups[groupIndex].items.filter((_, index) => index !== itemIndex);
      return { ...prev, groups: newGroups };
    });
    setIsDirty(true);
  }, []);

  // 품목 업데이트
  const updateItem = useCallback((groupIndex: number, itemIndex: number, updates: Partial<QuoteFormItem>) => {
    setFormData(prev => {
      const newGroups = [...prev.groups];
      newGroups[groupIndex].items[itemIndex] = {
        ...newGroups[groupIndex].items[itemIndex],
        ...updates
      };
      return { ...prev, groups: newGroups };
    });
    setIsDirty(true);
  }, []);

  // 세부항목 추가 (빈 항목)
  const addDetail = useCallback((groupIndex: number, itemIndex: number) => {
    const newDetail: QuoteFormDetail = {
      name: '',
      description: '',
      quantity: 1,
      days: 1,
      unit: '개',
      unit_price: 0,
      is_service: false,
      cost_price: 0,
      sort_order: formData.groups[groupIndex].items[itemIndex].details.length
    };

    setFormData(prev => {
      const newGroups = [...prev.groups];
      newGroups[groupIndex].items[itemIndex].details.push(newDetail);
      return { ...prev, groups: newGroups };
    });
    setIsDirty(true);
  }, [formData.groups]);

  // 세부항목 추가 (마스터 품목에서)
  const addDetailFromMaster = useCallback(async (
    groupIndex: number, 
    itemIndex: number, 
    masterItemId: string
  ) => {
    try {
      const snapshot = await Quote4TierService.createSnapshotFromMasterItem(masterItemId);
      
      const newDetail: QuoteFormDetail = {
        name: snapshot.name,
        description: snapshot.description,
        quantity: 1,
        days: 1,
        unit: snapshot.unit,
        unit_price: snapshot.unit_price,
        is_service: false,
        cost_price: snapshot.cost_price || 0,
        supplier_id: snapshot.supplier_id,
        supplier_name_snapshot: snapshot.supplier_name_snapshot,
        master_item_id: snapshot.master_item_id,
        sort_order: formData.groups[groupIndex].items[itemIndex].details.length
      };

      setFormData(prev => {
        const newGroups = [...prev.groups];
        newGroups[groupIndex].items[itemIndex].details.push(newDetail);
        return { ...prev, groups: newGroups };
      });
      setIsDirty(true);
    } catch (error) {
      console.error('마스터 품목 스냅샷 생성 실패:', error);
      throw error;
    }
  }, [formData.groups]);

  // 세부항목 제거
  const removeDetail = useCallback((groupIndex: number, itemIndex: number, detailIndex: number) => {
    setFormData(prev => {
      const newGroups = [...prev.groups];
      newGroups[groupIndex].items[itemIndex].details = 
        newGroups[groupIndex].items[itemIndex].details.filter((_, index) => index !== detailIndex);
      return { ...prev, groups: newGroups };
    });
    setIsDirty(true);
  }, []);

  // 세부항목 업데이트
  const updateDetail = useCallback((
    groupIndex: number, 
    itemIndex: number, 
    detailIndex: number, 
    updates: Partial<QuoteFormDetail>
  ) => {
    setFormData(prev => {
      const newGroups = [...prev.groups];
      newGroups[groupIndex].items[itemIndex].details[detailIndex] = {
        ...newGroups[groupIndex].items[itemIndex].details[detailIndex],
        ...updates
      };
      return { ...prev, groups: newGroups };
    });
    setIsDirty(true);
  }, []);

  // 실시간 계산 (클라이언트 사이드)
  const calculateLocal = useCallback(() => {
    let subtotal = 0;
    let feeApplicable = 0;
    let feeExcluded = 0;
    let totalCost = 0;

    formData.groups.forEach(group => {
      let groupTotal = 0;
      let groupCost = 0;

      group.items.forEach(item => {
        let itemTotal = 0;
        let itemCost = 0;

        item.details.forEach(detail => {
          const detailTotal = detail.quantity * detail.days * detail.unit_price;
          const detailCost = detail.quantity * detail.days * detail.cost_price;
          
          itemTotal += detailTotal;
          itemCost += detailCost;
        });

        groupTotal += itemTotal;
        groupCost += itemCost;
      });

      subtotal += groupTotal;
      totalCost += groupCost;

      if (group.include_in_fee) {
        feeApplicable += groupTotal;
      } else {
        feeExcluded += groupTotal;
      }
    });

    const agencyFee = feeApplicable * formData.agency_fee_rate;
    const discount = formData.discount_amount;
    
    let vatAmount = 0;
    let finalTotal = 0;

    if (formData.vat_type === 'exclusive') {
      finalTotal = subtotal + agencyFee - discount;
      vatAmount = finalTotal * 0.1;
      finalTotal += vatAmount;
    } else {
      finalTotal = subtotal + agencyFee - discount;
      vatAmount = finalTotal * 0.1 / 1.1;
    }

    const totalProfit = finalTotal - totalCost;
    const profitMargin = finalTotal > 0 ? (totalProfit / finalTotal) * 100 : 0;

    setCalculation({
      subtotal,
      fee_applicable_amount: feeApplicable,
      fee_excluded_amount: feeExcluded,
      agency_fee: agencyFee,
      discount_amount: discount,
      vat_amount: vatAmount,
      final_total: finalTotal,
      total_cost: totalCost,
      total_profit: totalProfit,
      profit_margin_percentage: profitMargin,
      groups: [] // 상세 그룹 계산은 서버에서
    });
  }, [formData]);

  // 자동 계산
  useEffect(() => {
    if (autoCalculate) {
      const timer = setTimeout(calculateLocal, debounceMs);
      return () => clearTimeout(timer);
    }
  }, [autoCalculate, calculateLocal, debounceMs]);

  // 템플릿 적용
  const applyTemplate = useCallback((templateData: Partial<QuoteFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...templateData
    }));
    setIsDirty(true);
  }, []);

  // 폼 초기화
  const resetForm = useCallback(() => {
    setFormData({
      project_title: '',
      customer_name_snapshot: '',
      issue_date: new Date().toISOString().split('T')[0],
      agency_fee_rate: 0.15,
      discount_amount: 0,
      vat_type: 'exclusive',
      show_cost_management: false,
      groups: []
    });
    setCalculation({
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
    });
    setIsDirty(false);
  }, []);

  // 유효성 검사
  const isValid = useMemo(() => {
    return (
      formData.project_title.trim() !== '' &&
      formData.groups.length > 0 &&
      formData.groups.some(group => 
        group.items.length > 0 && 
        group.items.some(item => item.details.length > 0)
      )
    );
  }, [formData]);

  return {
    // 상태
    formData,
    calculation,
    isCalculating,
    isDirty,
    suppliers,
    isValid,

    // 폼 데이터 조작
    updateFormData,
    resetForm,
    applyTemplate,

    // 그룹 조작
    addGroup,
    removeGroup,

    // 품목 조작
    addItem,
    removeItem,
    updateItem,

    // 세부항목 조작
    addDetail,
    addDetailFromMaster,
    removeDetail,
    updateDetail,

    // 계산
    calculateLocal
  };
}