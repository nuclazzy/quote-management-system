# 인증 플로우 분석 및 문제 해결 가이드

## 📊 현재 인증 플로우 시나리오

### 1. 로그인 시작 (Login Initiation)
**경로**: `/auth/login` → Google OAuth

**프로세스**:
1. 사용자가 `/auth/login` 페이지 접속
2. "Google로 로그인" 버튼 클릭
3. `AuthService.signInWithGoogle()` 호출
4. Supabase OAuth 리다이렉트 URL 생성:
   - 현재 설정: `https://quote.motionsense.co.kr/auth/callback`
   - NEXT_PUBLIC_SITE_URL 환경변수 사용

**코드 위치**:
- `/src/app/auth/login/page.tsx` (19-122줄)
- `/src/lib/auth/auth-service.ts` (12-46줄)

### 2. Google OAuth 인증
**프로세스**:
1. Google 로그인 페이지로 리다이렉트
2. 도메인 제한: `@motionsense.co.kr` 계정만 허용
3. 인증 성공 시 Supabase callback URL로 리다이렉트

**주요 설정**:
```javascript
// auth-service.ts
queryParams: {
  hd: 'motionsense.co.kr', // Google Workspace 도메인 제한
}
```

### 3. 콜백 처리 (Callback Processing) ⚠️ **문제 발생 지점**
**경로**: `/auth/callback`

**현재 상태**: 
- **단순화된 버전** (현재 활성화): 3초 후 자동 리다이렉트
- **원본 버전** (백업): 세션 처리 로직 포함

**문제점**:
1. 단순화 버전은 실제 세션 확인을 하지 않음
2. 원본 버전의 세션 처리가 실패하는 경우가 있음

### 4. AuthContext 초기화
**프로세스**:
1. `AuthProvider`에서 Supabase 세션 확인
2. 프로필 데이터 가져오기
3. 사용자 상태 설정

**주요 코드**:
```javascript
// AuthContext.tsx (21-89줄)
const initializeAuth = async () => {
  const result = await supabase.auth.getSession();
  session = result.data?.session;
  // ...프로필 데이터 처리
}
```

### 5. 대시보드 접근
**경로**: `/dashboard`

**현재 상태**:
- **단순화된 버전**: 하드코딩된 데이터 표시
- **원본 버전**: API 호출을 통한 실제 데이터 표시

## 🔍 발견된 문제점

### 1. 환경 변수 불일치
- `.env.local`: `NEXT_PUBLIC_SITE_URL=https://quote.motionsense.co.kr`
- Supabase 대시보드에 설정된 Redirect URL과 일치 필요

### 2. 콜백 페이지 세션 처리 실패
- 현재 단순화된 버전은 세션 검증 없이 리다이렉트
- 실제 로그인 상태가 설정되지 않을 수 있음

### 3. Middleware 인증 체크 부재
- `middleware.ts`에서 실제 인증 체크를 하지 않음
- 주석: "Edge Runtime doesn't support Supabase client operations"

### 4. Supabase 클라이언트 초기화
- 클라이언트 생성 시 디버그 로그는 있지만 실제 연결 확인 없음

## 🛠️ 해결 방안

### Step 1: Supabase 대시보드 설정 확인
1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. Authentication > URL Configuration 확인:
   ```
   Site URL: https://quote.motionsense.co.kr
   Redirect URLs: 
   - https://quote.motionsense.co.kr/**
   - https://quote.motionsense.co.kr/auth/callback
   ```

### Step 2: 콜백 페이지 복원 및 개선
원본 콜백 페이지를 개선하여 더 안정적인 세션 처리:

```typescript
// /src/app/auth/callback/page.tsx (개선 버전)
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CircularProgress, Box, Typography, Alert } from '@mui/material';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('Auth callback started');
        
        // 1. URL에서 에러 체크
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          console.error('OAuth error:', error, errorDescription);
          setStatus('error');
          setErrorMessage(errorDescription || '인증 중 오류가 발생했습니다.');
          return;
        }

        // 2. 세션 복구 시도
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setStatus('error');
          setErrorMessage('세션 처리 중 오류가 발생했습니다.');
          return;
        }

        if (!session) {
          // 3. URL 해시에서 토큰 확인 (OAuth 리다이렉트 직후)
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          
          if (accessToken) {
            // 세션 설정 없이 바로 대시보드로 이동
            // AuthContext가 자동으로 세션을 감지할 것임
            console.log('Token found, redirecting to dashboard');
            setStatus('success');
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 1000);
            return;
          }
          
          console.error('No session found');
          setStatus('error');
          setErrorMessage('인증 정보를 찾을 수 없습니다.');
          return;
        }

        // 4. 세션이 있으면 대시보드로 이동
        console.log('Session found, redirecting to dashboard');
        setStatus('success');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
        
      } catch (error) {
        console.error('Callback error:', error);
        setStatus('error');
        setErrorMessage('인증 처리 중 오류가 발생했습니다.');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (status === 'error') {
    return (
      <Box
        display='flex'
        flexDirection='column'
        justifyContent='center'
        alignItems='center'
        minHeight='100vh'
        gap={2}
      >
        <Alert severity='error' sx={{ maxWidth: 400 }}>
          <Typography variant='h6' gutterBottom>
            로그인 실패
          </Typography>
          <Typography variant='body2'>{errorMessage}</Typography>
        </Alert>
        <Typography
          variant='body2'
          color='primary'
          sx={{ cursor: 'pointer' }}
          onClick={() => router.push('/auth/login')}
        >
          다시 로그인하기
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      display='flex'
      flexDirection='column'
      justifyContent='center'
      alignItems='center'
      minHeight='100vh'
      gap={2}
    >
      <CircularProgress />
      <Typography variant='h6'>
        {status === 'success' ? '로그인 성공!' : '로그인 처리 중...'}
      </Typography>
      <Typography variant='body2' color='text.secondary'>
        잠시만 기다려주세요...
      </Typography>
    </Box>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        minHeight='100vh'
      >
        <CircularProgress />
      </Box>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
```

### Step 3: AuthContext 개선
세션 복구 로직 강화:

```typescript
// AuthContext.tsx의 initializeAuth 함수 개선
const initializeAuth = async () => {
  try {
    // 1. 먼저 세션 복구 시도
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session recovery error:', error);
      // 에러가 있어도 계속 진행
    }

    // 2. URL 해시 체크 (OAuth 콜백 직후)
    if (!session && typeof window !== 'undefined') {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      
      if (accessToken) {
        // Supabase가 자동으로 처리하도록 대기
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: { session: newSession } } = await supabase.auth.getSession();
        if (newSession) {
          // 세션 설정 성공
          await processUserSession(newSession);
          return;
        }
      }
    }

    // 3. 세션 처리
    if (session) {
      await processUserSession(session);
    } else {
      setAuthState({
        user: null,
        loading: false,
        initialized: true,
      });
    }
  } catch (error) {
    console.error('Auth initialization error:', error);
    setAuthState({
      user: null,
      loading: false,
      initialized: true,
    });
  }
};
```

### Step 4: 대시보드 페이지 복원
원래 기능으로 복원하되 에러 처리 강화:

```typescript
// /src/app/(dashboard)/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { DashboardService } from '@/lib/services/dashboard-service';
// ... 기존 imports

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 인증 체크
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadDashboardData();
    }
  }, [user, authLoading, router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('대시보드 데이터를 불러오는 중 오류가 발생했습니다.');
      
      // 폴백 데이터 사용
      setStats({
        totalQuotes: 0,
        totalAmount: 0,
        activeCustomers: 0,
        activeProjects: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // ... 나머지 렌더링 로직
}
```

## 📋 체크리스트

1. ✅ Supabase Dashboard에서 Redirect URL 확인
2. ✅ 환경 변수 확인 (NEXT_PUBLIC_SITE_URL)
3. ✅ 콜백 페이지 개선 버전 적용
4. ✅ AuthContext 세션 복구 로직 강화
5. ✅ 대시보드 페이지 에러 처리 강화
6. ✅ 브라우저 개발자 도구에서 네트워크 및 콘솔 로그 확인

## 🚀 테스트 시나리오

1. **정상 로그인 플로우**:
   - `/auth/login` 접속
   - Google 로그인
   - `/auth/callback` 리다이렉트
   - `/dashboard` 자동 이동

2. **세션 복구 테스트**:
   - 로그인 후 페이지 새로고침
   - 세션 유지 확인

3. **에러 처리 테스트**:
   - 잘못된 도메인 계정으로 로그인 시도
   - 네트워크 오류 시뮬레이션

## 📝 로그 확인 포인트

브라우저 콘솔에서 확인할 로그:
- `[Supabase Debug]` - Supabase 클라이언트 초기화
- `Google OAuth redirect URL` - OAuth 리다이렉트 URL
- `Auth callback started` - 콜백 처리 시작
- `Session found/not found` - 세션 상태
- `processUser 호출됨` - 사용자 처리

## 🔧 추가 디버깅

필요시 다음 명령어로 Supabase 연결 테스트:
```javascript
// 브라우저 콘솔에서 실행
const { createClient } = await import('/src/lib/supabase/client.ts');
const supabase = createClient();
const { data, error } = await supabase.auth.getSession();
console.log('Session:', data, 'Error:', error);
```