'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
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
        // Supabase client 생성 확인
        let session = null;
        try {
          const result = await supabase.auth.getSession();
          session = result.data?.session;
          if (result.error) {
            console.error('Session error:', result.error);
          }
        } catch (clientError) {
          console.error('Supabase client error:', clientError);
          // 클라이언트 생성 실패 시 기본 상태로 설정
          setAuthState({
            user: null,
            loading: false,
            initialized: true,
          });
          return;
        }

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
        // More detailed error logging
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        setAuthState({
          user: null,
          loading: false,
          initialized: true,
        });
      }
    };

    initializeAuth();

    // Auth state change subscription with error handling
    let subscription: any = null;
    try {
      const result = supabase.auth.onAuthStateChange(async (event, session) => {
        try {
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
        } catch (stateChangeError) {
          console.error('Auth state change error:', stateChangeError);
          setAuthState({
            user: null,
            loading: false,
            initialized: true,
          });
        }
      });
      
      subscription = result.data?.subscription;
    } catch (subscriptionError) {
      console.error('Auth subscription error:', subscriptionError);
    }

    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async () => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true }));
      await AuthService.signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
      setAuthState((prev) => ({ ...prev, loading: false }));
      // Don't throw in production to prevent crashes
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
      // Return a user-friendly error message instead
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
