import { z } from 'zod';

// 마스터 품목 생성/수정을 위한 Zod 스키마
export const masterItemSchema = z.object({
  name: z.string().min(1, '품목명은 필수입니다').max(255, '품목명은 255자 이하여야 합니다'),
  description: z.string().optional(),
  default_unit_price: z.number().min(0, '기본 단가는 0 이상이어야 합니다'),
  default_unit: z.string().min(1, '단위는 필수입니다').max(50, '단위는 50자 이하여야 합니다'),
  category: z.string().min(1, '카테고리는 필수입니다').max(100, '카테고리는 100자 이하여야 합니다'),
  is_active: z.boolean().default(true),
});

// 마스터 품목 업데이트를 위한 스키마 (부분 업데이트 허용)
export const masterItemUpdateSchema = masterItemSchema.partial();

// 마스터 품목 쿼리 파라미터 스키마
export const masterItemQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  is_active: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

// 타입 내보내기
export type MasterItemInput = z.infer<typeof masterItemSchema>;
export type MasterItemUpdateInput = z.infer<typeof masterItemUpdateSchema>;
export type MasterItemQuery = z.infer<typeof masterItemQuerySchema>;