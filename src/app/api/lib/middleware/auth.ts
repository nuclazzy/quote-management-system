import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createErrorResponse } from '../utils/response'

export type AuthenticatedUser = {
  id: string
  email: string
  role: 'admin' | 'member'
  company_id: string
  is_active: boolean
}

export interface AuthenticatedRequest extends NextRequest {
  user: AuthenticatedUser
}

/**
 * 인증 미들웨어 - 모든 API 요청에 대한 인증 검증
 */
export async function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  options: { requireAdmin?: boolean } = {}
) {
  return async (req: NextRequest) => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        return createErrorResponse(
          'CONFIGURATION_ERROR',
          'Supabase configuration error',
          null,
          500
        )
      }

      const supabase = createClient<Database>(supabaseUrl, supabaseKey)
      
      // 사용자 인증 확인
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.user) {
        return createErrorResponse(
          'AUTHENTICATION_REQUIRED',
          '로그인이 필요합니다.',
          sessionError ? { supabase_error: sessionError.message } : null,
          401
        )
      }

      // 사용자 프로필 조회
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, role, is_active, company_id')
        .eq('id', session.user.id)
        .single()

      if (profileError || !profile) {
        return createErrorResponse(
          'PROFILE_NOT_FOUND',
          '사용자 정보를 찾을 수 없습니다.',
          profileError ? { supabase_error: profileError.message } : null,
          403
        )
      }

      if (!profile.company_id) {
        return createErrorResponse(
          'COMPANY_NOT_ASSIGNED',
          '회사가 할당되지 않은 계정입니다.',
          null,
          403
        )
      }

      if (!profile.is_active) {
        return createErrorResponse(
          'ACCOUNT_DEACTIVATED',
          '비활성화된 계정입니다.',
          null,
          403
        )
      }

      // 관리자 권한 확인
      if (options.requireAdmin && profile.role !== 'admin') {
        return createErrorResponse(
          'ADMIN_REQUIRED',
          '관리자 권한이 필요합니다.',
          null,
          403
        )
      }

      // 인증된 사용자 정보를 요청 객체에 추가
      const authenticatedReq = req as AuthenticatedRequest
      authenticatedReq.user = {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        company_id: profile.company_id,
        is_active: profile.is_active
      }

      return await handler(authenticatedReq)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return createErrorResponse(
        'AUTH_MIDDLEWARE_ERROR',
        '인증 처리 중 오류가 발생했습니다.',
        process.env.NODE_ENV === 'development' ? { error: String(error) } : null,
        500
      )
    }
  }
}

/**
 * API 키 기반 인증 (외부 시스템 연동용)
 */
export async function withApiKey(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const apiKey = req.headers.get('X-API-Key')
      const expectedApiKey = process.env.API_SECRET_KEY

      if (!apiKey || !expectedApiKey || apiKey !== expectedApiKey) {
        return NextResponse.json(
          { error: 'Unauthorized', message: '유효하지 않은 API 키입니다.' },
          { status: 401 }
        )
      }

      return await handler(req)
    } catch (error) {
      console.error('API key middleware error:', error)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'API 키 검증 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  }
}