// 모션센스 견적서용 브라우저 기반 PDF 생성기
import { MotionsenseQuote, QuoteGroup, QuoteItem, QuoteDetail, QuoteCalculation } from '@/types/motionsense-quote';

export interface MotionsenseQuoteWithCalculation extends MotionsenseQuote {
  calculation: QuoteCalculation;
}

export interface CompanyInfo {
  name: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_number?: string;
  bank_info?: any;
}

export class MotionsensePDFGenerator {
  private companyInfo: CompanyInfo;

  constructor(companyInfo: CompanyInfo) {
    this.companyInfo = companyInfo;
  }

  // 통화 포맷팅
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // 숫자 포맷팅
  private formatNumber(num: number): string {
    return new Intl.NumberFormat('ko-KR').format(num);
  }

  // 날짜 포맷팅
  private formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('ko-KR');
    } catch {
      return dateString;
    }
  }

  // HTML 생성
  private generateHTML(quote: MotionsenseQuoteWithCalculation): string {
    const groups = quote.groups.sort((a, b) => a.sort_order - b.sort_order);

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>견적서 - ${quote.quote_number || 'MS-' + Date.now()}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
        
        @media print {
            @page {
                margin: 20mm;
                size: A4;
            }
            body {
                margin: 0;
                padding: 0;
                font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #333;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
        
        body {
            font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fff;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            border-bottom: 3px solid #1976d2;
            padding-bottom: 20px;
        }
        
        .logo-section {
            flex: 1;
        }
        
        .logo-section img {
            max-height: 60px;
            max-width: 200px;
        }
        
        .company-info {
            text-align: right;
            font-size: 11px;
            flex: 1;
        }
        
        .company-name {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 8px;
            color: #1976d2;
        }
        
        .company-detail {
            margin: 2px 0;
            color: #666;
        }
        
        .quote-title {
            text-align: center;
            font-size: 28px;
            font-weight: 700;
            margin: 25px 0;
            color: #1976d2;
            letter-spacing: 2px;
        }
        
        .quote-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 25px;
            font-size: 11px;
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
        }
        
        .meta-item {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .meta-label {
            font-weight: 500;
            color: #666;
            margin-bottom: 4px;
        }
        
        .meta-value {
            font-weight: 700;
            font-size: 12px;
            color: #333;
        }
        
        .customer-info {
            margin-bottom: 25px;
            padding: 20px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 10px;
            border: 1px solid #dee2e6;
        }
        
        .customer-info h3 {
            margin: 0 0 15px 0;
            font-size: 16px;
            font-weight: 700;
            color: #1976d2;
            border-bottom: 2px solid #1976d2;
            padding-bottom: 8px;
        }
        
        .customer-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 10px;
        }
        
        .customer-detail {
            display: flex;
            align-items: center;
        }
        
        .customer-label {
            font-weight: 500;
            color: #666;
            margin-right: 8px;
            min-width: 60px;
        }
        
        .customer-value {
            font-weight: 400;
            color: #333;
        }
        
        .quote-info {
            margin-bottom: 25px;
            padding: 15px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
        }
        
        .quote-info h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
            font-weight: 700;
            color: #333;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            font-size: 11px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .items-table th,
        .items-table td {
            border: 1px solid #dee2e6;
            padding: 12px 8px;
            text-align: left;
        }
        
        .items-table th {
            background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
            color: white;
            font-weight: 700;
            text-align: center;
            font-size: 12px;
        }
        
        .items-table .group-header {
            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
            font-weight: 700;
            color: #1976d2;
            font-size: 13px;
        }
        
        .items-table .group-header td {
            padding: 15px 12px;
        }
        
        .fee-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 12px;
            font-size: 9px;
            font-weight: 500;
            margin-left: 8px;
        }
        
        .fee-applied {
            background-color: #e8f5e8;
            color: #2e7d32;
        }
        
        .fee-excluded {
            background-color: #fff3e0;
            color: #f57c00;
        }
        
        .items-table .item-row {
            background-color: #fff;
        }
        
        .items-table .item-row:hover {
            background-color: #f8f9fa;
        }
        
        .items-table .detail-row {
            background-color: #fafafa;
            font-size: 10px;
        }
        
        .detail-row td:first-child {
            padding-left: 24px;
        }
        
        .number {
            text-align: right;
            font-weight: 500;
        }
        
        .center {
            text-align: center;
        }
        
        .total-section {
            float: right;
            width: 350px;
            margin-top: 25px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #dee2e6;
        }
        
        .total-row:last-child {
            border-bottom: none;
        }
        
        .total-row.subtotal {
            font-size: 13px;
            font-weight: 600;
        }
        
        .total-row.final {
            font-weight: 700;
            font-size: 16px;
            border-top: 2px solid #1976d2;
            border-bottom: 2px solid #1976d2;
            padding: 12px 0;
            margin-top: 8px;
            color: #1976d2;
        }
        
        .total-label {
            font-weight: 500;
        }
        
        .total-value {
            font-weight: 600;
        }
        
        .discount-value {
            color: #d32f2f;
        }
        
        .vat-info {
            font-size: 10px;
            color: #666;
            margin-top: 8px;
            text-align: center;
            font-style: italic;
        }
        
        .terms-section {
            clear: both;
            margin-top: 50px;
            padding-top: 25px;
            border-top: 2px solid #dee2e6;
        }
        
        .terms-section h4 {
            margin: 0 0 15px 0;
            font-size: 14px;
            font-weight: 700;
            color: #1976d2;
        }
        
        .terms-content {
            font-size: 11px;
            line-height: 1.6;
            white-space: pre-wrap;
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #dee2e6;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #dee2e6;
            padding-top: 15px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-section">
            ${this.companyInfo.logo_url ? `<img src="${this.companyInfo.logo_url}" alt="회사 로고">` : ''}
        </div>
        <div class="company-info">
            <div class="company-name">${this.companyInfo.name}</div>
            ${this.companyInfo.address ? `<div class="company-detail">${this.companyInfo.address}</div>` : ''}
            ${this.companyInfo.phone ? `<div class="company-detail">Tel: ${this.companyInfo.phone}</div>` : ''}
            ${this.companyInfo.email ? `<div class="company-detail">Email: ${this.companyInfo.email}</div>` : ''}
            ${this.companyInfo.website ? `<div class="company-detail">Web: ${this.companyInfo.website}</div>` : ''}
        </div>
    </div>
    
    <div class="quote-title">견 적 서</div>
    
    <div class="quote-meta">
        <div class="meta-item">
            <div class="meta-label">견적서 번호</div>
            <div class="meta-value">${quote.quote_number || 'MS-' + Date.now()}</div>
        </div>
        <div class="meta-item">
            <div class="meta-label">작성일</div>
            <div class="meta-value">${this.formatDate(quote.issue_date)}</div>
        </div>
        <div class="meta-item">
            <div class="meta-label">상태</div>
            <div class="meta-value">${this.getStatusLabel(quote.status)}</div>
        </div>
        <div class="meta-item">
            <div class="meta-label">부가세 유형</div>
            <div class="meta-value">${quote.vat_type === 'inclusive' ? '포함' : '별도'}</div>
        </div>
    </div>
    
    <div class="customer-info">
        <h3>프로젝트 및 고객 정보</h3>
        <div class="customer-details">
            <div class="customer-detail">
                <span class="customer-label">프로젝트:</span>
                <span class="customer-value">${quote.project_title}</span>
            </div>
            ${quote.customer_name_snapshot ? `
            <div class="customer-detail">
                <span class="customer-label">고객사:</span>
                <span class="customer-value">${quote.customer_name_snapshot}</span>
            </div>
            ` : ''}
        </div>
    </div>
    
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 35%">항목</th>
                <th style="width: 8%">수량</th>
                <th style="width: 8%">일수</th>
                <th style="width: 8%">단위</th>
                <th style="width: 12%">단가</th>
                <th style="width: 12%">금액</th>
                <th style="width: 17%">비고</th>
            </tr>
        </thead>
        <tbody>
            ${groups
              .map((group, groupIndex) => {
                const items = group.items.sort((a, b) => a.sort_order - b.sort_order);
                const groupSubtotal = this.calculateGroupSubtotal(group);

                return `
                <tr class="group-header">
                    <td colspan="7">
                        ${groupIndex + 1}. ${group.name}
                        <span class="fee-badge ${group.include_in_fee ? 'fee-applied' : 'fee-excluded'}">
                            ${group.include_in_fee ? '대행수수료 적용' : '대행수수료 미적용'}
                        </span>
                        <span style="float: right; font-weight: 700;">
                            그룹 소계: ${this.formatCurrency(groupSubtotal)}
                        </span>
                    </td>
                </tr>
                ${items
                  .map((item) => {
                    const details = item.details.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                    const itemSubtotal = this.calculateItemSubtotal(item);

                    return `
                    <tr class="item-row">
                        <td style="font-weight: 600;">• ${item.name}</td>
                        <td class="center">-</td>
                        <td class="center">-</td>
                        <td class="center">-</td>
                        <td class="center">-</td>
                        <td class="number" style="font-weight: 600;">${this.formatCurrency(itemSubtotal)}</td>
                        <td class="center">-</td>
                    </tr>
                    ${details
                      .map((detail) => {
                        const detailTotal = detail.quantity * detail.days * detail.unit_price;
                        return `
                      <tr class="detail-row">
                          <td>&nbsp;&nbsp;&nbsp;&nbsp;- ${detail.name}</td>
                          <td class="center">${this.formatNumber(detail.quantity)}</td>
                          <td class="center">${this.formatNumber(detail.days)}</td>
                          <td class="center">${detail.unit}</td>
                          <td class="number">${this.formatCurrency(detail.unit_price)}</td>
                          <td class="number">${this.formatCurrency(detailTotal)}</td>
                          <td class="center">${detail.supplier_name_snapshot || '-'}</td>
                      </tr>
                    `;
                      })
                      .join('')}
                  `;
                  })
                  .join('')}
              `;
              })
              .join('')}
        </tbody>
    </table>
    
    <div class="total-section">
        <div class="total-row subtotal">
            <span class="total-label">소계</span>
            <span class="total-value">${this.formatCurrency(quote.calculation.subtotal)}</span>
        </div>
        
        ${quote.calculation.fee_applicable_amount > 0 ? `
        <div class="total-row">
            <span class="total-label">∟ 대행수수료 적용 대상</span>
            <span class="total-value">${this.formatCurrency(quote.calculation.fee_applicable_amount)}</span>
        </div>
        ` : ''}
        
        ${quote.calculation.fee_excluded_amount > 0 ? `
        <div class="total-row">
            <span class="total-label">∟ 대행수수료 미적용</span>
            <span class="total-value">${this.formatCurrency(quote.calculation.fee_excluded_amount)}</span>
        </div>
        ` : ''}
        
        <div class="total-row">
            <span class="total-label">대행수수료 (${(quote.agency_fee_rate * 100).toFixed(1)}%)</span>
            <span class="total-value">${this.formatCurrency(quote.calculation.agency_fee)}</span>
        </div>
        
        ${quote.discount_amount > 0 ? `
        <div class="total-row">
            <span class="total-label">할인</span>
            <span class="total-value discount-value">-${this.formatCurrency(quote.discount_amount)}</span>
        </div>
        ` : ''}
        
        <div class="total-row">
            <span class="total-label">부가세 (10%)</span>
            <span class="total-value">${this.formatCurrency(quote.calculation.vat_amount)}</span>
        </div>
        
        <div class="total-row final">
            <span class="total-label">최종 총액</span>
            <span class="total-value">${this.formatCurrency(quote.calculation.final_total)}</span>
        </div>
        
        <div class="vat-info">
            * 부가세 ${quote.vat_type === 'inclusive' ? '포함' : '별도'}
        </div>
    </div>
    
    <div class="terms-section">
        <h4>결제 조건 및 기타사항</h4>
        <div class="terms-content">
• 본 견적서는 발행일로부터 30일간 유효합니다.
• 부가세는 별도 표기된 경우 추가 청구됩니다.
• 작업 범위 변경 시 별도 협의가 필요합니다.
• 계약금 50%, 잔금 50% (작업 완료 후 지급)

문의사항이 있으시면 언제든지 연락 주시기 바랍니다.
        </div>
    </div>
    
    <div class="footer">
        <div>본 견적서는 ${this.companyInfo.name}에서 발행되었습니다.</div>
        <div>생성일시: ${new Date().toLocaleString('ko-KR')}</div>
    </div>
</body>
</html>
    `;
  }

  // 상태 라벨 반환
  private getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      draft: '임시저장',
      sent: '발송완료',
      accepted: '승인완료',
      revised: '수정요청',
      canceled: '취소됨'
    };
    return statusMap[status] || status;
  }

  // 그룹 소계 계산
  private calculateGroupSubtotal(group: QuoteGroup): number {
    return group.items.reduce((groupTotal, item) => {
      return groupTotal + this.calculateItemSubtotal(item);
    }, 0);
  }

  // 항목 소계 계산
  private calculateItemSubtotal(item: QuoteItem): number {
    return item.details.reduce((itemTotal, detail) => {
      return itemTotal + (detail.quantity * detail.days * detail.unit_price);
    }, 0);
  }

  // PDF 생성 (브라우저 print 기능 사용)
  public generatePDF(quote: MotionsenseQuoteWithCalculation): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const htmlContent = this.generateHTML(quote);

        // 새 창에서 PDF 생성
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          reject(new Error('팝업이 차단되었습니다. 팝업을 허용해 주세요.'));
          return;
        }

        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // 이미지 및 폰트 로드 대기 후 인쇄
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
            resolve();
          }, 1000); // 폰트 로딩을 위해 대기 시간 증가
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // HTML 미리보기 생성
  public generatePreview(quote: MotionsenseQuoteWithCalculation): string {
    return this.generateHTML(quote);
  }
}

// 편의 함수들
export function generateMotionsenseQuotePDF(
  quote: MotionsenseQuoteWithCalculation,
  companyInfo: CompanyInfo
): Promise<void> {
  const generator = new MotionsensePDFGenerator(companyInfo);
  return generator.generatePDF(quote);
}

export function generateMotionsenseQuotePreview(
  quote: MotionsenseQuoteWithCalculation,
  companyInfo: CompanyInfo
): string {
  const generator = new MotionsensePDFGenerator(companyInfo);
  return generator.generatePreview(quote);
}