import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json();

    // 에러 데이터 검증
    if (!errorData.message || !errorData.timestamp) {
      return NextResponse.json(
        { error: 'Invalid error data' },
        { status: 400 }
      );
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

      // 예시: 파일 로그 (실제로는 로그 로테이션 등을 고려해야 함)
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging failed:', error);
    return NextResponse.json({ error: 'Failed to log error' }, { status: 500 });
  }
}
