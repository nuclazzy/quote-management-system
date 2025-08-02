import { useState, useCallback, useRef } from 'react';

interface UseAsyncActionOptions {
  debounceMs?: number;
  showSuccessMessage?: boolean;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
}

interface UseAsyncActionReturn<T extends any[], R> {
  execute: (...args: T) => Promise<R | undefined>;
  loading: boolean;
  error: string | null;
  success: boolean;
  reset: () => void;
}

/**
 * 비동기 액션을 처리하는 커스텀 훅
 * 중복 실행 방지, 디바운싱, 에러 처리 등을 제공합니다.
 */
export function useAsyncAction<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  options: UseAsyncActionOptions = {}
): UseAsyncActionReturn<T, R> {
  const {
    debounceMs = 300,
    showSuccessMessage = false,
    onSuccess,
    onError,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  const execute = useCallback(
    (...args: T): Promise<R | undefined> => {
      return new Promise((resolve, reject) => {
        // 기존 디바운스 타이머 클리어
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // 디바운스 적용
        debounceTimerRef.current = setTimeout(async () => {
          // 이미 실행 중이면 무시
          if (loading) {
            resolve(undefined);
            return;
          }

          // 이전 요청이 있으면 취소
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }

          // 새로운 AbortController 생성
          abortControllerRef.current = new AbortController();

          setLoading(true);
          setError(null);
          setSuccess(false);

          try {
            const result = await action(...args);
            
            // 요청이 취소되지 않았다면 결과 처리
            if (!abortControllerRef.current.signal.aborted) {
              setSuccess(showSuccessMessage);
              
              if (onSuccess) {
                onSuccess(result);
              }
              
              resolve(result);
            } else {
              resolve(undefined);
            }
          } catch (err) {
            // 요청이 취소되지 않았다면 에러 처리
            if (!abortControllerRef.current.signal.aborted) {
              const errorMessage = err instanceof Error 
                ? err.message 
                : '알 수 없는 오류가 발생했습니다.';
              
              setError(errorMessage);
              
              if (onError) {
                onError(err instanceof Error ? err : new Error(errorMessage));
              }
              
              reject(err);
            } else {
              resolve(undefined);
            }
          } finally {
            // 요청이 취소되지 않았다면 로딩 상태 해제
            if (!abortControllerRef.current?.signal.aborted) {
              setLoading(false);
            }
          }
        }, debounceMs);
      });
    },
    [action, loading, debounceMs, showSuccessMessage, onSuccess, onError]
  );

  const reset = useCallback(() => {
    // 진행 중인 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 디바운스 타이머 클리어
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setLoading(false);
    setError(null);
    setSuccess(false);
  }, []);

  // 컴포넌트 언마운트 시 정리
  useState(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  });

  return {
    execute,
    loading,
    error,
    success,
    reset,
  };
}

/**
 * 간단한 비동기 액션을 위한 훅 (디바운싱 없음)
 */
export function useSimpleAsyncAction<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  options: Omit<UseAsyncActionOptions, 'debounceMs'> = {}
): UseAsyncActionReturn<T, R> {
  return useAsyncAction(action, { ...options, debounceMs: 0 });
}

/**
 * 폼 제출용 비동기 액션 훅
 */
export function useFormAsyncAction<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  options: UseAsyncActionOptions = {}
): UseAsyncActionReturn<T, R> {
  return useAsyncAction(action, {
    debounceMs: 500,
    showSuccessMessage: true,
    ...options,
  });
}

/**
 * 검색용 비동기 액션 훅
 */
export function useSearchAsyncAction<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  options: UseAsyncActionOptions = {}
): UseAsyncActionReturn<T, R> {
  return useAsyncAction(action, {
    debounceMs: 800,
    ...options,
  });
}