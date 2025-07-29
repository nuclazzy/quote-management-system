# 견적서 관리 시스템 - 빠른 설정 가이드

이 가이드는 개발자가 프로젝트를 빠르게 설정하고 실행할 수 있도록 단계별 지침을 제공합니다.

## 🚀 빠른 시작 (5분 설정)

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
```bash
# .env.local 파일 생성
cp .env.example .env.local
```

### 3. Supabase 프로젝트 설정

#### 3.1 Supabase 계정 생성 및 프로젝트 생성
1. [Supabase](https://supabase.com) 접속
2. "Start your project" 클릭
3. 새 프로젝트 생성 (데이터베이스 비밀번호 기록해두기)

#### 3.2 데이터베이스 스키마 설정
Supabase Dashboard → SQL Editor에서 다음 순서로 실행:

```sql
-- 1. database/migrations/01_schema.sql 내용 복사하여 실행
-- 2. database/migrations/02_functions.sql 내용 복사하여 실행
-- 3. database/migrations/03_triggers.sql 내용 복사하여 실행
-- 4. database/migrations/04_rls.sql 내용 복사하여 실행
-- 5. database/migrations/05_indexes.sql 내용 복사하여 실행
```

#### 3.3 환경 변수 설정
Supabase Dashboard → Settings → API에서:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Google OAuth 설정

#### 4.1 Google Cloud Console 설정
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "API 및 서비스" → "사용자 인증 정보" → "사용자 인증 정보 만들기" → "OAuth 클라이언트 ID"
4. 애플리케이션 유형: "웹 애플리케이션"
5. 승인된 리디렉션 URI 추가:
   - `http://localhost:3000/api/auth/callback/google`
   - `http://localhost:3000/auth/callback` (필요시)

#### 4.2 환경 변수 추가
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 5. NextAuth Secret 생성
```bash
# 터미널에서 실행
openssl rand -base64 32
```

생성된 키를 환경 변수에 추가:
```env
NEXTAUTH_SECRET=generated-secret-key
NEXTAUTH_URL=http://localhost:3000
```

### 6. 초기 데이터 생성
```bash
npm run db:seed
```

### 7. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

## ✅ 설정 완료 체크리스트

- [ ] Node.js 18+ 설치됨
- [ ] npm install 완료
- [ ] .env.local 파일 생성 및 모든 환경 변수 설정
- [ ] Supabase 프로젝트 생성 및 마이그레이션 실행
- [ ] Google OAuth 클라이언트 생성 및 리디렉션 URI 설정
- [ ] NextAuth secret 생성 및 설정
- [ ] 초기 데이터 시드 실행
- [ ] 개발 서버 실행 성공
- [ ] Google 로그인 테스트 완료

## 🔧 개발 도구 설정

### VSCode 추천 확장 프로그램
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-eslint"
  ]
}
```

### VSCode 설정 (.vscode/settings.json)
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## 🐛 문제 해결

### 자주 발생하는 문제들

#### 1. Supabase 연결 오류
```
Error: Invalid API key
```
**해결책**: .env.local의 SUPABASE_* 변수들이 올바르게 설정되었는지 확인

#### 2. Google OAuth 오류
```
Error: redirect_uri_mismatch
```
**해결책**: Google Cloud Console에서 리디렉션 URI가 정확히 설정되었는지 확인

#### 3. NextAuth 오류
```
Error: NEXTAUTH_SECRET is required
```
**해결책**: NEXTAUTH_SECRET 환경 변수가 설정되었는지 확인

#### 4. 데이터베이스 권한 오류
```
Error: permission denied for table
```
**해결책**: RLS 정책이 올바르게 설정되었는지 확인 (04_rls.sql 실행)

### 로그 확인
```bash
# Next.js 개발 서버 로그
npm run dev

# 타입 체크
npm run type-check

# 린트 체크
npm run lint
```

## 📚 다음 단계

1. **기본 사용법 익히기**
   - 고객사 등록
   - 견적서 작성
   - 프로젝트 관리

2. **커스터마이징**
   - 마스터 아이템 추가/수정
   - UI 테마 변경
   - 추가 기능 개발

3. **배포 준비**
   - 프로덕션 환경 변수 설정
   - Vercel/Netlify 배포
   - 도메인 설정

## 🆘 도움이 필요한 경우

- **문서**: README.md 참조
- **이슈**: GitHub Issues에 문제 리포트
- **개발팀 연락**: 내부 개발팀에 문의

---

설정이 완료되면 이 체크리스트를 확인하고 개발을 시작하세요! 🎉