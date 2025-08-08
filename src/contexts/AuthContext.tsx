'use client';

// 완전히 정적인 인증 - 하이드레이션 문제 해결
export { useStaticAuth as useAuth } from './StaticAuthContext';

// 기존 타입들 유지를 위한 더미 export
export const AuthProvider = () => null;

// 모든 내용이 StaticAuth로 리다이렉션됨