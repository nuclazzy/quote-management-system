import { supabase } from '../supabase/client'
import { Profile, AuthUser } from '@/types/auth'

export class AuthService {
  /**
   * Google OAuth 로그인
   */
  static async signInWithGoogle() {
    // 환경 변수에서 사이트 URL 가져오기
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    const redirectTo = `${siteUrl}/auth/callback`

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          hd: 'motionsense.co.kr' // Google Workspace 도메인 제한
        }
      }
    })

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  /**
   * 로그아웃
   */
  static async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(error.message)
    }
  }

  /**
   * 현재 사용자 정보 가져오기
   */
  static async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    // 도메인 체크
    if (!user.email?.endsWith('@motionsense.co.kr')) {
      await this.signOut()
      throw new Error('접근이 제한된 도메인입니다. @motionsense.co.kr 계정을 사용해주세요.')
    }

    // 프로필 정보 가져오기
    const profile = await this.getProfile(user.id)
    
    return {
      ...user,
      profile
    }
  }

  /**
   * 사용자 프로필 가져오기
   */
  static async getProfile(userId: string): Promise<Profile | undefined> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Profile fetch error:', error)
      return undefined
    }

    return data
  }

  /**
   * 프로필 생성 또는 업데이트
   */
  static async upsertProfile(userId: string, email: string, fullName?: string): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        role: 'member', // 기본값은 member, admin은 수동으로 설정
        is_active: true
      }, {
        onConflict: 'id'
      })
      .select()
      .single()

    if (error) {
      throw new Error(`프로필 생성/업데이트 실패: ${error.message}`)
    }

    return data
  }

  /**
   * 프로필 업데이트
   */
  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`프로필 업데이트 실패: ${error.message}`)
    }

    return data
  }

  /**
   * 관리자 권한 확인
   */
  static isAdmin(profile?: Profile): boolean {
    return profile?.role === 'admin'
  }

  /**
   * 활성 사용자 확인
   */
  static isActive(profile?: Profile): boolean {
    return profile?.is_active === true
  }
}