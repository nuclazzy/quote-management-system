import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import {
  createErrorResponse,
  createSuccessResponse,
  createPaginatedResponse,
} from './utils/response';
import { withErrorHandler } from './middleware/error-handler';
import { AuthenticatedUser } from './middleware/auth';

export interface AuthContext {
  user: AuthenticatedUser;
  supabase: ReturnType<typeof createClient<Database>>;
}

/**
 * 안전한 인증된 API 핸들러
 */
export function withAuth<T = any>(
  request: NextRequest,
  handler: (context: AuthContext) => Promise<T>,
  options: { requireAdmin?: boolean } = {}
) {
  return withErrorHandler(async (req: NextRequest) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return createErrorResponse(
        'CONFIGURATION_ERROR',
        'Supabase configuration error',
        null,
        500
      );
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    // 사용자 인증 확인
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return createErrorResponse(
        'AUTHENTICATION_REQUIRED',
        '로그인이 필요합니다.',
        sessionError ? { supabase_error: sessionError.message } : null,
        401
      );
    }

    // 사용자 프로필 조회
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, is_active, company_id')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      return createErrorResponse(
        'PROFILE_NOT_FOUND',
        '사용자 정보를 찾을 수 없습니다.',
        profileError ? { supabase_error: profileError.message } : null,
        403
      );
    }

    if (!profile.company_id) {
      return createErrorResponse(
        'COMPANY_NOT_ASSIGNED',
        '회사가 할당되지 않은 계정입니다.',
        null,
        403
      );
    }

    if (!profile.is_active) {
      return createErrorResponse(
        'ACCOUNT_DEACTIVATED',
        '비활성화된 계정입니다.',
        null,
        403
      );
    }

    // 관리자 권한 확인
    if (options.requireAdmin && profile.role !== 'admin') {
      return createErrorResponse(
        'ADMIN_REQUIRED',
        '관리자 권한이 필요합니다.',
        null,
        403
      );
    }

    // 핸들러 실행
    const user: AuthenticatedUser = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      company_id: profile.company_id,
      is_active: profile.is_active,
    };

    const result = await handler({ user, supabase });

    // 결과가 이미 NextResponse인 경우 그대로 반환
    if (result && typeof result === 'object' && 'status' in result) {
      return result;
    }

    // 일반 데이터인 경우 성공 응답으로 래핑
    return createSuccessResponse(result);
  })(request);
}

/**
 * 검색 파라미터 파싱 (SQL 인젝션 방지)
 */
export function parseSearchParams(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // 페이지네이션 파라미터 (안전한 숫자 파싱)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('limit') || '20', 10))
  );

  // 정렬 파라미터 (화이트리스트 검증)
  const allowedSortFields = [
    'created_at',
    'updated_at',
    'name',
    'title',
    'status',
    'total',
  ];
  const sortBy = allowedSortFields.includes(searchParams.get('sort_by') || '')
    ? searchParams.get('sort_by')!
    : 'created_at';

  const sortOrder = searchParams.get('sort_order') === 'asc' ? 'asc' : 'desc';

  return {
    page,
    limit,
    sortBy,
    sortOrder,
    offset: (page - 1) * limit,
  };
}

/**
 * 안전한 필터 파라미터 추출
 */
export function extractFilterParams(
  request: NextRequest,
  allowedFilters: string[]
) {
  const searchParams = request.nextUrl.searchParams;
  const filters: Record<string, string> = {};

  for (const filter of allowedFilters) {
    const value = searchParams.get(filter);
    if (value && value.trim()) {
      // 기본적인 XSS 방지
      filters[filter] = value.trim().replace(/[<>]/g, '');
    }
  }

  return filters;
}

/**
 * 요청 본문 검증 및 파싱
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: (data: any) => T
): Promise<T> {
  try {
    const body = await request.json();
    return schema(body);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('잘못된 JSON 형식입니다.');
    }
    throw error;
  }
}

/**
 * 안전한 UUID 검증
 */
export function validateUUID(uuid: string, fieldName = 'ID'): string {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(uuid)) {
    throw new Error(`잘못된 ${fieldName} 형식입니다.`);
  }

  return uuid;
}

/**
 * 안전한 문자열 검증 (SQL 인젝션 방지)
 */
export function sanitizeString(str: string, maxLength = 255): string {
  if (typeof str !== 'string') {
    throw new Error('문자열이 아닙니다.');
  }

  // 기본적인 SQL 인젝션 패턴 검사
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(--|#|\/\*|\*\/)/g,
    /('|(\\')|(\\\\))/g,
  ];

  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(str)) {
      throw new Error('허용되지 않는 문자가 포함되어 있습니다.');
    }
  }

  return str.trim().substring(0, maxLength);
}

/**
 * 안전한 숫자 검증
 */
export function validateNumber(
  value: any,
  fieldName = 'number',
  options: { min?: number; max?: number; integer?: boolean } = {}
): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (typeof num !== 'number' || isNaN(num)) {
    throw new Error(`${fieldName}은(는) 유효한 숫자여야 합니다.`);
  }

  if (options.integer && !Number.isInteger(num)) {
    throw new Error(`${fieldName}은(는) 정수여야 합니다.`);
  }

  if (options.min !== undefined && num < options.min) {
    throw new Error(`${fieldName}은(는) ${options.min} 이상이어야 합니다.`);
  }

  if (options.max !== undefined && num > options.max) {
    throw new Error(`${fieldName}은(는) ${options.max} 이하여야 합니다.`);
  }

  return num;
}

/**
 * 데이터베이스 RPC 함수 호출 헬퍼
 */
export async function callRPC<T>(
  supabase: ReturnType<typeof createRouteHandlerClient<Database>>,
  functionName: string,
  params: Record<string, any> = {}
): Promise<T> {
  const { data, error } = await supabase.rpc(functionName, params);

  if (error) {
    console.error(`RPC function ${functionName} failed:`, error);
    throw new Error(
      `데이터베이스 함수 실행 중 오류가 발생했습니다: ${error.message}`
    );
  }

  return data;
}

/**
 * 페이지네이션된 응답 생성 헬퍼
 */
export function createPaginatedApiResponse<T>(
  data: T[],
  totalCount: number,
  page: number,
  limit: number,
  message?: string
) {
  return createPaginatedResponse(
    data,
    {
      page,
      per_page: limit,
      total_count: totalCount,
    },
    message
  );
}

// 자주 사용되는 에러 응답들
export const ApiErrors = {
  NotFound: (resource: string) =>
    createErrorResponse(
      'NOT_FOUND',
      `${resource}을(를) 찾을 수 없습니다.`,
      null,
      404
    ),

  ValidationError: (message: string, details?: any) =>
    createErrorResponse('VALIDATION_ERROR', message, details, 400),

  Unauthorized: (message = '인증이 필요합니다.') =>
    createErrorResponse('UNAUTHORIZED', message, null, 401),

  Forbidden: (message = '권한이 없습니다.') =>
    createErrorResponse('FORBIDDEN', message, null, 403),

  Conflict: (message: string, details?: any) =>
    createErrorResponse('CONFLICT', message, details, 409),

  InternalError: (message = '서버 내부 오류가 발생했습니다.', details?: any) =>
    createErrorResponse('INTERNAL_ERROR', message, details, 500),
};
