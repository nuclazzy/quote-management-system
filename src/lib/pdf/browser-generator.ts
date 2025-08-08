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
                margin: 15mm;
                size: A4;
            }
            body {
                margin: 0;
                padding: 0;
                font-family: 'Malgun Gothic', sans-serif;
                font-size: 11px;
                line-height: 1.3;
                color: #333;
            }
            .page-container {
                height: 100vh;
                display: flex;
                flex-direction: column;
            }
        }
        
        body {
            font-family: 'Malgun Gothic', sans-serif;
            font-size: 11px;
            line-height: 1.3;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 15px;
        }
        
        .page-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
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
            font-size: 10px;
            flex: 1;
            line-height: 1.2;
        }
        
        .company-name {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 3px;
            color: #2c3e50;
        }
        
        .quote-title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin: 15px 0;
        }
        
        .quote-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 10px;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 5px;
        }
        
        .quote-meta-left {
            flex: 1;
        }
        
        .quote-meta-right {
            text-align: right;
            flex: 1;
        }
        
        .customer-name {
            font-weight: bold;
            font-size: 11px;
        }
        
        .quote-info {
            margin-bottom: 15px;
        }
        
        .quote-info h3 {
            margin: 0 0 5px 0;
            font-size: 11px;
            font-weight: bold;
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
            background-color: #4a90e2;
            color: white;
            font-weight: bold;
            text-align: center;
            padding: 6px;
        }
        
        .items-table .group-header {
            background-color: #f0f0f0;
            font-weight: bold;
        }
        
        .items-table .item-row {
            background-color: white;
        }
        
        .items-table .detail-row {
            background-color: #fafafa;
            font-size: 9px;
        }
        
        .number {
            text-align: right;
        }
        
        .center {
            text-align: center;
        }
        
        .total-section {
            float: right;
            width: 280px;
            margin-top: 10px;
            margin-bottom: 30px;
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            border: 1px solid #dee2e6;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px solid #eee;
            font-size: 10px;
        }
        
        .total-row.subtotal-row {
            margin-top: 5px;
            padding-top: 8px;
            border-top: 1px solid #dee2e6;
        }
        
        .total-row.final {
            font-weight: bold;
            font-size: 12px;
            border-bottom: 2px solid #333;
            border-top: 2px solid #333;
            padding: 8px 0;
            margin-top: 5px;
        }
        
        .terms-section {
            clear: both;
            margin-top: 50px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: #f9f9f9;
        }
        
        .terms-section h4 {
            margin: 0 0 5px 0;
            font-size: 10px;
            font-weight: bold;
        }
        
        .terms-content {
            font-size: 9px;
            line-height: 1.4;
            white-space: pre-wrap;
        }
        
        .content-main {
            flex: 1;
        }
    </style>
</head>
<body>
<div class="page-container">
    <div class="header">
        <div class="logo-container">
            ${this.companyInfo.logo_url 
              ? `<img src="${this.companyInfo.logo_url}" alt="${this.companyInfo.name} 로고">` 
              : `<div class="logo-placeholder">로고 영역</div>`
            }
        </div>
        <div class="company-info">
            <div class="company-name">${this.companyInfo.name}</div>
            ${this.companyInfo.address ? `<div><strong>주소:</strong> ${this.companyInfo.address}</div>` : ''}
            ${this.companyInfo.phone ? `<div><strong>전화:</strong> ${this.companyInfo.phone}</div>` : ''}
            ${this.companyInfo.email ? `<div><strong>이메일:</strong> ${this.companyInfo.email}</div>` : ''}
            ${this.companyInfo.website ? `<div><strong>웹사이트:</strong> ${this.companyInfo.website}</div>` : ''}
            ${this.companyInfo.tax_number ? `<div><strong>사업자등록번호:</strong> ${this.companyInfo.tax_number}</div>` : ''}
        </div>
    </div>
    
    <div class="content-main">
    <div class="quote-title">견 적 서</div>
    
    <div class="quote-meta">
        <div class="quote-meta-left">
            <div>견적서 번호: ${quote.quote_number}</div>
            <div>작성일: ${new Date(quote.created_at).toLocaleDateString('ko-KR')}</div>
        </div>
        <div class="quote-meta-right">
            <div class="customer-name">고객사: ${quote.customers.name}</div>
        </div>
    </div>
    
    <div class="quote-info">
        <h3>제목: ${quote.title}</h3>
        ${quote.description ? `<div>${quote.description}</div>` : ''}
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
    
    <div class="total-section">
        <div class="total-row">
            <span>소계:</span>
            <span>${this.formatCurrency(quote.subtotal)}</span>
        </div>
        ${quote.commission_fee && quote.commission_fee > 0 ? `
        <div class="total-row">
            <span>대행수수료:</span>
            <span>${this.formatCurrency(quote.commission_fee)}</span>
        </div>` : ''}
        ${quote.discount_amount && quote.discount_amount > 0 ? `
        <div class="total-row">
            <span>할인금액:</span>
            <span>-${this.formatCurrency(quote.discount_amount)}</span>
        </div>` : ''}
        <div class="total-row">
            <span>세금 (${quote.tax_rate}%):</span>
            <span>${this.formatCurrency(quote.tax_amount)}</span>
        </div>
        <div class="total-row final">
            <span>총액:</span>
            <span>${this.formatCurrency(quote.total)}</span>
        </div>
    </div>
    
    ${
      quote.terms || this.companyInfo.default_terms || quote.notes
        ? `
    <div class="terms-section">
        <h4>비고</h4>
        <div class="terms-content">${[
          quote.terms || this.companyInfo.default_terms,
          quote.notes
        ].filter(Boolean).join('\n\n')}</div>
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
