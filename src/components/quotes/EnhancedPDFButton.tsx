'use client';

import { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { PictureAsPdf, Visibility } from '@mui/icons-material';
import { 
  NotoSansKoreanPDFGenerator, 
  type QuoteData, 
  type CompanyInfo 
} from '@/lib/pdf/noto-pdf-generator';

interface EnhancedPDFButtonProps {
  quote: QuoteData;
  companyInfo: CompanyInfo;
  variant?: 'download' | 'preview' | 'both';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onPreview?: (pdfDataUrl: string) => void;
}

export default function EnhancedPDFButton({
  quote,
  companyInfo,
  variant = 'download',
  size = 'medium',
  disabled = false,
  onPreview,
}: EnhancedPDFButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const handleDownload = async () => {
    if (isDownloading) return;

    setIsDownloading(true);

    try {
      const generator = new NotoSansKoreanPDFGenerator(companyInfo);
      
      // PDF 다운로드
      generator.download(quote, `견적서_${quote.quote_number}.pdf`);
      
      console.log('PDF 다운로드 완료:', quote.quote_number);
    } catch (error) {
      console.error('PDF 다운로드 실패:', error);
      alert(
        error instanceof Error 
          ? `PDF 다운로드 실패: ${error.message}` 
          : 'PDF 다운로드에 실패했습니다.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreview = async () => {
    if (isGeneratingPreview) return;

    setIsGeneratingPreview(true);

    try {
      const generator = new NotoSansKoreanPDFGenerator(companyInfo);
      
      // PDF 미리보기 생성
      const pdfDataUrl = generator.generateDataUrl(quote);
      
      if (onPreview) {
        onPreview(pdfDataUrl);
      } else {
        // 기본 동작: 새 창에서 PDF 미리보기 열기
        const previewWindow = window.open('', '_blank');
        if (!previewWindow) {
          throw new Error('팝업이 차단되었습니다. 팝업을 허용해 주세요.');
        }

        previewWindow.location.href = pdfDataUrl;
      }
      
      console.log('PDF 미리보기 생성 완료:', quote.quote_number);
    } catch (error) {
      console.error('PDF 미리보기 실패:', error);
      alert(
        error instanceof Error 
          ? `PDF 미리보기 실패: ${error.message}` 
          : 'PDF 미리보기에 실패했습니다.'
      );
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  if (variant === 'both') {
    return (
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button
          variant="outlined"
          size={size}
          disabled={disabled || isGeneratingPreview}
          onClick={handlePreview}
          startIcon={
            isGeneratingPreview ? (
              <CircularProgress size={16} />
            ) : (
              <Visibility />
            )
          }
        >
          {isGeneratingPreview ? '생성 중...' : '미리보기'}
        </Button>
        
        <Button
          variant="contained"
          size={size}
          disabled={disabled || isDownloading}
          onClick={handleDownload}
          startIcon={
            isDownloading ? (
              <CircularProgress size={16} />
            ) : (
              <PictureAsPdf />
            )
          }
        >
          {isDownloading ? '다운로드 중...' : 'PDF 다운로드'}
        </Button>
      </div>
    );
  }

  if (variant === 'preview') {
    return (
      <Button
        variant="outlined"
        size={size}
        disabled={disabled || isGeneratingPreview}
        onClick={handlePreview}
        startIcon={
          isGeneratingPreview ? (
            <CircularProgress size={16} />
          ) : (
            <Visibility />
          )
        }
      >
        {isGeneratingPreview ? '생성 중...' : 'PDF 미리보기'}
      </Button>
    );
  }

  // Default: download button
  return (
    <Button
      variant="contained"
      size={size}
      disabled={disabled || isDownloading}
      onClick={handleDownload}
      startIcon={
        isDownloading ? (
          <CircularProgress size={16} />
        ) : (
          <PictureAsPdf />
        )
      }
    >
      {isDownloading ? '다운로드 중...' : 'PDF 다운로드'}
    </Button>
  );
}

// PDF 생성 상태를 확인하는 유틸리티 훅
export function usePDFGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePDF = async (
    quote: QuoteData, 
    companyInfo: CompanyInfo,
    action: 'download' | 'preview' = 'download'
  ) => {
    setIsGenerating(true);
    setError(null);

    try {
      const generator = new NotoSansKoreanPDFGenerator(companyInfo);
      
      if (action === 'download') {
        generator.download(quote, `견적서_${quote.quote_number}.pdf`);
        return null;
      } else {
        return generator.generateDataUrl(quote);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'PDF 생성 실패';
      setError(errorMessage);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    error,
    generatePDF,
  };
}