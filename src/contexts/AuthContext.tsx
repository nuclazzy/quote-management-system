'use client';

// 간단한 리디렉션을 위해 SimpleAuthContext를 재사용
export { useSimpleAuth as useAuth } from './SimpleAuthContext';

// 기존 타입들 유지를 위한 더미 export
export const AuthProvider = () => null;

// 모든 내용이 위에서 SimpleAuth로 리디렉션됨