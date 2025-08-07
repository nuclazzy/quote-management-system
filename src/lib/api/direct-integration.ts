// 직접 연동 최적화 라이브러리
import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/secure-middleware';

/**
 * 직접 연동 최적화된 API 핸들러
 * - 단일 인증 검증
 * - 직접 Supabase 쿼리
 * - 최소한의 오버헤드
 */

interface DirectApiConfig {
  requireAuth?: boolean;
  requiredRole?: 'admin' | 'member';
  requirePermissions?: string[];
  enableLogging?: boolean;
  enableCaching?: boolean;
}

interface DirectApiContext extends AuthContext {
  searchParams: URLSearchParams;
  body?: any;
}

type DirectApiHandler<T = any> = (context: DirectApiContext) => Promise<T>;

/**
 * 직접 연동 API 래퍼 - 최적화된 성능
 */
export function createDirectApi<T = any>(
  handler: DirectApiHandler<T>,
  config: DirectApiConfig = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = performance.now();
    
    // URL 파라미터 미리 파싱
    const searchParams = new URL(request.url).searchParams;
    
    // 인증이 필요한 경우
    if (config.requireAuth !== false) {
      return withAuth(
        request,
        async (authContext) => {
          // 요청 본문 파싱 (필요한 경우만)
          let body = undefined;
          if (request.method !== 'GET' && request.method !== 'DELETE') {
            try {
              body = await request.json();
            } catch {
              body = undefined;
            }
          }

          const context: DirectApiContext = {
            ...authContext,
            searchParams,
            body,
          };

          const result = await handler(context);
          
          // 성능 로깅
          if (config.enableLogging) {
            const duration = performance.now() - startTime;
            console.log(`[DirectAPI] ${request.method} ${request.url} - ${duration.toFixed(2)}ms`);
          }

          return NextResponse.json({
            success: true,
            data: result,
            meta: {
              timestamp: new Date().toISOString(),
              ...(config.enableLogging && { duration: performance.now() - startTime })
            }
          });
        },
        {
          requireMinimumRole: config.requiredRole,
          requirePermissions: config.requirePermissions,
        }
      );
    }

    // 인증이 불필요한 경우 (공개 API)
    const supabase = createServerClient();
    const context: DirectApiContext = {
      user: null as any,
      supabase,
      searchParams,
      body: request.method !== 'GET' ? await request.json().catch(() => undefined) : undefined,
    };

    const result = await handler(context);
    return NextResponse.json({ success: true, data: result });
  };
}

/**
 * 페이지네이션 헬퍼
 */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

/**
 * 정렬 헬퍼
 */
export function parseSort(searchParams: URLSearchParams, allowedColumns: string[]) {
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
  
  // 보안: 허용된 컬럼만 정렬 가능
  const safeSortBy = allowedColumns.includes(sortBy) ? sortBy : 'created_at';
  
  return { sortBy: safeSortBy, sortOrder };
}

/**
 * 검색 필터 헬퍼
 */
export function parseSearch(searchParams: URLSearchParams, searchFields: string[]) {
  const search = searchParams.get('search');
  if (!search || search.trim() === '') return null;
  
  const cleanSearch = search.trim().slice(0, 100); // 길이 제한
  const orConditions = searchFields.map(field => `${field}.ilike.%${cleanSearch}%`);
  
  return orConditions.join(',');
}

/**
 * 표준 응답 포맷
 */
export interface StandardResponse<T = any> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    timestamp: string;
    duration?: number;
  };
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * 페이지네이션 응답 생성
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): StandardResponse<T[]> {
  return {
    success: true,
    data,
    meta: {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * 에러 응답 생성
 */
export function createErrorResponse(
  message: string,
  code?: string,
  statusCode = 400
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: { message, code },
      meta: { timestamp: new Date().toISOString() },
    },
    { status: statusCode }
  );
}

/**
 * 직접 연동 쿼리 빌더
 */
export class DirectQueryBuilder {
  constructor(
    private supabase: ReturnType<typeof createServerClient>,
    private table: string
  ) {}

  /**
   * 기본 CRUD 작업을 위한 최적화된 쿼리
   */
  async findMany<T>(options: {
    select?: string;
    where?: Record<string, any>;
    search?: { fields: string[]; term: string };
    sort?: { by: string; order: 'asc' | 'desc' };
    pagination?: { page: number; limit: number };
  }): Promise<{ data: T[]; count: number }> {
    let query = this.supabase
      .from(this.table)
      .select(options.select || '*', { count: 'exact' });

    // WHERE 조건
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // 검색
    if (options.search && options.search.term) {
      const searchConditions = options.search.fields
        .map(field => `${field}.ilike.%${options.search!.term}%`)
        .join(',');
      query = query.or(searchConditions);
    }

    // 정렬
    if (options.sort) {
      query = query.order(options.sort.by, { ascending: options.sort.order === 'asc' });
    }

    // 페이지네이션
    if (options.pagination) {
      const { page, limit } = options.pagination;
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return { data: data as T[], count: count || 0 };
  }

  /**
   * 단일 레코드 조회
   */
  async findOne<T>(id: string, select = '*'): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select(select)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as T;
  }

  /**
   * 레코드 생성
   */
  async create<T>(data: Partial<T>, select = '*'): Promise<T> {
    const { data: result, error } = await this.supabase
      .from(this.table)
      .insert(data)
      .select(select)
      .single();

    if (error) throw error;
    return result as T;
  }

  /**
   * 레코드 업데이트
   */
  async update<T>(id: string, data: Partial<T>, select = '*'): Promise<T> {
    const { data: result, error } = await this.supabase
      .from(this.table)
      .update(data)
      .eq('id', id)
      .select(select)
      .single();

    if (error) throw error;
    return result as T;
  }

  /**
   * 레코드 삭제
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.table)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}