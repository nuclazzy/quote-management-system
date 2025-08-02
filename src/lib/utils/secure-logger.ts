/**
 * 보안 강화된 로깅 시스템
 * 환경별 로깅 수준 분리 및 민감 정보 보호
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'security';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  environment: string;
}

class SecureLogger {
  private static instance: SecureLogger;
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  static getInstance(): SecureLogger {
    if (!SecureLogger.instance) {
      SecureLogger.instance = new SecureLogger();
    }
    return SecureLogger.instance;
  }

  /**
   * 민감 정보 마스킹 처리
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    
    // 민감 정보 필드 마스킹
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'auth', 'session',
      'email', 'phone', 'ssn', 'card', 'account', 'credit'
    ];

    Object.keys(sanitized).forEach(key => {
      const lowerKey = key.toLowerCase();
      
      // 민감 정보 필드 확인
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        if (key === 'email' && typeof sanitized[key] === 'string') {
          // 이메일은 부분 마스킹
          sanitized[key] = this.maskEmail(sanitized[key]);
        } else if (typeof sanitized[key] === 'string') {
          // 기타 민감 정보는 완전 마스킹
          sanitized[key] = '***MASKED***';
        }
      }
      
      // 중첩 객체 재귀 처리
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    });

    return sanitized;
  }

  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    return `${local.substring(0, 2)}***@${domain}`;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: any
  ): LogEntry {
    return {
      level,
      message,
      data: this.isProduction ? this.sanitizeData(data) : data,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) {
      return true; // 개발 환경에서는 모든 로그 허용
    }
    
    if (this.isProduction) {
      // 프로덕션에서는 warn, error, security만 허용
      return ['warn', 'error', 'security'].includes(level);
    }
    
    return ['info', 'warn', 'error', 'security'].includes(level);
  }

  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const logOutput = this.isProduction 
      ? JSON.stringify(entry)
      : entry;

    switch (entry.level) {
      case 'debug':
        console.debug('[DEBUG]', logOutput);
        break;
      case 'info':
        console.info('[INFO]', logOutput);
        break;
      case 'warn':
        console.warn('[WARN]', logOutput);
        break;
      case 'error':
        console.error('[ERROR]', logOutput);
        break;
      case 'security':
        console.error('[SECURITY]', logOutput);
        break;
      default:
        console.log('[LOG]', logOutput);
    }
  }

  /**
   * 디버그 로그 (개발 환경에서만)
   */
  debug(message: string, data?: any): void {
    const entry = this.createLogEntry('debug', message, data);
    this.writeLog(entry);
  }

  /**
   * 정보 로그
   */
  info(message: string, data?: any): void {
    const entry = this.createLogEntry('info', message, data);
    this.writeLog(entry);
  }

  /**
   * 경고 로그
   */
  warn(message: string, data?: any): void {
    const entry = this.createLogEntry('warn', message, data);
    this.writeLog(entry);
  }

  /**
   * 에러 로그
   */
  error(message: string, error?: any): void {
    const errorData = error instanceof Error 
      ? {
          name: error.name,
          message: error.message,
          stack: this.isDevelopment ? error.stack : undefined,
        }
      : error;

    const entry = this.createLogEntry('error', message, errorData);
    this.writeLog(entry);
  }

  /**
   * 보안 이벤트 로그 (항상 기록)
   */
  security(event: string, details?: any): void {
    const entry = this.createLogEntry('security', event, details);
    this.writeLog(entry);
  }

  /**
   * API 요청 로그
   */
  apiRequest(method: string, path: string, userId?: string, statusCode?: number): void {
    const message = `API ${method} ${path}`;
    const data = {
      method,
      path,
      userId,
      statusCode,
      ip: this.isProduction ? 'masked' : undefined, // IP는 프로덕션에서 마스킹
    };

    if (statusCode && statusCode >= 400) {
      this.warn(message, data);
    } else if (this.isDevelopment) {
      this.debug(message, data);
    }
  }

  /**
   * 인증 이벤트 로그
   */
  authEvent(event: 'login' | 'logout' | 'failed_login' | 'domain_violation' | 'role_violation', details?: any): void {
    this.security(`AUTH_${event.toUpperCase()}`, details);
  }

  /**
   * 데이터베이스 에러 로그
   */
  dbError(operation: string, error: any, query?: string): void {
    this.error(`Database ${operation} failed`, {
      operation,
      error: error.message || error,
      query: this.isDevelopment ? query : undefined, // 쿼리는 개발환경에서만
    });
  }
}

// 싱글톤 인스턴스 생성
const logger = SecureLogger.getInstance();

// 편의 함수들
export const secureLog = {
  debug: (message: string, data?: any) => logger.debug(message, data),
  info: (message: string, data?: any) => logger.info(message, data),
  warn: (message: string, data?: any) => logger.warn(message, data),
  error: (message: string, error?: any) => logger.error(message, error),
  security: (event: string, details?: any) => logger.security(event, details),
  apiRequest: (method: string, path: string, userId?: string, statusCode?: number) => 
    logger.apiRequest(method, path, userId, statusCode),
  authEvent: (event: 'login' | 'logout' | 'failed_login' | 'domain_violation' | 'role_violation', details?: any) => 
    logger.authEvent(event, details),
  dbError: (operation: string, error: any, query?: string) => 
    logger.dbError(operation, error, query),
};

export default logger;