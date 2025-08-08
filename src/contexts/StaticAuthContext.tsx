'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface StaticAuthState {
  user: { id: string; email: string; name: string };
  loading: false;
  initialized: true;
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
  // 초기 상태는 항상 false (SSR 안전)
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);

  // 클라이언트 사이드 확인
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 클라이언트 사이드에서만 localStorage 확인
  useEffect(() => {
    if (!isClient) return;

    try {
      const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (stored === 'true') {
        console.log('[Auth] Restored admin state from localStorage');
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('[Auth] Failed to read localStorage:', error);
    }
  }, [isClient]);

  // 관리자 로그인 함수
  const adminLogin = useCallback((password: string): boolean => {
    if (password === 'admin123') {
      console.log('[Auth] Admin login successful');
      setIsAdmin(true);
      
      // localStorage에 저장
      try {
        localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
        console.log('[Auth] Admin state saved to localStorage');
      } catch (error) {
        console.error('[Auth] Failed to save to localStorage:', error);
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
    
    // localStorage에서 제거
    try {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      console.log('[Auth] Admin state removed from localStorage');
    } catch (error) {
      console.error('[Auth] Failed to remove from localStorage:', error);
    }
  }, []);

  // Context 값
  const contextValue: StaticAuthState = {
    user: STATIC_USER,
    loading: false,
    initialized: true,
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
      isAdmin: false,
      adminLogin: () => false,
      adminLogout: () => {}
    };
  }
  
  return context;
}

// useAuth alias for compatibility
export const useAuth = useStaticAuth;