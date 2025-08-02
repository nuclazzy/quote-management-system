'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface UseApiCacheOptions {
  staleTime?: number; // 데이터가 stale 상태가 되는 시간 (ms)
  cacheTime?: number; // 캐시 보존 시간 (ms)
  retry?: number; // 재시도 횟수
  retryDelay?: (attempt: number) => number; // 재시도 지연 함수
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private subscribers = new Map<string, Set<() => void>>();

  set<T>(key: string, data: T, staleTime: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + staleTime
    });
    
    // 구독자들에게 알림
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach(callback => callback());
    }
  }

  get<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) return null;
    
    const now = Date.now();
    const isStale = now > entry.expiry;
    
    return {
      data: entry.data,
      isStale
    };
  }

  subscribe(key: string, callback: () => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    
    this.subscribers.get(key)!.add(callback);
    
    // 구독 해제 함수 반환
    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach(callback => callback());
    }
  }

  clear(): void {
    this.cache.clear();
    this.subscribers.forEach(subs => {
      subs.forEach(callback => callback());
    });
  }
}

// 전역 캐시 인스턴스
const globalCache = new ApiCache();

export function useApiCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseApiCacheOptions = {}
) {
  const {
    staleTime = 5 * 60 * 1000, // 5분
    cacheTime = 10 * 60 * 1000, // 10분
    retry = 3,
    retryDelay = (attempt) => Math.min(1000 * Math.pow(2, attempt), 30000)
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  
  const retryCountRef = useRef(0);
  const fetcherRef = useRef(fetcher);
  const mountedRef = useRef(true);

  // fetcher 참조 업데이트
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const executeRequest = useCallback(async (attempt = 0): Promise<void> => {
    if (!mountedRef.current) return;

    try {
      setError(null);
      const result = await fetcherRef.current();
      
      if (!mountedRef.current) return;
      
      setData(result);
      globalCache.set(key, result, staleTime);
      retryCountRef.current = 0;
      
    } catch (err) {
      if (!mountedRef.current) return;
      
      const error = err instanceof Error ? err : new Error('Unknown error');
      
      if (attempt < retry) {
        const delay = retryDelay(attempt);
        setTimeout(() => {
          if (mountedRef.current) {
            executeRequest(attempt + 1);
          }
        }, delay);
      } else {
        setError(error);
        retryCountRef.current = 0;
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsValidating(false);
      }
    }
  }, [key, staleTime, retry, retryDelay]);

  const refetch = useCallback(() => {
    setIsValidating(true);
    return executeRequest();
  }, [executeRequest]);

  const mutate = useCallback((newData?: T | ((prevData: T | null) => T)) => {
    if (typeof newData === 'function') {
      const updater = newData as (prevData: T | null) => T;
      const updated = updater(data);
      setData(updated);
      globalCache.set(key, updated, staleTime);
    } else if (newData !== undefined) {
      setData(newData);
      globalCache.set(key, newData, staleTime);
    }
  }, [data, key, staleTime]);

  const invalidate = useCallback(() => {
    globalCache.invalidate(key);
    setData(null);
    setError(null);
  }, [key]);

  // 초기 데이터 로드 및 캐시 구독
  useEffect(() => {
    // 캐시된 데이터 확인
    const cached = globalCache.get<T>(key);
    
    if (cached) {
      setData(cached.data);
      
      // 데이터가 stale하면 백그라운드에서 갱신
      if (cached.isStale) {
        setIsValidating(true);
        executeRequest();
      }
    } else {
      // 캐시된 데이터가 없으면 로딩 시작
      setIsLoading(true);
      executeRequest();
    }

    // 캐시 변경 구독
    const unsubscribe = globalCache.subscribe(key, () => {
      if (!mountedRef.current) return;
      
      const updated = globalCache.get<T>(key);
      if (updated) {
        setData(updated.data);
      }
    });

    return unsubscribe;
  }, [key, executeRequest]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    refetch,
    mutate,
    invalidate
  };
}

// 캐시 유틸리티 함수들
export const cacheUtils = {
  invalidate: (key: string) => globalCache.invalidate(key),
  clear: () => globalCache.clear(),
  prefetch: async <T>(key: string, fetcher: () => Promise<T>, staleTime?: number) => {
    try {
      const data = await fetcher();
      globalCache.set(key, data, staleTime);
      return data;
    } catch (error) {
      console.error(`Prefetch failed for key ${key}:`, error);
      throw error;
    }
  }
};