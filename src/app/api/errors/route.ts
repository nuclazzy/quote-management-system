import {
  createDirectApi,
} from '@/lib/api/direct-integration';

interface ErrorData {
  message: string;
  stack?: string;
  context?: any;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

// POST /api/errors - 최적화된 클라이언트 에러 로깅
export const POST = createDirectApi(
  async ({ body }) => {
    const errorData = body as ErrorData;

    // 에러 데이터 검증
    if (!errorData.message || !errorData.timestamp) {
      throw new Error('올바르지 않은 에러 데이터입니다.');
    }

    // 개발 환경에서는 콘솔에 출력
    if (process.env.NODE_ENV === 'development') {
      console.error('Client Error:', {
        message: errorData.message,
        stack: errorData.stack,
        context: errorData.context,
        timestamp: errorData.timestamp,
        userAgent: errorData.userAgent,
        url: errorData.url,
      });
    }

    // 프로덕션에서는 로그 시스템이나 외부 서비스로 전송
    if (process.env.NODE_ENV === 'production') {
      // TODO: 실제 운영에서는 Sentry, LogRocket, Datadog 등의 서비스 사용
      // 또는 데이터베이스에 저장

      const logEntry = {
        timestamp: errorData.timestamp,
        level: 'error',
        message: errorData.message,
        stack: errorData.stack,
        context: errorData.context,
        userAgent: errorData.userAgent,
        url: errorData.url,
      };

      // 여기에 로깅 로직 구현
      console.error('Production Error:', logEntry);
    }

    return {
      message: '에러가 성공적으로 기록되었습니다.',
    };
  },
  { requireAuth: false, enableLogging: false } // 에러 로깅은 인증 불필요
);
