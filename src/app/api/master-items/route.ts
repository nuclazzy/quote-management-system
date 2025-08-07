import {
  createDirectApi,
  DirectQueryBuilder,
  createPaginatedResponse,
  parsePagination,
  parseSort,
  parseSearch,
} from '@/lib/api/direct-integration';
import { masterItemSchema } from '@/lib/validations/master-items';

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

// GET /api/master-items - 최적화된 마스터 품목 목록 조회
export const GET = createDirectApi(
  async ({ supabase, searchParams }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'master_items');
    
    // 파라미터 파싱
    const pagination = parsePagination(searchParams);
    const sort = parseSort(searchParams, ['name', 'category', 'created_at', 'updated_at']);
    const searchTerm = searchParams.get('search')?.trim() || '';
    const category = searchParams.get('category') || '';
    const isActiveParam = searchParams.get('is_active');
    
    // 검색 조건 구성
    const searchCondition = searchTerm ? {
      fields: ['name', 'description', 'category'],
      term: searchTerm
    } : undefined;
    
    // WHERE 조건
    const where: Record<string, any> = {};
    if (category) where.category = category;
    if (isActiveParam !== null) where.is_active = isActiveParam === 'true';
    
    // 데이터 조회
    const { data, count } = await queryBuilder.findMany<MasterItem>({
      select: `
        *,
        created_by_profile:profiles!master_items_created_by_fkey(id, full_name, email)
      `,
      where,
      search: searchCondition,
      sort: { by: sort.sortBy, order: sort.sortOrder as 'asc' | 'desc' },
      pagination,
    });
    
    return createPaginatedResponse(data, count, pagination.page, pagination.limit);
  },
  { requireAuth: true, enableLogging: true }
);

// POST /api/master-items - 최적화된 마스터 품목 생성
export const POST = createDirectApi(
  async ({ supabase, user, body }) => {
    // 입력 검증
    const validatedData = masterItemSchema.parse(body);
    
    // 필수 필드 검증
    if (!validatedData.name?.trim()) {
      throw new Error('품목명은 필수입니다.');
    }
    
    if (!validatedData.unit?.trim()) {
      throw new Error('단위는 필수입니다.');
    }
    
    // 원가 검증
    if (validatedData.cost_price && validatedData.cost_price < 0) {
      throw new Error('원가는 0 이상이어야 합니다.');
    }
    
    const queryBuilder = new DirectQueryBuilder(supabase, 'master_items');
    
    // 중복 품목명 검사 (같은 카테고리 내에서)
    const { count: duplicateCount } = await queryBuilder.findMany({
      select: 'id',
      where: {
        name: validatedData.name.trim(),
        category: validatedData.category || null,
      },
      pagination: { page: 1, limit: 1 }
    });
    
    if (duplicateCount > 0) {
      throw new Error('같은 카테고리에 이미 동일한 품목명이 존재합니다.');
    }
    
    // 데이터 정리
    const masterItemData = {
      name: validatedData.name.trim(),
      description: validatedData.description?.trim() || null,
      category: validatedData.category?.trim() || null,
      unit: validatedData.unit.trim(),
      cost_price: validatedData.cost_price || null,
      is_active: validatedData.is_active !== undefined ? validatedData.is_active : true,
      created_by: user.id,
    };
    
    // 마스터 품목 생성
    const masterItem = await queryBuilder.create<MasterItem>(masterItemData, `
      *,
      created_by_profile:profiles!master_items_created_by_fkey(id, full_name, email)
    `);
    
    return {
      message: '마스터 품목이 성공적으로 생성되었습니다.',
      masterItem,
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);