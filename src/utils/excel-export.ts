/**
 * Excel/CSV 내보내기 유틸리티
 */

import type { Quote } from '@/types';

/**
 * 견적서 목록을 CSV로 변환
 */
export function quotesToCSV(quotes: Quote[]): string {
  // CSV 헤더
  const headers = [
    '견적번호',
    '프로젝트명',
    '고객사',
    '총액',
    '상태',
    '발행일',
    '유효기간',
    '작성일',
  ];

  // 상태 텍스트 변환
  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return '임시저장';
      case 'sent': return '발송됨';
      case 'accepted': return '수주확정';
      case 'rejected': return '거절됨';
      case 'expired': return '만료됨';
      default: return status;
    }
  };

  // CSV 행 생성
  const rows = quotes.map(quote => [
    quote.quote_number || '',
    quote.project_title || '',
    quote.customer_name_snapshot || '',
    quote.total_amount ? quote.total_amount.toLocaleString() : '0',
    getStatusText(quote.status),
    quote.issue_date || '',
    quote.valid_until || '',
    new Date(quote.created_at).toLocaleDateString('ko-KR'),
  ]);

  // CSV 문자열 생성
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  // BOM 추가 (Excel에서 한글 깨짐 방지)
  return '\uFEFF' + csvContent;
}

/**
 * CSV 파일 다운로드
 */
export function downloadCSV(csvContent: string, filename: string = 'quotes.csv'): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 견적서 목록 Excel 내보내기
 * CSV 형식으로 내보내지만 Excel에서 열 수 있음
 */
export function exportQuotesToExcel(quotes: Quote[]): void {
  const csvContent = quotesToCSV(quotes);
  const filename = `견적서_목록_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, filename);
}

/**
 * 선택된 견적서만 내보내기
 */
export function exportSelectedQuotesToExcel(quotes: Quote[], selectedIds: string[]): void {
  const selectedQuotes = quotes.filter(quote => selectedIds.includes(quote.id));
  exportQuotesToExcel(selectedQuotes);
}