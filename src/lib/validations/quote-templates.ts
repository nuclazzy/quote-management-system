import { z } from 'zod';

// 견적서 템플릿의 세부 항목 스키마
export const quoteDetailTemplateSchema = z.object({
  name: z.string().min(1, '세부 항목명은 필수입니다'),
  quantity: z.number().min(0.01, '수량은 0보다 커야 합니다'),
  days: z.number().min(0.01, '일수는 0보다 커야 합니다'),
  unit_price: z.number().min(0, '단가는 0 이상이어야 합니다'),
});

// 견적서 템플릿의 품목 스키마
export const quoteItemTemplateSchema = z.object({
  name: z.string().min(1, '품목명은 필수입니다'),
  include_in_fee: z.boolean().default(true),
  details: z.array(quoteDetailTemplateSchema).min(1, '최소 1개의 세부 항목이 필요합니다'),
});

// 견적서 템플릿의 그룹 스키마
export const quoteGroupTemplateSchema = z.object({
  name: z.string().min(1, '그룹명은 필수입니다'),
  include_in_fee: z.boolean().default(true),
  items: z.array(quoteItemTemplateSchema).min(1, '최소 1개의 품목이 필요합니다'),
});

// 견적서 템플릿 데이터 스키마
export const quoteTemplateDataSchema = z.object({
  groups: z.array(quoteGroupTemplateSchema).min(1, '최소 1개의 그룹이 필요합니다'),
});

// 견적서 템플릿 생성/수정을 위한 Zod 스키마
export const quoteTemplateSchema = z.object({
  name: z.string().min(1, '템플릿명은 필수입니다').max(255, '템플릿명은 255자 이하여야 합니다'),
  description: z.string().optional(),
  category: z.string().min(1, '카테고리는 필수입니다').max(100, '카테고리는 100자 이하여야 합니다'),
  template_data: quoteTemplateDataSchema,
  is_active: z.boolean().default(true),
});

// 견적서 템플릿 업데이트를 위한 스키마 (부분 업데이트 허용)
export const quoteTemplateUpdateSchema = quoteTemplateSchema.partial();

// 견적서 템플릿 쿼리 파라미터 스키마
export const quoteTemplateQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  is_active: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

// 타입 내보내기
export type QuoteTemplateInput = z.infer<typeof quoteTemplateSchema>;
export type QuoteTemplateUpdateInput = z.infer<typeof quoteTemplateUpdateSchema>;
export type QuoteTemplateQuery = z.infer<typeof quoteTemplateQuerySchema>;
export type QuoteDetailTemplateInput = z.infer<typeof quoteDetailTemplateSchema>;
export type QuoteItemTemplateInput = z.infer<typeof quoteItemTemplateSchema>;
export type QuoteGroupTemplateInput = z.infer<typeof quoteGroupTemplateSchema>;