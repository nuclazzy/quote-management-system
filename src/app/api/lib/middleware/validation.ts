import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export type ValidationSchema = z.ZodSchema<any>

/**
 * 요청 본문 검증 미들웨어
 */
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (req: NextRequest, validatedData: T) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      let body
      try {
        body = await req.json()
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Bad Request',
            message: '유효하지 않은 JSON 형식입니다.',
            details: { parseError: 'Invalid JSON' }
          },
          { status: 400 }
        )
      }

      const result = schema.safeParse(body)
      
      if (!result.success) {
        const errorDetails = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))

        return NextResponse.json(
          {
            error: 'Validation Error',
            message: '요청 데이터가 유효하지 않습니다.',
            details: errorDetails
          },
          { status: 400 }
        )
      }

      return await handler(req, result.data)
    } catch (error) {
      console.error('Validation middleware error:', error)
      return NextResponse.json(
        { error: 'Internal Server Error', message: '검증 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  }
}

/**
 * 쿼리 파라미터 검증 미들웨어
 */
export function withQueryValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (req: NextRequest, validatedQuery: T) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const url = new URL(req.url)
      const queryParams = Object.fromEntries(url.searchParams.entries())

      const result = schema.safeParse(queryParams)
      
      if (!result.success) {
        const errorDetails = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))

        return NextResponse.json(
          {
            error: 'Validation Error',
            message: '쿼리 파라미터가 유효하지 않습니다.',
            details: errorDetails
          },
          { status: 400 }
        )
      }

      return await handler(req, result.data)
    } catch (error) {
      console.error('Query validation middleware error:', error)
      return NextResponse.json(
        { error: 'Internal Server Error', message: '쿼리 검증 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  }
}

// 공통 검증 스키마들
export const PaginationSchema = z.object({
  page: z.string().default('1').transform(val => parseInt(val, 10)),
  per_page: z.string().default('20').transform(val => Math.min(parseInt(val, 10), 100)),
})

export const SortSchema = z.object({
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
})

export const SearchSchema = z.object({
  search: z.string().optional(),
})

export const IdParamSchema = z.object({
  id: z.string().uuid('유효한 UUID 형식이어야 합니다.'),
})

/**
 * 복합 검증 미들웨어
 */
export function withBodyAndQueryValidation<TBody, TQuery>(
  bodySchema: z.ZodSchema<TBody>,
  querySchema: z.ZodSchema<TQuery>,
  handler: (req: NextRequest, data: { body: TBody; query: TQuery }) => Promise<NextResponse>
) {
  return withValidation(bodySchema, async (req, body) => {
    return withQueryValidation(querySchema, async (req, query) => {
      return handler(req, { body, query })
    })(req)
  })
}