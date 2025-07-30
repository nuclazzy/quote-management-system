'use client';

// Web Vitals types
interface Metric {
  name: string;
  value: number;
  id: string;
  delta?: number;
}

// Web Vitals 모듈이 없는 경우를 대비한 스텁 함수들
const stubWebVitals = {
  getCLS: (callback: (metric: Metric) => void) => {},
  getFID: (callback: (metric: Metric) => void) => {},
  getFCP: (callback: (metric: Metric) => void) => {},
  getLCP: (callback: (metric: Metric) => void) => {},
  getTTFB: (callback: (metric: Metric) => void) => {},
};

declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, any>
    ) => void;
  }
}

function sendToAnalytics(metric: Metric) {
  // Google Analytics로 Core Web Vitals 전송
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(
        metric.name === 'CLS' ? metric.value * 1000 : metric.value
      ),
      non_interaction: true,
    });
  }

  // 개발 환경에서는 콘솔에 출력
  if (process.env.NODE_ENV === 'development') {
    console.log(`${metric.name}: ${metric.value}`, metric);
  }

  // 프로덕션에서는 분석 서비스로 전송 (예: Vercel Analytics)
  if (process.env.NODE_ENV === 'production') {
    // Vercel Analytics가 있다면 자동으로 수집됨
    // 추가적인 커스텀 분석이 필요한 경우 여기에 구현
  }
}

export async function reportWebVitals() {
  try {
    // 개발 환경에서만 Web Vitals 활성화 (실제로는 프로덕션에서도 사용해야 함)
    if (process.env.NODE_ENV === 'development') {
      console.log('Web Vitals monitoring would be active in production');
    }

    // TODO: web-vitals 패키지 설치 후 활성화
    // const { getCLS, getFID, getFCP, getLCP, getTTFB } = stubWebVitals
    // getCLS(sendToAnalytics)
    // getFID(sendToAnalytics)
    // getFCP(sendToAnalytics)
    // getLCP(sendToAnalytics)
    // getTTFB(sendToAnalytics)
  } catch (err) {
    console.error('Failed to report web vitals:', err);
  }
}

// 에러 추적
export function trackError(error: Error, context?: Record<string, any>) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error tracked:', error, context);
  }

  // 프로덕션에서는 에러 추적 서비스로 전송
  if (process.env.NODE_ENV === 'production') {
    // Sentry, LogRocket 등의 서비스 사용 가능
    try {
      // 기본적인 에러 로깅
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          context,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      }).catch(() => {
        // 에러 전송 실패시 무시 (무한 루프 방지)
      });
    } catch (err) {
      // 에러 추적 자체가 실패해도 무시
    }
  }
}
