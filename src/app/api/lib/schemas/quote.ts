import { z } from 'zod'

// 견적서 세부내용 스키마
export const QuoteDetailSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, '세부내용 이름을 입력해주세요.'),
  description: z.string().optional(),
  quantity: z.number().min(0, '수량은 0 이상이어야 합니다.').default(1),
  days: z.number().min(0, '일수는 0 이상이어야 합니다.').default(1),
  unit: z.string().min(1, '단위를 입력해주세요.').default('개'),
  unit_price: z.number().min(0, '단가는 0 이상이어야 합니다.').default(0),
  is_service: z.boolean().default(false),
  cost_price: z.number().min(0, '원가는 0 이상이어야 합니다.').default(0),
  supplier_id: z.string().uuid().optional(),
  supplier_name_snapshot: z.string().optional(),
})

// 견적서 품목 스키마
export const QuoteItemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, '품목 이름을 입력해주세요.'),
  sort_order: z.number().optional(),
  include_in_fee: z.boolean().default(true),
  details: z.array(QuoteDetailSchema).min(1, '최소 하나의 세부내용이 필요합니다.'),
})

// 견적서 그룹 스키마
export const QuoteGroupSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, '그룹 이름을 입력해주세요.'),
  sort_order: z.number().optional(),
  include_in_fee: z.boolean().default(true),
  items: z.array(QuoteItemSchema).min(1, '최소 하나의 품목이 필요합니다.'),
})

// 견적서 생성/수정 스키마
export const QuoteCreateUpdateSchema = z.object({
  project_title: z.string().min(1, '프로젝트명을 입력해주세요.'),
  customer_id: z.string().uuid('유효한 고객사를 선택해주세요.').optional(),
  customer_name_snapshot: z.string().min(1, '고객사명을 입력해주세요.'),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '유효한 날짜 형식이어야 합니다 (YYYY-MM-DD).').optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'revised', 'canceled']).default('draft'),
  vat_type: z.enum(['exclusive', 'inclusive']).default('exclusive'),
  discount_amount: z.number().min(0, '할인금액은 0 이상이어야 합니다.').default(0),
  agency_fee_rate: z.number().min(0).max(100, '대행수수료율은 0-100% 사이여야 합니다.').default(0),
  notes: z.string().optional(),
  groups: z.array(QuoteGroupSchema).min(1, '최소 하나의 그룹이 필요합니다.'),
})

// 견적서 조회 필터 스키마
export const QuoteFilterSchema = z.object({
  status: z.array(z.enum(['draft', 'sent', 'accepted', 'revised', 'canceled'])).optional(),
  customer_id: z.array(z.string().uuid()).optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount_min: z.number().min(0).optional(),
  amount_max: z.number().min(0).optional(),
  created_by: z.array(z.string().uuid()).optional(),
})

// 견적서 목록 조회 쿼리 스키마
export const QuoteListQuerySchema = z.object({
  page: z.string().default('1').transform(val => Math.max(1, parseInt(val, 10))),
  per_page: z.string().default('20').transform(val => Math.min(100, Math.max(1, parseInt(val, 10)))),
  sort_by: z.enum(['created_at', 'updated_at', 'issue_date', 'total_amount', 'project_title', 'customer_name_snapshot']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  status: z.string().optional().transform(val => val ? val.split(',') : undefined),
  customer_id: z.string().optional().transform(val => val ? val.split(',') : undefined),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount_min: z.string().optional().transform(val => val ? Number(val) : undefined),
  amount_max: z.string().optional().transform(val => val ? Number(val) : undefined),
  created_by: z.string().optional().transform(val => val ? val.split(',') : undefined),
})

// 견적서 상태 변경 스키마
export const QuoteStatusUpdateSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted', 'revised', 'canceled']),
  notes: z.string().optional(),
})

// 견적서 복사 스키마
export const QuoteCopySchema = z.object({
  project_title: z.string().min(1, '새로운 프로젝트명을 입력해주세요.'),
  customer_id: z.string().uuid().optional(),
  customer_name_snapshot: z.string().min(1, '고객사명을 입력해주세요.'),
  copy_structure_only: z.boolean().default(false), // true면 구조만 복사, false면 모든 데이터 복사
})

// 견적서 PDF 생성 스키마
export const QuotePdfSchema = z.object({
  format: z.enum(['A4', 'A3']).default('A4'),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  include_cost_details: z.boolean().default(false), // 원가 정보 포함 여부
  language: z.enum(['ko', 'en']).default('ko'),
})

// 대량 작업 스키마
export const QuoteBulkActionSchema = z.object({
  action: z.enum(['delete', 'status_update', 'export']),
  quote_ids: z.array(z.string().uuid()).min(1, '최소 하나의 견적서를 선택해주세요.'),
  parameters: z.record(z.any()).optional(), // 액션별 추가 파라미터
})

// 견적서 템플릿 스키마
export const QuoteTemplateSchema = z.object({
  name: z.string().min(1, '템플릿 이름을 입력해주세요.'),
  description: z.string().optional(),
  template_data: QuoteCreateUpdateSchema.omit({ 
    project_title: true, 
    customer_id: true, 
    customer_name_snapshot: true,
    issue_date: true 
  }),
})

export type QuoteDetailInput = z.infer<typeof QuoteDetailSchema>
export type QuoteItemInput = z.infer<typeof QuoteItemSchema>
export type QuoteGroupInput = z.infer<typeof QuoteGroupSchema>
export type QuoteCreateUpdateInput = z.infer<typeof QuoteCreateUpdateSchema>
export type QuoteFilterInput = z.infer<typeof QuoteFilterSchema>
export type QuoteListQueryInput = z.infer<typeof QuoteListQuerySchema>
export type QuoteStatusUpdateInput = z.infer<typeof QuoteStatusUpdateSchema>
export type QuoteCopyInput = z.infer<typeof QuoteCopySchema>
export type QuotePdfInput = z.infer<typeof QuotePdfSchema>
export type QuoteBulkActionInput = z.infer<typeof QuoteBulkActionSchema>
export type QuoteTemplateInput = z.infer<typeof QuoteTemplateSchema>