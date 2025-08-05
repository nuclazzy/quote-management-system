import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createApiError } from '@/lib/api/base';

// 허용된 도메인 리스트
const ALLOWED_DOMAINS = ['motionsense.co.kr'];

// 역할 계층 구조 정의
const ROLE_HIERARCHY = {
  super_admin: ['super_admin', 'admin', 'member'],
  admin: ['admin', 'member'],
  member: ['member'],
  user: ['user'], // 하위 호환성을 위해 유지
} as const;

export type UserRole = keyof typeof ROLE_HIERARCHY;

export interface AuthOptions {
  requireMinimumRole?: UserRole;
  requireSpecificRole?: UserRole;
  requirePermissions?: string[];
  skipDomainValidation?: boolean; // 테스트 환경용 - 서버 측에서만 설정 가능
  _internalCall?: boolean; // 내부 서버 호출 표시 (보안용)
}

export interface SecureAuthUser {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  company_id?: string;
  profile?: any;
}

export interface AuthContext {
  user: SecureAuthUser;
  supabase: ReturnType<typeof createServerClient>;
}

/**
 * 서버 측 도메인 검증 함수
 */
function validateEmailDomain(email: string): boolean {
  if (!email) return false;
  
  const domain = email.split('@')[1];
  return ALLOWED_DOMAINS.includes(domain);
}

/**
 * 역할 권한 검증 함수
 */
function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const userPermissions = ROLE_HIERARCHY[userRole] || [];
  return userPermissions.includes(requiredRole);
}

/**
 * 보안 강화된 인증 미들웨어
 */
export async function withAuth<T>(
  request: NextRequest,
  handler: (context: AuthContext) => Promise<T>,
  options: AuthOptions = {}
): Promise<NextResponse> {
  try {
    // 보안 강화: 클라이언트에서 전달된 skipDomainValidation 무시
    // 오직 서버 측 코드에서 _internalCall로 표시된 경우만 도메인 검증 건너뛰기 허용
    const sanitizedOptions = {
      ...options,
      skipDomainValidation: false // 기본값: 항상 도메인 검증
    };
    
    // 특정 관리자 API 경로에서만 도메인 검증 건너뛰기 허용
    const isAdminRoute = request.nextUrl.pathname.startsWith('/api/admin/');
    const isSystemRoute = request.nextUrl.pathname.startsWith('/api/system/');
    
    // 서버 측에서 명시적으로 _internalCall을 설정한 경우만 허용
    if (options._internalCall === true && (isAdminRoute || isSystemRoute)) {
      sanitizedOptions.skipDomainValidation = true;
    }

    const supabase = createServerClient();

    // 1. 세션 검증
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('[Security] Session error:', sessionError.message);
      return createApiError('Authentication failed', 401);
    }

    if (!session?.user) {
      return createApiError('로그인이 필요합니다.', 401);
    }

    // 2. 서버 측 도메인 재검증 (Critical Security Fix)
    if (!sanitizedOptions.skipDomainValidation && !validateEmailDomain(session.user.email || '')) {
      console.warn('[Security] Domain validation failed:', {
        email: session.user.email,
        userId: session.user.id,
        timestamp: new Date().toISOString(),
      });
      
      // 즉시 세션 무효화
      await supabase.auth.signOut();
      
      return createApiError(
        '접근이 제한된 도메인입니다. @motionsense.co.kr 계정을 사용해주세요.',
        403
      );
    }

    // 3. 사용자 프로필 조회
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, is_active, company_id')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      console.error('[Security] Profile not found:', {
        userId: session.user.id,
        error: profileError?.message,
      });
      return createApiError('사용자 정보를 찾을 수 없습니다.', 403);
    }

    // 4. 계정 활성화 상태 확인
    if (!profile.is_active) {
      console.warn('[Security] Inactive account access attempt:', {
        userId: profile.id,
        email: profile.email,
      });
      return createApiError('비활성화된 계정입니다.', 403);
    }

    // 5. 권한 검증
    const userRole = profile.role as UserRole;
    
    if (options.requireMinimumRole) {
      if (!hasMinimumRole(userRole, options.requireMinimumRole)) {
        console.warn('[Security] Insufficient role:', {
          userId: profile.id,
          userRole,
          requiredRole: options.requireMinimumRole,
        });
        return createApiError('권한이 부족합니다.', 403);
      }
    }

    if (options.requireSpecificRole) {
      if (userRole !== options.requireSpecificRole) {
        console.warn('[Security] Role mismatch:', {
          userId: profile.id,
          userRole,
          requiredRole: options.requireSpecificRole,
        });
        return createApiError('해당 역할의 권한이 필요합니다.', 403);
      }
    }

    // 6. 추가 권한 검증 (향후 확장 가능)
    if (options.requirePermissions && options.requirePermissions.length > 0) {
      // TODO: 세밀한 권한 시스템 구현
      console.log('[Info] Permission check requested:', options.requirePermissions);
    }

    // 7. 보안 로깅 (성공적인 인증)
    if (process.env.NODE_ENV === 'production') {
      console.log('[Security] Successful authentication:', {
        userId: profile.id,
        role: profile.role,
        endpoint: request.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      });
    }

    // 8. 컨텍스트 생성 및 핸들러 실행
    const user: SecureAuthUser = {
      id: profile.id,
      email: profile.email,
      role: userRole,
      is_active: profile.is_active,
      company_id: profile.company_id,
      profile,
    };

    const result = await handler({ user, supabase });

    // 결과가 이미 NextResponse인 경우 반환
    if (result && typeof result === 'object' && 'status' in result) {
      return result as NextResponse;
    }

    // 일반 데이터는 성공 응답으로 래핑
    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('[Security] Auth middleware error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      endpoint: request.nextUrl.pathname,
      timestamp: new Date().toISOString(),
    });

    return createApiError(
      process.env.NODE_ENV === 'development' 
        ? `인증 처리 중 오류: ${error instanceof Error ? error.message : error}`
        : '인증 처리 중 오류가 발생했습니다.',
      500
    );
  }
}

/**
 * 관리자 권한 확인 헬퍼
 */
export function requireAdmin(options: AuthOptions = {}): AuthOptions {
  return {
    ...options,
    requireMinimumRole: 'admin',
  };
}

/**
 * 슈퍼 관리자 권한 확인 헬퍼
 */
export function requireSuperAdmin(options: AuthOptions = {}): AuthOptions {
  return {
    ...options,
    requireSpecificRole: 'super_admin',
  };
}

/**
 * 역할 기반 접근 제어 헬퍼
 */
export function requireRole(role: UserRole, options: AuthOptions = {}): AuthOptions {
  return {
    ...options,
    requireMinimumRole: role,
  };
}

/**
 * 보안 이벤트 로깅 유틸리티
 */
export const SecurityLogger = {
  logSecurityEvent: (event: string, details: Record<string, any>) => {
    const logData = {
      event,
      ...details,
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === 'production') {
      // 프로덕션에서는 보안 이벤트만 로깅
      console.log('[Security Event]', JSON.stringify(logData));
    } else {
      console.log('[Security Event]', logData);
    }
  },

  logAuthFailure: (reason: string, email?: string, userId?: string) => {
    SecurityLogger.logSecurityEvent('AUTH_FAILURE', {
      reason,
      email: email ? email.replace(/(.{2}).*@/, '$1***@') : undefined, // 이메일 마스킹
      userId,
    });
  },

  logDomainViolation: (email: string, userId?: string) => {
    SecurityLogger.logSecurityEvent('DOMAIN_VIOLATION', {
      email: email.replace(/(.{2}).*@/, '$1***@'), // 이메일 마스킹
      userId,
    });
  },

  logRoleViolation: (userId: string, userRole: string, requiredRole: string) => {
    SecurityLogger.logSecurityEvent('ROLE_VIOLATION', {
      userId,
      userRole,
      requiredRole,
    });
  },
};