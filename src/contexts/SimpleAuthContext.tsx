'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// 매우 단순한 Auth Context
interface SimpleAuthState {
  user: any | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SimpleAuthContext = createContext<SimpleAuthState | undefined>(undefined);

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔥 SimpleAuthProvider - Starting initialization');
    
    const supabase = createClient();
    
    // 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔥 SimpleAuthProvider - Session:', session ? 'Found' : 'None');
      
      if (session?.user) {
        const userData = {
          ...session.user,
          profile: {
            id: session.user.id,
            email: session.user.email!,
            full_name: session.user.user_metadata?.full_name || session.user.email!.split('@')[0],
            role: session.user.email === 'lewis@motionsense.co.kr' ? 'super_admin' : 'member',
            is_active: true,
          },
        };
        setUser(userData);
      }
      setLoading(false);
    });

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔥 SimpleAuthProvider - Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        const userData = {
          ...session.user,
          profile: {
            id: session.user.id,
            email: session.user.email!,
            full_name: session.user.user_metadata?.full_name || session.user.email!.split('@')[0],
            role: session.user.email === 'lewis@motionsense.co.kr' ? 'super_admin' : 'member',
            is_active: true,
          },
        };
        setUser(userData);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const signIn = async () => {
    const supabase = createClient();
    const siteUrl = window.location.origin;
    
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
        queryParams: { hd: 'motionsense.co.kr' },
      },
    });
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  };

  return (
    <SimpleAuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </SimpleAuthContext.Provider>
  );
}

export function useSimpleAuth() {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
}