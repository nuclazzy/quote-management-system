'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { AuthService } from '@/lib/auth/auth-service';
import { AuthContextType, AuthState, ProfileUpdate } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    initialized: false,
  });

  // 인증 상태 변경 감지 - 단순화 버전
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // 현재 세션 확인
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          // 간단한 사용자 객체 생성 (프로필 생성 스킵)
          const user = {
            ...session.user,
            profile: {
              id: session.user.id,
              email: session.user.email!,
              full_name:
                session.user.user_metadata?.full_name ||
                session.user.email!.split('@')[0],
              role: 'user',
              is_active: true,
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
        console.error('Auth initialization error:', error);
        setAuthState({
          user: null,
          loading: false,
          initialized: true,
        });
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // 간단한 사용자 객체 생성 (프로필 생성 스킵)
        const user = {
          ...session.user,
          profile: {
            id: session.user.id,
            email: session.user.email!,
            full_name:
              session.user.user_metadata?.full_name ||
              session.user.email!.split('@')[0],
            role: 'user',
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

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true }));
      await AuthService.signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
      setAuthState((prev) => ({ ...prev, loading: false }));
      throw error;
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

  const value: AuthContextType = {
    ...authState,
    signIn,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
