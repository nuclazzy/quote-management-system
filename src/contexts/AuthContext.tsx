'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AuthService } from '@/lib/auth/auth-service';
import { AuthContextType, AuthState, ProfileUpdate } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 전역 Supabase 클라이언트 (싱글톤)
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient();
  }
  return supabaseClient;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    initialized: false,
  });

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        const supabase = getSupabaseClient();
        
        // 세션 가져오기
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (session?.user) {
          // 프로필 데이터 가져오기 (에러 시 기본값 사용)
          let profile = null;
          try {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            profile = data;
          } catch (profileError) {
            console.warn('Profile fetch failed, using default profile');
            // 프로필 조회 실패해도 기본 프로필로 계속 진행
          }

          // 사용자 객체 생성 - 프로필 없어도 로그인 상태 유지
          const user = {
            ...session.user,
            profile: profile || {
              id: session.user.id,
              email: session.user.email!,
              full_name:
                session.user.user_metadata?.full_name ||
                session.user.email!.split('@')[0],
              role: 'member', // 기본 역할
              is_active: true, // 기본 활성 상태
            },
          };

          setAuthState({
            user,
            loading: false,
            initialized: true,
          });
        } else {
          setAuthState({
            user: null,
            loading: false,
            initialized: true,
          });
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        if (mounted) {
          setAuthState({
            user: null,
            loading: false,
            initialized: true,
          });
        }
      }
    };

    // 타임아웃 설정 (5초로 단축)
    const timeout = setTimeout(() => {
      if (mounted && authState.loading) {
        setAuthState({
          user: null,
          loading: false,
          initialized: true,
        });
      }
    }, 5000);

    // 즉시 실행
    initializeAuth();

    // Auth state 구독
    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_IN' && session?.user) {
        // 프로필 데이터 가져오기 (에러 시 기본값 사용)
        let profile = null;
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          profile = data;
        } catch (profileError) {
          console.warn('Profile fetch failed in auth state change');
        }

        const user = {
          ...session.user,
          profile: profile || {
            id: session.user.id,
            email: session.user.email!,
            full_name:
              session.user.user_metadata?.full_name ||
              session.user.email!.split('@')[0],
            role: 'member', // 기본 역할
            is_active: true, // 기본 활성 상태
          },
        };

        setAuthState({
          user,
          loading: false,
          initialized: true,
        });
      } else if (event === 'SIGNED_OUT') {
        setAuthState({
          user: null,
          loading: false,
          initialized: true,
        });
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async () => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true }));
      await AuthService.signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
      setAuthState((prev) => ({ ...prev, loading: false }));
      throw new Error('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const signOut = async () => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true }));
      await AuthService.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      setAuthState((prev) => ({ ...prev, loading: false }));
      throw error;
    }
  };

  const updateProfile = async (updates: ProfileUpdate) => {
    if (!authState.user?.id) {
      throw new Error('사용자가 로그인되어 있지 않습니다.');
    }

    try {
      const updatedProfile = await AuthService.updateProfile(
        authState.user.id,
        updates
      );
      setAuthState((prev) => ({
        ...prev,
        user: prev.user ? { ...prev.user, profile: updatedProfile } : null,
      }));
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const value = useMemo(
    () => ({
      ...authState,
      signIn,
      signOut,
      updateProfile,
    }),
    [authState]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}