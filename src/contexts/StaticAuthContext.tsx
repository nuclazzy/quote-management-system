'use client';

import React, { createContext, useContext, useState } from 'react';

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
  console.log('🔧 StaticAuthProvider: 정적 인증 시작');
  const [isAdmin, setIsAdmin] = useState(false);
  
  const adminLogin = (password: string): boolean => {
    if (password === 'admin123') {
      setIsAdmin(true);
      console.log('✅ 정적 관리자 로그인 성공');
      return true;
    }
    console.log('❌ 정적 관리자 비밀번호 틀림');
    return false;
  };

  const adminLogout = () => {
    setIsAdmin(false);
    console.log('✅ 정적 관리자 로그아웃');
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