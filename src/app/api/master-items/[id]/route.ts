import {
  createDirectApi,
  DirectQueryBuilder,
} from '@/lib/api/direct-integration';
import { masterItemUpdateSchema } from '@/lib/validations/master-items';

interface MasterItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  cost_price?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

// GET /api/master-items/[id] - 최적화된 마스터 품목 상세 조회
export const GET = createDirectApi(
  async ({ supabase }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'master_items');
    
    const masterItem = await queryBuilder.findOne<MasterItem>(params.id, `
      *,
      created_by_profile:profiles!master_items_created_by_fkey(id, full_name, email),
      updated_by_profile:profiles!master_items_updated_by_fkey(id, full_name, email)
    `);
    
    if (!masterItem) {
      throw new Error('마스터 품목을 찾을 수 없습니다.');
    }

    return { masterItem };
  },
  { requireAuth: true, enableLogging: true }
);

// PUT /api/master-items/[id] - 최적화된 마스터 품목 수정
export const PUT = createDirectApi(
  async ({ supabase, user, body }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'master_items');
    
    // 기존 마스터 품목 확인
    const existingItem = await queryBuilder.findOne<MasterItem>(params.id);
    if (!existingItem) {
      throw new Error('마스터 품목을 찾을 수 없습니다.');
    }

    // 입력 검증
    const validatedData = masterItemUpdateSchema.parse(body);
    
    // 빈 객체인 경우 처리
    if (Object.keys(validatedData).length === 0) {
      throw new Error('수정할 데이터가 없습니다.');
    }
    
    // 필드별 검증
    if (validatedData.name !== undefined && !validatedData.name?.trim()) {
      throw new Error('품목명은 필수입니다.');
    }
    
    if (validatedData.unit !== undefined && !validatedData.unit?.trim()) {
      throw new Error('단위는 필수입니다.');
    }
    
    if (validatedData.cost_price !== undefined && validatedData.cost_price < 0) {
      throw new Error('원가는 0 이상이어야 합니다.');
    }
    
    // 품목명 중복 검사 (변경된 경우만, 자신 제외)
    if (validatedData.name && validatedData.name.trim() !== existingItem.name) {
      const duplicateQuery = await queryBuilder.findMany({
        select: 'id',
        where: {
          name: validatedData.name.trim(),
          category: validatedData.category !== undefined ? validatedData.category : existingItem.category,
        },
        pagination: { page: 1, limit: 1 }
      });
      
      if (duplicateQuery.count > 0) {
        throw new Error('같은 카테고리에 이미 동일한 품목명이 존재합니다.');
      }
    }
    
    // 데이터 정리
    const updateData = {
      ...(validatedData.name !== undefined && { name: validatedData.name.trim() }),
      ...(validatedData.description !== undefined && { description: validatedData.description?.trim() || null }),
      ...(validatedData.category !== undefined && { category: validatedData.category?.trim() || null }),
      ...(validatedData.unit !== undefined && { unit: validatedData.unit.trim() }),
      ...(validatedData.cost_price !== undefined && { cost_price: validatedData.cost_price }),
      ...(validatedData.is_active !== undefined && { is_active: validatedData.is_active }),
      updated_by: user.id,
    };

    // 마스터 품목 수정
    const masterItem = await queryBuilder.update<MasterItem>(params.id, updateData, `
      *,
      created_by_profile:profiles!master_items_created_by_fkey(id, full_name, email),
      updated_by_profile:profiles!master_items_updated_by_fkey(id, full_name, email)
    `);

    return {
      message: '마스터 품목이 성공적으로 수정되었습니다.',
      masterItem,
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);

// DELETE /api/master-items/[id] - 최적화된 마스터 품목 삭제 (논리 삭제)
export const DELETE = createDirectApi(
  async ({ supabase, user }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'master_items');
    
    // 기존 마스터 품목 확인
    const existingItem = await queryBuilder.findOne<MasterItem>(params.id);
    if (!existingItem) {
      throw new Error('마스터 품목을 찾을 수 없습니다.');
    }

    // 해당 품목을 사용하는 견적서 세부내용이 있는지 확인
    const quoteDetailsQuery = new DirectQueryBuilder(supabase, 'quote_details');
    const { count: usageCount } = await quoteDetailsQuery.findMany({
      select: 'id',
      where: { master_item_id: params.id },
      pagination: { page: 1, limit: 1 }
    });

    if (usageCount > 0) {
      throw new Error('견적서에서 사용 중인 품목은 삭제할 수 없습니다. 비활성화를 권장합니다.');
    }
    
    // 논리 삭제 (is_active를 false로 설정)
    const masterItem = await queryBuilder.update<MasterItem>(params.id, {
      is_active: false,
      updated_by: user.id,
    }, `
      *,
      created_by_profile:profiles!master_items_created_by_fkey(id, full_name, email),
      updated_by_profile:profiles!master_items_updated_by_fkey(id, full_name, email)
    `);

    return {
      masterItem,
      message: '마스터 품목이 성공적으로 삭제되었습니다.',
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);