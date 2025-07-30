'use client';

import { useState, useCallback } from 'react';

interface ErrorState {
  error: Error | null;
  isError: boolean;
  errorMessage: string;
}

interface UseErrorHandlerReturn extends ErrorState {
  setError: (error: Error | string | null) => void;
  clearError: () => void;
  handleError: (error: unknown) => void;
  withErrorHandling: <T extends any[], R>(
    fn: (...args: T) => Promise<R>
  ) => (...args: T) => Promise<R | undefined>;
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false,
    errorMessage: '',
  });

  const setError = useCallback((error: Error | string | null) => {
    if (!error) {
      setErrorState({
        error: null,
        isError: false,
        errorMessage: '',
      });
      return;
    }

    const errorObj = error instanceof Error ? error : new Error(String(error));
    const message = getErrorMessage(errorObj);

    setErrorState({
      error: errorObj,
      isError: true,
      errorMessage: message,
    });
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false,
      errorMessage: '',
    });
  }, []);

  const handleError = useCallback(
    (error: unknown) => {
      console.error('Error occurred:', error);

      if (error instanceof Error) {
        setError(error);
      } else if (typeof error === 'string') {
        setError(new Error(error));
      } else {
        setError(new Error('알 수 없는 오류가 발생했습니다.'));
      }
    },
    [setError]
  );

  const withErrorHandling = useCallback(
    <T extends any[], R>(fn: (...args: T) => Promise<R>) => {
      return async (...args: T): Promise<R | undefined> => {
        try {
          clearError();
          return await fn(...args);
        } catch (error) {
          handleError(error);
          return undefined;
        }
      };
    },
    [clearError, handleError]
  );

  return {
    ...errorState,
    setError,
    clearError,
    handleError,
    withErrorHandling,
  };
}

function getErrorMessage(error: Error): string {
  // API 에러 메시지 처리
  if (error.message.includes('fetch')) {
    return '네트워크 연결을 확인해주세요.';
  }

  if (error.message.includes('401')) {
    return '인증이 필요합니다. 다시 로그인해주세요.';
  }

  if (error.message.includes('403')) {
    return '접근 권한이 없습니다.';
  }

  if (error.message.includes('404')) {
    return '요청한 리소스를 찾을 수 없습니다.';
  }

  if (error.message.includes('500')) {
    return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }

  // 일반적인 에러 메시지 반환
  return error.message || '알 수 없는 오류가 발생했습니다.';
}
