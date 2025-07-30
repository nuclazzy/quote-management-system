'use client';

import { useState, useEffect, useCallback } from 'react';
import { useErrorHandler } from './useErrorHandler';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isError: boolean;
  errorMessage: string;
}

interface UseAsyncOptions {
  immediate?: boolean;
  initialData?: any;
}

interface UseAsyncReturn<T> extends AsyncState<T> {
  execute: () => Promise<T | undefined>;
  reset: () => void;
  setData: (data: T) => void;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  options: UseAsyncOptions = {}
): UseAsyncReturn<T> {
  const { immediate = true, initialData = null } = options;
  const { error, isError, errorMessage, handleError, clearError } =
    useErrorHandler();

  const [state, setState] = useState<Pick<AsyncState<T>, 'data' | 'loading'>>({
    data: initialData,
    loading: immediate,
  });

  const execute = useCallback(async (): Promise<T | undefined> => {
    setState((prev) => ({ ...prev, loading: true }));
    clearError();

    try {
      const data = await asyncFunction();
      setState({ data, loading: false });
      return data;
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false }));
      handleError(err);
      return undefined;
    }
  }, [asyncFunction, clearError, handleError]);

  const reset = useCallback(() => {
    setState({ data: initialData, loading: false });
    clearError();
  }, [initialData, clearError]);

  const setData = useCallback((data: T) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, []); // immediate가 변경되어도 재실행하지 않음

  return {
    data: state.data,
    loading: state.loading,
    error,
    isError,
    errorMessage,
    execute,
    reset,
    setData,
  };
}
