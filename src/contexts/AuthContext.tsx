'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AuthService } from '@/lib/auth/auth-service';
import { AuthContextType, AuthState, ProfileUpdate } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    initialized: false,
  });

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('AuthContext: Initializing...');
      
      try {
        // Supabase 클라이언트 생성
        const supabase = createClient();
        
        // 세션 가져오기 (타임아웃 포함)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 5000)
        );
        
        const sessionPromise = supabase.auth.getSession();
        
        try {
          const result = await Promise.race([sessionPromise, timeoutPromise]);
          const session = (result as any).data?.session;
          
          if (session?.user) {
            console.log('AuthContext: Session found, fetching profile...');
            
            // 프로필 데이터 가져오기 (에러 무시)
            let profile = null;
            try {
              const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
              profile = data;
            } catch (profileError) {
              console.warn('Profile fetch failed, using defaults');
            }

            // 사용자 객체 생성
            const user = {
              ...session.user,
              profile: profile || {
                id: session.user.id,
                email: session.user.email!,
                full_name:
                  session.user.user_metadata?.full_name ||
                  session.user.email!.split('@')[0],
                role: profile?.role || 'member',
                is_active: profile?.is_active ?? true,
              },
            };

            console.log('AuthContext: User authenticated');
            setAuthState({
              user,
              loading: false,
              initialized: true,
            });
          } else {
            console.log('AuthContext: No session found');
            setAuthState({
              user: null,
              loading: false,
              initialized: true,
            });
          }
        } catch (timeoutError) {
          console.error('AuthContext: Session timeout, proceeding without auth');
          setAuthState({
            user: null,
            loading: false,
            initialized: true,
          });
        }
      } catch (error) {
        console.error('AuthContext: Fatal error during initialization:', error);
        // 에러가 있어도 초기화는 완료로 처리
        setAuthState({
          user: null,
          loading: false,
          initialized: true,
        });
      }
    };

    // 즉시 실행
    initializeAuth();

    // Auth state 구독 (별도로 처리)
    let subscription: any = null;
    
    try {
      const supabase = createClient();
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('AuthContext: Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // 프로필 데이터 가져오기
          let profile = null;
          try {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            profile = data;
          } catch (profileError) {
            console.warn('Profile fetch failed in state change');
          }

          const user = {
            ...session.user,
            profile: profile || {
              id: session.user.id,
              email: session.user.email!,
              full_name:
                session.user.user_metadata?.full_name ||
                session.user.email!.split('@')[0],
              role: profile?.role || 'member',
              is_active: profile?.is_active ?? true,
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
      
      subscription = data?.subscription;
    } catch (subscriptionError) {
      console.error('AuthContext: Subscription setup failed:', subscriptionError);
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