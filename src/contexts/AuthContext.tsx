'use client';

// 인증 제거 - NoAuthContext로 리다이렉트
export { useNoAuth as useAuth } from './NoAuthContext';

// 기존 타입들 유지를 위한 더미 export
export const AuthProvider = () => null;

// 모든 내용이 NoAuth로 리디렉션됨