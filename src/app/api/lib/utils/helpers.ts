import { NextRequest } from 'next/server';
import { z } from 'zod';

/**
 * 쿼리 파라미터에서 페이지네이션 정보 추출
 */
export function extractPagination(req: NextRequest) {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const per_page = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get('per_page') || '20', 10))
  );

  return {
    page,
    per_page,
    offset: (page - 1) * per_page,
    limit: per_page,
  };
}

/**
 * 쿼리 파라미터에서 정렬 정보 추출
 */
export function extractSorting(req: NextRequest, allowedFields: string[] = []) {
  const url = new URL(req.url);
  const sort_by = url.searchParams.get('sort_by') || 'created_at';
  const sort_order =
    url.searchParams.get('sort_order') === 'asc' ? 'asc' : 'desc';

  // 허용된 필드만 사용
  const validSortBy =
    allowedFields.length > 0 && !allowedFields.includes(sort_by)
      ? 'created_at'
      : sort_by;

  return {
    sort_by: validSortBy,
    sort_order,
    ascending: sort_order === 'asc',
  };
}

/**
 * 쿼리 파라미터에서 검색 정보 추출
 */
export function extractSearch(req: NextRequest) {
  const url = new URL(req.url);
  const search = url.searchParams.get('search')?.trim() || '';

  return {
    search,
    hasSearch: search.length > 0,
  };
}

/**
 * 쿼리 파라미터에서 필터 정보 추출
 */
export function extractFilters(req: NextRequest, filterSchema?: z.ZodSchema) {
  const url = new URL(req.url);
  const filters: Record<string, any> = {};

  // 기본 필터들
  for (const [key, value] of url.searchParams.entries()) {
    if (
      !['page', 'per_page', 'sort_by', 'sort_order', 'search'].includes(key)
    ) {
      // 배열 형태의 파라미터 처리 (예: status=draft&status=sent)
      if (filters[key]) {
        if (Array.isArray(filters[key])) {
          filters[key].push(value);
        } else {
          filters[key] = [filters[key], value];
        }
      } else {
        filters[key] = value;
      }
    }
  }

  // 스키마가 있으면 검증
  if (filterSchema) {
    const result = filterSchema.safeParse(filters);
    return result.success ? result.data : {};
  }

  return filters;
}

/**
 * URL 경로에서 ID 추출 및 검증
 */
export function extractIdFromPath(req: NextRequest): string {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const id = pathSegments[pathSegments.length - 1];

  if (!id || !isValidUUID(id)) {
    throw new Error('유효하지 않은 ID 형식입니다.');
  }

  return id;
}

/**
 * UUID 유효성 검사
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * 날짜 범위 파라미터 추출
 */
export function extractDateRange(req: NextRequest) {
  const url = new URL(req.url);
  const date_from = url.searchParams.get('date_from');
  const date_to = url.searchParams.get('date_to');

  return {
    date_from: date_from && isValidDate(date_from) ? date_from : undefined,
    date_to: date_to && isValidDate(date_to) ? date_to : undefined,
  };
}

/**
 * 날짜 유효성 검사
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
}

/**
 * 숫자 범위 파라미터 추출
 */
export function extractNumberRange(req: NextRequest, field: string) {
  const url = new URL(req.url);
  const min = url.searchParams.get(`${field}_min`);
  const max = url.searchParams.get(`${field}_max`);

  return {
    [`${field}_min`]: min && !isNaN(Number(min)) ? Number(min) : undefined,
    [`${field}_max`]: max && !isNaN(Number(max)) ? Number(max) : undefined,
  };
}

/**
 * 안전한 JSON 파싱
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString);
  } catch {
    return defaultValue;
  }
}

/**
 * 객체에서 undefined 값 제거
 */
export function removeUndefined<T extends Record<string, any>>(
  obj: T
): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key as keyof T] = value;
    }
  }

  return result;
}

/**
 * 배열을 청크 단위로 분할
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
}

/**
 * 딜레이 함수
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 재시도 래퍼
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        throw lastError;
      }

      await delay(delayMs * attempt);
    }
  }

  throw lastError!;
}

/**
 * 환경 변수 유효성 검사
 */
export function validateEnvironment(requiredVars: string[]): void {
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

/**
 * 디버그 로깅
 */
export function debugLog(message: string, data?: any): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[DEBUG] ${message}`,
      data ? JSON.stringify(data, null, 2) : ''
    );
  }
}
