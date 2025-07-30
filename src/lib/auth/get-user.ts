import { createClient } from '@/lib/supabase/server';
import { AuthUser } from '@/types/auth';

/**
 * 서버 사이드에서 현재 인증된 사용자 정보를 가져오는 함수
 */
export async function getUser(): Promise<AuthUser | null> {
  const supabase = await createClient();

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // 도메인 체크
    if (!user.email?.endsWith('@motionsense.co.kr')) {
      return null;
    }

    // 프로필 정보 가져오기
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      ...user,
      profile,
    };
  } catch (error) {
    console.error('getUser error:', error);
    return null;
  }
}
