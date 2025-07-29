import { NextRequest, NextResponse } from 'next/server'
import { createErrorResponse } from '../utils/response'

export interface ApiError extends Error {
  statusCode?: number
  code?: string
  details?: any
}

export class BusinessError extends Error {
  public statusCode: number
  public code: string
  public details?: any

  constructor(message: string, statusCode = 400, code = 'BUSINESS_ERROR', details?: any) {
    super(message)
    this.name = 'BusinessError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export class ValidationError extends Error {
  public statusCode = 400
  public code = 'VALIDATION_ERROR'
  public details: any

  constructor(message: string, details: any) {
    super(message)
    this.name = 'ValidationError'
    this.details = details
  }
}

export class NotFoundError extends Error {
  public statusCode = 404
  public code = 'NOT_FOUND'

  constructor(resource: string) {
    super(`${resource}을(를) 찾을 수 없습니다.`)
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends Error {
  public statusCode = 401
  public code = 'UNAUTHORIZED'

  constructor(message = '인증이 필요합니다.') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  public statusCode = 403
  public code = 'FORBIDDEN'

  constructor(message = '권한이 없습니다.') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

/**
 * 글로벌 에러 핸들러 미들웨어
 */
export function withErrorHandler(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const requestId = generateRequestId()
    
    try {
      return await handler(req)
    } catch (error) {
      // 구조화된 에러 로깅
      const errorContext = {
        request_id: requestId,
        url: req.url,
        method: req.method,
        user_agent: req.headers.get('user-agent'),
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        } : String(error)
      }

      console.error('API Error:', errorContext)

      // 알려진 에러 타입들 처리
      if (error instanceof BusinessError || 
          error instanceof ValidationError || 
          error instanceof NotFoundError ||
          error instanceof UnauthorizedError ||
          error instanceof ForbiddenError) {
        return createErrorResponse(
          error.code,
          error.message,
          error.details,
          error.statusCode,
          requestId
        )
      }

      // Supabase 에러 처리
      if (isSupabaseError(error)) {
        return handleSupabaseError(error, requestId)
      }

      // 기본 에러 응답
      const isDevelopment = process.env.NODE_ENV === 'development'
      
      return createErrorResponse(
        'INTERNAL_SERVER_ERROR',
        '서버 내부 오류가 발생했습니다.',
        isDevelopment ? {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        } : null,
        500,
        requestId
      )
    }
  }
}

/**
 * 요청 ID 생성 함수
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Supabase 에러 판별
 */
function isSupabaseError(error: any): boolean {
  return error && (
    error.code ||
    error.details ||
    error.hint ||
    (typeof error.message === 'string' && error.message.includes('supabase'))
  )
}

/**
 * Supabase 에러 처리
 */
function handleSupabaseError(error: any, requestId: string): NextResponse {
  console.error(`[${requestId}] Supabase Error:`, error)

  // 흔한 Supabase 에러 코드들 매핑
  const errorMappings: Record<string, { status: number; message: string; code: string }> = {
    '23505': { status: 409, message: '중복된 데이터입니다.', code: 'DUPLICATE_DATA' },
    '23503': { status: 400, message: '참조 무결성 오류입니다.', code: 'FOREIGN_KEY_VIOLATION' },
    '23502': { status: 400, message: '필수 필드가 누락되었습니다.', code: 'NOT_NULL_VIOLATION' },
    '42P01': { status: 500, message: '테이블을 찾을 수 없습니다.', code: 'UNDEFINED_TABLE' },
    'PGRST116': { status: 404, message: '데이터를 찾을 수 없습니다.', code: 'NOT_FOUND' },
    'PGRST301': { status: 403, message: '접근 권한이 없습니다.', code: 'INSUFFICIENT_PRIVILEGE' }
  }

  const mapping = errorMappings[error.code]
  if (mapping) {
    return createErrorResponse(
      mapping.code,
      mapping.message,
      process.env.NODE_ENV === 'development' ? {
        database_code: error.code,
        details: error.details,
        hint: error.hint
      } : null,
      mapping.status,
      requestId
    )
  }

  // 기본 데이터베이스 에러 응답
  return createErrorResponse(
    'DATABASE_ERROR',
    '데이터베이스 오류가 발생했습니다.',
    process.env.NODE_ENV === 'development' ? error : null,
    500,
    requestId
  )
}

/**
 * 성공 응답 헬퍼
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    },
    { status }
  )
}

/**
 * 페이지네이션 응답 헬퍼
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: {
    page: number
    per_page: number
    total_count: number
    total_pages: number
  },
  message?: string
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      pagination,
      message,
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  )
}