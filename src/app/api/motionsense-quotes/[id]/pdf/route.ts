import { NextRequest, NextResponse } from 'next/server';
import { withAuth, createApiError } from '@/lib/api/base';
import {
  MotionsensePDFGenerator,
  type MotionsenseQuoteWithCalculation,
  type CompanyInfo,
} from '@/lib/pdf/motionsense-generator';
import { QuoteCalculation } from '@/types/motionsense-quote';

// GET /api/motionsense-quotes/[id]/pdf - 모션센스 견적서 PDF 생성 및 다운로드
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async ({ user, supabase }) => {
    try {
      // 견적서 기본 정보 조회
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select(`
          id,
          quote_number,
          project_title,
          customer_name_snapshot,
          issue_date,
          status,
          vat_type,
          discount_amount,
          agency_fee_rate,
          total_amount,
          version,
          created_by
        `)
        .eq('id', params.id)
        .single();

      if (quoteError || !quote) {
        console.error('Error fetching motionsense quote:', quoteError);
        return createApiError('견적서를 찾을 수 없습니다.', 404);
      }

      // 견적서 그룹 정보 조회 (include_in_fee 포함)
      const { data: groups, error: groupsError } = await supabase
        .from('quote_groups')
        .select(`
          id,
          name,
          sort_order,
          include_in_fee
        `)
        .eq('quote_id', params.id)
        .order('sort_order');

      if (groupsError) {
        console.error('Error fetching quote groups:', groupsError);
        return createApiError('견적서 그룹 정보를 가져올 수 없습니다.', 500);
      }

      // 각 그룹의 항목 정보 조회
      const quotesWithDetails: any = { ...quote, groups: [] };

      for (const group of groups || []) {
        // 항목 조회
        const { data: items, error: itemsError } = await supabase
          .from('quote_items_motionsense')
          .select(`
            id,
            name,
            sort_order
          `)
          .eq('quote_group_id', group.id)
          .order('sort_order');

        if (itemsError) {
          console.error('Error fetching quote items:', itemsError);
          continue;
        }

        const itemsWithDetails = [];

        for (const item of items || []) {
          // 세부 항목 조회
          const { data: details, error: detailsError } = await supabase
            .from('quote_details')
            .select(`
              id,
              name,
              description,
              quantity,
              days,
              unit,
              unit_price,
              is_service,
              cost_price,
              supplier_id,
              supplier_name_snapshot
            `)
            .eq('quote_item_id', item.id)
            .order('id'); // sort_order가 없으므로 id로 정렬

          if (detailsError) {
            console.error('Error fetching quote details:', detailsError);
            continue;
          }

          itemsWithDetails.push({
            ...item,
            details: details || []
          });
        }

        quotesWithDetails.groups.push({
          ...group,
          items: itemsWithDetails
        });
      }

      // 계산 로직 실행 (quotesWithDetails를 기반으로)
      const calculation = calculateQuoteTotal(quotesWithDetails);

      // 회사 정보 조회
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', user.profile.company_id)
        .single();

      if (companyError || !company) {
        console.error('Error fetching company info:', companyError);
        return createApiError('회사 정보를 찾을 수 없습니다.', 404);
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
          bank_info: company.bank_info,
        };

        const quoteWithCalculation: MotionsenseQuoteWithCalculation = {
          ...quotesWithDetails,
          calculation
        };

        const generator = new MotionsensePDFGenerator(companyInfo);
        const htmlContent = generator.generatePreview(quoteWithCalculation);

        // HTML 응답 반환 (클라이언트에서 PDF로 변환)
        return new NextResponse(htmlContent, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        });
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        return createApiError('PDF 생성에 실패했습니다.', 500);
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      return createApiError('PDF 생성에 실패했습니다.', 500);
    }
  });
}

// POST /api/motionsense-quotes/[id]/pdf - PDF 미리보기 (JSON 반환)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async ({ user, supabase }) => {
    try {
      const { preview = false } = await request.json();

      // GET 메서드와 동일한 로직으로 데이터 조회
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select(`
          id,
          quote_number,
          project_title,
          customer_name_snapshot,
          issue_date,
          status,
          vat_type,
          discount_amount,
          agency_fee_rate,
          total_amount,
          version,
          created_by
        `)
        .eq('id', params.id)
        .single();

      if (quoteError || !quote) {
        return createApiError('견적서를 찾을 수 없습니다.', 404);
      }

      // 그룹 조회
      const { data: groups, error: groupsError } = await supabase
        .from('quote_groups')
        .select(`
          id,
          name,
          sort_order,
          include_in_fee
        `)
        .eq('quote_id', params.id)
        .order('sort_order');

      if (groupsError) {
        return createApiError('견적서 그룹 정보를 가져올 수 없습니다.', 500);
      }

      // 그룹별 항목 및 세부 정보 조회
      const quotesWithDetails: any = { ...quote, groups: [] };

      for (const group of groups || []) {
        const { data: items, error: itemsError } = await supabase
          .from('quote_items_motionsense')
          .select(`
            id,
            name,
            sort_order
          `)
          .eq('quote_group_id', group.id)
          .order('sort_order');

        if (itemsError) continue;

        const itemsWithDetails = [];

        for (const item of items || []) {
          const { data: details, error: detailsError } = await supabase
            .from('quote_details')
            .select(`
              id,
              name,
              description,
              quantity,
              days,
              unit,
              unit_price,
              is_service,
              cost_price,
              supplier_id,
              supplier_name_snapshot
            `)
            .eq('quote_item_id', item.id)
            .order('id');

          if (detailsError) continue;

          itemsWithDetails.push({
            ...item,
            details: details || []
          });
        }

        quotesWithDetails.groups.push({
          ...group,
          items: itemsWithDetails
        });
      }

      const calculation = calculateQuoteTotal(quotesWithDetails);

      // 회사 정보 조회
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', user.profile.company_id)
        .single();

      if (companyError || !company) {
        return createApiError('회사 정보를 찾을 수 없습니다.', 404);
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
          bank_info: company.bank_info,
        };

        const quoteWithCalculation: MotionsenseQuoteWithCalculation = {
          ...quotesWithDetails,
          calculation
        };

        const generator = new MotionsensePDFGenerator(companyInfo);
        const htmlContent = generator.generatePreview(quoteWithCalculation);

        return NextResponse.json({
          success: true,
          data: {
            html: htmlContent,
            filename: `견적서_${quote.quote_number || 'MS-' + quote.id}.pdf`,
          },
        });
      } catch (pdfError) {
        console.error('PDF preview generation error:', pdfError);
        return createApiError('PDF 미리보기 생성에 실패했습니다.', 500);
      }
    } catch (error) {
      console.error('PDF preview generation error:', error);
      return createApiError('PDF 미리보기 생성에 실패했습니다.', 500);
    }
  });
}

// 견적서 총액 계산 함수
function calculateQuoteTotal(quote: any): QuoteCalculation {
  const groups = quote.groups || [];
  
  // 그룹별 소계 계산
  const groupCalculations = groups.map((group: any) => {
    const subtotal = group.items.reduce((groupTotal: number, item: any) => {
      return groupTotal + item.details.reduce((itemTotal: number, detail: any) => {
        return itemTotal + (detail.quantity * detail.days * detail.unit_price);
      }, 0);
    }, 0);

    return {
      name: group.name,
      subtotal,
      include_in_fee: group.include_in_fee
    };
  });

  // 전체 소계
  const subtotal = groupCalculations.reduce((total, group) => total + group.subtotal, 0);

  // 대행수수료 적용 대상/미적용 구분
  const fee_applicable_amount = groupCalculations
    .filter(group => group.include_in_fee)
    .reduce((total, group) => total + group.subtotal, 0);

  const fee_excluded_amount = groupCalculations
    .filter(group => !group.include_in_fee)
    .reduce((total, group) => total + group.subtotal, 0);

  // 대행수수료 계산
  const agency_fee = fee_applicable_amount * (quote.agency_fee_rate || 0);

  // 할인 전 총액
  const total_before_vat = subtotal + agency_fee;

  // 할인 적용
  const discount_amount = quote.discount_amount || 0;
  const discounted_total = total_before_vat - discount_amount;

  // 부가세 계산 (10%)
  let vat_amount = 0;
  let final_total = 0;

  if (quote.vat_type === 'inclusive') {
    // 부가세 포함: 최종금액에서 부가세 역산
    final_total = discounted_total;
    vat_amount = Math.round(discounted_total / 1.1 * 0.1);
  } else {
    // 부가세 별도: 최종금액에 부가세 추가
    vat_amount = Math.round(discounted_total * 0.1);
    final_total = discounted_total + vat_amount;
  }

  // 원가 및 수익 계산
  const total_cost = groups.reduce((total: number, group: any) => {
    return total + group.items.reduce((groupCost: number, item: any) => {
      return groupCost + item.details.reduce((itemCost: number, detail: any) => {
        return itemCost + (detail.quantity * detail.days * (detail.cost_price || 0));
      }, 0);
    }, 0);
  }, 0);

  const total_profit = final_total - total_cost;
  const profit_margin_percentage = total_cost > 0 ? (total_profit / total_cost) * 100 : 0;
  const gross_margin_percentage = final_total > 0 ? (total_profit / final_total) * 100 : 0;

  return {
    groups: groupCalculations,
    subtotal,
    fee_applicable_amount,
    fee_excluded_amount,
    agency_fee,
    total_before_vat,
    vat_amount,
    discount_amount,
    final_total,
    total_cost,
    total_profit,
    profit_margin_percentage,
    gross_margin_percentage
  };
}