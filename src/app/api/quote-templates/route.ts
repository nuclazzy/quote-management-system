import {
  createDirectApi,
  DirectQueryBuilder,
  createPaginatedResponse,
  parsePagination,
  parseSort,
  parseSearch,
} from '@/lib/api/direct-integration';
import { quoteTemplateSchema } from '@/lib/validations/quote-templates';

interface QuoteTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  template_data: any;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

// GET /api/quote-templates - 최적화된 견적서 템플릿 목록 조회
export const GET = createDirectApi(
  async ({ supabase, searchParams }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'quote_templates');
    
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
    
    // is_active 필터 처리 - template_data내 is_active 필드 검사
    // 이 부분은 Supabase의 JSON 연산을 사용해야 하므로 별도 처리
    let query = supabase
      .from('quote_templates')
      .select('*', { count: 'exact' });
      
    // WHERE 조건 적용
    if (category) {
      query = query.eq('category', category);
    }
    
    // 검색 조건 적용
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`);
    }
    
    // is_active 필터 (기본값은 true)
    const isActive = isActiveParam !== null ? isActiveParam === 'true' : true;
    if (isActive) {
      // template_data에서 is_active가 없거나 true인 경우만 조회
      query = query.or(`template_data->>'is_active'.is.null,template_data->>'is_active'.eq.true`);
    } else {
      // is_active가 false인 경우
      query = query.eq('template_data->is_active', false);
    }
    
    // 정렬 적용
    query = query.order(sort.sortBy, { ascending: sort.sortOrder === 'asc' });
    
    // 페이지네이션 적용
    const offset = (pagination.page - 1) * pagination.limit;
    query = query.range(offset, offset + pagination.limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('견적서 템플릿 조회 오류:', error);
      throw error;
    }
    
    return createPaginatedResponse(data || [], count || 0, pagination.page, pagination.limit);
  },
  { requireAuth: true, enableLogging: true }
);

// POST /api/quote-templates - 최적화된 견적서 템플릿 생성
export const POST = createDirectApi(
  async ({ supabase, user, body }) => {
    // 입력 검증
    const validatedData = quoteTemplateSchema.parse(body);
    
    // 필수 필드 검증
    if (!validatedData.name?.trim()) {
      throw new Error('템플릿명은 필수입니다.');
    }
    
    if (!validatedData.template_data) {
      throw new Error('템플릿 데이터는 필수입니다.');
    }
    
    const queryBuilder = new DirectQueryBuilder(supabase, 'quote_templates');
    
    // 중복 템플릿명 검사
    const { count: duplicateCount } = await queryBuilder.findMany({
      select: 'id',
      where: {
        name: validatedData.name.trim(),
        category: validatedData.category || null,
      },
      pagination: { page: 1, limit: 1 }
    });
    
    if (duplicateCount > 0) {
      throw new Error('같은 카테고리에 이미 동일한 템플릿명이 존재합니다.');
    }
    
    // 데이터 정리
    const templateData = {
      name: validatedData.name.trim(),
      description: validatedData.description?.trim() || null,
      category: validatedData.category?.trim() || null,
      template_data: validatedData.template_data,
      created_by: user.id,
    };
    
    // 견적서 템플릿 생성
    const template = await queryBuilder.create<QuoteTemplate>(templateData, `
      *,
      created_by_profile:profiles!quote_templates_created_by_fkey(id, full_name, email)
    `);
    
    return {
      message: '견적서 템플릿이 성공적으로 생성되었습니다.',
      template,
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);