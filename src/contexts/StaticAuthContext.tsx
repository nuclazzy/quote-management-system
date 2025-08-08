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
  // localStorage에서 초기값 가져오기 (클라이언트에서만)
  const getInitialAdminState = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('isAdmin');
      console.log('[StaticAuth] 초기값 읽기 - localStorage isAdmin:', stored);
      return stored === 'true';
    }
    return false;
  };

  const [isAdmin, setIsAdmin] = useState(getInitialAdminState);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // 하이드레이션 완료 표시
  useEffect(() => {
    console.log('[StaticAuth] 컴포넌트 마운트됨, 현재 isAdmin:', isAdmin);
    setIsHydrated(true);
  }, []);
  
  // isAdmin 상태가 변경될 때 localStorage에 저장
  useEffect(() => {
    console.log('[StaticAuth] isAdmin 상태 변경됨:', isAdmin);
    if (typeof window !== 'undefined') {
      if (isAdmin) {
        localStorage.setItem('isAdmin', 'true');
        console.log('[StaticAuth] localStorage에 isAdmin=true 저장');
      } else {
        localStorage.removeItem('isAdmin');
        console.log('[StaticAuth] localStorage에서 isAdmin 제거');
      }
    }
  }, [isAdmin]);
  
  const adminLogin = (password: string): boolean => {
    console.log('[StaticAuth] adminLogin 호출됨, password:', password);
    if (password === 'admin123') {
      console.log('[StaticAuth] 비밀번호 일치! isAdmin을 true로 설정');
      setIsAdmin(true);
      // localStorage에 즉시 저장
      if (typeof window !== 'undefined') {
        localStorage.setItem('isAdmin', 'true');
        console.log('[StaticAuth] localStorage에 isAdmin=true 저장 완료');
      }
      return true;
    }
    console.log('[StaticAuth] 비밀번호 불일치');
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