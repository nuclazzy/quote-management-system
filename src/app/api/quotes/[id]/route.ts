import { NextRequest } from 'next/server';
import {
  withAuth,
  createApiResponse,
  createApiError,
  validateRequestBody,
} from '@/lib/api/base';
import { validateQuote } from '@/lib/api/validation';

// GET /api/quotes/[id] - 특정 견적서 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async ({ user, supabase }) => {
    try {
      const { data: quote, error } = await supabase
        .from('quotes')
        .select(
          `
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
        `
        )
        .eq('id', params.id)
        .eq('company_id', user.profile.company_id)
        .single();

      if (error) {
        console.error('Error fetching quote:', error);
        return createApiError('Quote not found', 404);
      }

      return createApiResponse(quote, 'Quote fetched successfully');
    } catch (error) {
      console.error('GET /api/quotes/[id] error:', error);
      return createApiError('Internal server error', 500);
    }
  });
}

// PUT /api/quotes/[id] - 견적서 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async ({ user, supabase }) => {
    try {
      // 기존 견적서 확인
      const { data: existingQuote, error: fetchError } = await supabase
        .from('quotes')
        .select('id, status, company_id')
        .eq('id', params.id)
        .eq('company_id', user.profile.company_id)
        .single();

      if (fetchError || !existingQuote) {
        return createApiError('Quote not found', 404);
      }

      // 승인된 견적서는 수정 불가
      if (existingQuote.status === 'accepted') {
        return createApiError('Cannot modify accepted quote', 400);
      }

      const validatedData = await validateRequestBody(request, validateQuote);

      // 견적서 총액 계산
      const calculations = calculateQuoteTotals(
        validatedData.quote_groups,
        validatedData.tax_rate
      );

      // 견적서 기본 정보 업데이트
      const { data: updatedQuote, error: updateError } = await supabase
        .from('quotes')
        .update({
          title: validatedData.title,
          customer_id: validatedData.customer_id,
          project_id: validatedData.project_id,
          description: validatedData.description,
          subtotal: calculations.subtotal,
          tax_rate: validatedData.tax_rate,
          tax_amount: calculations.tax_amount,
          total: calculations.total,
          valid_until: validatedData.valid_until,
          terms: validatedData.terms,
          notes: validatedData.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating quote:', updateError);
        return createApiError('Failed to update quote', 500);
      }

      // 기존 견적서 구성 요소들 삭제
      await supabase
        .from('quote_item_details')
        .delete()
        .in(
          'quote_item_id',
          supabase.from('quote_items').select('id').eq('quote_id', params.id)
        );

      await supabase.from('quote_items').delete().eq('quote_id', params.id);
      await supabase.from('quote_groups').delete().eq('quote_id', params.id);

      // 새로운 견적서 구성 요소들 생성
      for (const group of validatedData.quote_groups) {
        const { data: quoteGroup, error: groupError } = await supabase
          .from('quote_groups')
          .insert({
            quote_id: params.id,
            title: group.title,
            sort_order: group.sort_order,
          })
          .select()
          .single();

        if (groupError) {
          console.error('Error creating quote group:', groupError);
          return createApiError('Failed to create quote group', 500);
        }

        for (const item of group.quote_items) {
          const { data: quoteItem, error: itemError } = await supabase
            .from('quote_items')
            .insert({
              quote_id: params.id,
              quote_group_id: quoteGroup.id,
              item_name: item.item_name,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.quantity * item.unit_price,
              supplier_id: item.supplier_id,
              sort_order: item.sort_order,
            })
            .select()
            .single();

          if (itemError) {
            console.error('Error creating quote item:', itemError);
            return createApiError('Failed to create quote item', 500);
          }

          for (const detail of item.quote_item_details) {
            const { error: detailError } = await supabase
              .from('quote_item_details')
              .insert({
                quote_item_id: quoteItem.id,
                detail_name: detail.detail_name,
                description: detail.description,
                quantity: detail.quantity,
                unit_price: detail.unit_price,
                total_price: detail.quantity * detail.unit_price,
                sort_order: detail.sort_order,
              });

            if (detailError) {
              console.error('Error creating quote item detail:', detailError);
              return createApiError('Failed to create quote item detail', 500);
            }
          }
        }
      }

      // 견적서 히스토리 기록
      await supabase.from('quote_history').insert({
        quote_id: params.id,
        user_id: user.id,
        action: 'updated',
        changes: {
          title: validatedData.title,
          total: calculations.total,
        },
      });

      return createApiResponse(updatedQuote, 'Quote updated successfully');
    } catch (error) {
      console.error('PUT /api/quotes/[id] error:', error);
      if (error instanceof Error) {
        return createApiError(error.message, 400);
      }
      return createApiError('Internal server error', 500);
    }
  });
}

// DELETE /api/quotes/[id] - 견적서 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async ({ user, supabase }) => {
    try {
      // 기존 견적서 확인
      const { data: existingQuote, error: fetchError } = await supabase
        .from('quotes')
        .select('id, status, company_id')
        .eq('id', params.id)
        .eq('company_id', user.profile.company_id)
        .single();

      if (fetchError || !existingQuote) {
        return createApiError('Quote not found', 404);
      }

      // 승인된 견적서는 삭제 불가
      if (existingQuote.status === 'accepted') {
        return createApiError('Cannot delete accepted quote', 400);
      }

      // 견적서 및 관련 데이터 삭제 (CASCADE로 자동 삭제됨)
      const { error: deleteError } = await supabase
        .from('quotes')
        .delete()
        .eq('id', params.id);

      if (deleteError) {
        console.error('Error deleting quote:', deleteError);
        return createApiError('Failed to delete quote', 500);
      }

      return createApiResponse(null, 'Quote deleted successfully');
    } catch (error) {
      console.error('DELETE /api/quotes/[id] error:', error);
      return createApiError('Internal server error', 500);
    }
  });
}

// PATCH /api/quotes/[id] - 견적서 상태 변경
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async ({ user, supabase }) => {
    try {
      const { status, action } = await request.json();

      if (
        !status ||
        !['draft', 'sent', 'accepted', 'rejected', 'expired'].includes(status)
      ) {
        return createApiError('Invalid status', 400);
      }

      // 기존 견적서 확인
      const { data: existingQuote, error: fetchError } = await supabase
        .from('quotes')
        .select('id, status, company_id')
        .eq('id', params.id)
        .eq('company_id', user.profile.company_id)
        .single();

      if (fetchError || !existingQuote) {
        return createApiError('Quote not found', 404);
      }

      const updateData: any = { status };

      // 상태별 추가 데이터 설정
      if (status === 'sent' && existingQuote.status === 'draft') {
        updateData.sent_at = new Date().toISOString();
      } else if (status === 'accepted') {
        updateData.accepted_at = new Date().toISOString();
      }

      // 견적서 상태 업데이트
      const { data: updatedQuote, error: updateError } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', params.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating quote status:', updateError);
        return createApiError('Failed to update quote status', 500);
      }

      // 견적서 히스토리 기록
      await supabase.from('quote_history').insert({
        quote_id: params.id,
        user_id: user.id,
        action: action || `status_changed_to_${status}`,
        changes: {
          old_status: existingQuote.status,
          new_status: status,
        },
      });

      // Notification removed - no longer needed
      // Previously notified on quote status change

      return createApiResponse(
        updatedQuote,
        'Quote status updated successfully'
      );
    } catch (error) {
      console.error('PATCH /api/quotes/[id] error:', error);
      return createApiError('Internal server error', 500);
    }
  });
}

// 견적서 총액 계산 함수 (재사용)
function calculateQuoteTotals(groups: any[], taxRate: number) {
  let subtotal = 0;

  for (const group of groups) {
    for (const item of group.quote_items) {
      let itemTotal = item.quantity * item.unit_price;

      for (const detail of item.quote_item_details) {
        itemTotal += detail.quantity * detail.unit_price;
      }

      subtotal += itemTotal;
    }
  }

  const tax_amount = subtotal * (taxRate / 100);
  const total = subtotal + tax_amount;

  return {
    subtotal: Math.round(subtotal),
    tax_amount: Math.round(tax_amount),
    total: Math.round(total),
  };
}
