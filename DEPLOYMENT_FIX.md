# 🚨 Vercel 배포 로그인 문제 해결 가이드

## 문제 상황
- URL: https://motionsense-quote-system-motionsenses-projects.vercel.app
- 커스텀 도메인: https://quote.motionsense.co.kr
- 증상: 로그인 후 /auth/callback 페이지에서 멈춤

## 해결 방법

### 1. Supabase 대시보드 설정

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택 (xbkzzpewdfmykcosfkly)
3. **Authentication** → **URL Configuration** 이동

4. **Site URL** 설정 (커스텀 도메인으로):
   ```
   https://quote.motionsense.co.kr
   ```

5. **Redirect URLs** 에 다음 URL들 모두 추가:
   ```
   https://quote.motionsense.co.kr/**
   https://quote.motionsense.co.kr/auth/callback
   https://motionsense-quote-system-motionsenses-projects.vercel.app/**
   https://motionsense-quote-system-motionsenses-projects.vercel.app/auth/callback
   https://motionsense-quote-system.vercel.app/**
   https://motionsense-quote-system.vercel.app/auth/callback
   http://localhost:3000/**
   http://localhost:3000/auth/callback
   ```

### 2. Vercel 환경변수 설정

[Vercel Dashboard](https://vercel.com) 에서:

1. 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 다음 환경변수들이 설정되어 있는지 확인:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xbkzzpewdfmykcosfkly.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhia3p6cGV3ZGZteWtjb3Nma2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NTU4OTUsImV4cCI6MjA2OTEzMTg5NX0.mJXlJNWPQY6zyE-r7Pc-Ym2nuQmSjxuubNy9bov14j4
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhia3p6cGV3ZGZteWtjb3Nma2x5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzU1NTg5NSwiZXhwIjoyMDY5MTMxODk1fQ.3PHZx-lJDJ8AYxYgVGzUQkLwUVhCe7HKgBJy75cxI5s
   NEXT_PUBLIC_SITE_URL=https://quote.motionsense.co.kr
   ```
   
   **⚠️ 중요**: NEXT_PUBLIC_SITE_URL을 커스텀 도메인으로 설정!

4. **중요**: 환경변수 변경 후 반드시 **Redeploy** 필요

### 3. Google OAuth 설정 (선택사항)

Google Cloud Console에서:

1. **APIs & Services** → **Credentials**
2. OAuth 2.0 Client ID 선택
3. **Authorized redirect URIs** 에 추가:
   ```
   https://quote.motionsense.co.kr/auth/callback
   https://motionsense-quote-system-motionsenses-projects.vercel.app/auth/callback
   https://xbkzzpewdfmykcosfkly.supabase.co/auth/v1/callback
   ```

### 4. 코드 수정 (이미 적용됨)

`src/lib/supabase/client.ts` 파일에서 URL 동적 처리:

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
```

### 5. 테스트 순서

1. Supabase 대시보드에서 Redirect URLs 추가
2. Vercel에서 환경변수 확인/수정
3. Vercel에서 Redeploy 실행
4. 캐시 클리어 후 테스트
5. 개발자 도구 콘솔에서 에러 메시지 확인

### 6. 디버깅 팁

브라우저 개발자 도구에서:
- Network 탭: Supabase API 호출 확인
- Console 탭: JavaScript 에러 확인
- Application 탭: localStorage의 supabase.auth.token 확인

### 7. 임시 해결책

로그인이 여전히 안 되면:
1. 로컬에서 테스트: `npm run dev`
2. 로컬 URL로 Supabase 설정 변경
3. 문제 확인 후 프로덕션 적용

## 예상 문제 및 해결

### 문제 1: "Invalid Redirect URL"
→ Supabase Dashboard에서 Redirect URL 추가

### 문제 2: "Missing Supabase credentials"
→ Vercel 환경변수 설정 확인

### 문제 3: 무한 리디렉션
→ Site URL과 NEXT_PUBLIC_SITE_URL 일치 확인

### 문제 4: CORS 에러
→ Supabase Dashboard에서 도메인 허용 설정

## 연락처

문제가 지속되면:
- Supabase Support: https://supabase.com/support
- Vercel Support: https://vercel.com/support