'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  console.log('🎯 HOME PAGE: 즉시 대시보드로 리다이렉트');

  // 즉시 대시보드로 리다이렉트
  useEffect(() => {
    router.push('/dashboard');
  }, [router]);

  // LoadingState 컴포넌트 대신 간단한 HTML 사용
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div>
        <h2 style={{ color: '#1976d2', marginBottom: '10px' }}>🚀 대시보드로 이동 중...</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>잠시만 기다려주세요</p>
      </div>
    </div>
  );
}
