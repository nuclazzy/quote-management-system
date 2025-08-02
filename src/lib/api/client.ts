/**
 * API 클라이언트 - 타임아웃 및 에러 처리 포함
 */

const API_TIMEOUT = 30000; // 30초
const API_RETRY_ATTEMPTS = 3;
const API_RETRY_DELAY = 1000; // 1초

interface ApiRequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

/**
 * API 에러 생성 함수
 */
export function createApiError(
  message: string,
  status?: number,
  code?: string,
  details?: any
): ApiError {
  const error = new Error(message) as ApiError;
  error.name = 'ApiError';
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

/**
 * 지연 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 타임아웃이 적용된 fetch 함수
 */
export async function fetchWithTimeout(
  url: string,
  options: ApiRequestOptions = {}
): Promise<Response> {
  const {
    timeout = API_TIMEOUT,
    retries = API_RETRY_ATTEMPTS,
    retryDelay = API_RETRY_DELAY,
    ...fetchOptions
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // HTTP 에러 상태 코드 처리
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorDetails: any = null;

        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
            errorDetails = errorData.details || errorData;
          }
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }

        throw createApiError(
          errorMessage,
          response.status,
          response.status.toString(),
          errorDetails
        );
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error as Error;

      // AbortError (타임아웃) 처리
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = createApiError(
          `요청 시간이 초과되었습니다 (${timeout / 1000}초). 잠시 후 다시 시도해주세요.`,
          408,
          'TIMEOUT'
        );
        
        // 타임아웃은 재시도하지 않음
        throw timeoutError;
      }

      // 네트워크 에러 처리
      if (error instanceof Error && error.name === 'TypeError') {
        const networkError = createApiError(
          '네트워크 연결을 확인해주세요.',
          0,
          'NETWORK_ERROR'
        );
        lastError = networkError;
      }

      // 마지막 시도가 아니면 재시도
      if (attempt < retries) {
        console.warn(`API 요청 실패 (시도 ${attempt + 1}/${retries + 1}): ${error.message}`);
        await delay(retryDelay * (attempt + 1)); // 지수 백오프
        continue;
      }

      // 모든 재시도 실패
      throw lastError;
    }
  }

  throw lastError!;
}

/**
 * JSON API 호출 함수
 */
export async function apiCall<T = any>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const response = await fetchWithTimeout(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  try {
    const data = await response.json();
    return data;
  } catch (error) {
    throw createApiError(
      '응답 데이터를 파싱할 수 없습니다.',
      response.status,
      'PARSE_ERROR',
      error
    );
  }
}

/**
 * GET 요청
 */
export async function apiGet<T = any>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiCall<T>(url, {
    method: 'GET',
    ...options,
  });
}

/**
 * POST 요청
 */
export async function apiPost<T = any>(
  url: string,
  data: any,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiCall<T>(url, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options,
  });
}

/**
 * PUT 요청
 */
export async function apiPut<T = any>(
  url: string,
  data: any,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiCall<T>(url, {
    method: 'PUT',
    body: JSON.stringify(data),
    ...options,
  });
}

/**
 * DELETE 요청
 */
export async function apiDelete<T = any>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiCall<T>(url, {
    method: 'DELETE',
    ...options,
  });
}

/**
 * 에러 메시지 추출 함수
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '알 수 없는 오류가 발생했습니다.';
}

/**
 * API 에러인지 확인하는 타입 가드
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && error.name === 'ApiError';
}

/**
 * 네트워크 상태 확인
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * 연결 상태 모니터링
 */
export function createConnectionMonitor() {
  const listeners = new Set<(online: boolean) => void>();

  const handleOnline = () => listeners.forEach(fn => fn(true));
  const handleOffline = () => listeners.forEach(fn => fn(false));

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  return {
    subscribe(listener: (online: boolean) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    isOnline: () => isOnline(),
    destroy() {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
      listeners.clear();
    },
  };
}