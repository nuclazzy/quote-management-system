// ========================================
// 브라우저 호환성 Polyfills 및 대체 구현
// BROWSER_COMPATIBILITY_POLYFILLS.js
// ========================================

// ========================================
// 1. Navigator.sendBeacon Polyfill
// ========================================

(function() {
  'use strict';

  if (!navigator.sendBeacon) {
    console.warn('📱 navigator.sendBeacon not supported, using polyfill');
    
    navigator.sendBeacon = function(url, data) {
      try {
        // XMLHttpRequest 동기 요청으로 대체
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, false); // 동기 요청
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        if (data) {
          xhr.send(typeof data === 'string' ? data : JSON.stringify(data));
        } else {
          xhr.send();
        }
        
        return xhr.status >= 200 && xhr.status < 300;
      } catch (error) {
        console.error('sendBeacon polyfill failed:', error);
        return false;
      }
    };
  }
})();

// ========================================
// 2. Fetch API Polyfill (IE 지원)
// ========================================

if (!window.fetch) {
  console.warn('📱 fetch not supported, using XMLHttpRequest');
  
  window.fetch = function(url, options = {}) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open(options.method || 'GET', url);
      
      // 헤더 설정
      if (options.headers) {
        Object.keys(options.headers).forEach(key => {
          xhr.setRequestHeader(key, options.headers[key]);
        });
      }
      
      xhr.onload = function() {
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          statusText: xhr.statusText,
          json: () => Promise.resolve(JSON.parse(xhr.responseText)),
          text: () => Promise.resolve(xhr.responseText)
        });
      };
      
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.ontimeout = () => reject(new Error('Request timeout'));
      
      // 타임아웃 설정
      if (options.timeout) {
        xhr.timeout = options.timeout;
      }
      
      xhr.send(options.body || null);
    });
  };
}

// ========================================
// 3. IntersectionObserver Polyfill
// ========================================

if (!window.IntersectionObserver) {
  console.warn('📱 IntersectionObserver not supported, using polyfill');
  
  window.IntersectionObserver = class IntersectionObserverPolyfill {
    constructor(callback, options = {}) {
      this.callback = callback;
      this.options = options;
      this.observed = new Set();
      this.isPolyfill = true;
    }
    
    observe(element) {
      this.observed.add(element);
      
      // 즉시 콜백 실행 (가시성 체크 생략)
      setTimeout(() => {
        this.callback([{
          target: element,
          isIntersecting: true,
          intersectionRatio: 1,
          boundingClientRect: element.getBoundingClientRect(),
          rootBounds: null,
          time: Date.now()
        }]);
      }, 100);
    }
    
    unobserve(element) {
      this.observed.delete(element);
    }
    
    disconnect() {
      this.observed.clear();
    }
  };
}

// ========================================
// 4. ResizeObserver Polyfill
// ========================================

if (!window.ResizeObserver) {
  console.warn('📱 ResizeObserver not supported, using polyfill');
  
  window.ResizeObserver = class ResizeObserverPolyfill {
    constructor(callback) {
      this.callback = callback;
      this.observed = new Map();
      this.isPolyfill = true;
    }
    
    observe(element) {
      const initialRect = element.getBoundingClientRect();
      this.observed.set(element, initialRect);
      
      // 윈도우 리사이즈 이벤트로 대체
      const resizeHandler = () => {
        const currentRect = element.getBoundingClientRect();
        const lastRect = this.observed.get(element);
        
        if (lastRect && 
            (lastRect.width !== currentRect.width || 
             lastRect.height !== currentRect.height)) {
          this.callback([{
            target: element,
            contentRect: currentRect,
            borderBoxSize: [{ blockSize: currentRect.height, inlineSize: currentRect.width }],
            contentBoxSize: [{ blockSize: currentRect.height, inlineSize: currentRect.width }]
          }]);
          
          this.observed.set(element, currentRect);
        }
      };
      
      element._resizeHandler = resizeHandler;
      window.addEventListener('resize', resizeHandler);
    }
    
    unobserve(element) {
      if (element._resizeHandler) {
        window.removeEventListener('resize', element._resizeHandler);
        delete element._resizeHandler;
      }
      this.observed.delete(element);
    }
    
    disconnect() {
      this.observed.forEach((_, element) => {
        this.unobserve(element);
      });
    }
  };
}

// ========================================
// 5. 브라우저별 특화 처리 유틸리티
// ========================================

export const BrowserUtils = {
  // 브라우저 감지
  getBrowserInfo() {
    const ua = navigator.userAgent;
    const browsers = {
      chrome: /Chrome\/([0-9.]+)/.test(ua),
      firefox: /Firefox\/([0-9.]+)/.test(ua),
      safari: /Safari\/([0-9.]+)/.test(ua) && !/Chrome/.test(ua),
      edge: /Edg\/([0-9.]+)/.test(ua),
      ie: /MSIE|Trident/.test(ua),
      mobile: /Mobile|Android|iPhone|iPad/.test(ua)
    };
    
    return {
      ...browsers,
      version: this.getBrowserVersion(ua),
      isModern: browsers.chrome || browsers.firefox || browsers.edge || 
               (browsers.safari && !browsers.mobile)
    };
  },
  
  getBrowserVersion(ua) {
    const matches = ua.match(/(Chrome|Firefox|Safari|Edg)\/([0-9.]+)/);
    return matches ? parseFloat(matches[2]) : 0;
  },
  
  // 안전한 localStorage 사용
  safeLocalStorage: {
    getItem(key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.warn('localStorage.getItem failed:', e);
        return null;
      }
    },
    
    setItem(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        console.warn('localStorage.setItem failed:', e);
        return false;
      }
    },
    
    removeItem(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        console.warn('localStorage.removeItem failed:', e);
        return false;
      }
    }
  },
  
  // 안전한 sessionStorage 사용
  safeSessionStorage: {
    getItem(key) {
      try {
        return sessionStorage.getItem(key);
      } catch (e) {
        console.warn('sessionStorage.getItem failed:', e);
        return null;
      }
    },
    
    setItem(key, value) {
      try {
        sessionStorage.setItem(key, value);
        return true;
      } catch (e) {
        console.warn('sessionStorage.setItem failed:', e);
        return false;
      }
    },
    
    removeItem(key) {
      try {
        sessionStorage.removeItem(key);
        return true;
      } catch (e) {
        console.warn('sessionStorage.removeItem failed:', e);
        return false;
      }
    }
  },
  
  // 안전한 이벤트 리스너
  addEventListener(element, event, handler, options) {
    try {
      if (element.addEventListener) {
        element.addEventListener(event, handler, options);
      } else if (element.attachEvent) {
        // IE 8 이하 지원
        element.attachEvent('on' + event, handler);
      }
      return true;
    } catch (e) {
      console.warn('addEventListener failed:', e);
      return false;
    }
  },
  
  removeEventListener(element, event, handler, options) {
    try {
      if (element.removeEventListener) {
        element.removeEventListener(event, handler, options);
      } else if (element.detachEvent) {
        // IE 8 이하 지원
        element.detachEvent('on' + event, handler);
      }
      return true;
    } catch (e) {
      console.warn('removeEventListener failed:', e);
      return false;
    }
  }
};

// ========================================
// 6. Safari 특화 처리
// ========================================

export const SafariCompat = {
  // iOS Safari에서 100vh 문제 해결
  fixViewportHeight() {
    if (BrowserUtils.getBrowserInfo().safari) {
      const setViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      
      setViewportHeight();
      BrowserUtils.addEventListener(window, 'resize', setViewportHeight);
      BrowserUtils.addEventListener(window, 'orientationchange', setViewportHeight);
    }
  },
  
  // iOS Safari에서 스크롤 바운스 방지
  preventScrollBounce() {
    if (BrowserUtils.getBrowserInfo().mobile && BrowserUtils.getBrowserInfo().safari) {
      document.body.style.overscrollBehavior = 'none';
      document.documentElement.style.overscrollBehavior = 'none';
    }
  },
  
  // Safari에서 자동완성 스타일 문제 해결
  fixAutofillStyles() {
    if (BrowserUtils.getBrowserInfo().safari) {
      const style = document.createElement('style');
      style.textContent = `
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          transition: background-color 5000s ease-in-out 0s !important;
          -webkit-text-fill-color: var(--text-color, #000) !important;
        }
      `;
      document.head.appendChild(style);
    }
  },
  
  // iOS Safari에서 클릭 이벤트 지연 제거
  removeTapDelay() {
    if (BrowserUtils.getBrowserInfo().mobile) {
      document.addEventListener('touchstart', function() {}, { passive: true });
      
      const style = document.createElement('style');
      style.textContent = `
        * {
          touch-action: manipulation;
        }
        
        .clickable {
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
      `;
      document.head.appendChild(style);
    }
  }
};

// ========================================
// 7. IE/Edge Legacy 호환성
// ========================================

export const IECompat = {
  // IE에서 Object.assign 대체
  objectAssign(target, ...sources) {
    if (Object.assign) {
      return Object.assign(target, ...sources);
    }
    
    // Polyfill
    sources.forEach(source => {
      if (source != null) {
        Object.keys(source).forEach(key => {
          target[key] = source[key];
        });
      }
    });
    
    return target;
  },
  
  // IE에서 Array.includes 대체
  arrayIncludes(array, searchElement) {
    if (array.includes) {
      return array.includes(searchElement);
    }
    
    return array.indexOf(searchElement) !== -1;
  },
  
  // IE에서 Array.find 대체
  arrayFind(array, predicate) {
    if (array.find) {
      return array.find(predicate);
    }
    
    for (let i = 0; i < array.length; i++) {
      if (predicate(array[i], i, array)) {
        return array[i];
      }
    }
    
    return undefined;
  },
  
  // IE에서 String.startsWith 대체
  stringStartsWith(str, searchString) {
    if (str.startsWith) {
      return str.startsWith(searchString);
    }
    
    return str.substring(0, searchString.length) === searchString;
  },
  
  // IE에서 String.endsWith 대체
  stringEndsWith(str, searchString) {
    if (str.endsWith) {
      return str.endsWith(searchString);
    }
    
    return str.substring(str.length - searchString.length) === searchString;
  }
};

// ========================================
// 8. 성능 최적화 호환성
// ========================================

export const PerformanceCompat = {
  // requestAnimationFrame 대체
  requestAnimationFrame(callback) {
    if (window.requestAnimationFrame) {
      return window.requestAnimationFrame(callback);
    }
    
    // 폴백: setTimeout 사용
    return setTimeout(callback, 16.67); // ~60fps
  },
  
  cancelAnimationFrame(id) {
    if (window.cancelAnimationFrame) {
      return window.cancelAnimationFrame(id);
    }
    
    return clearTimeout(id);
  },
  
  // performance.now() 대체
  now() {
    if (performance && performance.now) {
      return performance.now();
    }
    
    return Date.now();
  },
  
  // requestIdleCallback 대체
  requestIdleCallback(callback, options = {}) {
    if (window.requestIdleCallback) {
      return window.requestIdleCallback(callback, options);
    }
    
    // 폴백: setTimeout 사용
    return setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() % 50))
      });
    }, 1);
  },
  
  cancelIdleCallback(id) {
    if (window.cancelIdleCallback) {
      return window.cancelIdleCallback(id);
    }
    
    return clearTimeout(id);
  }
};

// ========================================
// 9. 네트워크 호환성
// ========================================

export const NetworkCompat = {
  // 네트워크 상태 감지 (구형 브라우저)
  isOnline() {
    if ('onLine' in navigator) {
      return navigator.onLine;
    }
    
    // 폴백: 항상 온라인으로 가정
    return true;
  },
  
  // 네트워크 변경 이벤트
  addNetworkListener(callback) {
    if ('onLine' in navigator) {
      BrowserUtils.addEventListener(window, 'online', callback);
      BrowserUtils.addEventListener(window, 'offline', callback);
      return true;
    }
    
    return false;
  },
  
  // 연결 품질 추정
  getConnectionQuality() {
    if (navigator.connection) {
      const connection = navigator.connection;
      return {
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false
      };
    }
    
    // 기본값 반환
    return {
      effectiveType: '4g',
      downlink: 10,
      rtt: 100,
      saveData: false
    };
  }
};

// ========================================
// 10. 통합 초기화 함수
// ========================================

export const initBrowserCompatibility = () => {
  console.log('🔧 브라우저 호환성 시스템 초기화 중...');
  
  const browserInfo = BrowserUtils.getBrowserInfo();
  console.log('📱 브라우저 정보:', browserInfo);
  
  // Safari 특화 처리
  if (browserInfo.safari) {
    SafariCompat.fixViewportHeight();
    SafariCompat.preventScrollBounce();
    SafariCompat.fixAutofillStyles();
    SafariCompat.removeTapDelay();
    console.log('✅ Safari 호환성 처리 완료');
  }
  
  // 모바일 최적화
  if (browserInfo.mobile) {
    SafariCompat.removeTapDelay();
    console.log('✅ 모바일 최적화 완료');
  }
  
  // 구형 브라우저 지원
  if (!browserInfo.isModern) {
    console.warn('⚠️ 구형 브라우저가 감지되었습니다. 일부 기능이 제한될 수 있습니다.');
  }
  
  console.log('✅ 브라우저 호환성 시스템 초기화 완료');
  
  return {
    browserInfo,
    utils: BrowserUtils,
    safari: SafariCompat,
    ie: IECompat,
    performance: PerformanceCompat,
    network: NetworkCompat
  };
};

// ========================================
// 11. React Hook 통합
// ========================================

export const useBrowserCompatibility = () => {
  const [browserInfo, setBrowserInfo] = React.useState(null);
  const [isOnline, setIsOnline] = React.useState(true);
  
  React.useEffect(() => {
    const info = BrowserUtils.getBrowserInfo();
    setBrowserInfo(info);
    setIsOnline(NetworkCompat.isOnline());
    
    // 네트워크 상태 감지
    const handleNetworkChange = () => {
      setIsOnline(NetworkCompat.isOnline());
    };
    
    NetworkCompat.addNetworkListener(handleNetworkChange);
    
    return () => {
      // 정리 로직은 브라우저별로 다르게 처리
    };
  }, []);
  
  return {
    browserInfo,
    isOnline,
    utils: BrowserUtils,
    safari: SafariCompat,
    ie: IECompat,
    performance: PerformanceCompat,
    network: NetworkCompat
  };
};

// 자동 초기화
if (typeof window !== 'undefined') {
  // DOM이 로드된 후 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBrowserCompatibility);
  } else {
    initBrowserCompatibility();
  }
}

// ========================================
// 12. 사용 예시
// ========================================

/*
// React 컴포넌트에서 사용
const MyComponent = () => {
  const { browserInfo, isOnline, utils } = useBrowserCompatibility();
  
  const handleSave = () => {
    if (browserInfo.safari && browserInfo.mobile) {
      // iOS Safari에서는 특별한 처리
      utils.safeLocalStorage.setItem('data', JSON.stringify(data));
    } else {
      // 일반적인 처리
      localStorage.setItem('data', JSON.stringify(data));
    }
  };
  
  return (
    <div>
      <div>브라우저: {browserInfo?.safari ? 'Safari' : 'Other'}</div>
      <div>온라인: {isOnline ? '예' : '아니오'}</div>
    </div>
  );
};

// 바닐라 JavaScript에서 사용
const compat = initBrowserCompatibility();
if (compat.browserInfo.safari) {
  // Safari 전용 로직
}
*/