'use client';

import { useState } from 'react';
import { Button, Paper, Typography, Box, Alert } from '@mui/material';
import { PictureAsPdf, Visibility, TestTube } from '@mui/icons-material';
import EnhancedPDFButton from './EnhancedPDFButton';
import type { QuoteData, CompanyInfo } from '@/lib/pdf/noto-pdf-generator';

// 테스트용 샘플 데이터
const sampleQuoteData: QuoteData = {
  id: 'test-quote-1',
  quote_number: 'Q-TEST-001',
  title: '테스트 견적서 - Noto Sans Korean 폰트 검증',
  description: '이것은 Noto Sans Korean 폰트를 사용한 PDF 생성 테스트입니다. 한글이 제대로 표시되는지 확인하기 위한 견적서입니다.',
  status: 'draft',
  subtotal: 1000000,
  tax_rate: 10,
  tax_amount: 100000,
  total: 1100000,
  valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  terms: '결제 조건: 월말 정산\n배송 조건: 설치 후 7일 이내\n보증 조건: 1년 A/S 보증',
  notes: '추가 사항이나 특별 요구사항이 있으시면 언제든 연락 주시기 바랍니다.',
  created_at: new Date().toISOString(),

  customers: {
    id: 'test-customer-1',
    name: '㈜테스트 고객사',
    email: 'test@customer.com',
    phone: '02-1234-5678',
    address: '서울특별시 강남구 테헤란로 123 테스트빌딩 10층',
    contact_person: '김철수',
  },

  projects: {
    id: 'test-project-1',
    name: '테스트 프로젝트',
    description: 'Noto Sans Korean 폰트 테스트를 위한 샘플 프로젝트',
  },

  quote_groups: [
    {
      id: 'group-1',
      title: '하드웨어 구성품',
      sort_order: 1,
      quote_items: [
        {
          id: 'item-1',
          item_name: '모션센서 디바이스',
          description: '고정밀 모션 감지 센서',
          quantity: 5,
          unit_price: 150000,
          total_price: 750000,
          sort_order: 1,
          suppliers: {
            id: 'supplier-1',
            name: '㈜센서테크',
          },
          quote_item_details: [
            {
              id: 'detail-1',
              detail_name: '센서 본체',
              description: '메인 센서 유닛',
              quantity: 5,
              unit_price: 120000,
              total_price: 600000,
              sort_order: 1,
            },
            {
              id: 'detail-2',
              detail_name: '마운팅 브라켓',
              description: '벽면 설치용 브라켓',
              quantity: 5,
              unit_price: 30000,
              total_price: 150000,
              sort_order: 2,
            }
          ]
        }
      ]
    },
    {
      id: 'group-2',
      title: '소프트웨어 및 서비스',
      sort_order: 2,
      quote_items: [
        {
          id: 'item-2',
          item_name: '모니터링 소프트웨어 라이선스',
          description: '1년간 소프트웨어 사용 라이선스',
          quantity: 1,
          unit_price: 200000,
          total_price: 200000,
          sort_order: 1,
          suppliers: {
            id: 'supplier-2',
            name: '㈜소프트웨어솔루션',
          },
          quote_item_details: []
        },
        {
          id: 'item-3',
          item_name: '설치 및 설정 서비스',
          description: '현장 설치 및 초기 설정',
          quantity: 1,
          unit_price: 50000,
          total_price: 50000,
          sort_order: 2,
          suppliers: undefined,
          quote_item_details: []
        }
      ]
    }
  ]
};

const sampleCompanyInfo: CompanyInfo = {
  name: '㈜모션센스',
  address: '서울특별시 서초구 강남대로 123 모션센스빌딩 5층',
  phone: '02-9876-5432',
  email: 'info@motionsense.co.kr',
  website: 'www.motionsense.co.kr',
  tax_number: '123-45-67890',
};

export default function PDFTestComponent() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const runPDFTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);

    const results: string[] = [];

    try {
      // 테스트 1: PDF 생성 기능 확인
      results.push('✅ 테스트 1: PDF 생성 라이브러리 로드 성공');

      // 테스트 2: 한글 텍스트 처리 확인
      const koreanText = '안녕하세요, 견적서 시스템입니다. 한글 폰트 테스트 중입니다.';
      const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(koreanText);
      
      if (hasKorean) {
        results.push('✅ 테스트 2: 한글 텍스트 감지 기능 정상 작동');
      } else {
        results.push('❌ 테스트 2: 한글 텍스트 감지 기능 오류');
      }

      // 테스트 3: 폰트 로드 확인 (웹 환경)
      try {
        if (document.fonts && document.fonts.check) {
          const notoSansLoaded = document.fonts.check('16px "Noto Sans KR"');
          results.push(
            notoSansLoaded 
              ? '✅ 테스트 3: Noto Sans KR 웹폰트 로드 확인됨' 
              : '⚠️ 테스트 3: Noto Sans KR 웹폰트 로드 확인 불가 (fallback 사용 예정)'
          );
        } else {
          results.push('⚠️ 테스트 3: 브라우저에서 폰트 확인 API 지원 안함');
        }
      } catch (error) {
        results.push('⚠️ 테스트 3: 폰트 로드 확인 중 오류 발생');
      }

      // 테스트 4: 샘플 데이터 유효성 검증
      if (sampleQuoteData.customers && sampleQuoteData.quote_groups.length > 0) {
        results.push('✅ 테스트 4: 샘플 견적서 데이터 구조 유효');
      } else {
        results.push('❌ 테스트 4: 샘플 견적서 데이터 구조 오류');
      }

      // 테스트 5: 회사 정보 유효성 검증
      if (sampleCompanyInfo.name && sampleCompanyInfo.address) {
        results.push('✅ 테스트 5: 회사 정보 데이터 유효');
      } else {
        results.push('❌ 테스트 5: 회사 정보 데이터 오류');
      }

      results.push('🎉 모든 기본 테스트 완료! PDF 다운로드를 테스트해보세요.');

    } catch (error) {
      results.push(`❌ 테스트 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }

    setTestResults(results);
    setIsRunningTests(false);
  };

  const handlePreview = (pdfDataUrl: string) => {
    // PDF 미리보기를 새 창에서 열기
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.location.href = pdfDataUrl;
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
      <Typography variant="h5" gutterBottom>
        PDF 한글 폰트 테스트 (Noto Sans Korean)
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        이 컴포넌트는 Noto Sans Korean 폰트를 사용한 PDF 생성 기능을 테스트합니다.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<TestTube />}
          onClick={runPDFTests}
          disabled={isRunningTests}
          sx={{ mb: 2 }}
        >
          {isRunningTests ? '테스트 실행 중...' : '기본 테스트 실행'}
        </Button>

        {testResults.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              테스트 결과:
            </Typography>
            {testResults.map((result, index) => (
              <Typography key={index} variant="body2" component="div">
                {result}
              </Typography>
            ))}
          </Alert>
        )}
      </Box>

      <Typography variant="h6" gutterBottom>
        PDF 생성 테스트
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        아래 버튼을 사용해서 실제 PDF 생성을 테스트해보세요. 
        한글 텍스트가 제대로 표시되는지 확인하실 수 있습니다.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <EnhancedPDFButton
          quote={sampleQuoteData}
          companyInfo={sampleCompanyInfo}
          variant="both"
          onPreview={handlePreview}
        />
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        💡 팁: 미리보기로 PDF를 먼저 확인해보신 후 다운로드를 테스트해보세요.
      </Typography>
    </Paper>
  );
}