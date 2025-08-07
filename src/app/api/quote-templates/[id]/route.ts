import {
  createDirectApi,
  DirectQueryBuilder,
} from '@/lib/api/direct-integration';
import { quoteTemplateUpdateSchema } from '@/lib/validations/quote-templates';

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

// GET /api/quote-templates/[id] - 최적화된 견적서 템플릿 상세 조회
export const GET = createDirectApi(
  async ({ supabase }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'quote_templates');
    
    const template = await queryBuilder.findOne<QuoteTemplate>(params.id, `
      *,
      created_by_profile:profiles!quote_templates_created_by_fkey(id, full_name, email),
      updated_by_profile:profiles!quote_templates_updated_by_fkey(id, full_name, email)
    `);
    
    if (!template) {
      throw new Error('견적서 템플릿을 찾을 수 없습니다.');
    }

    return { template };
  },
  { requireAuth: true, enableLogging: true }
);

// PUT /api/quote-templates/[id] - 최적화된 견적서 템플릿 수정
export const PUT = createDirectApi(
  async ({ supabase, user, body }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'quote_templates');
    
    // 기존 템플릿 확인
    const existingTemplate = await queryBuilder.findOne<QuoteTemplate>(params.id);
    if (!existingTemplate) {
      throw new Error('견적서 템플릿을 찾을 수 없습니다.');
    }

    // 입력 검증
    const validatedData = quoteTemplateUpdateSchema.parse(body);
    
    // 빈 객체인 경우 처리
    if (Object.keys(validatedData).length === 0) {
      throw new Error('수정할 데이터가 없습니다.');
    }
    
    // 필드별 검증
    if (validatedData.name !== undefined && !validatedData.name?.trim()) {
      throw new Error('템플릿명은 필수입니다.');
    }
    
    // 템플릿명 중복 검사 (변경된 경우만, 자신 제외)
    if (validatedData.name && validatedData.name.trim() !== existingTemplate.name) {
      const duplicateQuery = await queryBuilder.findMany({
        select: 'id',
        where: {
          name: validatedData.name.trim(),
          category: validatedData.category !== undefined ? validatedData.category : existingTemplate.category,
        },
        pagination: { page: 1, limit: 1 }
      });
      
      if (duplicateQuery.count > 0) {
        throw new Error('같은 카테고리에 이미 동일한 템플릿명이 존재합니다.');
      }
    }
    
    // 데이터 정리
    const updateData = {
      ...(validatedData.name !== undefined && { name: validatedData.name.trim() }),
      ...(validatedData.description !== undefined && { description: validatedData.description?.trim() || null }),
      ...(validatedData.category !== undefined && { category: validatedData.category?.trim() || null }),
      ...(validatedData.template_data !== undefined && { template_data: validatedData.template_data }),
      updated_by: user.id,
    };

    // 견적서 템플릿 수정
    const template = await queryBuilder.update<QuoteTemplate>(params.id, updateData, `
      *,
      created_by_profile:profiles!quote_templates_created_by_fkey(id, full_name, email),
      updated_by_profile:profiles!quote_templates_updated_by_fkey(id, full_name, email)
    `);

    return {
      message: '견적서 템플릿이 성공적으로 수정되었습니다.',
      template,
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);

// DELETE /api/quote-templates/[id] - 최적화된 견적서 템플릿 삭제 (물리 삭제)
export const DELETE = createDirectApi(
  async ({ supabase, user }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'quote_templates');
    
    // 기존 템플릿 확인
    const existingTemplate = await queryBuilder.findOne<QuoteTemplate>(params.id);
    if (!existingTemplate) {
      throw new Error('견적서 템플릿을 찾을 수 없습니다.');
    }

    // 템플릿을 사용하는 견적서가 있는지 확인
    const quotesQuery = new DirectQueryBuilder(supabase, 'quotes');
    const { count: usageCount } = await quotesQuery.findMany({
      select: 'id',
      where: { template_id: params.id },
      pagination: { page: 1, limit: 1 }
    });

    if (usageCount > 0) {
      throw new Error('사용 중인 템플릿은 삭제할 수 없습니다.');
    }
    
    // 물리적 삭제 (템플릿은 하드 삭제)
    await queryBuilder.delete(params.id);

    return {
      message: '견적서 템플릿이 성공적으로 삭제되었습니다.',
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);