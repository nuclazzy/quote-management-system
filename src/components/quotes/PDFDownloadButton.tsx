'use client'

import { useState } from 'react'

interface PDFDownloadButtonProps {
  quoteId: string
  quoteNumber: string
  variant?: 'contained' | 'outlined' | 'text'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  className?: string
}

export default function PDFDownloadButton({
  quoteId,
  quoteNumber,
  variant = 'contained',
  size = 'medium',
  disabled = false,
  className = ''
}: PDFDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (isDownloading) return
    
    setIsDownloading(true)
    
    try {
      const response = await fetch(`/api/quotes/${quoteId}/pdf`, {
        method: 'GET',
        headers: {
          'Accept': 'text/html',
        },
      })

      if (!response.ok) {
        throw new Error('PDF 생성에 실패했습니다.')
      }

      // HTML 컨텐츠를 받아서 새 창에서 인쇄
      const htmlContent = await response.text()
      
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error('팝업이 차단되었습니다. 팝업을 허용해 주세요.')
      }
      
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      
      // 이미지 로드 대기 후 인쇄
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
          // 인쇄 후 창 닫기는 사용자가 결정하도록 함
        }, 500)
      }
      
    } catch (error) {
      console.error('PDF 다운로드 실패:', error)
      alert(error instanceof Error ? error.message : 'PDF 다운로드에 실패했습니다.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={disabled || isDownloading}
      style={{
        padding: '8px 16px',
        backgroundColor: isDownloading ? '#666' : '#1976d2',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: (disabled || isDownloading) ? 'not-allowed' : 'pointer',
        opacity: (disabled || isDownloading) ? 0.6 : 1,
        minWidth: '120px'
      }}
    >
      {isDownloading ? '생성 중...' : 'PDF 다운로드'}
    </button>
  )
}

// PDF 미리보기 버튼 컴포넌트
interface PDFPreviewButtonProps {
  quoteId: string
  quoteNumber: string
  onPreview?: (pdfBase64: string) => void
  variant?: 'contained' | 'outlined' | 'text'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  className?: string
}

export function PDFPreviewButton({
  quoteId,
  quoteNumber,
  onPreview,
  variant = 'outlined',
  size = 'medium',
  disabled = false,
  className = ''
}: PDFPreviewButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handlePreview = async () => {
    if (isGenerating) return
    
    setIsGenerating(true)
    
    try {
      const response = await fetch(`/api/quotes/${quoteId}/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preview: true })
      })

      if (!response.ok) {
        throw new Error('PDF 미리보기 생성에 실패했습니다.')
      }

      const result = await response.json()
      
      if (result.success && result.data?.html) {
        // HTML 미리보기 처리
        if (onPreview) {
          onPreview(result.data.html)
        } else {
          // 기본 동작: 새 창에서 HTML 미리보기 열기
          const previewWindow = window.open('', '_blank')
          if (!previewWindow) {
            throw new Error('팝업이 차단되었습니다. 팝업을 허용해 주세요.')
          }
          
          previewWindow.document.write(result.data.html)
          previewWindow.document.close()
        }
      } else {
        throw new Error('미리보기 데이터를 받지 못했습니다.')
      }
      
    } catch (error) {
      console.error('PDF 미리보기 실패:', error)
      alert(error instanceof Error ? error.message : 'PDF 미리보기에 실패했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button
      onClick={handlePreview}
      disabled={disabled || isGenerating}
      style={{
        padding: '8px 16px',
        backgroundColor: 'white',
        color: isGenerating ? '#666' : '#1976d2',
        border: `1px solid ${isGenerating ? '#666' : '#1976d2'}`,
        borderRadius: '4px',
        cursor: (disabled || isGenerating) ? 'not-allowed' : 'pointer',
        opacity: (disabled || isGenerating) ? 0.6 : 1,
        minWidth: '100px'
      }}
    >
      {isGenerating ? '생성 중...' : '미리보기'}
    </button>
  )
}