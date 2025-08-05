'use client';

import { useState, useCallback } from 'react';
import { 
  MotionsenseQuote, 
  QuoteGroup, 
  QuoteFormData,
  MasterItem
} from '@/types/motionsense-quote';

export function useMotionsenseQuoteSimple(initialData?: Partial<MotionsenseQuote>) {
  console.log('useMotionsenseQuoteSimple 훅 초기화 시작');
  
  // 간단한 폼 데이터 상태 (에러 없이)
  const [formData, setFormData] = useState<QuoteFormData>({
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
    ...initialData,
  });

  // 계산 결과 상태
  const [calculation, setCalculation] = useState(null);
  
  // 마스터 데이터
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  
  // 상태 관리
  const [isDirty, setIsDirty] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  console.log('useMotionsenseQuoteSimple 상태 초기화 완료');

  // 폼 데이터 업데이트 (간단한 버전)
  const updateFormData = useCallback((updates: Partial<QuoteFormData>) => {
    console.log('폼 데이터 업데이트:', updates);
    setFormData(prev => ({
      ...prev,
      ...updates,
    }));
    setIsDirty(true);
  }, []);

  // 그룹 추가 (간단한 버전)
  const addGroup = useCallback((name: string = '새 그룹') => {
    console.log('그룹 추가:', name);
    const newGroup: QuoteGroup = {
      name,
      sort_order: formData.groups.length,
      include_in_fee: true,
      items: [],
    };
    
    updateFormData({
      groups: [...formData.groups, newGroup],
    });
  }, [formData.groups, updateFormData]);

  console.log('useMotionsenseQuoteSimple 훅 반환 준비 완료');
  
  return {
    // 상태
    formData,
    calculation,
    masterItems,
    isDirty,
    isCalculating,
    
    // 액션
    updateFormData,
    addGroup,
    setMasterItems,
    
    // 간단한 더미 함수들
    updateGroup: () => {},
    removeGroup: () => {},
    addItem: () => {},
    updateItem: () => {},
    removeItem: () => {},
    addDetailFromMaster: () => {},
    addDetail: () => {},
    updateDetail: () => {},
    removeDetail: () => {},
    applyTemplate: () => {},
    calculateQuote: () => {},
    resetForm: () => {},
    setSuppliers: () => {},
  };
}