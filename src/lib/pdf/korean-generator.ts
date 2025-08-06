import jsPDF from 'jspdf';
import 'jspdf-autotable';

// jsPDF 타입 확장
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => void;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

export interface QuoteData {
  id: string;
  quote_number: string;
  title: string;
  description?: string;
  status: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
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
  bank_info?: any;
}

export class KoreanQuotePDFGenerator {
  private pdf: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;
  private companyInfo: CompanyInfo;
  private fontLoaded: boolean = false;

  constructor(companyInfo: CompanyInfo) {
    this.pdf = new jsPDF('p', 'mm', 'a4');
    this.pageWidth = this.pdf.internal.pageSize.getWidth();
    this.pageHeight = this.pdf.internal.pageSize.getHeight();
    this.margin = 20;
    this.currentY = this.margin;
    this.companyInfo = companyInfo;

    // 한글 폰트 설정
    this.setupKoreanFont();
  }

  // 한글 폰트 설정 - 웹폰트 방식 사용
  private setupKoreanFont() {
    try {
      // 나눔고딕 웹폰트 추가 (온라인)
      const fontBase64 = this.getNanumGothicBase64();
      if (fontBase64) {
        this.pdf.addFileToVFS('NanumGothic.ttf', fontBase64);
        this.pdf.addFont('NanumGothic.ttf', 'NanumGothic', 'normal');
        this.pdf.setFont('NanumGothic', 'normal');
        this.fontLoaded = true;
      } else {
        // 폴백: 기본 폰트 사용 
        this.pdf.setFont('helvetica', 'normal');
        console.warn('Korean font not loaded, using helvetica as fallback');
      }
    } catch (error) {
      console.warn('Korean font setup failed:', error);
      this.pdf.setFont('helvetica', 'normal');
    }
  }

  // 나눔고딕 폰트 Base64 데이터 (간소화된 샘플)
  // 실제 운영에서는 CDN 또는 로컬 폰트 파일을 사용해야 합니다
  private getNanumGothicBase64(): string | null {
    // 여기서는 null을 반환하고 fallback을 사용
    // 실제 구현에서는 폰트 파일을 base64로 인코딩하여 반환
    return null;
  }

  // 새 페이지 시작
  private newPage() {
    this.pdf.addPage();
    this.currentY = this.margin;
    this.addHeader();
  }

  // 페이지 체크 및 필요시 새 페이지 생성
  private checkPageBreak(requiredHeight: number) {
    if (this.currentY + requiredHeight > this.pageHeight - this.margin) {
      this.newPage();
    }
  }

  // 한글 텍스트 처리 개선
  private addKoreanText(text: string, x: number, y: number, options?: any) {
    // 한글이 포함된 경우 적절한 폰트 설정
    if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text)) {
      if (this.fontLoaded) {
        this.pdf.setFont('NanumGothic', 'normal');
      } else {
        // 한글을 영문으로 대체하는 방식 사용 (임시)
        // 실제로는 이 방식보다는 폰트 파일을 제대로 로드하는 것이 좋습니다
        this.pdf.setFont('helvetica', 'normal');
      }
    }

    this.pdf.text(text, x, y, options);
  }

  // 헤더 추가
  private addHeader() {
    const startY = this.currentY;

    // 회사 로고 (있다면)
    if (this.companyInfo.logo_url) {
      // 실제 구현시 이미지 로드 로직 필요
      // this.pdf.addImage(logoData, 'PNG', this.margin, this.currentY, 40, 20)
    }

    // 회사 정보 (오른쪽 정렬)
    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    const companyInfoX = this.pageWidth - this.margin - 60;

    this.addKoreanText(this.companyInfo.name, companyInfoX, this.currentY + 5);

    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');

    let infoY = this.currentY + 12;
    if (this.companyInfo.address) {
      this.addKoreanText(this.companyInfo.address, companyInfoX, infoY);
      infoY += 4;
    }
    if (this.companyInfo.phone) {
      this.addKoreanText(`Tel: ${this.companyInfo.phone}`, companyInfoX, infoY);
      infoY += 4;
    }
    if (this.companyInfo.email) {
      this.addKoreanText(`Email: ${this.companyInfo.email}`, companyInfoX, infoY);
      infoY += 4;
    }

    this.currentY = Math.max(startY + 30, infoY + 5);
  }

  // 견적서 제목 및 기본 정보
  private addQuoteHeader(quote: QuoteData) {
    this.checkPageBreak(30);

    // 견적서 제목
    this.pdf.setFontSize(20);
    this.pdf.setFont('helvetica', 'bold');
    this.addKoreanText('견 적 서', this.pageWidth / 2, this.currentY, {
      align: 'center',
    });
    this.currentY += 15;

    // 견적서 번호 및 날짜
    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'normal');

    this.addKoreanText(
      `견적서 번호: ${quote.quote_number}`,
      this.margin,
      this.currentY
    );
    this.addKoreanText(
      `작성일: ${new Date(quote.created_at).toLocaleDateString('ko-KR')}`,
      this.pageWidth - this.margin - 60,
      this.currentY
    );
    this.currentY += 8;

    if (quote.valid_until) {
      this.addKoreanText(
        `유효기한: ${new Date(quote.valid_until).toLocaleDateString('ko-KR')}`,
        this.pageWidth - this.margin - 60,
        this.currentY
      );
      this.currentY += 8;
    }

    this.currentY += 5;
  }

  // 고객 정보
  private addCustomerInfo(quote: QuoteData) {
    this.checkPageBreak(25);

    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.addKoreanText('고객 정보:', this.margin, this.currentY);
    this.currentY += 8;

    this.pdf.setFont('helvetica', 'normal');
    this.addKoreanText(
      `회사명: ${quote.customers.name}`,
      this.margin + 5,
      this.currentY
    );
    this.currentY += 6;

    if (quote.customers.contact_person) {
      this.addKoreanText(
        `담당자: ${quote.customers.contact_person}`,
        this.margin + 5,
        this.currentY
      );
      this.currentY += 6;
    }

    if (quote.customers.phone) {
      this.addKoreanText(
        `연락처: ${quote.customers.phone}`,
        this.margin + 5,
        this.currentY
      );
      this.currentY += 6;
    }

    if (quote.customers.email) {
      this.addKoreanText(
        `이메일: ${quote.customers.email}`,
        this.margin + 5,
        this.currentY
      );
      this.currentY += 6;
    }

    this.currentY += 5;
  }

  // 견적서 제목 및 설명
  private addQuoteTitle(quote: QuoteData) {
    this.checkPageBreak(20);

    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.addKoreanText(`제목: ${quote.title}`, this.margin, this.currentY);
    this.currentY += 10;

    if (quote.description) {
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'normal');
      const splitDescription = this.pdf.splitTextToSize(
        quote.description,
        this.pageWidth - 2 * this.margin
      );
      this.addKoreanText(splitDescription, this.margin, this.currentY);
      this.currentY += splitDescription.length * 5 + 5;
    }

    this.currentY += 5;
  }

  // 견적 항목 테이블 (한글 지원 개선)
  private addQuoteItems(quote: QuoteData) {
    const tableData: any[] = [];
    let rowIndex = 1;

    // 그룹별로 데이터 생성
    for (const group of quote.quote_groups.sort(
      (a, b) => a.sort_order - b.sort_order
    )) {
      // 그룹 헤더
      tableData.push([
        {
          content: `${rowIndex++}. ${group.title}`,
          styles: { fontStyle: 'bold', fillColor: '#f0f0f0' },
        },
        '',
        '',
        '',
        '',
      ]);

      // 그룹 내 품목들
      for (const item of group.quote_items.sort(
        (a, b) => a.sort_order - b.sort_order
      )) {
        // 주 품목
        tableData.push([
          `  • ${item.item_name}`,
          this.formatNumber(item.quantity),
          this.formatCurrency(item.unit_price),
          this.formatCurrency(item.total_price),
          item.suppliers?.name || '',
        ]);

        // 세부 품목들
        for (const detail of item.quote_item_details.sort(
          (a, b) => a.sort_order - b.sort_order
        )) {
          tableData.push([
            `    - ${detail.detail_name}`,
            this.formatNumber(detail.quantity),
            this.formatCurrency(detail.unit_price),
            this.formatCurrency(detail.total_price),
            '',
          ]);
        }
      }

      // 그룹 간 여백
      if (quote.quote_groups.indexOf(group) < quote.quote_groups.length - 1) {
        tableData.push(['', '', '', '', '']);
      }
    }

    // 테이블 생성 (한글 폰트 고려)
    this.pdf.autoTable({
      startY: this.currentY,
      head: [['항목', '수량', '단가', '금액', '공급업체']],
      body: tableData,
      margin: { left: this.margin, right: this.margin },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        font: this.fontLoaded ? 'NanumGothic' : 'helvetica',
      },
      headStyles: {
        fillColor: '#4a90e2',
        textColor: 255,
        fontStyle: 'bold',
        font: this.fontLoaded ? 'NanumGothic' : 'helvetica',
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'center' },
      },
      didDrawPage: (data: any) => {
        // 페이지가 넘어갔을 때 헤더 다시 그리기
        if (data.pageNumber > 1) {
          this.addHeader();
        }
      },
    });

    this.currentY = (this.pdf as any).lastAutoTable.finalY + 10;
  }

  // 총액 정보
  private addTotalSection(quote: QuoteData) {
    this.checkPageBreak(40);

    const totalSectionX = this.pageWidth - this.margin - 80;

    // 소계
    this.pdf.setFontSize(11);
    this.addKoreanText('소계:', totalSectionX, this.currentY);
    this.addKoreanText(
      this.formatCurrency(quote.subtotal),
      totalSectionX + 40,
      this.currentY,
      { align: 'right' }
    );
    this.currentY += 7;

    // 세금
    this.addKoreanText(`세금 (${quote.tax_rate}%):`, totalSectionX, this.currentY);
    this.addKoreanText(
      this.formatCurrency(quote.tax_amount),
      totalSectionX + 40,
      this.currentY,
      { align: 'right' }
    );
    this.currentY += 7;

    // 총액
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(12);
    this.addKoreanText('총액:', totalSectionX, this.currentY);
    this.addKoreanText(
      this.formatCurrency(quote.total),
      totalSectionX + 40,
      this.currentY,
      { align: 'right' }
    );
    this.currentY += 10;
  }

  // 조건 및 비고
  private addTermsAndNotes(quote: QuoteData) {
    if (quote.terms || quote.notes) {
      this.checkPageBreak(30);

      if (quote.terms) {
        this.pdf.setFontSize(10);
        this.pdf.setFont('helvetica', 'bold');
        this.addKoreanText('조건 및 기타사항:', this.margin, this.currentY);
        this.currentY += 7;

        this.pdf.setFont('helvetica', 'normal');
        const splitTerms = this.pdf.splitTextToSize(
          quote.terms,
          this.pageWidth - 2 * this.margin
        );
        this.addKoreanText(splitTerms, this.margin, this.currentY);
        this.currentY += splitTerms.length * 4 + 5;
      }

      if (quote.notes) {
        this.pdf.setFont('helvetica', 'bold');
        this.addKoreanText('비고:', this.margin, this.currentY);
        this.currentY += 7;

        this.pdf.setFont('helvetica', 'normal');
        const splitNotes = this.pdf.splitTextToSize(
          quote.notes,
          this.pageWidth - 2 * this.margin
        );
        this.addKoreanText(splitNotes, this.margin, this.currentY);
        this.currentY += splitNotes.length * 4 + 5;
      }
    }
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

  // PDF 생성
  public generate(quote: QuoteData): Uint8Array {
    // 첫 페이지 헤더
    this.addHeader();

    // 견적서 내용 추가
    this.addQuoteHeader(quote);
    this.addCustomerInfo(quote);
    this.addQuoteTitle(quote);
    this.addQuoteItems(quote);
    this.addTotalSection(quote);
    this.addTermsAndNotes(quote);

    // PDF 바이트 배열 반환
    return new Uint8Array(this.pdf.output('arraybuffer'));
  }

  // PDF 다운로드
  public download(quote: QuoteData, filename?: string): void {
    const fileName = filename || `견적서_${quote.quote_number}.pdf`;
    this.generate(quote);
    this.pdf.save(fileName);
  }

  // PDF Blob 생성 (미리보기용)
  public generateBlob(quote: QuoteData): Blob {
    this.generate(quote);
    return this.pdf.output('blob');
  }
}

// 편의 함수들
export function generateKoreanQuotePDF(
  quote: QuoteData,
  companyInfo: CompanyInfo
): Uint8Array {
  const generator = new KoreanQuotePDFGenerator(companyInfo);
  return generator.generate(quote);
}

export function downloadKoreanQuotePDF(
  quote: QuoteData,
  companyInfo: CompanyInfo,
  filename?: string
): void {
  const generator = new KoreanQuotePDFGenerator(companyInfo);
  generator.download(quote, filename);
}

export function generateKoreanQuotePDFBlob(
  quote: QuoteData,
  companyInfo: CompanyInfo
): Blob {
  const generator = new KoreanQuotePDFGenerator(companyInfo);
  return generator.generateBlob(quote);
}