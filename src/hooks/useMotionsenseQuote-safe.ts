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
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
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

  // 기타 안전한 함수들 (더미 구현)
  const updateItem = useCallback(() => setIsDirty(true), []);
  const removeItem = useCallback(() => setIsDirty(true), []);
  const addDetailFromMaster = useCallback(() => setIsDirty(true), []);
  const addDetail = useCallback(() => setIsDirty(true), []);
  const updateDetail = useCallback(() => setIsDirty(true), []);
  const removeDetail = useCallback(() => setIsDirty(true), []);
  const applyTemplate = useCallback(() => setIsDirty(true), []);
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
    
    // 간단한 계산
    setTimeout(() => {
      const subtotal = formData.groups.reduce((total, group) => {
        return total + group.items.reduce((groupTotal, item) => {
          return groupTotal + item.details.reduce((itemTotal, detail) => {
            return itemTotal + (detail.quantity * detail.days * detail.unit_price);
          }, 0);
        }, 0);
      }, 0);
      
      const agencyFee = subtotal * formData.agency_fee_rate;
      const vatAmount = (subtotal + agencyFee - formData.discount_amount) * 0.1;
      const finalTotal = subtotal + agencyFee - formData.discount_amount + vatAmount;
      
      setCalculation({
        groups: formData.groups.map(group => ({
          name: group.name,
          subtotal: 0,
          include_in_fee: group.include_in_fee,
        })),
        subtotal,
        fee_applicable_amount: subtotal,
        agency_fee: agencyFee,
        total_before_vat: subtotal + agencyFee - formData.discount_amount,
        vat_amount: vatAmount,
        discount_amount: formData.discount_amount,
        final_total: finalTotal,
        total_cost: 0,
        total_profit: finalTotal,
        profit_margin_percentage: 0,
      });
      
      setIsCalculating(false);
    }, 100);
  }, [formData]);

  // 폼 데이터 변경 시 자동 계산
  useEffect(() => {
    const timeoutId = setTimeout(calculateQuote, 300);
    return () => clearTimeout(timeoutId);
  }, [calculateQuote]);

  console.log('useMotionsenseQuoteSafe 훅 반환 준비 완료');

  return {
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
}