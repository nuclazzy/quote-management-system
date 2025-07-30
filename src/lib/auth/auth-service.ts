import { supabase } from '../supabase/client';
import { Profile, AuthUser } from '@/types/auth';

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
   * 로그아웃
   */
  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
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

    // 도메인 체크
    if (!user.email?.endsWith('@motionsense.co.kr')) {
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
      console.error('Profile fetch error:', error);
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
    console.log('🔄 AuthService.upsertProfile called with:', {
      userId,
      email,
      fullName,
      timestamp: new Date().toISOString(),
    });

    try {
      // 기존 프로필 확인
      console.log('🔍 Checking for existing profile...');
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Error fetching existing profile:', fetchError);
        throw new Error(`프로필 조회 실패: ${fetchError.message}`);
      }

      const profileData = {
        id: userId,
        email,
        full_name: fullName || email.split('@')[0],
        role: email === 'lewis@motionsense.co.kr' ? 'super_admin' : 'user',
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      console.log('📝 Profile data to upsert:', profileData);

      if (existingProfile) {
        // 업데이트
        console.log('🔄 Updating existing profile...');
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
          console.error('❌ Profile update error:', error);
          throw new Error(`프로필 업데이트 실패: ${error.message}`);
        }

        console.log('✅ Profile update successful:', data);
        return data;
      } else {
        // 새로 생성
        console.log('🔄 Creating new profile...');
        const { data, error } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();

        if (error) {
          console.error('❌ Profile insert error:', error);
          throw new Error(`프로필 생성 실패: ${error.message}`);
        }

        console.log('✅ Profile creation successful:', data);
        return data;
      }
    } catch (error) {
      console.error('❌ upsertProfile failed:', {
        error,
        message: error instanceof Error ? error.message : error,
      });
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
