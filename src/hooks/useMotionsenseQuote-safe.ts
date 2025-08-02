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

export function useMotionsenseQuoteSafe(initialData?: Partial<MotionsenseQuote>) {
  console.log('useMotionsenseQuoteSafe 훅 초기화 시작');
  
  // 완전히 안전한 초기화 (절대 에러 throw 안함)
  const [formData, setFormData] = useState<QuoteFormData>({
    project_title: initialData?.project_title || '',
    customer_id: initialData?.customer_id || '',
    customer_name_snapshot: initialData?.customer_name_snapshot || '',
    issue_date: initialData?.issue_date || new Date().toISOString().split('T')[0],
    status: initialData?.status || 'draft',
    vat_type: initialData?.vat_type || 'exclusive',
    discount_amount: initialData?.discount_amount || 0,
    agency_fee_rate: initialData?.agency_fee_rate || 0.15,
    version: initialData?.version || 1,
    groups: initialData?.groups || [],
    show_cost_management: initialData?.show_cost_management || false,
    auto_save_enabled: initialData?.auto_save_enabled || true,
  });

  // 간단한 상태들
  const [calculation, setCalculation] = useState<QuoteCalculation | null>(null);
  // masterItems는 이제 MasterItemSelector에서 직접 API 호출로 처리됨
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  console.log('useMotionsenseQuoteSafe 상태 초기화 완료');

  // 안전한 폼 데이터 업데이트
  const updateFormData = useCallback((updates: Partial<QuoteFormData>) => {
    console.log('폼 데이터 업데이트:', updates);
    setFormData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  // 안전한 그룹 추가
  const addGroup = useCallback((name: string = '새 그룹') => {
    console.log('그룹 추가:', name);
    const newGroup: QuoteGroup = {
      name,
      sort_order: formData.groups.length,
      include_in_fee: true,
      items: [],
    };
    
    setFormData(prev => ({
      ...prev,
      groups: [...prev.groups, newGroup],
    }));
    setIsDirty(true);
  }, [formData.groups]);

  // 안전한 그룹 업데이트
  const updateGroup = useCallback((groupIndex: number, updates: Partial<QuoteGroup>) => {
    setFormData(prev => {
      const updatedGroups = [...prev.groups];
      if (updatedGroups[groupIndex]) {
        updatedGroups[groupIndex] = { ...updatedGroups[groupIndex], ...updates };
      }
      return { ...prev, groups: updatedGroups };
    });
    setIsDirty(true);
  }, []);

  // 안전한 그룹 삭제
  const removeGroup = useCallback((groupIndex: number) => {
    setFormData(prev => ({
      ...prev,
      groups: prev.groups.filter((_, index) => index !== groupIndex),
    }));
    setIsDirty(true);
  }, []);

  // 안전한 항목 추가
  const addItem = useCallback((groupIndex: number, name: string = '새 항목') => {
    setFormData(prev => {
      const updatedGroups = [...prev.groups];
      if (updatedGroups[groupIndex]) {
        const newItem: QuoteItem = {
          name,
          sort_order: updatedGroups[groupIndex].items.length,
          include_in_fee: updatedGroups[groupIndex].include_in_fee,
          details: [],
        };
        updatedGroups[groupIndex].items.push(newItem);
      }
      return { ...prev, groups: updatedGroups };
    });
    setIsDirty(true);
  }, []);

  // 안전한 항목 업데이트
  const updateItem = useCallback((groupIndex: number, itemIndex: number, updates: Partial<QuoteItem>) => {
    setFormData(prev => {
      const updatedGroups = [...prev.groups];
      if (updatedGroups[groupIndex]?.items[itemIndex]) {
        updatedGroups[groupIndex].items[itemIndex] = {
          ...updatedGroups[groupIndex].items[itemIndex],
          ...updates
        };
      }
      return { ...prev, groups: updatedGroups };
    });
    setIsDirty(true);
  }, []);

  // 안전한 항목 삭제
  const removeItem = useCallback((groupIndex: number, itemIndex: number) => {
    setFormData(prev => {
      const updatedGroups = [...prev.groups];
      if (updatedGroups[groupIndex]) {
        updatedGroups[groupIndex].items = updatedGroups[groupIndex].items.filter((_, index) => index !== itemIndex);
      }
      return { ...prev, groups: updatedGroups };
    });
    setIsDirty(true);
  }, []);

  // 안전한 세부내용 추가 (마스터 품목에서)
  const addDetailFromMaster = useCallback((groupIndex: number, itemIndex: number, masterItem: MasterItem) => {
    setFormData(prev => {
      const updatedGroups = [...prev.groups];
      if (updatedGroups[groupIndex]?.items[itemIndex]) {
        const newDetail: QuoteDetail = {
          name: masterItem.name,
          description: masterItem.description || '',
          quantity: 1,
          days: 1,
          unit: masterItem.default_unit,
          unit_price: masterItem.default_unit_price,
          is_service: masterItem.name.includes('편집') || masterItem.name.includes('제작'),
          cost_price: 0,
          supplier_id: undefined,
          supplier_name_snapshot: '',
        };
        updatedGroups[groupIndex].items[itemIndex].details.push(newDetail);
      }
      return { ...prev, groups: updatedGroups };
    });
    setIsDirty(true);
  }, []);

  // 안전한 세부내용 추가
  const addDetail = useCallback((groupIndex: number, itemIndex: number) => {
    setFormData(prev => {
      const updatedGroups = [...prev.groups];
      if (updatedGroups[groupIndex]?.items[itemIndex]) {
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
      }
      return { ...prev, groups: updatedGroups };
    });
    setIsDirty(true);
  }, []);

  // 안전한 세부내용 업데이트
  const updateDetail = useCallback((groupIndex: number, itemIndex: number, detailIndex: number, updates: Partial<QuoteDetail>) => {
    setFormData(prev => {
      const updatedGroups = [...prev.groups];
      if (updatedGroups[groupIndex]?.items[itemIndex]?.details[detailIndex]) {
        updatedGroups[groupIndex].items[itemIndex].details[detailIndex] = {
          ...updatedGroups[groupIndex].items[itemIndex].details[detailIndex],
          ...updates
        };
      }
      return { ...prev, groups: updatedGroups };
    });
    setIsDirty(true);
  }, []);

  // 안전한 세부내용 삭제
  const removeDetail = useCallback((groupIndex: number, itemIndex: number, detailIndex: number) => {
    setFormData(prev => {
      const updatedGroups = [...prev.groups];
      if (updatedGroups[groupIndex]?.items[itemIndex]) {
        updatedGroups[groupIndex].items[itemIndex].details = 
          updatedGroups[groupIndex].items[itemIndex].details.filter((_, index) => index !== detailIndex);
      }
      return { ...prev, groups: updatedGroups };
    });
    setIsDirty(true);
  }, []);
  const applyTemplate = useCallback((template: any) => {
    try {
      console.log('템플릿 적용:', template);
      
      // API에서 받은 실제 템플릿 데이터 구조 사용
      if (template.template_data && template.template_data.groups) {
        const templateGroups: QuoteGroup[] = template.template_data.groups.map((group: any, groupIndex: number) => ({
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
              days: detail.days,
              unit: '개', // 기본값
              unit_price: detail.unit_price,
              is_service: detail.name.includes('편집') || detail.name.includes('제작') || detail.name.includes('기획'),
              cost_price: 0,
              supplier_name_snapshot: '',
            }))
          }))
        }));

        setFormData(prev => ({
          ...prev,
          groups: templateGroups,
          project_title: template.name + ' 프로젝트'
        }));
      }
      
      setIsDirty(true);
      console.log('템플릿 적용 완료');
    } catch (error) {
      console.error('템플릿 적용 실패:', error);
    }
  }, []);
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

  // 안전한 계산 함수
  const calculateQuote = useCallback(() => {
    console.log('견적서 계산 실행');
    setIsCalculating(true);
    
    // 개선된 계산 로직
    setTimeout(() => {
      // 그룹별 상세 계산
      const groupCalculations = formData.groups.map(group => {
        const groupSubtotal = group.items.reduce((groupTotal, item) => {
          return groupTotal + item.details.reduce((itemTotal, detail) => {
            return itemTotal + (detail.quantity * detail.days * detail.unit_price);
          }, 0);
        }, 0);
        
        return {
          name: group.name,
          subtotal: groupSubtotal,
          include_in_fee: group.include_in_fee,
        };
      });
      
      // 전체 소계
      const subtotal = groupCalculations.reduce((total, group) => total + group.subtotal, 0);
      
      // 대행수수료 적용 대상/미적용 구분
      const feeApplicableAmount = groupCalculations
        .filter(group => group.include_in_fee)
        .reduce((total, group) => total + group.subtotal, 0);
      
      const feeExcludedAmount = groupCalculations
        .filter(group => !group.include_in_fee)
        .reduce((total, group) => total + group.subtotal, 0);
      
      // 대행수수료는 적용 대상에만 계산
      const agencyFee = feeApplicableAmount * formData.agency_fee_rate;
      
      // 할인 금액 검증 (총액을 초과하지 않도록)
      const validDiscountAmount = Math.min(formData.discount_amount, subtotal + agencyFee);
      
      // 부가세 전 총액
      const totalBeforeVat = Math.max(0, subtotal + agencyFee - validDiscountAmount);
      
      // 부가세 계산 (포함/별도 타입 정확히 처리)
      let vatAmount = 0;
      let finalTotal = 0;
      
      if (formData.vat_type === 'inclusive') {
        // 부가세 포함: 역산하여 부가세 계산
        finalTotal = totalBeforeVat;
        vatAmount = totalBeforeVat / 11; // 110에서 10을 역산
      } else {
        // 부가세 별도: 추가로 계산
        vatAmount = totalBeforeVat * 0.1;
        finalTotal = totalBeforeVat + vatAmount;
      }
      
      // 총 원가 계산 (음수 방지)
      const totalCost = formData.groups.reduce((total, group) => {
        return total + group.items.reduce((groupTotal, item) => {
          return groupTotal + item.details.reduce((itemTotal, detail) => {
            const quantity = Math.max(0, detail.quantity || 0);
            const days = Math.max(0, detail.days || 0);
            const costPrice = Math.max(0, detail.cost_price || 0);
            return itemTotal + Math.round(quantity * days * costPrice);
          }, 0);
        }, 0);
      }, 0);
      
      // 수익 계산
      const totalProfit = finalTotal - totalCost;
      
      // 수익률 계산 (원가 대비 마진율과 매출 대비 총마진율)
      const profitMarginPercentage = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0; // 원가 대비 마진율
      const grossMarginPercentage = finalTotal > 0 ? (totalProfit / finalTotal) * 100 : 0; // 매출 대비 총마진율
      
      setCalculation({
        groups: groupCalculations,
        subtotal,
        fee_applicable_amount: feeApplicableAmount,
        fee_excluded_amount: feeExcludedAmount,
        agency_fee: agencyFee,
        total_before_vat: totalBeforeVat,
        vat_amount: vatAmount,
        discount_amount: validDiscountAmount, // 검증된 할인 금액
        final_total: finalTotal,
        total_cost: totalCost,
        total_profit: totalProfit,
        profit_margin_percentage: profitMarginPercentage, // 원가 대비 마진율
        gross_margin_percentage: grossMarginPercentage, // 매출 대비 총마진율
      });
      
      setIsCalculating(false);
    }, 100);
  }, [formData]);

  // 폼 데이터 변경 시 자동 계산
  useEffect(() => {
    const timeoutId = setTimeout(calculateQuote, 300);
    return () => clearTimeout(timeoutId);
  }, [calculateQuote]);

  // 공급업체 데이터 로드 (더미 데이터)
  useEffect(() => {
    const dummySuppliers: Supplier[] = [
      {
        id: '1',
        name: '크리에이티브 스튜디오',
        contact_person: '김영상',
        phone: '02-1234-5678',
        email: 'info@creativestudio.co.kr',
        is_active: true
      },
      {
        id: '2',
        name: '프로덕션 하우스',
        contact_person: '이제작',
        phone: '02-2345-6789',
        email: 'contact@productionhouse.co.kr',
        is_active: true
      },
      {
        id: '3',
        name: '테크 솔루션',
        contact_person: '박개발',
        phone: '02-3456-7890',
        email: 'hello@techsolution.co.kr',
        is_active: true
      },
      {
        id: '4',
        name: '디자인 워크스',
        contact_person: '최디자인',
        phone: '02-4567-8901',
        email: 'design@designworks.co.kr',
        is_active: true
      }
    ];
    
    setSuppliers(dummySuppliers);
  }, []);

  console.log('useMotionsenseQuoteSafe 훅 반환 준비 완료');

  return {
    // 상태
    formData,
    calculation,
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
  };
}