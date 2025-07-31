'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  MotionsenseQuote, 
  QuoteGroup, 
  QuoteItem, 
  QuoteDetail, 
  QuoteCalculation,
  QuoteFormData,
  MasterItem,
  Supplier
} from '@/types/motionsense-quote';

export function useMotionsenseQuote(initialData?: Partial<MotionsenseQuote>) {
  console.log('useMotionsenseQuote 훅 초기화 시작');
  
  // 폼 데이터 상태 (안전한 초기화)
  const [formData, setFormData] = useState<QuoteFormData>(() => {
    try {
      const defaultData = {
        project_title: '',
        customer_id: '',
        customer_name_snapshot: '',
        issue_date: new Date().toISOString().split('T')[0],
        status: 'draft' as const,
        vat_type: 'exclusive' as const,
        discount_amount: 0,
        agency_fee_rate: 0.15, // 15% 기본값
        version: 1,
        groups: [],
        show_cost_management: false,
        auto_save_enabled: true,
        ...initialData,
      };
      console.log('폼 데이터 초기화 완료:', defaultData);
      return defaultData;
    } catch (error) {
      console.error('폼 데이터 초기화 실패:', error);
      throw new Error(`견적서 폼 데이터 초기화 중 오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // 계산 결과 상태
  const [calculation, setCalculation] = useState<QuoteCalculation | null>(null);
  
  // 마스터 데이터
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // 상태 관리
  const [isDirty, setIsDirty] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  console.log('useMotionsenseQuote 상태 초기화 완료');

  // 폼 데이터 업데이트 (안전한 구현)
  const updateFormData = useCallback((updates: Partial<QuoteFormData>) => {
    try {
      console.log('폼 데이터 업데이트:', updates);
      setFormData(prev => ({
        ...prev,
        ...updates,
      }));
      setIsDirty(true);
    } catch (error) {
      console.error('폼 데이터 업데이트 실패:', error);
    }
  }, []);

  // 그룹 추가 (안전한 구현)
  const addGroup = useCallback((name: string = '새 그룹') => {
    try {
      console.log('그룹 추가:', name);
      if (!formData || !formData.groups) {
        console.error('formData.groups가 정의되지 않음:', formData);
        return;
      }
      
      const newGroup: QuoteGroup = {
        name,
        sort_order: formData.groups.length,
        include_in_fee: true,
        items: [],
      };
      
      updateFormData({
        groups: [...formData.groups, newGroup],
      });
      console.log('그룹 추가 완료:', newGroup);
    } catch (error) {
      console.error('그룹 추가 실패:', error);
    }
  }, [formData.groups, updateFormData]);

  // 그룹 업데이트
  const updateGroup = useCallback((groupIndex: number, updates: Partial<QuoteGroup>) => {
    const updatedGroups = [...formData.groups];
    updatedGroups[groupIndex] = {
      ...updatedGroups[groupIndex],
      ...updates,
    };
    
    updateFormData({ groups: updatedGroups });
  }, [formData.groups, updateFormData]);

  // 그룹 삭제
  const removeGroup = useCallback((groupIndex: number) => {
    const updatedGroups = formData.groups.filter((_, index) => index !== groupIndex);
    updateFormData({ groups: updatedGroups });
  }, [formData.groups, updateFormData]);

  // 항목 추가
  const addItem = useCallback((groupIndex: number, name: string = '새 항목') => {
    const updatedGroups = [...formData.groups];
    const newItem: QuoteItem = {
      name,
      sort_order: updatedGroups[groupIndex].items.length,
      include_in_fee: updatedGroups[groupIndex].include_in_fee,
      details: [],
    };
    
    updatedGroups[groupIndex].items.push(newItem);
    updateFormData({ groups: updatedGroups });
  }, [formData.groups, updateFormData]);

  // 항목 업데이트
  const updateItem = useCallback((groupIndex: number, itemIndex: number, updates: Partial<QuoteItem>) => {
    const updatedGroups = [...formData.groups];
    updatedGroups[groupIndex].items[itemIndex] = {
      ...updatedGroups[groupIndex].items[itemIndex],
      ...updates,
    };
    
    updateFormData({ groups: updatedGroups });
  }, [formData.groups, updateFormData]);

  // 항목 삭제
  const removeItem = useCallback((groupIndex: number, itemIndex: number) => {
    const updatedGroups = [...formData.groups];
    updatedGroups[groupIndex].items = updatedGroups[groupIndex].items.filter((_, index) => index !== itemIndex);
    updateFormData({ groups: updatedGroups });
  }, [formData.groups, updateFormData]);

  // 세부내용 추가 (마스터 품목에서)
  const addDetailFromMaster = useCallback((
    groupIndex: number, 
    itemIndex: number, 
    masterItem: MasterItem
  ) => {
    const updatedGroups = [...formData.groups];
    const newDetail: QuoteDetail = {
      // 스냅샷된 정보 (데이터 불변성 보장)
      name: masterItem.name,
      description: masterItem.description || '',
      quantity: 1,
      days: 1,
      unit: masterItem.default_unit,
      unit_price: masterItem.default_unit_price,
      
      // 원가 관리
      is_service: masterItem.name.includes('편집') || masterItem.name.includes('제작'),
      cost_price: 0,
      supplier_id: undefined,
      supplier_name_snapshot: '',
    };
    
    updatedGroups[groupIndex].items[itemIndex].details.push(newDetail);
    updateFormData({ groups: updatedGroups });
  }, [formData.groups, updateFormData]);

  // 세부내용 수동 추가
  const addDetail = useCallback((groupIndex: number, itemIndex: number) => {
    const updatedGroups = [...formData.groups];
    const newDetail: QuoteDetail = {
      name: '',
      description: '',
      quantity: 1,
      days: 1,
      unit: '개',
      unit_price: 0,
      is_service: false,
      cost_price: 0,
      supplier_name_snapshot: '',
    };
    
    updatedGroups[groupIndex].items[itemIndex].details.push(newDetail);
    updateFormData({ groups: updatedGroups });
  }, [formData.groups, updateFormData]);

  // 세부내용 업데이트
  const updateDetail = useCallback((
    groupIndex: number, 
    itemIndex: number, 
    detailIndex: number, 
    updates: Partial<QuoteDetail>
  ) => {
    const updatedGroups = [...formData.groups];
    const detail = updatedGroups[groupIndex].items[itemIndex].details[detailIndex];
    
    updatedGroups[groupIndex].items[itemIndex].details[detailIndex] = {
      ...detail,
      ...updates,
    };
    
    updateFormData({ groups: updatedGroups });
  }, [formData.groups, updateFormData]);

  // 세부내용 삭제
  const removeDetail = useCallback((groupIndex: number, itemIndex: number, detailIndex: number) => {
    const updatedGroups = [...formData.groups];
    updatedGroups[groupIndex].items[itemIndex].details = 
      updatedGroups[groupIndex].items[itemIndex].details.filter((_, index) => index !== detailIndex);
    updateFormData({ groups: updatedGroups });
  }, [formData.groups, updateFormData]);

  // 견적서 계산 (순환 의존성 해결을 위해 직접 상태 업데이트 분리)
  const calculateQuote = useCallback(() => {
    setIsCalculating(true);
    
    try {
      let subtotal = 0;
      let feeApplicableAmount = 0;
      let totalCost = 0;
      const groupCalculations = [];

      // 그룹별 계산 (원본 데이터 변경 없이 계산만)
      for (const group of formData.groups) {
        let groupSubtotal = 0;
        
        for (const item of group.items) {
          for (const detail of item.details) {
            const detailSubtotal = detail.quantity * detail.days * detail.unit_price;
            groupSubtotal += detailSubtotal;
            totalCost += detail.quantity * detail.days * (detail.cost_price || 0);
          }
        }
        
        subtotal += groupSubtotal;
        
        // 수수료 적용 대상 금액 계산
        if (group.include_in_fee) {
          feeApplicableAmount += groupSubtotal;
        }
        
        groupCalculations.push({
          name: group.name,
          subtotal: groupSubtotal,
          include_in_fee: group.include_in_fee,
        });
      }

      // 대행 수수료 계산
      const agencyFee = feeApplicableAmount * (formData.agency_fee_rate || 0.15);
      
      // 부가세 전 총액
      const totalBeforeVat = subtotal + agencyFee - (formData.discount_amount || 0);
      
      // 부가세 계산
      let vatAmount = 0;
      if (formData.vat_type === 'exclusive') {
        vatAmount = totalBeforeVat * 0.1; // 부가세 별도
      }
      
      // 최종 총액
      const finalTotal = totalBeforeVat + vatAmount;
      
      // 수익 계산
      const totalProfit = finalTotal - totalCost - agencyFee;
      const profitMarginPercentage = finalTotal > 0 ? (totalProfit / finalTotal) * 100 : 0;

      const calculationResult: QuoteCalculation = {
        groups: groupCalculations,
        subtotal,
        fee_applicable_amount: feeApplicableAmount,
        agency_fee: agencyFee,
        total_before_vat: totalBeforeVat,
        vat_amount: vatAmount,
        discount_amount: formData.discount_amount || 0,
        final_total: finalTotal,
        total_cost: totalCost,
        total_profit: totalProfit,
        profit_margin_percentage: profitMarginPercentage,
      };

      setCalculation(calculationResult);
      
      // 순환 의존성 방지: 총액을 별도로 업데이트하지 않고 계산 결과만 설정
      
    } catch (error) {
      console.error('견적서 계산 오류:', error);
      setCalculation(null);
    } finally {
      setIsCalculating(false);
    }
  }, [formData.groups, formData.agency_fee_rate, formData.discount_amount, formData.vat_type]);

  // 폼 데이터 변경 시 자동 계산 (디바운스와 함께)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateQuote();
    }, 300); // 300ms 디바운스

    return () => clearTimeout(timeoutId);
  }, [calculateQuote]);

  // 템플릿 적용
  const applyTemplate = useCallback((template: any) => {
    const groups: QuoteGroup[] = template.template_data.groups.map((group: any, groupIndex: number) => ({
      name: group.name,
      sort_order: groupIndex,
      include_in_fee: group.include_in_fee,
      items: group.items.map((item: any, itemIndex: number) => ({
        name: item.name,
        sort_order: itemIndex,
        include_in_fee: item.include_in_fee,
        details: item.details.map((detail: any) => ({
          name: detail.name,
          description: '',
          quantity: detail.quantity,
          days: detail.days || 1,
          unit: '개',
          unit_price: detail.unit_price,
          is_service: false,
          cost_price: 0,
          supplier_name_snapshot: '',
        })),
      })),
    }));

    updateFormData({
      groups,
      template_id: template.id,
    });
  }, [updateFormData]);

  // 초기화
  const resetForm = useCallback(() => {
    setFormData({
      project_title: '',
      customer_id: '',
      customer_name_snapshot: '',
      issue_date: new Date().toISOString().split('T')[0],
      status: 'draft',
      vat_type: 'exclusive',
      discount_amount: 0,
      agency_fee_rate: 0.15,
      version: 1,
      groups: [],
      show_cost_management: false,
      auto_save_enabled: true,
    });
    setIsDirty(false);
  }, []);

  console.log('useMotionsenseQuote 훅 반환 준비 완료');
  
  const hookResult = {
    // 상태
    formData,
    calculation,
    masterItems,
    suppliers,
    isDirty,
    isCalculating,
    
    // 액션
    updateFormData,
    
    // 그룹 관리
    addGroup,
    updateGroup,
    removeGroup,
    
    // 항목 관리
    addItem,
    updateItem,
    removeItem,
    
    // 세부내용 관리
    addDetailFromMaster,
    addDetail,
    updateDetail,
    removeDetail,
    
    // 유틸리티
    calculateQuote,
    applyTemplate,
    resetForm,
    
    // 데이터 로더
    setMasterItems,
    setSuppliers,
  };
  
  console.log('useMotionsenseQuote 훅 반환:', Object.keys(hookResult));
  return hookResult;
}