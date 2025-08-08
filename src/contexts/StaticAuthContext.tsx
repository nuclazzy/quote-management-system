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

// 전역 관리자 상태 (페이지 새로고침 시에도 유지)
let globalIsAdmin = false;

export function StaticAuthProvider({ children }: { children: React.ReactNode }) {
  // SSR 안전한 초기값 설정 - 항상 false로 시작
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  // 클라이언트 사이드에서 상태 동기화 - 마운트 후 즉시 실행
  useEffect(() => {
    setMounted(true);
    // 컴포넌트 마운트 후 localStorage 확인
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('motionsense_admin');
        const shouldBeAdmin = stored === 'true';
        console.log('Admin state from localStorage:', shouldBeAdmin);
        setIsAdmin(shouldBeAdmin);
        globalIsAdmin = shouldBeAdmin;
      } catch (e) {
        console.error('localStorage 읽기 오류:', e);
        setIsAdmin(false);
        globalIsAdmin = false;
      }
    }
  }, []);

  // isAdmin 변경 시 localStorage 업데이트 - mounted 상태 확인
  useEffect(() => {
    // 초기 마운트 시에는 실행하지 않음 (false positive 방지)
    if (!mounted) return;
    
    if (typeof window !== 'undefined') {
      try {
        if (isAdmin) {
          window.localStorage.setItem('motionsense_admin', 'true');
          globalIsAdmin = true;
          console.log('Admin state saved to localStorage: true');
        } else {
          window.localStorage.removeItem('motionsense_admin');
          globalIsAdmin = false;
          console.log('Admin state removed from localStorage');
        }
      } catch (e) {
        console.error('localStorage 쓰기 오류:', e);
      }
    }
  }, [isAdmin, mounted]);

  const adminLogin = (password: string): boolean => {
    if (password === 'admin123') {
      console.log('Admin login successful');
      setIsAdmin(true);
      // 즉시 localStorage 저장 (동기적)
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('motionsense_admin', 'true');
          globalIsAdmin = true;
          console.log('Admin state immediately saved to localStorage');
        } catch (e) {
          console.error('로그인 시 localStorage 저장 실패:', e);
        }
      }
      return true;
    }
    console.log('Admin login failed - incorrect password');
    return false;
  };

  const adminLogout = () => {
    setIsAdmin(false);
    globalIsAdmin = false;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('motionsense_admin');
      } catch (e) {
        console.error('로그아웃 시 localStorage 제거 실패:', e);
      }
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
    return {
      user: STATIC_USER,
      loading: false as const,
      initialized: true as const,
      isAdmin: globalIsAdmin,
      adminLogin: () => false,
      adminLogout: () => {}
    };
  }
  return context;
}

// useAuth를 useStaticAuth의 별칭으로 export (호환성)
export const useAuth = useStaticAuth;