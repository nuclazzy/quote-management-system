'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// 완전히 정적인 인증 - 로딩 없음
interface StaticAuthState {
  user: { id: string; email: string; name: string };
  loading: false; // 절대 로딩하지 않음
  initialized: true; // 항상 초기화됨
  isAdmin: boolean;
  adminLogin: (password: string) => boolean;
  adminLogout: () => void;
}

const StaticAuthContext = createContext<StaticAuthState | undefined>(undefined);

// 정적 사용자 객체 - 절대 변하지 않음
const STATIC_USER = {
  id: 'static',
  email: 'user@example.com',
  name: '사용자'
};

export function StaticAuthProvider({ children }: { children: React.ReactNode }) {
  // 초기값은 항상 false (서버/클라이언트 동일하게)
  const [isAdmin, setIsAdmin] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // 컴포넌트 마운트 시 localStorage에서 상태 복원
  useEffect(() => {
    setIsHydrated(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('isAdmin');
      if (stored === 'true') {
        setIsAdmin(true);
      }
    }
  }, []);
  
  const adminLogin = (password: string): boolean => {
    if (password === 'admin123') {
      setIsAdmin(true);
      // localStorage에 즉시 저장
      if (typeof window !== 'undefined') {
        localStorage.setItem('isAdmin', 'true');
      }
      return true;
    }
    return false;
  };

  const adminLogout = () => {
    setIsAdmin(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isAdmin');
    }
  };

  // 완전히 정적인 값 - 서버와 클라이언트에서 동일
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

export function useStaticAuth() {
  const context = useContext(StaticAuthContext);
  if (context === undefined) {
    // Provider 외부에서 호출된 경우 기본값 반환
    console.warn('useStaticAuth called outside of StaticAuthProvider, returning default values');
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

// useAuth를 useStaticAuth의 별칭으로 export (호환성)
export const useAuth = useStaticAuth;