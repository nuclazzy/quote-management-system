import { supabase } from '../supabase/client';
import { Profile, AuthUser } from '@/types/auth';
import { secureLog } from '@/lib/utils/secure-logger';

export class AuthService {
  /**
   * Google OAuth 로그인
   */
  static async signInWithGoogle() {
    // 환경 변수에서 사이트 URL 가져오기 - 프로덕션에서는 Vercel URL 사용
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== 'undefined'
        ? window.location.origin
        : 'https://motionsense-quote-system.vercel.app');
    const redirectTo = `${siteUrl}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          hd: 'motionsense.co.kr', // Google Workspace 도메인 제한
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * 완전한 로그아웃 프로세스 (보안 강화)
   */
  static async signOut() {
    try {
      // 1. Supabase 세션 무효화
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signOut error:', error);
        // 에러가 있어도 클라이언트 정리는 계속 진행
      }

      // 2. 클라이언트 측 완전한 상태 정리
      if (typeof window !== 'undefined') {
        // localStorage 정리
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith('supabase.') ||
            key.startsWith('sb-') ||
            key.includes('auth') ||
            key.includes('session') ||
            key.includes('user') ||
            key.includes('quote') ||
            key.includes('draft')
          )) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // sessionStorage 정리
        const sessionKeysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (
            key.startsWith('supabase.') ||
            key.startsWith('sb-') ||
            key.includes('auth') ||
            key.includes('session') ||
            key.includes('user') ||
            key.includes('quote') ||
            key.includes('draft')
          )) {
            sessionKeysToRemove.push(key);
          }
        }
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

        // 쿠키 정리 (Supabase 관련)
        document.cookie.split(';').forEach(cookie => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.startsWith('sb-') || name.includes('supabase')) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          }
        });

        // 브라우저 캐시 관련 헤더 설정을 위한 페이지 리로드 강제
        // 이를 통해 메모리상의 임시 데이터도 정리
        setTimeout(() => {
          window.location.href = '/auth/login?logout=true';
        }, 100);
      }

      // 3. 보안 로깅
      secureLog.authEvent('logout', {
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      });

    } catch (error) {
      secureLog.error('Logout process error', error);
      // 에러가 발생해도 기본적인 정리는 수행
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/auth/login?error=logout_failed';
      }
      throw new Error('로그아웃 처리 중 오류가 발생했습니다.');
    }
  }

  /**
   * 현재 사용자 정보 가져오기
   */
  static async getCurrentUser(): Promise<AuthUser | null> {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // 서버 측 도메인 체크 (보안 강화)
    if (!user.email?.endsWith('@motionsense.co.kr')) {
      secureLog.authEvent('domain_violation', {
        email: user.email,
        userId: user.id,
      });
      
      await this.signOut();
      throw new Error(
        '접근이 제한된 도메인입니다. @motionsense.co.kr 계정을 사용해주세요.'
      );
    }

    // 프로필 정보 가져오기
    const profile = await this.getProfile(user.id);

    return {
      ...user,
      profile,
    };
  }

  /**
   * 사용자 프로필 가져오기
   */
  static async getProfile(userId: string): Promise<Profile | undefined> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      secureLog.error('Profile fetch error', error);
      return undefined;
    }

    return data;
  }

  /**
   * 프로필 생성 또는 업데이트 (17번 마이그레이션 호환)
   */
  static async upsertProfile(
    userId: string,
    email: string,
    fullName?: string
  ): Promise<Profile> {
    secureLog.debug('AuthService.upsertProfile called', {
      userId,
      email: email?.replace(/(.{2}).*@/, '$1***@'), // 이메일 마스킹
      fullName,
    });

    try {
      // 기존 프로필 확인
      secureLog.debug('Checking for existing profile...');
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        secureLog.error('Error fetching existing profile', fetchError);
        throw new Error(`프로필 조회 실패: ${fetchError.message}`);
      }

      const profileData = {
        id: userId,
        email,
        full_name: fullName || email.split('@')[0],
        role: email === 'lewis@motionsense.co.kr' ? 'super_admin' : 'member',
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      secureLog.debug('Profile data to upsert', {
        id: profileData.id,
        email: profileData.email?.replace(/(.{2}).*@/, '$1***@'),
        role: profileData.role,
        is_active: profileData.is_active,
      });

      if (existingProfile) {
        // 업데이트
        secureLog.debug('Updating existing profile...');
        const { data, error } = await supabase
          .from('profiles')
          .update({
            email: profileData.email,
            full_name: profileData.full_name,
            updated_at: profileData.updated_at,
          })
          .eq('id', userId)
          .select()
          .single();

        if (error) {
          secureLog.error('Profile update error', error);
          throw new Error(`프로필 업데이트 실패: ${error.message}`);
        }

        secureLog.info('Profile update successful', { userId: data.id });
        return data;
      } else {
        // 새로 생성
        secureLog.debug('Creating new profile...');
        const { data, error } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();

        if (error) {
          secureLog.error('Profile insert error', error);
          throw new Error(`프로필 생성 실패: ${error.message}`);
        }

        secureLog.info('Profile creation successful', { userId: data.id });
        return data;
      }
    } catch (error) {
      secureLog.error('upsertProfile failed', error);
      throw error;
    }
  }

  /**
   * 사용자 초대 (관리자 전용)
   */
  static async inviteUser(
    email: string,
    fullName?: string,
    role: 'member' | 'admin' = 'member'
  ): Promise<Profile> {
    const { data, error } = await supabase.rpc('invite_user', {
      p_email: email,
      p_full_name: fullName,
      p_role: role,
    });

    if (error) {
      throw new Error(`사용자 초대 실패: ${error.message}`);
    }

    return data;
  }

  /**
   * 사용자 역할 변경 (관리자 전용)
   */
  static async changeUserRole(
    userId: string,
    newRole: 'member' | 'admin'
  ): Promise<Profile> {
    const { data, error } = await supabase.rpc('change_user_role', {
      p_user_id: userId,
      p_new_role: newRole,
    });

    if (error) {
      throw new Error(`역할 변경 실패: ${error.message}`);
    }

    return data;
  }

  /**
   * 사용자 비활성화 (관리자 전용)
   */
  static async deactivateUser(userId: string): Promise<Profile> {
    const { data, error } = await supabase.rpc('deactivate_user', {
      p_user_id: userId,
    });

    if (error) {
      throw new Error(`사용자 비활성화 실패: ${error.message}`);
    }

    return data;
  }

  /**
   * 사용자 목록 조회 (관리자 전용)
   */
  static async getUserList(): Promise<any[]> {
    const { data, error } = await supabase
      .from('user_management_view')
      .select('*');

    if (error) {
      throw new Error(`사용자 목록 조회 실패: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 프로필 업데이트
   */
  static async updateProfile(
    userId: string,
    updates: Partial<Profile>
  ): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`프로필 업데이트 실패: ${error.message}`);
    }

    return data;
  }

  /**
   * 관리자 권한 확인
   */
  static isAdmin(profile?: Profile): boolean {
    return profile?.role === 'admin';
  }

  /**
   * 활성 사용자 확인
   */
  static isActive(profile?: Profile): boolean {
    return profile?.is_active === true;
  }
}
