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
  // 초기값은 false로 설정 (서버/클라이언트 동일)
  const [isAdmin, setIsAdmin] = useState(false);
  
  // 클라이언트 사이드에서만 localStorage 읽기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('isAdmin');
      if (stored === 'true') {
        setIsAdmin(true);
      }
    }
  }, []);
  
  // isAdmin 상태가 변경될 때 localStorage에 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isAdmin', isAdmin.toString());
    }
  }, [isAdmin]);
  
  const adminLogin = (password: string): boolean => {
    if (password === 'admin123') {
      setIsAdmin(true);
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
    throw new Error('useStaticAuth must be used within a StaticAuthProvider');
  }
  return context;
}