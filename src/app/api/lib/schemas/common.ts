import { z } from 'zod'

// 고객사 스키마
export const CustomerSchema = z.object({
  name: z.string().min(1, '고객사명을 입력해주세요.').max(100, '고객사명은 100자를 초과할 수 없습니다.'),
  contact_person: z.string().max(50, '담당자명은 50자를 초과할 수 없습니다.').optional(),
  phone: z.string().regex(/^[0-9-+\s()]+$/, '유효한 전화번호 형식이어야 합니다.').max(20, '전화번호는 20자를 초과할 수 없습니다.').optional(),
  email: z.string().email('유효한 이메일 형식이어야 합니다.').max(100, '이메일은 100자를 초과할 수 없습니다.').optional(),
  business_number: z.string().regex(/^\d{3}-\d{2}-\d{5}$/, '사업자등록번호는 000-00-00000 형식이어야 합니다.').optional(),
  address: z.string().max(200, '주소는 200자를 초과할 수 없습니다.').optional(),
  memo: z.string().max(500, '메모는 500자를 초과할 수 없습니다.').optional(),
  is_active: z.boolean().default(true),
})

// 공급업체 스키마
export const SupplierSchema = z.object({
  name: z.string().min(1, '공급업체명을 입력해주세요.').max(100, '공급업체명은 100자를 초과할 수 없습니다.'),
  contact_person: z.string().max(50, '담당자명은 50자를 초과할 수 없습니다.').optional(),
  phone: z.string().regex(/^[0-9-+\s()]+$/, '유효한 전화번호 형식이어야 합니다.').max(20, '전화번호는 20자를 초과할 수 없습니다.').optional(),
  email: z.string().email('유효한 이메일 형식이어야 합니다.').max(100, '이메일은 100자를 초과할 수 없습니다.').optional(),
  memo: z.string().max(500, '메모는 500자를 초과할 수 없습니다.').optional(),
  is_active: z.boolean().default(true),
})

// 마스터 품목 스키마
export const MasterItemSchema = z.object({
  name: z.string().min(1, '품목명을 입력해주세요.').max(100, '품목명은 100자를 초과할 수 없습니다.'),
  description: z.string().max(500, '설명은 500자를 초과할 수 없습니다.').optional(),
  default_unit_price: z.number().min(0, '기본 단가는 0 이상이어야 합니다.').default(0),
  default_unit: z.string().min(1, '기본 단위를 입력해주세요.').max(20, '단위는 20자를 초과할 수 없습니다.').default('개'),
  is_active: z.boolean().default(true),
})

// 프로젝트 스키마
export const ProjectSchema = z.object({
  name: z.string().min(1, '프로젝트명을 입력해주세요.').max(100, '프로젝트명은 100자를 초과할 수 없습니다.'),
  quote_id: z.string().uuid('유효한 견적서를 선택해주세요.'),
  status: z.enum(['active', 'completed', 'on_hold', 'canceled']).default('active'),
  parent_project_id: z.string().uuid().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '유효한 날짜 형식이어야 합니다 (YYYY-MM-DD).').optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '유효한 날짜 형식이어야 합니다 (YYYY-MM-DD).').optional(),
})

// 거래 내역 스키마
export const TransactionSchema = z.object({
  project_id: z.string().uuid('유효한 프로젝트를 선택해주세요.'),
  type: z.enum(['income', 'expense']),
  partner_name: z.string().min(1, '거래처명을 입력해주세요.').max(100, '거래처명은 100자를 초과할 수 없습니다.'),
  item_name: z.string().min(1, '거래 항목명을 입력해주세요.').max(100, '항목명은 100자를 초과할 수 없습니다.'),
  amount: z.number().min(0, '거래 금액은 0 이상이어야 합니다.'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '유효한 날짜 형식이어야 합니다 (YYYY-MM-DD).').optional(),
  status: z.enum(['pending', 'processing', 'completed', 'issue']).default('pending'),
  tax_invoice_status: z.enum(['not_issued', 'issued', 'received']).default('not_issued'),
  notes: z.string().max(500, '메모는 500자를 초과할 수 없습니다.').optional(),
})

// 프로젝트 경비 스키마
export const ProjectExpenseSchema = z.object({
  project_id: z.string().uuid('유효한 프로젝트를 선택해주세요.'),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '유효한 날짜 형식이어야 합니다 (YYYY-MM-DD).').default(() => new Date().toISOString().split('T')[0]),
  description: z.string().min(1, '경비 내용을 입력해주세요.').max(200, '경비 내용은 200자를 초과할 수 없습니다.'),
  amount: z.number().min(0, '경비 금액은 0 이상이어야 합니다.'),
  receipt_url: z.string().url('유효한 URL 형식이어야 합니다.').optional(),
})

// 공통 목록 조회 쿼리 스키마
export const ListQuerySchema = z.object({
  page: z.string().default('1').transform(val => Math.max(1, parseInt(val, 10))),
  per_page: z.string().default('20').transform(val => Math.min(100, Math.max(1, parseInt(val, 10)))),
  sort_by: z.string().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  is_active: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
})

// ID 파라미터 스키마
export const IdParamSchema = z.object({
  id: z.string().uuid('유효한 UUID 형식이어야 합니다.'),
})

// 대량 작업 스키마
export const BulkActionSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'delete']),
  ids: z.array(z.string().uuid()).min(1, '최소 하나의 항목을 선택해주세요.').max(100, '한 번에 최대 100개 항목까지 처리할 수 있습니다.'),
})

// 내보내기 스키마
export const ExportSchema = z.object({
  format: z.enum(['csv', 'excel']).default('csv'),
  fields: z.array(z.string()).optional(), // 내보낼 필드 선택
  filters: z.record(z.any()).optional(), // 필터 조건
})

export type CustomerInput = z.infer<typeof CustomerSchema>
export type SupplierInput = z.infer<typeof SupplierSchema>
export type MasterItemInput = z.infer<typeof MasterItemSchema>
export type ProjectInput = z.infer<typeof ProjectSchema>
export type TransactionInput = z.infer<typeof TransactionSchema>
export type ProjectExpenseInput = z.infer<typeof ProjectExpenseSchema>
export type ListQueryInput = z.infer<typeof ListQuerySchema>
export type IdParamInput = z.infer<typeof IdParamSchema>
export type BulkActionInput = z.infer<typeof BulkActionSchema>
export type ExportInput = z.infer<typeof ExportSchema>