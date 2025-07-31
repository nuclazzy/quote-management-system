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
      
      // 템플릿에 따른 더미 그룹 생성
      let templateGroups: QuoteGroup[] = [];
      
      if (template.id === '1') { // 기본 영상 제작
        templateGroups = [
          {
            name: '기획/스토리보드',
            sort_order: 0,
            include_in_fee: true,
            items: [
              {
                name: '컨셉 기획',
                sort_order: 0,
                include_in_fee: true,
                details: [
                  { name: '컨셉 설계', description: '', quantity: 1, days: 3, unit: '식', unit_price: 300000, is_service: true, cost_price: 0, supplier_name_snapshot: '' }
                ]
              },
              {
                name: '스토리보드 제작',
                sort_order: 1,
                include_in_fee: true,
                details: [
                  { name: '스토리보드 작성', description: '', quantity: 1, days: 2, unit: '식', unit_price: 400000, is_service: true, cost_price: 0, supplier_name_snapshot: '' }
                ]
              }
            ]
          },
          {
            name: '촬영',
            sort_order: 1,
            include_in_fee: true,
            items: [
              {
                name: '메인 촬영',
                sort_order: 0,
                include_in_fee: true,
                details: [
                  { name: '현장 촬영', description: '', quantity: 1, days: 2, unit: '일', unit_price: 500000, is_service: false, cost_price: 200000, supplier_name_snapshot: '' }
                ]
              }
            ]
          },
          {
            name: '편집/후반작업',
            sort_order: 2,
            include_in_fee: true,
            items: [
              {
                name: '영상 편집',
                sort_order: 0,
                include_in_fee: true,
                details: [
                  { name: '컷 편집', description: '', quantity: 1, days: 5, unit: '분', unit_price: 80000, is_service: true, cost_price: 0, supplier_name_snapshot: '' },
                  { name: '컬러 그레이딩', description: '', quantity: 1, days: 2, unit: '분', unit_price: 50000, is_service: true, cost_price: 0, supplier_name_snapshot: '' }
                ]
              }
            ]
          }
        ];
      } else if (template.id === '2') { // 제품 촬영 패키지
        templateGroups = [
          {
            name: '제품 촬영',
            sort_order: 0,
            include_in_fee: true,
            items: [
              {
                name: '제품 사진 촬영',
                sort_order: 0,
                include_in_fee: true,
                details: [
                  { name: '스튜디오 촬영', description: '', quantity: 20, days: 1, unit: '컷', unit_price: 15000, is_service: false, cost_price: 5000, supplier_name_snapshot: '' }
                ]
              }
            ]
          }
        ];
      } else if (template.id === '3') { // 인포그래픽 제작
        templateGroups = [
          {
            name: '컨셉 디자인',
            sort_order: 0,
            include_in_fee: true,
            items: [
              {
                name: '컨셉 설계',
                sort_order: 0,
                include_in_fee: true,
                details: [
                  { name: '컨셉 기획', description: '', quantity: 1, days: 2, unit: '식', unit_price: 200000, is_service: true, cost_price: 0, supplier_name_snapshot: '' }
                ]
              }
            ]
          },
          {
            name: '인포그래픽 제작',
            sort_order: 1,
            include_in_fee: true,
            items: [
              {
                name: '인포그래픽 디자인',
                sort_order: 0,
                include_in_fee: true,
                details: [
                  { name: '인포그래픽 제작', description: '', quantity: 5, days: 1, unit: '개', unit_price: 150000, is_service: true, cost_price: 0, supplier_name_snapshot: '' }
                ]
              }
            ]
          }
        ];
      } else if (template.id === '4') { // 웹사이트 개발
        templateGroups = [
          {
            name: '기획/설계',
            sort_order: 0,
            include_in_fee: true,
            items: [
              {
                name: '사이트 기획',
                sort_order: 0,
                include_in_fee: true,
                details: [
                  { name: '웹 개발', description: '', quantity: 10, days: 1, unit: '페이지', unit_price: 500000, is_service: true, cost_price: 0, supplier_name_snapshot: '' }
                ]
              }
            ]
          }
        ];
      }
      
      setFormData(prev => ({
        ...prev,
        groups: templateGroups,
        project_title: template.name + ' 프로젝트'
      }));
      
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

  // 더미 마스터 품목 데이터 로드
  useEffect(() => {
    const dummyMasterItems: MasterItem[] = [
      {
        id: '1',
        name: '2D 모션그래픽 제작',
        category: '영상편집',
        description: '2D 애니메이션 및 모션그래픽 제작',
        default_unit: '초',
        default_unit_price: 50000,
        is_active: true
      },
      {
        id: '2',
        name: '3D 모델링',
        category: '3D제작',
        description: '3D 모델 제작 및 렌더링',
        default_unit: '개',
        default_unit_price: 200000,
        is_active: true
      },
      {
        id: '3',
        name: '영상 편집',
        category: '영상편집',
        description: '컷 편집, 컬러 그레이딩 포함',
        default_unit: '분',
        default_unit_price: 80000,
        is_active: true
      },
      {
        id: '4',
        name: '사운드 디자인',
        category: '오디오',
        description: 'BGM, 효과음 제작 및 믹싱',
        default_unit: '분',
        default_unit_price: 30000,
        is_active: true
      },
      {
        id: '5',
        name: '현장 촬영',
        category: '촬영',
        description: '카메라, 조명 장비 포함',
        default_unit: '일',
        default_unit_price: 500000,
        is_active: true
      },
      {
        id: '6',
        name: '스튜디오 촬영',
        category: '촬영',
        description: '스튜디오 대여 및 촬영',
        default_unit: '일',
        default_unit_price: 300000,
        is_active: true
      },
      {
        id: '7',
        name: '인포그래픽 제작',
        category: '그래픽디자인',
        description: '정보 시각화 및 인포그래픽',
        default_unit: '개',
        default_unit_price: 150000,
        is_active: true
      },
      {
        id: '8',
        name: '웹 개발',
        category: '개발',
        description: '웹사이트 개발 및 구축',
        default_unit: '페이지',
        default_unit_price: 500000,
        is_active: true
      }
    ];
    
    setMasterItems(dummyMasterItems);
  }, []);

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