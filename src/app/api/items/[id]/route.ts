import {
  createDirectApi,
  DirectQueryBuilder,
} from '@/lib/api/direct-integration';

interface Item {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  category?: string;
  sku: string;
  unit: string;
  unit_price: number;
  cost_price?: number;
  supplier_id?: string;
  min_quantity?: number;
  max_quantity?: number;
  stock_quantity: number;
  minimum_stock_level?: number;
  item_type: 'product' | 'service';
  barcode?: string;
  status?: 'active' | 'inactive';
  is_active: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

// GET /api/items/[id] - 최적화된 품목 상세 조회
export const GET = createDirectApi(
  async ({ supabase, user }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'items');
    
    const item = await queryBuilder.findOne<Item>(params.id, `
      *,
      category:item_categories(id, name),
      suppliers(id, name)
    `);
    
    if (!item || item.user_id !== user.id) {
      throw new Error('품목을 찾을 수 없습니다.');
    }

    // 공급업체 데이터 평면화
    const formattedItem = {
      ...item,
      supplier_name: (item as any).suppliers?.name || null,
    };

    return formattedItem;
  },
  { requireAuth: true, enableLogging: true }
);

// PUT /api/items/[id] - 최적화된 품목 수정
export const PUT = createDirectApi(
  async ({ supabase, user, body }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'items');
    
    // 입력 검증
    if (!body?.name?.trim()) {
      throw new Error('품목명은 필수 항목입니다.');
    }
    
    if (!body?.sku?.trim()) {
      throw new Error('SKU는 필수 항목입니다.');
    }
    
    if (!body?.unit?.trim()) {
      throw new Error('단위는 필수 항목입니다.');
    }
    
    if (body?.unit_price === undefined || body.unit_price < 0) {
      throw new Error('단가는 필수이며 0 이상이어야 합니다.');
    }

    // 기존 품목 확인 및 권한 체크
    const existingItem = await queryBuilder.findOne<Item>(params.id);
    if (!existingItem || existingItem.user_id !== user.id) {
      throw new Error('품목을 찾을 수 없습니다.');
    }

    // SKU 중복 검사 (자신 제외)
    if (body.sku.trim() !== existingItem.sku) {
      const existing = await queryBuilder.findMany<Item>({
        select: 'id',
        where: {
          sku: body.sku.trim(),
          user_id: user.id
        },
        pagination: { page: 1, limit: 1 }
      });
      
      if (existing.count > 0) {
        throw new Error('이미 사용 중인 SKU입니다.');
      }
    }

    // 카테고리 존재 확인 (제공된 경우)
    if (body.category_id) {
      const categoryQuery = new DirectQueryBuilder(supabase, 'item_categories');
      const category = await categoryQuery.findOne(body.category_id);
      if (!category) {
        throw new Error('존재하지 않는 카테고리입니다.');
      }
    }

    // 공급업체 존재 확인 (제공된 경우)
    if (body.supplier_id) {
      const supplierQuery = new DirectQueryBuilder(supabase, 'suppliers');
      const supplier = await supplierQuery.findOne(body.supplier_id);
      if (!supplier) {
        throw new Error('존재하지 않는 공급업체입니다.');
      }
    }

    // 데이터 정리 및 검증
    const itemData = {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      category_id: body.category_id || existingItem.category_id,
      category: body.category?.trim() || existingItem.category,
      sku: body.sku.trim(),
      unit: body.unit.trim(),
      unit_price: Math.max(0, Number(body.unit_price)),
      cost_price: body.cost_price ? Math.max(0, Number(body.cost_price)) : 0,
      supplier_id: body.supplier_id || null,
      min_quantity: body.min_quantity ? Math.max(0, Number(body.min_quantity)) : 0,
      max_quantity: body.max_quantity ? Math.max(0, Number(body.max_quantity)) : 0,
      stock_quantity: body.stock_quantity ? Math.max(0, Number(body.stock_quantity)) : 0,
      minimum_stock_level: body.minimum_stock_level ? Math.max(0, Number(body.minimum_stock_level)) : 0,
      item_type: body.item_type && ['product', 'service'].includes(body.item_type) ? body.item_type : existingItem.item_type,
      barcode: body.barcode?.trim() || null,
      status: body.status && ['active', 'inactive'].includes(body.status) ? body.status : 'active',
      is_active: body.status !== 'inactive',
      updated_by: user.id,
    };

    // 품목 수정
    const item = await queryBuilder.update<Item>(params.id, itemData, `
      *,
      category:item_categories(id, name),
      suppliers(id, name)
    `);

    return {
      message: '품목이 성공적으로 수정되었습니다.',
      item,
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);

// DELETE /api/items/[id] - 최적화된 품목 삭제
export const DELETE = createDirectApi(
  async ({ supabase, user }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'items');
    
    // 기존 품목 확인 및 권한 체크
    const existingItem = await queryBuilder.findOne<Item>(params.id);
    if (!existingItem || existingItem.user_id !== user.id) {
      throw new Error('품목을 찾을 수 없습니다.');
    }

    // 견적서에서 사용 중인지 확인
    const quoteItemsQuery = new DirectQueryBuilder(supabase, 'quote_items_motionsense');
    const { count: quoteItemsCount } = await quoteItemsQuery.findMany({
      select: 'id',
      where: { item_id: params.id },
      pagination: { page: 1, limit: 1 }
    });

    if (quoteItemsCount > 0) {
      throw new Error('견적서에서 사용 중인 품목은 삭제할 수 없습니다.');
    }

    // 품목 삭제
    await queryBuilder.delete(params.id);

    return {
      message: '품목이 성공적으로 삭제되었습니다.',
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);