import { NextRequest, NextResponse } from 'next/server'
import { withAuth, createApiError } from '@/lib/api/base'
import { BrowserPDFGenerator, type QuoteData, type CompanyInfo } from '@/lib/pdf/browser-generator'

// GET /api/quotes/[id]/pdf - 견적서 PDF 생성 및 다운로드
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async ({ user, supabase }) => {
    try {
      // 견적서 데이터 조회
      const { data: quote, error } = await supabase
        .from('quotes')
        .select(`
          *,
          customers(id, name, email, phone, address, contact_person),
          projects(id, name, description),
          users!quotes_created_by_fkey(id, full_name),
          quote_groups(
            id,
            title,
            sort_order,
            quote_items(
              id,
              item_name,
              description,
              quantity,
              unit_price,
              total_price,
              sort_order,
              suppliers(id, name),
              quote_item_details(
                id,
                detail_name,
                description,
                quantity,
                unit_price,
                total_price,
                sort_order
              )
            )
          )
        `)
        .eq('id', params.id)
        .eq('company_id', user.profile.company_id)
        .single()

      if (error || !quote) {
        console.error('Error fetching quote for PDF:', error)
        return createApiError('Quote not found', 404)
      }

      // 회사 정보 조회
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', user.profile.company_id)
        .single()

      if (companyError || !company) {
        console.error('Error fetching company info:', companyError)
        return createApiError('Company information not found', 404)
      }

      // HTML 생성 (클라이언트에서 PDF로 변환)
      try {
        const companyInfo: CompanyInfo = {
          name: company.name,
          logo_url: company.logo_url,
          address: company.address,
          phone: company.phone,
          email: company.email,
          website: company.website,
          tax_number: company.tax_number,
          bank_info: company.bank_info
        }

        const generator = new BrowserPDFGenerator(companyInfo)
        const htmlContent = generator.generatePreview(quote as QuoteData)

        // HTML 응답 반환 (클라이언트에서 PDF로 변환)
        return new NextResponse(htmlContent, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError)
        return createApiError('Failed to generate PDF', 500)
      }

    } catch (error) {
      console.error('PDF generation error:', error)
      return createApiError('Failed to generate PDF', 500)
    }
  })
}

// POST /api/quotes/[id]/pdf - PDF 미리보기 (Base64 반환)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async ({ user, supabase }) => {
    try {
      const { preview = false } = await request.json()

      // 견적서 데이터 조회 (위와 동일)
      const { data: quote, error } = await supabase
        .from('quotes')
        .select(`
          *,
          customers(id, name, email, phone, address, contact_person),
          projects(id, name, description),
          users!quotes_created_by_fkey(id, full_name),
          quote_groups(
            id,
            title,
            sort_order,
            quote_items(
              id,
              item_name,
              description,
              quantity,
              unit_price,
              total_price,
              sort_order,
              suppliers(id, name),
              quote_item_details(
                id,
                detail_name,
                description,
                quantity,
                unit_price,
                total_price,
                sort_order
              )
            )
          )
        `)
        .eq('id', params.id)
        .eq('company_id', user.profile.company_id)
        .single()

      if (error || !quote) {
        return createApiError('Quote not found', 404)
      }

      // 회사 정보 조회
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', user.profile.company_id)
        .single()

      if (companyError || !company) {
        return createApiError('Company information not found', 404)
      }

      // HTML 생성 (미리보기용)
      try {
        const companyInfo: CompanyInfo = {
          name: company.name,
          logo_url: company.logo_url,
          address: company.address,
          phone: company.phone,
          email: company.email,
          website: company.website,
          tax_number: company.tax_number,
          bank_info: company.bank_info
        }

        const generator = new BrowserPDFGenerator(companyInfo)
        const htmlContent = generator.generatePreview(quote as QuoteData)
        
        return NextResponse.json({
          success: true,
          data: {
            html: htmlContent,
            filename: `견적서_${quote.quote_number}.pdf`
          }
        })
      } catch (pdfError) {
        console.error('PDF preview generation error:', pdfError)
        return createApiError('Failed to generate PDF preview', 500)
      }

    } catch (error) {
      console.error('PDF preview generation error:', error)
      return createApiError('Failed to generate PDF preview', 500)
    }
  })
}