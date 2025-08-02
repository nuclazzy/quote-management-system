/**
 * 전역 에러 핸들러
 * Unhandled Promise Rejections과 예상치 못한 JavaScript 에러를 처리합니다.
 */

interface ErrorInfo {
  message: string;
  stack?: string;
  timestamp: number;
  url: string;
  userAgent: string;
  userId?: string;
}

class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private errorQueue: ErrorInfo[] = [];
  private isInitialized = false;

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  /**
   * 전역 에러 핸들러 초기화
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Unhandled Promise Rejection 처리
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    
    // JavaScript Error 처리
    window.addEventListener('error', this.handleGlobalError.bind(this));

    // React Error Boundary에서 사용할 수 있도록 전역 객체에 등록
    (window as any).__globalErrorHandler = this;

    this.isInitialized = true;
    console.log('[GlobalErrorHandler] 전역 에러 핸들러가 초기화되었습니다.');
  }

  /**
   * Unhandled Promise Rejection 처리
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    console.error('[GlobalErrorHandler] Unhandled Promise Rejection:', event.reason);
    
    const errorInfo: ErrorInfo = {
      message: `Unhandled Promise Rejection: ${this.getErrorMessage(event.reason)}`,
      stack: event.reason?.stack,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.logError(errorInfo);
    this.showUserFriendlyError('시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    
    // 기본 동작 방지 (콘솔 에러 출력 방지)
    event.preventDefault();
  }

  /**
   * 전역 JavaScript Error 처리
   */
  private handleGlobalError(event: ErrorEvent): void {
    console.error('[GlobalErrorHandler] Global Error:', event.error || event.message);
    
    const errorInfo: ErrorInfo = {
      message: event.message || 'Unknown error',
      stack: event.error?.stack,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.logError(errorInfo);
    this.showUserFriendlyError('예상치 못한 오류가 발생했습니다. 페이지를 새로고침해주세요.');
  }

  /**
   * React Error Boundary에서 호출할 수 있는 에러 핸들러
   */
  handleReactError(error: Error, errorInfo: { componentStack: string }): void {
    console.error('[GlobalErrorHandler] React Error:', error);
    
    const errorInfoData: ErrorInfo = {
      message: `React Error: ${error.message}`,
      stack: error.stack + '\n\nComponent Stack:' + errorInfo.componentStack,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.logError(errorInfoData);
  }

  /**
   * 에러 로깅
   */
  private logError(errorInfo: ErrorInfo): void {
    // 에러를 큐에 추가
    this.errorQueue.push(errorInfo);

    // 로컬 스토리지에 저장 (개발 환경에서 디버깅용)
    if (process.env.NODE_ENV === 'development') {
      const existingErrors = JSON.parse(localStorage.getItem('error_logs') || '[]');
      existingErrors.push(errorInfo);
      
      // 최대 50개까지만 보관
      if (existingErrors.length > 50) {
        existingErrors.splice(0, existingErrors.length - 50);
      }
      
      localStorage.setItem('error_logs', JSON.stringify(existingErrors));
    }

    // 실제 운영 환경에서는 외부 로깅 서비스로 전송
    // 예: Sentry, LogRocket, etc.
    this.sendToLoggingService(errorInfo);
  }

  /**
   * 외부 로깅 서비스로 에러 전송
   */
  private async sendToLoggingService(errorInfo: ErrorInfo): Promise<void> {
    try {
      // 실제 운영 환경에서는 외부 로깅 서비스 API 호출
      // 현재는 콘솔에만 출력
      if (process.env.NODE_ENV === 'development') {
        console.group('🔴 Error Report');
        console.log('Message:', errorInfo.message);
        console.log('Stack:', errorInfo.stack);
        console.log('URL:', errorInfo.url);
        console.log('Timestamp:', new Date(errorInfo.timestamp).toISOString());
        console.groupEnd();
      }
    } catch (loggingError) {
      console.error('[GlobalErrorHandler] 로깅 서비스 전송 실패:', loggingError);
    }
  }

  /**
   * 사용자 친화적 에러 메시지 표시
   */
  private showUserFriendlyError(message: string): void {
    // Toast 라이브러리가 있다면 사용, 없으면 기본 alert
    if (typeof window !== 'undefined') {
      // Material-UI Snackbar나 react-hot-toast 등을 사용할 수 있음
      // 현재는 간단한 Toast 구현
      this.showToast(message, 'error');
    }
  }

  /**
   * 간단한 Toast 구현
   */
  private showToast(message: string, type: 'error' | 'warning' | 'info' = 'error'): void {
    // 기존 toast가 있으면 제거
    const existingToast = document.getElementById('global-error-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'global-error-toast';
    toast.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#f44336' : '#ff9800'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
      ">
        ${message}
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: none;
          border: none;
          color: white;
          margin-left: 12px;
          cursor: pointer;
          font-size: 16px;
        ">×</button>
      </div>
    `;

    // CSS 애니메이션 추가
    if (!document.getElementById('global-error-styles')) {
      const style = document.createElement('style');
      style.id = 'global-error-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // 5초 후 자동 제거
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 5000);
  }

  /**
   * 에러 메시지 추출
   */
  private getErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.toString) return error.toString();
    return 'Unknown error';
  }

  /**
   * 에러 큐 조회 (디버깅용)
   */
  getErrorQueue(): ErrorInfo[] {
    return [...this.errorQueue];
  }

  /**
   * 에러 큐 클리어
   */
  clearErrorQueue(): void {
    this.errorQueue = [];
  }
}

export default GlobalErrorHandler;