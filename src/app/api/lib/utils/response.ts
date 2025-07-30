import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  request_id?: string;
}

export interface PaginatedApiResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
}

/**
 * 고유한 요청 ID 생성
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 성공 응답 생성
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status = 200,
  requestId?: string
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    request_id: requestId || generateRequestId(),
  };

  return NextResponse.json(response, { status });
}

/**
 * 페이지네이션 응답 생성
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
  },
  message?: string
): NextResponse {
  const total_pages = Math.ceil(pagination.total_count / pagination.per_page);

  const response: PaginatedApiResponse<T> = {
    success: true,
    data,
    message,
    pagination: {
      ...pagination,
      total_pages,
      has_next_page: pagination.page < total_pages,
      has_prev_page: pagination.page > 1,
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: 200 });
}

/**
 * 에러 응답 생성
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: any,
  status = 400,
  requestId?: string
): NextResponse {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
    request_id: requestId || generateRequestId(),
  };

  // 에러 로깅 (운영 환경에서는 외부 로깅 서비스로 전송)
  if (status >= 500) {
    console.error(`[${response.request_id}] Server Error:`, {
      code,
      message,
      details,
      timestamp: response.timestamp,
    });
  }

  return NextResponse.json(response, { status });
}

/**
 * 생성 성공 응답
 */
export function createCreatedResponse<T>(
  data: T,
  message = '성공적으로 생성되었습니다.'
): NextResponse {
  return createSuccessResponse(data, message, 201);
}

/**
 * 업데이트 성공 응답
 */
export function createUpdatedResponse<T>(
  data: T,
  message = '성공적으로 업데이트되었습니다.'
): NextResponse {
  return createSuccessResponse(data, message, 200);
}

/**
 * 삭제 성공 응답
 */
export function createDeletedResponse(
  message = '성공적으로 삭제되었습니다.'
): NextResponse {
  return createSuccessResponse(null, message, 200);
}

/**
 * 유효하지 않은 요청 응답
 */
export function createBadRequestResponse(
  message: string,
  details?: any
): NextResponse {
  return createErrorResponse('BAD_REQUEST', message, details, 400);
}

/**
 * 인증 오류 응답
 */
export function createUnauthorizedResponse(
  message = '인증이 필요합니다.'
): NextResponse {
  return createErrorResponse('UNAUTHORIZED', message, null, 401);
}

/**
 * 권한 없음 응답
 */
export function createForbiddenResponse(
  message = '권한이 없습니다.'
): NextResponse {
  return createErrorResponse('FORBIDDEN', message, null, 403);
}

/**
 * 찾을 수 없음 응답
 */
export function createNotFoundResponse(resource: string): NextResponse {
  return createErrorResponse(
    'NOT_FOUND',
    `${resource}을(를) 찾을 수 없습니다.`,
    null,
    404
  );
}

/**
 * 충돌 응답
 */
export function createConflictResponse(
  message: string,
  details?: any
): NextResponse {
  return createErrorResponse('CONFLICT', message, details, 409);
}

/**
 * 서버 오류 응답
 */
export function createInternalErrorResponse(
  message = '서버 내부 오류가 발생했습니다.',
  details?: any
): NextResponse {
  return createErrorResponse('INTERNAL_SERVER_ERROR', message, details, 500);
}

/**
 * 메서드 허용 안함 응답
 */
export function createMethodNotAllowedResponse(
  allowedMethods: string[]
): NextResponse {
  const response = createErrorResponse(
    'METHOD_NOT_ALLOWED',
    `허용되지 않는 메서드입니다. 허용된 메서드: ${allowedMethods.join(', ')}`,
    { allowedMethods },
    405
  );

  response.headers.set('Allow', allowedMethods.join(', '));
  return response;
}

/**
 * CORS 헤더 추가
 */
export function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-API-Key'
  );
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

/**
 * 캐시 헤더 추가
 */
export function addCacheHeaders(
  response: NextResponse,
  maxAge: number = 0,
  staleWhileRevalidate: number = 0
): NextResponse {
  if (maxAge > 0) {
    const cacheControl =
      staleWhileRevalidate > 0
        ? `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
        : `public, max-age=${maxAge}`;

    response.headers.set('Cache-Control', cacheControl);
  } else {
    response.headers.set(
      'Cache-Control',
      'no-cache, no-store, must-revalidate'
    );
  }

  return response;
}
