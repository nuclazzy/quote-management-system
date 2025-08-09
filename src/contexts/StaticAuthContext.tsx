'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface StaticAuthState {
  user: { id: string; email: string; name: string };
  loading: false;
  initialized: true;
  isHydrated: boolean;
  isAdmin: boolean;
  adminLogin: (password: string) => boolean;
  adminLogout: () => void;
}

const StaticAuthContext = createContext<StaticAuthState | undefined>(undefined);

// 정적 사용자 객체
const STATIC_USER = {
  id: 'static',
  email: 'user@example.com',
  name: '사용자'
};

// localStorage 키
const ADMIN_STORAGE_KEY = 'motionsense_admin_state';

export function StaticAuthProvider({ children }: { children: React.ReactNode }) {
  // Hydration 완료 여부 추적
  const [isHydrated, setIsHydrated] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Hydration 완료 후 localStorage 상태 복원
  useEffect(() => {
    // 브라우저 환경에서만 localStorage 접근
    if (typeof window === 'undefined') return;

    let timeoutId: NodeJS.Timeout;

    // localStorage 상태 복원을 비동기로 처리
    const restoreAdminState = () => {
      try {
        const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
        if (stored === 'true') {
          console.log('[Auth] Restored admin state from localStorage');
          setIsAdmin(true);
        }
      } catch (error) {
        console.error('[Auth] Failed to read localStorage:', error);
        // localStorage 접근 실패 시 기본 상태 유지
      }

      // Hydration 완료 마킹 (상태 복원 후 실행)
      timeoutId = setTimeout(() => {
        setIsHydrated(true);
        console.log('[Auth] Hydration completed');
      }, 0);
    };

    // 다음 틱에서 상태 복원 실행
    const restoreTimeout = setTimeout(restoreAdminState, 0);

    return () => {
      clearTimeout(restoreTimeout);
      clearTimeout(timeoutId);
    };
  }, []);

  // 관리자 로그인 함수
  const adminLogin = useCallback((password: string): boolean => {
    if (password === 'admin123') {
      console.log('[Auth] Admin login successful');
      setIsAdmin(true);
      
      // localStorage에 저장 (브라우저 환경에서만)
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
          console.log('[Auth] Admin state saved to localStorage');
        } catch (error) {
          console.error('[Auth] Failed to save to localStorage:', error);
        }
      }
      
      return true;
    }
    
    console.log('[Auth] Admin login failed - incorrect password');
    return false;
  }, []);

  // 관리자 로그아웃 함수
  const adminLogout = useCallback(() => {
    console.log('[Auth] Admin logout');
    setIsAdmin(false);
    
    // localStorage에서 제거 (브라우저 환경에서만)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(ADMIN_STORAGE_KEY);
        console.log('[Auth] Admin state removed from localStorage');
      } catch (error) {
        console.error('[Auth] Failed to remove from localStorage:', error);
      }
    }
  }, []);

  // Context 값
  const contextValue: StaticAuthState = {
    user: STATIC_USER,
    loading: false,
    initialized: true,
    isHydrated,
    isAdmin,
    adminLogin,
    adminLogout
  };

  return (
    <StaticAuthContext.Provider value={contextValue}>
      {children}
    </StaticAuthContext.Provider>
  );
}

// Hook
export function useStaticAuth() {
  const context = useContext(StaticAuthContext);
  
  // Context가 없는 경우 기본값 반환
  if (context === undefined) {
    console.warn('[Auth] useStaticAuth called outside of StaticAuthProvider');
    return {
      user: STATIC_USER,
      loading: false as const,
      initialized: true as const,
      isHydrated: false,
      isAdmin: false,
      adminLogin: () => false,
      adminLogout: () => {}
    };
  }
  
  return context;
}

// useAuth alias for compatibility
export const useAuth = useStaticAuth;