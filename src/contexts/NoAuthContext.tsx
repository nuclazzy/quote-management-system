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
  // 서버에서는 항상 로딩 상태, 클라이언트에서만 사용자 설정
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    console.log('🚀 NoAuthProvider 클라이언트 초기화 시작');
    
    // 하이드레이션 완료 표시
    setHydrated(true);
    
    // 기본 사용자 설정 (클라이언트에서만)
    const defaultUser = {
      id: 'anonymous',
      email: 'user@example.com',
      name: '사용자'
    };
    
    console.log('👤 기본 사용자 설정:', defaultUser);
    setUser(defaultUser);
    
    // localStorage에서 관리자 상태 복원 (클라이언트에서만)
    try {
      const adminStatus = localStorage.getItem('isAdmin');
      console.log('🔐 관리자 상태 복원:', adminStatus);
      if (adminStatus === 'true') {
        setIsAdmin(true);
      }
    } catch (e) {
      console.warn('localStorage 접근 실패:', e);
    }
    
    console.log('✅ NoAuth 초기화 완료 - 로딩 false로 설정');
    setLoading(false);
  }, []);

  // 하이드레이션 전에는 로딩 상태 유지
  if (!hydrated) {
    return (
      <NoAuthContext.Provider value={{ 
        user: null, 
        loading: true, 
        isAdmin: false, 
        adminLogin: () => false, 
        adminLogout: () => {} 
      }}>
        {children}
      </NoAuthContext.Provider>
    );
  }

  // 하이드레이션 후에만 실행되는 함수들
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