'use client';

import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  componentName: string;
  timestamp: number;
}

interface UsePerformanceMonitorOptions {
  trackMemory?: boolean;
  logToConsole?: boolean;
  sendToAnalytics?: boolean;
}

export function usePerformanceMonitor(
  componentName: string,
  options: UsePerformanceMonitorOptions = {}
) {
  const {
    trackMemory = false,
    logToConsole = process.env.NODE_ENV === 'development',
    sendToAnalytics = false
  } = options;

  const renderStartTime = useRef<number>();
  const metricsRef = useRef<PerformanceMetrics[]>([]);

  // 렌더링 시작 시점 기록
  const startMeasure = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  // 렌더링 완료 시점 기록
  const endMeasure = useCallback(() => {
    if (renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current;
      let memoryUsage: number | undefined;

      // 메모리 사용량 측정 (지원되는 브라우저에서만)
      if (trackMemory && 'memory' in performance) {
        const memory = (performance as any).memory;
        memoryUsage = memory.usedJSHeapSize;
      }

      const metrics: PerformanceMetrics = {
        renderTime,
        memoryUsage,
        componentName,
        timestamp: Date.now()
      };

      metricsRef.current.push(metrics);

      // 콘솔 로깅
      if (logToConsole) {
        console.log(`⏱️  [${componentName}] Render time: ${renderTime.toFixed(2)}ms`, 
          memoryUsage ? `Memory: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB` : ''
        );
      }

      // 분석 도구로 전송 (필요시)
      if (sendToAnalytics) {
        // 여기에 분석 도구 전송 로직 구현
        // 예: amplitude, mixpanel 등
      }
    }
  }, [componentName, trackMemory, logToConsole, sendToAnalytics]);

  // Core Web Vitals 측정
  const measureWebVitals = useCallback(() => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        // LCP (Largest Contentful Paint) 측정
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (logToConsole) {
              console.log(`🎯 LCP: ${entry.startTime.toFixed(2)}ms`);
            }
          });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // FID (First Input Delay) 측정
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (logToConsole) {
              console.log(`⚡ FID: ${(entry as any).processingStart - entry.startTime}ms`);
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // CLS (Cumulative Layout Shift) 측정
        const clsObserver = new PerformanceObserver((list) => {
          let cls = 0;
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
          });
          if (logToConsole && cls > 0) {
            console.log(`📐 CLS: ${cls.toFixed(4)}`);
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

      } catch (error) {
        console.warn('Performance measurement not supported:', error);
      }
    }
  }, [logToConsole]);

  // 메트릭스 가져오기
  const getMetrics = useCallback(() => {
    return metricsRef.current;
  }, []);

  // 메트릭스 초기화
  const clearMetrics = useCallback(() => {
    metricsRef.current = [];
  }, []);

  // 평균 렌더링 시간 계산
  const getAverageRenderTime = useCallback(() => {
    const metrics = metricsRef.current;
    if (metrics.length === 0) return 0;
    
    const totalTime = metrics.reduce((sum, metric) => sum + metric.renderTime, 0);
    return totalTime / metrics.length;
  }, []);

  // 컴포넌트 마운트 시 Web Vitals 측정 시작
  useEffect(() => {
    measureWebVitals();
  }, [measureWebVitals]);

  return {
    startMeasure,
    endMeasure,
    getMetrics,
    clearMetrics,
    getAverageRenderTime,
    measureWebVitals
  };
}