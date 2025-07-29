import { useEffect, useRef, useCallback } from 'react'
import { debounce } from '@/utils/validation'

interface AutoSaveOptions {
  data: any
  onSave: (data: any) => Promise<void>
  enabled?: boolean
  delay?: number
  key?: string
}

export function useAutoSave({
  data,
  onSave,
  enabled = true,
  delay = 3000,
  key = 'autosave'
}: AutoSaveOptions) {
  const previousDataRef = useRef<any>()
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const isSavingRef = useRef(false)

  // 디바운스된 저장 함수
  const debouncedSave = useCallback(
    debounce(async (dataToSave: any) => {
      if (!enabled || isSavingRef.current) return
      
      try {
        isSavingRef.current = true
        await onSave(dataToSave)
        
        // 로컬 스토리지에서 임시 저장 데이터 제거
        localStorage.removeItem(`${key}_temp`)
      } catch (error) {
        console.error('Auto save failed:', error)
        
        // 실패한 경우 로컬 스토리지에 임시 저장
        localStorage.setItem(`${key}_temp`, JSON.stringify(dataToSave))
      } finally {
        isSavingRef.current = false
      }
    }, delay),
    [onSave, enabled, delay, key]
  )

  // 데이터 변경 감지 및 자동 저장 트리거
  useEffect(() => {
    if (!enabled) return

    const currentData = JSON.stringify(data)
    const previousData = JSON.stringify(previousDataRef.current)

    if (currentData !== previousData && previousDataRef.current !== undefined) {
      // 로컬 스토리지에 임시 저장
      localStorage.setItem(`${key}_temp`, currentData)
      
      // 디바운스된 저장 실행
      debouncedSave(data)
    }

    previousDataRef.current = data
  }, [data, enabled, debouncedSave, key])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // 임시 저장된 데이터 복구
  const recoverTempData = useCallback(() => {
    const tempData = localStorage.getItem(`${key}_temp`)
    if (tempData) {
      try {
        return JSON.parse(tempData)
      } catch (error) {
        console.error('Failed to parse temp data:', error)
        localStorage.removeItem(`${key}_temp`)
      }
    }
    return null
  }, [key])

  // 임시 저장 데이터 삭제
  const clearTempData = useCallback(() => {
    localStorage.removeItem(`${key}_temp`)
  }, [key])

  // 수동 저장
  const forceSave = useCallback(async () => {
    if (!enabled || isSavingRef.current) return false
    
    try {
      isSavingRef.current = true
      await onSave(data)
      clearTempData()
      return true
    } catch (error) {
      console.error('Force save failed:', error)
      return false
    } finally {
      isSavingRef.current = false
    }
  }, [data, onSave, enabled, clearTempData])

  return {
    recoverTempData,
    clearTempData,
    forceSave,
    isSaving: isSavingRef.current
  }
}