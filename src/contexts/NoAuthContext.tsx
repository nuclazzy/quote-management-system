'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

// 인증 없이 모든 사용자 허용
interface NoAuthState {
  user: { id: string; email: string; name: string } | null;
  loading: boolean;
  isAdmin: boolean;
  adminLogin: (password: string) => boolean;
  adminLogout: () => void;
}

const NoAuthContext = createContext<NoAuthState | undefined>(undefined);

export function NoAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 즉시 기본 사용자로 설정
    const defaultUser = {
      id: 'anonymous',
      email: 'user@example.com',
      name: '사용자'
    };
    
    setUser(defaultUser);
    
    // localStorage에서 관리자 상태 복원
    const adminStatus = localStorage.getItem('isAdmin');
    if (adminStatus === 'true') {
      setIsAdmin(true);
    }
    
    setLoading(false);
    console.log('✅ NoAuth 초기화 완료');
  }, []);

  const adminLogin = (password: string): boolean => {
    const adminPassword = 'admin123'; // 간단한 비밀번호
    
    if (password === adminPassword) {
      setIsAdmin(true);
      localStorage.setItem('isAdmin', 'true');
      console.log('✅ 관리자 로그인 성공');
      return true;
    }
    
    console.log('❌ 관리자 비밀번호 틀림');
    return false;
  };

  const adminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('isAdmin');
    console.log('✅ 관리자 로그아웃');
  };

  return (
    <NoAuthContext.Provider value={{ 
      user, 
      loading, 
      isAdmin, 
      adminLogin, 
      adminLogout 
    }}>
      {children}
    </NoAuthContext.Provider>
  );
}

export function useNoAuth() {
  const context = useContext(NoAuthContext);
  if (context === undefined) {
    throw new Error('useNoAuth must be used within a NoAuthProvider');
  }
  return context;
}