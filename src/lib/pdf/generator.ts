// PDF 생성을 위한 라이브러리 import
const jsPDF = require('jspdf')
require('jspdf-autotable')

// jsPDF 타입 정의
interface jsPDFType {
  new (orientation?: string, unit?: string, format?: string): any
  setFontSize: (size: number) => void
  setFont: (font: string, style?: string) => void
  text: (text: string | string[], x: number, y: number, options?: any) => void
  splitTextToSize: (text: string, maxWidth: number) => string[]
  addPage: () => void
  autoTable: (options: any) => void
  internal: {
    pageSize: {
      getWidth: () => number
      getHeight: () => number
    }
  }
  output: (type: string) => any
  save: (filename: string) => void
}

export interface QuoteData {
  id: string
  quote_number: string
  title: string
  description?: string
  status: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  valid_until?: string
  terms?: string
  notes?: string
  created_at: string
  
  // 관련 데이터
  customers: {
    id: string
    name: string
    email?: string
    phone?: string
    address?: string
    contact_person?: string
  }
  
  projects?: {
    id: string
    name: string
    description?: string
  }
  
  quote_groups: Array<{
    id: string
    title: string
    sort_order: number
    quote_items: Array<{
      id: string
      item_name: string
      description?: string
      quantity: number
      unit_price: number
      total_price: number
      sort_order: number
      suppliers?: {
        id: string
        name: string
      }
      quote_item_details: Array<{
        id: string
        detail_name: string
        description?: string
        quantity: number
        unit_price: number
        total_price: number
        sort_order: number
      }>
    }>
  }>
}

export interface CompanyInfo {
  name: string
  logo_url?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  tax_number?: string
  bank_info?: any
}

export class QuotePDFGenerator {
  private pdf: any
  private pageWidth: number
  private pageHeight: number
  private margin: number
  private currentY: number
  private companyInfo: CompanyInfo

  constructor(companyInfo: CompanyInfo) {
    this.pdf = new jsPDF('p', 'mm', 'a4')
    this.pageWidth = this.pdf.internal.pageSize.getWidth()
    this.pageHeight = this.pdf.internal.pageSize.getHeight()
    this.margin = 20
    this.currentY = this.margin
    this.companyInfo = companyInfo
    
    // 한글 폰트 설정을 위한 폰트 등록 (웹폰트 사용)
    this.setupKoreanFont()
  }

  // 한글 폰트 설정
  private setupKoreanFont() {
    // jsPDF는 기본적으로 한글을 지원하지 않으므로,
    // 웹에서 사용 가능한 폰트로 대체하거나 폰트 파일을 추가해야 합니다.
    // 현재는 기본 폰트를 사용하되, 향후 한글 폰트 파일을 추가할 수 있습니다.
    try {
      // 기본 폰트 설정 (한글 지원을 위해서는 별도 폰트 파일이 필요)
      this.pdf.setFont('helvetica', 'normal')
    } catch (error) {
      console.warn('Font setup warning:', error)
      this.pdf.setFont('helvetica', 'normal')
    }
  }

  // 새 페이지 시작
  private newPage() {
    this.pdf.addPage()
    this.currentY = this.margin
    this.addHeader()
  }

  // 페이지 체크 및 필요시 새 페이지 생성
  private checkPageBreak(requiredHeight: number) {
    if (this.currentY + requiredHeight > this.pageHeight - this.margin) {
      this.newPage()
    }
  }

  // 헤더 추가
  private addHeader() {
    const startY = this.currentY

    // 회사 로고 (있다면)
    if (this.companyInfo.logo_url) {
      // 실제 구현시 이미지 로드 로직 필요
      // this.pdf.addImage(logoData, 'PNG', this.margin, this.currentY, 40, 20)
    }

    // 회사 정보 (오른쪽 정렬)
    this.pdf.setFontSize(12)
    this.pdf.setFont('helvetica', 'bold')
    const companyInfoX = this.pageWidth - this.margin - 60
    
    this.addText(this.companyInfo.name, companyInfoX, this.currentY + 5)
    
    this.pdf.setFontSize(9)
    this.pdf.setFont('helvetica', 'normal')
    
    let infoY = this.currentY + 12
    if (this.companyInfo.address) {
      this.addText(this.companyInfo.address, companyInfoX, infoY)
      infoY += 4
    }
    if (this.companyInfo.phone) {
      this.addText(`Tel: ${this.companyInfo.phone}`, companyInfoX, infoY)
      infoY += 4
    }
    if (this.companyInfo.email) {
      this.addText(`Email: ${this.companyInfo.email}`, companyInfoX, infoY)
      infoY += 4
    }

    this.currentY = Math.max(startY + 30, infoY + 5)
  }

  // 견적서 제목 및 기본 정보
  private addQuoteHeader(quote: QuoteData) {
    this.checkPageBreak(30)

    // 견적서 제목
    this.pdf.setFontSize(20)
    this.pdf.setFont('helvetica', 'bold')
    this.addText('견 적 서', this.pageWidth / 2, this.currentY, { align: 'center' })
    this.currentY += 15

    // 견적서 번호 및 날짜
    this.pdf.setFontSize(12)
    this.pdf.setFont('helvetica', 'normal')
    
    this.addText(`견적서 번호: ${quote.quote_number}`, this.margin, this.currentY)
    this.addText(`작성일: ${new Date(quote.created_at).toLocaleDateString('ko-KR')}`, this.pageWidth - this.margin - 60, this.currentY)
    this.currentY += 8

    if (quote.valid_until) {
      this.addText(`유효기한: ${new Date(quote.valid_until).toLocaleDateString('ko-KR')}`, this.pageWidth - this.margin - 60, this.currentY)
      this.currentY += 8
    }

    this.currentY += 5
  }

  // 고객 정보
  private addCustomerInfo(quote: QuoteData) {
    this.checkPageBreak(25)

    this.pdf.setFontSize(12)
    this.pdf.setFont('helvetica', 'bold')
    this.addText('고객 정보:', this.margin, this.currentY)
    this.currentY += 8

    this.pdf.setFont('helvetica', 'normal')
    this.addText(`회사명: ${quote.customers.name}`, this.margin + 5, this.currentY)
    this.currentY += 6

    if (quote.customers.contact_person) {
      this.addText(`담당자: ${quote.customers.contact_person}`, this.margin + 5, this.currentY)
      this.currentY += 6
    }

    if (quote.customers.phone) {
      this.addText(`연락처: ${quote.customers.phone}`, this.margin + 5, this.currentY)
      this.currentY += 6
    }

    if (quote.customers.email) {
      this.addText(`이메일: ${quote.customers.email}`, this.margin + 5, this.currentY)
      this.currentY += 6
    }

    this.currentY += 5
  }

  // 견적서 제목 및 설명
  private addQuoteTitle(quote: QuoteData) {
    this.checkPageBreak(20)

    this.pdf.setFontSize(14)
    this.pdf.setFont('helvetica', 'bold')
    this.addText(`제목: ${quote.title}`, this.margin, this.currentY)
    this.currentY += 10

    if (quote.description) {
      this.pdf.setFontSize(10)
      this.pdf.setFont('helvetica', 'normal')
      const splitDescription = this.pdf.splitTextToSize(quote.description, this.pageWidth - 2 * this.margin)
      this.addText(splitDescription, this.margin, this.currentY)
      this.currentY += splitDescription.length * 5 + 5
    }

    this.currentY += 5
  }

  // 견적 항목 테이블
  private addQuoteItems(quote: QuoteData) {
    const tableData: any[] = []
    let rowIndex = 1

    // 그룹별로 데이터 생성
    for (const group of quote.quote_groups.sort((a, b) => a.sort_order - b.sort_order)) {
      // 그룹 헤더
      tableData.push([
        { content: `${rowIndex++}. ${group.title}`, styles: { fontStyle: 'bold', fillColor: '#f0f0f0' } },
        '', '', '', ''
      ])

      // 그룹 내 품목들
      for (const item of group.quote_items.sort((a, b) => a.sort_order - b.sort_order)) {
        // 주 품목
        tableData.push([
          `  • ${item.item_name}`,
          this.formatNumber(item.quantity),
          this.formatCurrency(item.unit_price),
          this.formatCurrency(item.total_price),
          item.suppliers?.name || ''
        ])

        // 세부 품목들
        for (const detail of item.quote_item_details.sort((a, b) => a.sort_order - b.sort_order)) {
          tableData.push([
            `    - ${detail.detail_name}`,
            this.formatNumber(detail.quantity),
            this.formatCurrency(detail.unit_price),
            this.formatCurrency(detail.total_price),
            ''
          ])
        }
      }

      // 그룹 간 여백
      if (quote.quote_groups.indexOf(group) < quote.quote_groups.length - 1) {
        tableData.push(['', '', '', '', ''])
      }
    }

    // 테이블 생성
    this.pdf.autoTable({
      startY: this.currentY,
      head: [['항목', '수량', '단가', '금액', '공급업체']],
      body: tableData,
      margin: { left: this.margin, right: this.margin },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: '#4a90e2',
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'center' }
      },
      didDrawPage: (data: any) => {
        // 페이지가 넘어갔을 때 헤더 다시 그리기
        if (data.pageNumber > 1) {
          this.addHeader()
        }
      }
    })

    this.currentY = (this.pdf as any).lastAutoTable.finalY + 10
  }

  // 총액 정보
  private addTotalSection(quote: QuoteData) {
    this.checkPageBreak(40)

    const totalSectionX = this.pageWidth - this.margin - 80
    
    // 소계
    this.pdf.setFontSize(11)
    this.addText('소계:', totalSectionX, this.currentY)
    this.addText(this.formatCurrency(quote.subtotal), totalSectionX + 40, this.currentY, { align: 'right' })
    this.currentY += 7

    // 세금
    this.addText(`세금 (${quote.tax_rate}%):`, totalSectionX, this.currentY)
    this.addText(this.formatCurrency(quote.tax_amount), totalSectionX + 40, this.currentY, { align: 'right' })
    this.currentY += 7

    // 총액
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.setFontSize(12)
    this.addText('총액:', totalSectionX, this.currentY)
    this.addText(this.formatCurrency(quote.total), totalSectionX + 40, this.currentY, { align: 'right' })
    this.currentY += 10
  }

  // 조건 및 비고
  private addTermsAndNotes(quote: QuoteData) {
    if (quote.terms || quote.notes) {
      this.checkPageBreak(30)

      if (quote.terms) {
        this.pdf.setFontSize(10)
        this.pdf.setFont('helvetica', 'bold')
        this.addText('조건 및 기타사항:', this.margin, this.currentY)
        this.currentY += 7

        this.pdf.setFont('helvetica', 'normal')
        const splitTerms = this.pdf.splitTextToSize(quote.terms, this.pageWidth - 2 * this.margin)
        this.addText(splitTerms, this.margin, this.currentY)
        this.currentY += splitTerms.length * 4 + 5
      }

      if (quote.notes) {
        this.pdf.setFont('helvetica', 'bold')
        this.addText('비고:', this.margin, this.currentY)
        this.currentY += 7

        this.pdf.setFont('helvetica', 'normal')
        const splitNotes = this.pdf.splitTextToSize(quote.notes, this.pageWidth - 2 * this.margin)
        this.addText(splitNotes, this.margin, this.currentY)
        this.currentY += splitNotes.length * 4 + 5
      }
    }
  }

  // 통화 포맷팅
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // 숫자 포맷팅
  private formatNumber(num: number): string {
    return new Intl.NumberFormat('ko-KR').format(num)
  }

  // 한글 텍스트 처리 (폰트 문제로 깨질 수 있는 텍스트를 안전하게 처리)
  private safeText(text: string): string {
    // 한글이 포함된 경우 폰트 설정
    if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text)) {
      try {
        this.pdf.setFont('helvetica', 'normal')
      } catch (error) {
        console.warn('Korean font setting error:', error)
      }
    }
    return text
  }

  // 텍스트 출력 헬퍼
  private addText(text: string, x: number, y: number, options?: any) {
    const safeString = this.safeText(text)
    this.pdf.text(safeString, x, y, options)
  }

  // PDF 생성
  public generate(quote: QuoteData): Uint8Array {
    // 첫 페이지 헤더
    this.addHeader()
    
    // 견적서 내용 추가
    this.addQuoteHeader(quote)
    this.addCustomerInfo(quote)
    this.addQuoteTitle(quote)
    this.addQuoteItems(quote)
    this.addTotalSection(quote)
    this.addTermsAndNotes(quote)

    // PDF 바이트 배열 반환
    return this.pdf.output('arraybuffer') as Uint8Array
  }

  // PDF 다운로드
  public download(quote: QuoteData, filename?: string): void {
    const fileName = filename || `견적서_${quote.quote_number}.pdf`
    this.generate(quote)
    this.pdf.save(fileName)
  }
}

// 편의 함수들
export function generateQuotePDF(quote: QuoteData, companyInfo: CompanyInfo): Uint8Array {
  const generator = new QuotePDFGenerator(companyInfo)
  return generator.generate(quote)
}

export function downloadQuotePDF(quote: QuoteData, companyInfo: CompanyInfo, filename?: string): void {
  const generator = new QuotePDFGenerator(companyInfo)
  generator.download(quote, filename)
}