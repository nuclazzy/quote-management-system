import {
  createDirectApi,
  DirectQueryBuilder,
} from '@/lib/api/direct-integration';

interface MotionsenseQuote {
  id: string;
  quote_number: string;
  project_title: string;
  customer_id?: string;
  customer_name_snapshot: string;
  issue_date: string;
  due_date?: string;
  status: string;
  vat_type: string;
  discount_amount: number;
  agency_fee_rate: number;
  total_amount: number;
  version: number;
  parent_quote_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// GET /api/motionsense-quotes/[id] - 최적화된 모션센스 견적서 개별 조회
export const GET = createDirectApi(
  async ({ supabase }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'quotes');
    
    // 견적서 기본 정보 조회
    const quote = await queryBuilder.findOne<MotionsenseQuote>(params.id, `
      id,
      quote_number,
      project_title,
      customer_id,
      customer_name_snapshot,
      issue_date,
      due_date,
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
    `);

    if (!quote) {
      throw new Error('견적서를 찾을 수 없습니다.');
    }

    // 견적서 그룹 정보 조회
    const groupsQueryBuilder = new DirectQueryBuilder(supabase, 'quote_groups');
    const { data: groups } = await groupsQueryBuilder.findMany({
      select: `
        id,
        name,
        sort_order,
        include_in_fee
      `,
      where: { quote_id: params.id },
      sort: { by: 'sort_order', order: 'asc' }
    });

    // 각 그룹의 항목 및 세부 정보 조회
    const groupsWithDetails = [];

    for (const group of groups) {
      // 항목 조회
      const itemsQueryBuilder = new DirectQueryBuilder(supabase, 'quote_items_motionsense');
      const { data: items } = await itemsQueryBuilder.findMany({
        select: `
          id,
          name,
          sort_order
        `,
        where: { quote_group_id: group.id },
        sort: { by: 'sort_order', order: 'asc' }
      });

      const itemsWithDetails = [];

      for (const item of items) {
        // 세부 항목 조회
        const detailsQueryBuilder = new DirectQueryBuilder(supabase, 'quote_details');
        const { data: details } = await detailsQueryBuilder.findMany({
          select: `
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
            supplier_name_snapshot,
            sort_order
          `,
          where: { quote_item_id: item.id },
          sort: { by: 'sort_order', order: 'asc' }
        });

        itemsWithDetails.push({
          ...item,
          details
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

    return { quote: responseData };
  },
  { requireAuth: true, enableLogging: true }
);

// PUT /api/motionsense-quotes/[id] - 최적화된 모션센스 견적서 수정
export const PUT = createDirectApi(
  async ({ supabase, user, body }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'quotes');
    
    // 기존 견적서 확인
    const existingQuote = await queryBuilder.findOne<MotionsenseQuote>(params.id, 'id, version');
    if (!existingQuote) {
      throw new Error('견적서를 찾을 수 없습니다.');
    }

    // 데이터 검증
    if (!body.project_info?.name?.trim()) {
      throw new Error('프로젝트명을 입력해주세요.');
    }

    if (!body.groups || !Array.isArray(body.groups) || body.groups.length === 0) {
      throw new Error('최소 하나 이상의 그룹을 추가해주세요.');
    }

    // 견적서 기본 정보 업데이트
    const updatedQuote = await queryBuilder.update<MotionsenseQuote>(params.id, {
      project_title: body.project_info.name.trim(),
      customer_name_snapshot: body.project_info?.client_name?.trim() || '',
      issue_date: body.project_info?.issue_date || new Date().toISOString().split('T')[0],
      due_date: body.project_info?.due_date || null,
      vat_type: body.vat_type || 'exclusive',
      discount_amount: body.discount_amount || 0,
      agency_fee_rate: body.agency_fee_rate || 0,
      total_amount: body.calculation?.total_with_vat || 0,
      version: existingQuote.version + 1,
    });

    // 기존 그룹, 항목, 세부내용 삭제 (CASCADE로 자동 삭제됨)
    const groupsQueryBuilder = new DirectQueryBuilder(supabase, 'quote_groups');
    await supabase
      .from('quote_groups')
      .delete()
      .eq('quote_id', params.id);

    // 새로운 그룹, 항목, 세부내용 생성
    for (let groupIndex = 0; groupIndex < body.groups.length; groupIndex++) {
      const group = body.groups[groupIndex];

      // 그룹 생성
      const groupData = await groupsQueryBuilder.create({
        quote_id: params.id,
        name: group.name.trim(),
        sort_order: groupIndex,
        include_in_fee: group.include_in_fee || false,
      });

      if (!group.items || !Array.isArray(group.items)) {
        continue;
      }

      // 항목 생성
      const itemsQueryBuilder = new DirectQueryBuilder(supabase, 'quote_items_motionsense');
      for (let itemIndex = 0; itemIndex < group.items.length; itemIndex++) {
        const item = group.items[itemIndex];

        const itemData = await itemsQueryBuilder.create({
          quote_group_id: groupData.id,
          name: item.name.trim(),
          sort_order: itemIndex,
        });

        // 세부내용 생성
        if (item.details && Array.isArray(item.details) && item.details.length > 0) {
          const detailsQueryBuilder = new DirectQueryBuilder(supabase, 'quote_details');
          for (let detailIndex = 0; detailIndex < item.details.length; detailIndex++) {
            const detail = item.details[detailIndex];
            
            await detailsQueryBuilder.create({
              quote_item_id: itemData.id,
              name: detail.name.trim(),
              description: detail.description?.trim() || '',
              unit: detail.unit || '개',
              unit_price: detail.unit_price || 0,
              quantity: detail.quantity || 1,
              days: detail.days || 1,
              is_service: detail.is_service || false,
              cost_price: detail.cost_price || 0,
              supplier_id: detail.supplier_id || null,
              supplier_name_snapshot: detail.supplier_name_snapshot || '',
              sort_order: detailIndex,
            });
          }
        }
      }
    }

    return {
      id: params.id,
      message: '견적서가 성공적으로 수정되었습니다.',
      version: updatedQuote.version
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);

// DELETE /api/motionsense-quotes/[id] - 최적화된 모션센스 견적서 삭제
export const DELETE = createDirectApi(
  async ({ supabase, user }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'quotes');
    
    // 견적서 존재 확인
    const existingQuote = await queryBuilder.findOne<MotionsenseQuote>(params.id, 'id, status');
    if (!existingQuote) {
      throw new Error('견적서를 찾을 수 없습니다.');
    }

    // 승인된 견적서는 삭제 불가
    if (existingQuote.status === 'accepted') {
      throw new Error('승인된 견적서는 삭제할 수 없습니다.');
    }

    // 견적서 삭제 (CASCADE로 관련 데이터 자동 삭제)
    await queryBuilder.delete(params.id);

    return {
      message: '견적서가 성공적으로 삭제되었습니다.'
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);