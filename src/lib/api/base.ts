import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export class ApiError extends Error {
  statusCode: number
  
  constructor(message: string, statusCode: number = 500) {
    super(message)
    this.statusCode = statusCode
    this.name = 'ApiError'
  }
}

export function createApiResponse<T>(
  data?: T,
  message?: string,
  statusCode: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status: statusCode }
  )
}

export function createApiError(
  error: string,
  statusCode: number = 500
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status: statusCode }
  )
}

export async function withAuth<T = any>(
  request: NextRequest,
  handler: (params: {
    request: NextRequest
    user: any
    supabase: any
  }) => Promise<NextResponse<ApiResponse<T>>>,
  options: {
    requireAdmin?: boolean
  } = {}
): Promise<NextResponse<ApiResponse<T>>> {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient()
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session?.user) {
      return createApiError('Unauthorized', 401)
    }

    // Get user profile for role check
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile) {
      return createApiError('User profile not found', 404)
    }

    // Check admin requirement
    if (options.requireAdmin && profile.role !== 'admin') {
      return createApiError('Admin access required', 403)
    }

    return await handler({
      request,
      user: { ...session.user, profile },
      supabase
    })
  } catch (error) {
    console.error('Auth handler error:', error)
    return createApiError('Internal server error', 500)
  }
}

export function parseSearchParams(request: NextRequest): PaginationParams {
  const searchParams = request.nextUrl.searchParams
  
  return {
    page: parseInt(searchParams.get('page') || '1'),
    limit: Math.min(parseInt(searchParams.get('limit') || '10'), 100),
    sortBy: searchParams.get('sortBy') || 'created_at',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
  }
}

export async function validateRequestBody<T>(
  request: NextRequest,
  validator: (data: any) => T | Promise<T>
): Promise<T> {
  try {
    const body = await request.json()
    return await validator(body)
  } catch (error) {
    throw new ApiError('Invalid request body', 400)
  }
}