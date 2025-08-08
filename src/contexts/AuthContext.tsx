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
  // 강제로 alert로 디버깅
  if (typeof window !== 'undefined') {
    console.log('🚨 AuthProvider mounted at:', new Date().toISOString());
  }
  
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    initialized: false,
  });

  useEffect(() => {
    console.log('🚨 AuthProvider useEffect started at:', new Date().toISOString());
    
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        const supabase = getSupabaseClient();
        
        // 세션 가져오기
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('🚨 CRITICAL - Session check:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          mounted,
          timestamp: new Date().toISOString()
        });
        
        if (!mounted) return;
        
        if (session?.user) {
          // 프로필 데이터 사용하지 않고 세션 정보만 사용
          const user = {
            ...session.user,
            profile: {
              id: session.user.id,
              email: session.user.email!,
              full_name:
                session.user.user_metadata?.full_name ||
                session.user.user_metadata?.name ||
                session.user.email!.split('@')[0],
              role: session.user.email === 'lewis@motionsense.co.kr' ? 'super_admin' : 'member',
              is_active: true,
            },
          };

          console.log('AuthContext DEBUG - Setting user state:', {
            userId: user.id,
            email: user.email,
            profileRole: user.profile.role
          });
          
          setAuthState({
            user,
            loading: false,
            initialized: true,
          });
        } else {
          console.log('AuthContext DEBUG - No session, setting null user');
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
    console.log('🚨 CRITICAL - About to initialize auth');
    initializeAuth().then(() => {
      console.log('🚨 CRITICAL - Auth initialization completed');
    }).catch(error => {
      console.error('🚨 CRITICAL - Auth initialization failed:', error);
    });

    // Auth state 구독
    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_IN' && session?.user) {
        // 프로필 데이터 사용하지 않고 세션 정보만 사용
        const user = {
          ...session.user,
          profile: {
            id: session.user.id,
            email: session.user.email!,
            full_name:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              session.user.email!.split('@')[0],
            role: session.user.email === 'lewis@motionsense.co.kr' ? 'super_admin' : 'member',
            is_active: true,
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