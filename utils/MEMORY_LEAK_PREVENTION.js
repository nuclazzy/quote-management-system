// ========================================
// 메모리 누수 방지 및 성능 최적화 유틸리티
// MEMORY_LEAK_PREVENTION.js
// ========================================

import { useCallback, useEffect, useRef, useMemo } from 'react';
import { debounce, throttle } from 'lodash';

// ========================================
// 1. WeakMap 기반 메모리 관리
// ========================================

class MemoryManager {
  constructor() {
    this.componentRefs = new WeakMap();
    this.eventListeners = new WeakMap();
    this.timers = new WeakMap();
    this.subscriptions = new WeakMap();
    this.observers = new WeakMap();
    this.cacheStore = new Map(); // 제한된 크기의 캐시
    this.maxCacheSize = 100;
    this.cleanupScheduled = false;
    
    // 주기적 정리 스케줄링
    this.scheduleCleanup();
  }

  // 컴포넌트별 리소스 등록
  registerComponent(component, resources = {}) {
    if (!this.componentRefs.has(component)) {
      this.componentRefs.set(component, {
        timers: new Set(),
        listeners: new Set(),
        subscriptions: new Set(),
        observers: new Set(),
        createdAt: Date.now()
      });
    }
    
    const componentData = this.componentRefs.get(component);
    Object.assign(componentData, resources);
    
    return componentData;
  }

  // 타이머 등록
  registerTimer(component, timerId, type = 'timeout') {
    const componentData = this.registerComponent(component);
    componentData.timers.add({ id: timerId, type, createdAt: Date.now() });
    
    // WeakMap에도 저장 (빠른 접근용)
    if (!this.timers.has(component)) {
      this.timers.set(component, new Set());
    }
    this.timers.get(component).add(timerId);
  }

  // 이벤트 리스너 등록
  registerEventListener(component, element, event, handler, options) {
    const componentData = this.registerComponent(component);
    const listenerInfo = { element, event, handler, options, createdAt: Date.now() };
    componentData.listeners.add(listenerInfo);
    
    if (!this.eventListeners.has(component)) {
      this.eventListeners.set(component, new Set());
    }
    this.eventListeners.get(component).add(listenerInfo);
  }

  // Observer 등록
  registerObserver(component, observer, type = 'generic') {
    const componentData = this.registerComponent(component);
    const observerInfo = { observer, type, createdAt: Date.now() };
    componentData.observers.add(observerInfo);
    
    if (!this.observers.has(component)) {
      this.observers.set(component, new Set());
    }
    this.observers.get(component).add(observerInfo);
  }

  // 컴포넌트 정리
  cleanup(component) {
    // 타이머 정리
    const timers = this.timers.get(component);
    if (timers) {
      timers.forEach(timerId => {
        if (typeof timerId === 'number') {
          clearTimeout(timerId);
          clearInterval(timerId);
        }
      });
      this.timers.delete(component);
    }

    // 이벤트 리스너 정리
    const listeners = this.eventListeners.get(component);
    if (listeners) {
      listeners.forEach(({ element, event, handler, options }) => {
        try {
          if (element && element.removeEventListener) {
            element.removeEventListener(event, handler, options);
          }
        } catch (error) {
          console.warn('이벤트 리스너 제거 실패:', error);
        }
      });
      this.eventListeners.delete(component);
    }

    // Observer 정리
    const observers = this.observers.get(component);
    if (observers) {
      observers.forEach(({ observer, type }) => {
        try {
          if (observer && typeof observer.disconnect === 'function') {
            observer.disconnect();
          } else if (observer && typeof observer.unsubscribe === 'function') {
            observer.unsubscribe();
          }
        } catch (error) {
          console.warn(`${type} observer 정리 실패:`, error);
        }
      });
      this.observers.delete(component);
    }

    // WeakMap에서 제거 (자동으로 GC됨)
    this.componentRefs.delete(component);
  }

  // 캐시 관리
  setCache(key, value, ttl = 300000) { // 기본 5분 TTL
    // 크기 제한
    if (this.cacheStore.size >= this.maxCacheSize) {
      this.evictOldestCache();
    }

    this.cacheStore.set(key, {
      value,
      createdAt: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now()
    });
  }

  getCache(key) {
    const cached = this.cacheStore.get(key);
    if (!cached) return null;

    // TTL 확인
    if (Date.now() - cached.createdAt > cached.ttl) {
      this.cacheStore.delete(key);
      return null;
    }

    // 접근 통계 업데이트
    cached.accessCount++;
    cached.lastAccessed = Date.now();
    
    return cached.value;
  }

  evictOldestCache() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, data] of this.cacheStore.entries()) {
      if (data.createdAt < oldestTime) {
        oldestTime = data.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cacheStore.delete(oldestKey);
    }
  }

  // 주기적 정리
  scheduleCleanup() {
    if (this.cleanupScheduled) return;
    
    this.cleanupScheduled = true;
    
    const cleanup = () => {
      this.performScheduledCleanup();
      setTimeout(cleanup, 60000); // 1분마다
    };
    
    setTimeout(cleanup, 60000);
  }

  performScheduledCleanup() {
    // 만료된 캐시 정리
    const now = Date.now();
    for (const [key, data] of this.cacheStore.entries()) {
      if (now - data.createdAt > data.ttl) {
        this.cacheStore.delete(key);
      }
    }

    // 메모리 사용량 로깅 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      this.logMemoryUsage();
    }
  }

  logMemoryUsage() {
    if (performance && performance.memory) {
      const memory = performance.memory;
      console.log('🧠 메모리 사용량:', {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB',
        cacheEntries: this.cacheStore.size,
        activeComponents: this.getActiveComponentCount()
      });
    }
  }

  getActiveComponentCount() {
    let count = 0;
    // WeakMap은 크기를 직접 확인할 수 없으므로 추정
    this.timers.forEach(() => count++);
    return count;
  }
}

// 전역 메모리 매니저 인스턴스
const memoryManager = new MemoryManager();

// ========================================
// 2. React Hook - useMemoryManagement
// ========================================

export const useMemoryManagement = () => {
  const componentRef = useRef({});
  const isMountedRef = useRef(true);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      memoryManager.cleanup(componentRef.current);
    };
  }, []);

  const safeSetter = useCallback((setter) => {
    return (...args) => {
      if (isMountedRef.current) {
        setter(...args);
      }
    };
  }, []);

  const safeTimeout = useCallback((callback, delay) => {
    const timerId = setTimeout(() => {
      if (isMountedRef.current) {
        callback();
      }
    }, delay);
    
    memoryManager.registerTimer(componentRef.current, timerId, 'timeout');
    return timerId;
  }, []);

  const safeInterval = useCallback((callback, delay) => {
    const timerId = setInterval(() => {
      if (isMountedRef.current) {
        callback();
      }
    }, delay);
    
    memoryManager.registerTimer(componentRef.current, timerId, 'interval');
    return timerId;
  }, []);

  const safeEventListener = useCallback((element, event, handler, options) => {
    const safeHandler = (...args) => {
      if (isMountedRef.current) {
        handler(...args);
      }
    };

    element.addEventListener(event, safeHandler, options);
    memoryManager.registerEventListener(
      componentRef.current, 
      element, 
      event, 
      safeHandler, 
      options
    );

    return () => {
      element.removeEventListener(event, safeHandler, options);
    };
  }, []);

  return {
    safeSetter,
    safeTimeout,
    safeInterval,
    safeEventListener,
    isMounted: () => isMountedRef.current,
    componentRef: componentRef.current
  };
};

// ========================================
// 3. React Hook - useOptimizedCallback
// ========================================

export const useOptimizedCallback = (callback, deps, options = {}) => {
  const {
    debounceMs = 0,
    throttleMs = 0,
    maxWait = 0,
    leading = false,
    trailing = true
  } = options;

  const { isMounted } = useMemoryManagement();

  return useMemo(() => {
    let optimizedCallback = callback;

    // 안전성 래퍼
    const safeCallback = (...args) => {
      if (isMounted()) {
        return callback(...args);
      }
    };

    // Debounce 적용
    if (debounceMs > 0) {
      optimizedCallback = debounce(safeCallback, debounceMs, {
        leading,
        trailing,
        maxWait: maxWait > 0 ? maxWait : undefined
      });
    }
    // Throttle 적용
    else if (throttleMs > 0) {
      optimizedCallback = throttle(safeCallback, throttleMs, {
        leading,
        trailing
      });
    }
    // 기본 안전 콜백
    else {
      optimizedCallback = safeCallback;
    }

    return optimizedCallback;
  }, [...deps, isMounted]);
};

// ========================================
// 4. React Hook - useOptimizedState
// ========================================

export const useOptimizedState = (initialState, options = {}) => {
  const {
    enableCache = false,
    cacheKey = null,
    cacheTTL = 300000,
    enableHistory = false,
    maxHistorySize = 10
  } = options;

  const { safeSetter } = useMemoryManagement();
  const [state, setState] = React.useState(() => {
    // 캐시에서 초기값 로드 시도
    if (enableCache && cacheKey) {
      const cached = memoryManager.getCache(cacheKey);
      return cached !== null ? cached : initialState;
    }
    return initialState;
  });

  const historyRef = useRef([]);

  const optimizedSetState = useCallback((newState) => {
    const safeSet = safeSetter(setState);
    
    safeSet(prevState => {
      const nextState = typeof newState === 'function' ? newState(prevState) : newState;
      
      // 히스토리 관리
      if (enableHistory) {
        historyRef.current.push({
          state: prevState,
          timestamp: Date.now()
        });
        
        if (historyRef.current.length > maxHistorySize) {
          historyRef.current.shift();
        }
      }

      // 캐시 업데이트
      if (enableCache && cacheKey) {
        memoryManager.setCache(cacheKey, nextState, cacheTTL);
      }

      return nextState;
    });
  }, [safeSetter, enableCache, cacheKey, cacheTTL, enableHistory, maxHistorySize]);

  const undoState = useCallback(() => {
    if (enableHistory && historyRef.current.length > 0) {
      const previousState = historyRef.current.pop();
      if (previousState) {
        const safeSet = safeSetter(setState);
        safeSet(previousState.state);
      }
    }
  }, [enableHistory, safeSetter]);

  return [state, optimizedSetState, { undo: undoState, history: historyRef.current }];
};

// ========================================
// 5. React Hook - useResourceMonitor
// ========================================

export const useResourceMonitor = (options = {}) => {
  const {
    enableLogging = process.env.NODE_ENV === 'development',
    logInterval = 30000, // 30초
    performanceThreshold = {
      memory: 100 * 1024 * 1024, // 100MB
      renderTime: 16 // 16ms (60fps)
    }
  } = options;

  const { safeInterval } = useMemoryManagement();
  const [resourceStats, setResourceStats] = useOptimizedState({
    memory: { used: 0, total: 0 },
    renderTime: 0,
    warnings: []
  });

  const startTimeRef = useRef(Date.now());
  const renderCountRef = useRef(0);

  useEffect(() => {
    if (!enableLogging) return;

    const monitorId = safeInterval(() => {
      const stats = gatherResourceStats();
      setResourceStats(stats);
      
      // 임계값 확인
      checkThresholds(stats, performanceThreshold);
    }, logInterval);

    return () => clearInterval(monitorId);
  }, [enableLogging, logInterval, safeInterval]);

  // 렌더 시간 측정
  useEffect(() => {
    renderCountRef.current++;
    const renderStart = performance.now();

    return () => {
      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;
      
      if (renderTime > performanceThreshold.renderTime) {
        console.warn(`⚠️ 느린 렌더링 감지: ${renderTime.toFixed(2)}ms`);
      }
    };
  });

  return {
    resourceStats,
    renderCount: renderCountRef.current,
    uptime: Date.now() - startTimeRef.current
  };
};

// ========================================
// 6. 리소스 통계 수집 함수
// ========================================

const gatherResourceStats = () => {
  const stats = {
    memory: { used: 0, total: 0, limit: 0 },
    renderTime: 0,
    warnings: [],
    timestamp: Date.now()
  };

  // 메모리 정보
  if (performance && performance.memory) {
    const memory = performance.memory;
    stats.memory = {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit
    };
  }

  // DOM 노드 수
  stats.domNodes = document.querySelectorAll('*').length;

  // 이벤트 리스너 수 (근사치)
  stats.eventListeners = memoryManager.getActiveComponentCount();

  return stats;
};

const checkThresholds = (stats, thresholds) => {
  const warnings = [];

  // 메모리 사용량 확인
  if (stats.memory.used > thresholds.memory) {
    warnings.push({
      type: 'memory',
      message: `메모리 사용량이 ${Math.round(stats.memory.used / 1024 / 1024)}MB를 초과했습니다.`
    });
  }

  // DOM 노드 수 확인
  if (stats.domNodes > 5000) {
    warnings.push({
      type: 'dom',
      message: `DOM 노드가 ${stats.domNodes}개로 과다합니다.`
    });
  }

  if (warnings.length > 0) {
    console.group('🚨 성능 경고');
    warnings.forEach(warning => {
      console.warn(`${warning.type.toUpperCase()}: ${warning.message}`);
    });
    console.groupEnd();
  }
};

// ========================================
// 7. WeakRef 기반 옵저버 패턴
// ========================================

export class WeakObserver {
  constructor() {
    this.observers = new Set();
  }

  addObserver(observer) {
    // WeakRef 지원 확인
    if (typeof WeakRef !== 'undefined') {
      this.observers.add(new WeakRef(observer));
    } else {
      // 폴백: 일반 참조 (메모리 누수 위험)
      this.observers.add({ deref: () => observer });
    }
  }

  removeObserver(observer) {
    for (const ref of this.observers) {
      if (ref.deref() === observer) {
        this.observers.delete(ref);
        break;
      }
    }
  }

  notifyObservers(data) {
    const deadRefs = new Set();

    for (const ref of this.observers) {
      const observer = ref.deref();
      if (observer) {
        try {
          observer(data);
        } catch (error) {
          console.error('옵저버 알림 실패:', error);
        }
      } else {
        deadRefs.add(ref);
      }
    }

    // 죽은 참조 정리
    deadRefs.forEach(ref => this.observers.delete(ref));
  }

  cleanup() {
    this.observers.clear();
  }
}

// ========================================
// 8. 메모리 누수 감지 유틸리티
// ========================================

export const detectMemoryLeaks = () => {
  if (typeof performance === 'undefined' || !performance.memory) {
    console.warn('메모리 측정을 지원하지 않는 브라우저입니다.');
    return;
  }

  const initialMemory = performance.memory.usedJSHeapSize;
  const measurements = [];

  const measure = () => {
    const currentMemory = performance.memory.usedJSHeapSize;
    const growth = currentMemory - initialMemory;
    
    measurements.push({
      timestamp: Date.now(),
      memory: currentMemory,
      growth: growth
    });

    // 최근 10개 측정값만 유지
    if (measurements.length > 10) {
      measurements.shift();
    }

    // 지속적인 증가 패턴 감지
    if (measurements.length >= 5) {
      const trend = calculateTrend(measurements);
      if (trend > 1024 * 1024) { // 1MB 증가 추세
        console.warn('🚨 메모리 누수 의심:', {
          trend: Math.round(trend / 1024) + 'KB/측정',
          currentUsage: Math.round(currentMemory / 1024 / 1024) + 'MB'
        });
      }
    }
  };

  // 10초마다 측정
  const intervalId = setInterval(measure, 10000);
  
  // 정리 함수 반환
  return () => clearInterval(intervalId);
};

const calculateTrend = (measurements) => {
  const n = measurements.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = measurements[i].memory;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  // 선형 회귀 기울기 계산
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return slope;
};

// ========================================
// 9. 전역 메모리 관리 인터페이스
// ========================================

export const GlobalMemoryManager = {
  // 컴포넌트 등록
  register: (component, resources) => memoryManager.registerComponent(component, resources),
  
  // 컴포넌트 정리
  cleanup: (component) => memoryManager.cleanup(component),
  
  // 캐시 관리
  setCache: (key, value, ttl) => memoryManager.setCache(key, value, ttl),
  getCache: (key) => memoryManager.getCache(key),
  clearCache: () => memoryManager.cacheStore.clear(),
  
  // 메모리 통계
  getMemoryStats: () => ({
    cacheSize: memoryManager.cacheStore.size,
    activeComponents: memoryManager.getActiveComponentCount()
  }),
  
  // 수동 정리 실행
  forceCleanup: () => memoryManager.performScheduledCleanup(),
  
  // 메모리 누수 감지 시작
  startLeakDetection: detectMemoryLeaks
};

// 개발 환경에서 글로벌 접근 가능하게 설정
if (process.env.NODE_ENV === 'development') {
  window.MemoryManager = GlobalMemoryManager;
}

export default {
  useMemoryManagement,
  useOptimizedCallback,
  useOptimizedState,
  useResourceMonitor,
  WeakObserver,
  GlobalMemoryManager,
  detectMemoryLeaks
};

// ========================================
// 10. 사용 예시
// ========================================

/*
// 기본 사용법
const MyComponent = () => {
  const { safeTimeout, safeInterval, safeEventListener } = useMemoryManagement();
  const [data, setData] = useOptimizedState([], { enableCache: true, cacheKey: 'myData' });
  
  const optimizedHandler = useOptimizedCallback(
    (value) => console.log(value),
    [data],
    { debounceMs: 300 }
  );

  useEffect(() => {
    // 안전한 타이머
    const timerId = safeTimeout(() => {
      console.log('Timer executed safely');
    }, 1000);

    // 안전한 이벤트 리스너
    const cleanup = safeEventListener(window, 'resize', () => {
      console.log('Window resized');
    });

    return cleanup;
  }, [safeTimeout, safeEventListener]);

  return <div>My Component</div>;
};

// 리소스 모니터링
const MonitoredComponent = () => {
  const { resourceStats, renderCount, uptime } = useResourceMonitor({
    enableLogging: true,
    logInterval: 10000
  });

  return (
    <div>
      <p>렌더 횟수: {renderCount}</p>
      <p>실행 시간: {Math.round(uptime / 1000)}초</p>
      <p>메모리 사용량: {Math.round(resourceStats.memory.used / 1024 / 1024)}MB</p>
    </div>
  );
};
*/