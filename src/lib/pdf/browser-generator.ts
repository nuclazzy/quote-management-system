// 브라우저 기반 PDF 생성기 (Print API 사용)
export interface QuoteData {
  id: string;
  quote_number: string;
  title: string;
  description?: string;
  status: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  commission_fee?: number;
  discount_amount?: number;
  total: number;
  valid_until?: string;
  terms?: string;
  notes?: string;
  created_at: string;

  // 관련 데이터
  customers: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    contact_person?: string;
  };

  projects?: {
    id: string;
    name: string;
    description?: string;
  };

  quote_groups: Array<{
    id: string;
    title: string;
    sort_order: number;
    quote_items: Array<{
      id: string;
      item_name: string;
      description?: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      sort_order: number;
      suppliers?: {
        id: string;
        name: string;
      };
      quote_item_details: Array<{
        id: string;
        detail_name: string;
        description?: string;
        quantity: number;
        unit_price: number;
        total_price: number;
        sort_order: number;
      }>;
    }>;
  }>;
}

export interface CompanyInfo {
  name: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_number?: string;
  default_terms?: string;
}

export class BrowserPDFGenerator {
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

  // HTML 생성
  private generateHTML(quote: QuoteData): string {
    const groups = quote.quote_groups.sort(
      (a, b) => a.sort_order - b.sort_order
    );

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>견적서 - ${quote.quote_number}</title>
    <style>
        @media print {
            @page {
                margin: 10mm;
                size: A4;
            }
            body {
                margin: 0;
                padding: 0;
                font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
                font-size: 9pt;
                line-height: 1.2;
                color: #333;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .page-container {
                width: 100%;
                height: auto;
                display: flex;
                flex-direction: column;
                page-break-after: avoid;
            }
        }
        
        body {
            font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
            font-size: 10px;
            line-height: 1.2;
            color: #333;
            max-width: 210mm;
            margin: 0 auto;
            padding: 10mm 15mm;
            background: white;
        }
        
        .page-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            margin-bottom: 10px;
        }
        
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 8px;
            border-bottom: 2px solid #1976d2;
            margin-bottom: 8px;
        }
        
        .logo-container {
            flex: 1;
            display: flex;
            align-items: center;
        }
        
        .logo-container img {
            max-height: 50px;
            max-width: 180px;
            object-fit: contain;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
        }
        
        .logo-placeholder {
            width: 120px;
            height: 50px;
            border: 2px dashed #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #999;
            font-size: 9px;
            border-radius: 4px;
        }
        
        .company-info {
            text-align: right;
            font-size: 9px;
            color: #666;
            line-height: 1.3;
        }
        
        .company-name {
            font-size: 12px;
            font-weight: bold;
            color: #333;
            margin-bottom: 2px;
        }
        
        .quote-title {
            font-size: 24px;
            font-weight: bold;
            color: #1976d2;
            letter-spacing: 3px;
        }
        
        .header-info {
            display: flex;
            justify-content: space-between;
            padding: 6px 10px;
            background-color: #f5f5f5;
            border-radius: 3px;
            font-size: 10px;
            margin-bottom: 10px;
        }
        
        .quote-info {
            display: flex;
            gap: 20px;
        }
        
        .info-item {
            display: flex;
            gap: 5px;
        }
        
        .info-item label {
            color: #666;
        }
        
        .info-item span {
            color: #333;
            font-weight: 600;
        }
        
        .quote-meta-left {
            flex: 1;
        }
        
        .quote-meta-right {
            text-align: right;
            flex: 1;
        }
        
        .customer-name {
            color: #1976d2;
            font-weight: bold;
            font-size: 11px;
        }
        
        .project-section {
            margin-bottom: 10px;
            padding: 8px 12px;
            background: linear-gradient(90deg, #e3f2fd 0%, #bbdefb 100%);
            border-radius: 4px;
        }
        
        .project-section h2 {
            font-size: 13px;
            font-weight: bold;
            color: #1565c0;
            margin: 0 0 3px 0;
        }
        
        .project-section p {
            font-size: 10px;
            color: #555;
            margin: 0;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 10px;
        }
        
        .items-table th,
        .items-table td {
            border: 1px solid #ddd;
            padding: 5px;
            text-align: left;
        }
        
        .items-table th {
            background-color: #1976d2;
            color: white;
            font-weight: 600;
            text-align: left;
            padding: 5px 6px;
            font-size: 10px;
            border-right: 1px solid rgba(255,255,255,0.2);
        }
        
        .items-table th:last-child {
            border-right: none;
            text-align: right;
        }
        
        .items-table th:nth-child(2),
        .items-table th:nth-child(3),
        .items-table th:nth-child(4) {
            text-align: center;
            width: 8%;
        }
        
        .items-table th:nth-child(5) {
            text-align: right;
            width: 15%;
        }
        
        .items-table .group-header {
            background-color: #e3f2fd;
            font-weight: bold;
            font-size: 11px;
        }
        
        .items-table .group-header td {
            padding: 5px 6px;
            color: #1565c0;
            border-bottom: 1px solid #90caf9;
        }
        
        .group-total {
            text-align: right;
            font-weight: bold;
            color: #1565c0;
        }
        
        .items-table .item-row {
            background-color: #fafafa;
        }
        
        .items-table .item-row td:first-child {
            padding-left: 20px;
            font-weight: 600;
            color: #424242;
            font-size: 10px;
        }
        
        .item-total {
            text-align: right;
            font-weight: 600;
            color: #424242;
        }
        
        .items-table .detail-row td:first-child {
            padding-left: 35px;
            color: #666;
            font-size: 9px;
        }
        
        .items-table .detail-row td {
            padding: 3px 6px;
            font-size: 9px;
            background-color: white;
        }
        
        .number {
            text-align: right;
        }
        
        .center {
            text-align: center;
        }
        
        .summary-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 12px;
        }
        
        .summary-box {
            width: 280px;
            background: #f8f9fa;
            border: 2px solid #1976d2;
            border-radius: 5px;
            padding: 10px 12px;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 10px;
            padding: 2px 0;
        }
        
        .summary-row.discount {
            color: #d32f2f;
        }
        
        .summary-row.total {
            font-size: 13px;
            font-weight: bold;
            color: #1976d2;
            padding-top: 6px;
            border-top: 1px solid #1976d2;
            margin-top: 6px;
        }
        
        .terms-section {
            padding: 10px 12px;
            background: #fff3e0;
            border: 1px solid #ffb74d;
            border-radius: 4px;
            margin-top: auto;
        }
        
        .terms-section h3 {
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 6px;
            color: #e65100;
        }
        
        .terms-list {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 3px 15px;
            font-size: 9px;
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .terms-list li {
            padding-left: 12px;
            position: relative;
            line-height: 1.3;
        }
        
        .terms-list li:before {
            content: "•";
            position: absolute;
            left: 0;
            color: #e65100;
        }
        
        .content-main {
            flex: 1;
        }
    </style>
</head>
<body>
<div class="page-container">
    <div class="header">
        <div class="header-top">
            <h1 class="quote-title">견 적 서</h1>
            <div class="company-info">
                <div class="company-name">${this.companyInfo.name}</div>
                ${this.companyInfo.address ? `<div>${this.companyInfo.address}</div>` : ''}
                ${this.companyInfo.phone ? `<div>Tel: ${this.companyInfo.phone}</div>` : ''}
                ${this.companyInfo.email ? `<div>${this.companyInfo.email}${this.companyInfo.tax_number ? ` | 사업자: ${this.companyInfo.tax_number}` : ''}</div>` : ''}
            </div>
        </div>
        <div class="header-info">
            <div class="quote-info">
                <div class="info-item">
                    <label>견적번호:</label>
                    <span>${quote.quote_number}</span>
                </div>
                <div class="info-item">
                    <label>작성일:</label>
                    <span>${new Date(quote.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
            </div>
            <div class="info-item">
                <label>고객사:</label>
                <span class="customer-name">${quote.customers.name}</span>
            </div>
        </div>
    </div>
    
    <div class="content-main">
    <div class="project-section">
        <h2>${quote.title}</h2>
        ${quote.description ? `<p>${quote.description}</p>` : ''}
    </div>
    
    <table class="items-table">
        <thead>
            <tr>
                <th>항목</th>
                <th>수량</th>
                <th>단가</th>
                <th>금액</th>
                <th>공급업체</th>
            </tr>
        </thead>
        <tbody>
            ${groups
              .map((group, groupIndex) => {
                const items = group.quote_items.sort(
                  (a, b) => a.sort_order - b.sort_order
                );

                return `
                <tr class="group-header">
                    <td colspan="5">${groupIndex + 1}. ${group.title}</td>
                </tr>
                ${items
                  .map((item) => {
                    const details = item.quote_item_details.sort(
                      (a, b) => a.sort_order - b.sort_order
                    );

                    return `
                    <tr class="item-row">
                        <td>• ${item.item_name}</td>
                        <td class="center">${this.formatNumber(item.quantity)}</td>
                        <td class="number">${this.formatCurrency(item.unit_price)}</td>
                        <td class="number">${this.formatCurrency(item.total_price)}</td>
                        <td class="center">${item.suppliers?.name || ''}</td>
                    </tr>
                    ${details
                      .map(
                        (detail) => `
                      <tr class="detail-row">
                          <td>&nbsp;&nbsp;&nbsp;&nbsp;- ${detail.detail_name}</td>
                          <td class="center">${this.formatNumber(detail.quantity)}</td>
                          <td class="number">${this.formatCurrency(detail.unit_price)}</td>
                          <td class="number">${this.formatCurrency(detail.total_price)}</td>
                          <td class="center"></td>
                      </tr>
                    `
                      )
                      .join('')}
                  `;
                  })
                  .join('')}
              `;
              })
              .join('')}
        </tbody>
    </table>
    
    <div class="summary-section">
        <div class="summary-box">
            <div class="summary-row">
                <span>순 공급가액:</span>
                <span>${this.formatCurrency(quote.subtotal)}</span>
            </div>
            ${quote.commission_fee && quote.commission_fee > 0 ? `
            <div class="summary-row">
                <span>대행수수료:</span>
                <span>${this.formatCurrency(quote.commission_fee)}</span>
            </div>` : ''}
            <div class="summary-row">
                <span>부가세 (${quote.tax_rate}%):</span>
                <span>${this.formatCurrency(quote.tax_amount)}</span>
            </div>
            ${quote.discount_amount && quote.discount_amount > 0 ? `
            <div class="summary-row discount">
                <span>할인 금액:</span>
                <span>-${this.formatCurrency(quote.discount_amount)}</span>
            </div>` : ''}
            <div class="summary-row total">
                <span>최종 견적가:</span>
                <span>${this.formatCurrency(quote.total)}</span>
            </div>
        </div>
    </div>
    
    ${
      quote.terms || this.companyInfo.default_terms || quote.notes
        ? `
    <div class="terms-section">
        <h3>조건 및 참고사항</h3>
        <ul class="terms-list">
            ${([
          ...(quote.terms || this.companyInfo.default_terms || '').split('\n').filter(line => line.trim()),
          ...(quote.notes || '').split('\n').filter(line => line.trim())
        ].filter(Boolean).map(item => `<li>${item}</li>`).join('\n            '))}
        </ul>
    </div>
    `
        : ''
    }
    </div>
</div>
</body>
</html>
    `;
  }

  // PDF 생성 (브라우저 print 기능 사용)
  public generatePDF(quote: QuoteData): Promise<void> {
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

        // 이미지 로드 대기 후 인쇄
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
            resolve();
          }, 500);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // HTML 미리보기 생성
  public generatePreview(quote: QuoteData): string {
    return this.generateHTML(quote);
  }
}

// 편의 함수들
export function generateQuotePDF(
  quote: QuoteData,
  companyInfo: CompanyInfo
): Promise<void> {
  const generator = new BrowserPDFGenerator(companyInfo);
  return generator.generatePDF(quote);
}

export function generateQuotePreview(
  quote: QuoteData,
  companyInfo: CompanyInfo
): string {
  const generator = new BrowserPDFGenerator(companyInfo);
  return generator.generatePreview(quote);
}
