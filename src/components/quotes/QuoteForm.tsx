'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Alert,
} from '@mui/material'
import { useQuoteForm } from '@/hooks/useQuoteForm'
import { QuoteService } from '@/lib/services/quote-service'
import { Customer } from '@/types'
import QuoteFormHeader from './QuoteFormHeader'
import QuoteBasicInfo from './QuoteBasicInfo'
import QuoteItemsManager from './QuoteItemsManager'
import QuoteCalculationSummary from './QuoteCalculationSummary'
import QuoteFormActions from './QuoteFormActions'
import QuoteExitDialog from './QuoteExitDialog'

interface QuoteFormProps {
  initialData?: any
  isEdit?: boolean
  onSave?: (id: string) => void
  onCancel?: () => void
}

const QuoteForm = React.memo(function QuoteForm({ 
  initialData, 
  isEdit = false, 
  onSave, 
  onCancel 
}: QuoteFormProps) {
  const {
    formData,
    calculation,
    isDirty,
    errors,
    updateFormData,
    addGroup,
    updateGroup,
    removeGroup,
    validateForm,
    resetForm,
  } = useQuoteForm(initialData)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [showCostPrice, setShowCostPrice] = useState(false)

  // 고객사 목록 로드
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const customerList = await QuoteService.getCustomers()
        setCustomers(customerList)
      } catch (error) {
        console.error('고객사 목록 로드 실패:', error)
      }
    }
    loadCustomers()
  }, [])

  // 고객사 선택 시 고객사명 스냅샷 업데이트
  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId)
    updateFormData({
      customer_id: customerId,
      customer_name_snapshot: customer?.name || ''
    })
  }

  // 저장
  const handleSave = async (status: 'draft' | 'sent') => {
    if (!validateForm()) {
      return
    }

    setSaving(true)
    try {
      const dataToSave = {
        ...formData,
        status: status || formData.status
      }

      let quoteId: string
      if (isEdit && initialData?.id) {
        quoteId = await QuoteService.updateQuote(initialData.id, dataToSave)
      } else {
        quoteId = await QuoteService.createQuote(dataToSave)
      }

      onSave?.(quoteId)
    } catch (error) {
      console.error('저장 실패:', error)
      alert(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 페이지 이탈 방지
  const handleCancel = () => {
    if (isDirty) {
      setShowExitDialog(true)
    } else {
      onCancel?.()
    }
  }

  const confirmExit = () => {
    setShowExitDialog(false)
    onCancel?.()
  }

  return (
    <Box>
      {/* 헤더 */}
      <QuoteFormHeader
        isEdit={isEdit}
        showCostPrice={showCostPrice}
        onToggleCostPrice={setShowCostPrice}
        isDirty={isDirty}
      />

      {/* 에러 메시지 */}
      {Object.keys(errors).length > 0 && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3,
            borderRadius: 2,
            '& .MuiAlert-message': {
              fontSize: '0.875rem',
            },
          }}
          role="alert"
          aria-live="polite"
        >
          {Object.values(errors)[0]}
        </Alert>
      )}

      {/* 기본 정보 */}
      <QuoteBasicInfo
        formData={formData}
        customers={customers}
        errors={errors}
        onUpdate={updateFormData}
        onCustomerChange={handleCustomerChange}
      />

      {/* 견적 내용 */}
      <QuoteItemsManager
        groups={formData.groups}
        showCostPrice={showCostPrice}
        onAddGroup={addGroup}
        onUpdateGroup={updateGroup}
        onRemoveGroup={removeGroup}
      />

      {/* 계산 요약 */}
      {calculation && (
        <QuoteCalculationSummary 
          calculation={calculation}
          formData={formData}
        />
      )}

      {/* 액션 버튼 */}
      <QuoteFormActions
        saving={saving}
        onCancel={handleCancel}
        onSave={handleSave}
        onSaveAndSend={handleSave}
        isEdit={isEdit}
      />

      {/* 페이지 이탈 확인 다이얼로그 */}
      <QuoteExitDialog
        open={showExitDialog}
        onClose={() => setShowExitDialog(false)}
        onConfirm={confirmExit}
        isEdit={isEdit}
      />
    </Box>
  )
})

export default QuoteForm