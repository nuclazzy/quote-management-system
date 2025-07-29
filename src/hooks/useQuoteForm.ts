'use client'

import { useState, useCallback, useEffect } from 'react'
import { QuoteFormData, QuoteCalculation } from '@/types'
import { QuoteService } from '@/lib/services/quote-service'

const defaultFormData: QuoteFormData = {
  quote_number: '',
  project_title: '',
  customer_id: '',
  customer_name_snapshot: '',
  issue_date: new Date().toISOString().split('T')[0],
  status: 'draft',
  vat_type: 'exclusive',
  discount_amount: 0,
  agency_fee_rate: 10,
  notes: '',
  groups: []
}

const defaultGroup = {
  name: '기본 그룹',
  sort_order: 0,
  include_in_fee: true,
  items: []
}

const defaultItem = {
  name: '기본 품목',
  sort_order: 0,
  include_in_fee: true,
  details: []
}

const defaultDetail = {
  name: '',
  description: '',
  quantity: 1,
  days: 1,
  unit: 'EA',
  unit_price: 0,
  is_service: false,
  cost_price: 0,
  supplier_id: '',
  supplier_name_snapshot: ''
}

export function useQuoteForm(initialData?: Partial<QuoteFormData>) {
  const [formData, setFormData] = useState<QuoteFormData>({
    ...defaultFormData,
    ...initialData
  })
  const [calculation, setCalculation] = useState<QuoteCalculation | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)

  // 자동 계산 (디바운스 적용)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // 최신 비즈니스 로직으로 계산
      const calc = QuoteService.calculateQuote(formData)
      setCalculation(calc)
    }, 150) // 150ms 디바운스

    return () => clearTimeout(timeoutId)
  }, [formData])

  // 자동 저장 (임시저장)
  useEffect(() => {
    if (!isDirty) return

    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
    }

    const timer = setTimeout(() => {
      handleAutoSave()
    }, 5000) // 5초 후 자동 저장

    setAutoSaveTimer(timer)

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [formData, isDirty])

  const handleAutoSave = useCallback(async () => {
    if (formData.quote_number && isDirty) {
      try {
        // 임시저장 로직 (status가 draft인 경우만)
        if (formData.status === 'draft') {
          console.log('자동 저장 실행...')
          // 실제 저장 로직은 여기에 구현
        }
      } catch (error) {
        console.error('자동 저장 실패:', error)
      }
    }
  }, [formData, isDirty])

  const updateFormData = useCallback((updates: Partial<QuoteFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    setIsDirty(true)
    setErrors({})
  }, [])

  const addGroup = useCallback(() => {
    const newGroup = {
      ...defaultGroup,
      id: `temp-group-${Date.now()}`,
      sort_order: formData.groups.length,
      items: []
    }
    updateFormData({
      groups: [...formData.groups, newGroup]
    })
  }, [formData.groups, updateFormData])

  const updateGroup = useCallback((groupIndex: number, updates: any) => {
    const newGroups = [...formData.groups]
    newGroups[groupIndex] = { ...newGroups[groupIndex], ...updates }
    updateFormData({ groups: newGroups })
  }, [formData.groups, updateFormData])

  const removeGroup = useCallback((groupIndex: number) => {
    const newGroups = formData.groups.filter((_, index) => index !== groupIndex)
    updateFormData({ groups: newGroups })
  }, [formData.groups, updateFormData])

  const addItem = useCallback((groupIndex: number) => {
    const newGroups = [...formData.groups]
    const newItem = {
      ...defaultItem,
      id: `temp-item-${Date.now()}`,
      sort_order: newGroups[groupIndex].items.length,
      details: []
    }
    newGroups[groupIndex].items.push(newItem)
    updateFormData({ groups: newGroups })
  }, [formData.groups, updateFormData])

  const updateItem = useCallback((groupIndex: number, itemIndex: number, updates: any) => {
    const newGroups = [...formData.groups]
    newGroups[groupIndex].items[itemIndex] = { 
      ...newGroups[groupIndex].items[itemIndex], 
      ...updates 
    }
    updateFormData({ groups: newGroups })
  }, [formData.groups, updateFormData])

  const removeItem = useCallback((groupIndex: number, itemIndex: number) => {
    const newGroups = [...formData.groups]
    newGroups[groupIndex].items = newGroups[groupIndex].items.filter((_, index) => index !== itemIndex)
    updateFormData({ groups: newGroups })
  }, [formData.groups, updateFormData])

  const addDetail = useCallback((groupIndex: number, itemIndex: number) => {
    const newGroups = [...formData.groups]
    const newDetail = {
      ...defaultDetail,
      id: `temp-detail-${Date.now()}`
    }
    newGroups[groupIndex].items[itemIndex].details.push(newDetail)
    updateFormData({ groups: newGroups })
  }, [formData.groups, updateFormData])

  const updateDetail = useCallback((
    groupIndex: number, 
    itemIndex: number, 
    detailIndex: number, 
    updates: any
  ) => {
    const newGroups = [...formData.groups]
    newGroups[groupIndex].items[itemIndex].details[detailIndex] = {
      ...newGroups[groupIndex].items[itemIndex].details[detailIndex],
      ...updates
    }
    updateFormData({ groups: newGroups })
  }, [formData.groups, updateFormData])

  const removeDetail = useCallback((
    groupIndex: number, 
    itemIndex: number, 
    detailIndex: number
  ) => {
    const newGroups = [...formData.groups]
    newGroups[groupIndex].items[itemIndex].details = 
      newGroups[groupIndex].items[itemIndex].details.filter((_, index) => index !== detailIndex)
    updateFormData({ groups: newGroups })
  }, [formData.groups, updateFormData])

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.project_title.trim()) {
      newErrors.project_title = '프로젝트명을 입력해주세요.'
    }

    if (!formData.customer_name_snapshot.trim()) {
      newErrors.customer_name_snapshot = '고객사명을 입력해주세요.'
    }

    if (!formData.issue_date) {
      newErrors.issue_date = '발행일을 선택해주세요.'
    }

    if (formData.groups.length === 0) {
      newErrors.groups = '최소 하나의 그룹을 추가해주세요.'
    } else {
      let hasDetails = false
      formData.groups.forEach(group => {
        group.items.forEach(item => {
          if (item.details.length > 0) {
            hasDetails = true
          }
        })
      })
      if (!hasDetails) {
        newErrors.details = '최소 하나의 세부내용을 추가해주세요.'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const resetForm = useCallback(() => {
    setFormData(defaultFormData)
    setIsDirty(false)
    setErrors({})
  }, [])

  const loadTemplate = useCallback((templateData: any) => {
    const newFormData = {
      ...formData,
      groups: templateData.groups || []
    }
    updateFormData(newFormData)
  }, [formData, updateFormData])

  return {
    formData,
    calculation,
    isDirty,
    errors,
    updateFormData,
    addGroup,
    updateGroup,
    removeGroup,
    addItem,
    updateItem,
    removeItem,
    addDetail,
    updateDetail,
    removeDetail,
    validateForm,
    resetForm,
    loadTemplate
  }
}