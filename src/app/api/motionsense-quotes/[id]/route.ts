import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../lib/base';
import { createSuccessResponse, createErrorResponse } from '../../lib/utils/response';

// GET /api/motionsense-quotes/[id] - 모션센스 견적서 개별 조회
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
          customer_id,
          customer_name_snapshot,
          issue_date,
          status,
          vat_type,
          discount_amount,
          agency_fee_rate,
          total_amount,
          version,
          parent_quote_id,
          created_by,
          created_at,
          updated_at
        `)
        .eq('id', params.id)
        .single();

      if (quoteError || !quote) {
        console.error('Error fetching motionsense quote:', quoteError);
        return createErrorResponse('견적서를 찾을 수 없습니다.', 404);
      }

      // 견적서 그룹 정보 조회
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
        return createErrorResponse('견적서 그룹 정보를 가져올 수 없습니다.', 500);
      }

      // 각 그룹의 항목 및 세부 정보 조회
      const groupsWithDetails = [];

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

        groupsWithDetails.push({
          ...group,
          items: itemsWithDetails
        });
      }

      // 최종 응답 데이터 구성
      const responseData = {
        ...quote,
        groups: groupsWithDetails
      };

      return createSuccessResponse(responseData);

    } catch (error) {
      console.error('견적서 조회 실패:', error);
      return createErrorResponse('견적서 조회에 실패했습니다.', 500);
    }
  });
}

// PUT /api/motionsense-quotes/[id] - 모션센스 견적서 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async ({ user, supabase }) => {
    try {
      const body = await request.json();
      
      // 기존 견적서 확인
      const { data: existingQuote, error: fetchError } = await supabase
        .from('quotes')
        .select('id, version')
        .eq('id', params.id)
        .single();

      if (fetchError || !existingQuote) {
        return createErrorResponse('견적서를 찾을 수 없습니다.', 404);
      }

      // 견적서 기본 정보 업데이트
      const { data: updatedQuote, error: updateError } = await supabase
        .from('quotes')
        .update({
          project_title: body.project_info?.name,
          customer_name_snapshot: body.project_info?.client_name,
          issue_date: body.project_info?.issue_date,
          vat_type: body.vat_type,
          discount_amount: body.discount_amount,
          agency_fee_rate: body.agency_fee_rate,
          total_amount: body.calculation?.final_total,
          version: existingQuote.version + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)
        .select()
        .single();

      if (updateError) {
        console.error('견적서 업데이트 실패:', updateError);
        return createErrorResponse('견적서 업데이트에 실패했습니다.', 500);
      }

      // 기존 그룹, 항목, 세부내용 삭제 (CASCADE로 자동 삭제됨)
      await supabase
        .from('quote_groups')
        .delete()
        .eq('quote_id', params.id);

      // 새로운 그룹, 항목, 세부내용 생성
      for (let groupIndex = 0; groupIndex < body.groups.length; groupIndex++) {
        const group = body.groups[groupIndex];

        // 그룹 생성
        const { data: groupData, error: groupError } = await supabase
          .from('quote_groups')
          .insert({
            quote_id: params.id,
            name: group.name,
            sort_order: groupIndex,
            include_in_fee: group.include_in_fee,
          })
          .select()
          .single();

        if (groupError) throw groupError;

        // 항목 생성
        for (let itemIndex = 0; itemIndex < group.items.length; itemIndex++) {
          const item = group.items[itemIndex];

          const { data: itemData, error: itemError } = await supabase
            .from('quote_items_motionsense')
            .insert({
              quote_group_id: groupData.id,
              name: item.name,
              sort_order: itemIndex,
            })
            .select()
            .single();

          if (itemError) throw itemError;

          // 세부내용 생성
          if (item.details && item.details.length > 0) {
            const detailsToInsert = item.details.map((detail: any) => ({
              quote_item_id: itemData.id,
              name: detail.name,
              description: detail.description || '',
              unit: detail.unit || '개',
              unit_price: detail.unit_price,
              quantity: detail.quantity,
              days: detail.days,
              is_service: detail.is_service || false,
              cost_price: detail.cost_price || 0,
              supplier_id: detail.supplier_id || null,
              supplier_name_snapshot: detail.supplier_name_snapshot || '',
            }));

            const { error: detailsError } = await supabase
              .from('quote_details')
              .insert(detailsToInsert);

            if (detailsError) throw detailsError;
          }
        }
      }

      return createSuccessResponse({
        id: params.id,
        message: '견적서가 성공적으로 수정되었습니다.',
        version: updatedQuote.version
      });

    } catch (error) {
      console.error('견적서 수정 실패:', error);
      return createErrorResponse('견적서 수정에 실패했습니다.', 500);
    }
  });
}

// DELETE /api/motionsense-quotes/[id] - 모션센스 견적서 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async ({ user, supabase }) => {
    try {
      // 견적서 존재 확인
      const { data: existingQuote, error: fetchError } = await supabase
        .from('quotes')
        .select('id, status')
        .eq('id', params.id)
        .single();

      if (fetchError || !existingQuote) {
        return createErrorResponse('견적서를 찾을 수 없습니다.', 404);
      }

      // 승인된 견적서는 삭제 불가
      if (existingQuote.status === 'accepted') {
        return createErrorResponse('승인된 견적서는 삭제할 수 없습니다.', 400);
      }

      // 견적서 삭제 (CASCADE로 관련 데이터 자동 삭제)
      const { error: deleteError } = await supabase
        .from('quotes')
        .delete()
        .eq('id', params.id);

      if (deleteError) {
        console.error('견적서 삭제 실패:', deleteError);
        return createErrorResponse('견적서 삭제에 실패했습니다.', 500);
      }

      return createSuccessResponse({
        message: '견적서가 성공적으로 삭제되었습니다.'
      });

    } catch (error) {
      console.error('견적서 삭제 실패:', error);
      return createErrorResponse('견적서 삭제에 실패했습니다.', 500);
    }
  });
}