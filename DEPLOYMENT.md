# 견적서 관리 시스템 배포 가이드

## 목차
1. [배포 준비사항](#배포-준비사항)
2. [환경 변수 설정](#환경-변수-설정)
3. [Vercel 배포](#vercel-배포)
4. [GitHub Actions 설정](#github-actions-설정)
5. [데이터베이스 설정](#데이터베이스-설정)
6. [도메인 및 SSL 설정](#도메인-및-ssl-설정)
7. [모니터링 및 로그](#모니터링-및-로그)
8. [배포 후 확인사항](#배포-후-확인사항)

## 배포 준비사항

### 필수 계정 및 서비스
- [x] GitHub 계정 및 리포지토리
- [x] Vercel 계정
- [x] Supabase 프로젝트
- [x] Google Cloud Console (OAuth용)

### 필수 도구 설치
```bash
# Node.js 18 이상 설치 확인
node --version

# npm 업데이트
npm install -g npm@latest

# Vercel CLI 설치 (선택사항)
npm install -g vercel

# 의존성 설치
npm ci
```

## 환경 변수 설정

### 1. 로컬 개발 환경 (.env.local)
```bash
# Next.js 설정
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-generated-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# 애플리케이션 설정
NODE_ENV=development
LOG_LEVEL=info
MAX_FILE_SIZE=10
```

### 2. 프로덕션 환경 변수 생성
```bash
# NextAuth Secret 생성
openssl rand -base64 32

# 또는
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Vercel 환경 변수 설정
Vercel Dashboard에서 다음 환경 변수를 설정:

| 변수명 | 값 | 환경 |
|--------|-----|------|
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` | Production |
| `NEXTAUTH_SECRET` | `생성된 시크릿 키` | All |
| `GOOGLE_CLIENT_ID` | `Google OAuth 클라이언트 ID` | All |
| `GOOGLE_CLIENT_SECRET` | `Google OAuth 클라이언트 시크릿` | All |
| `NEXT_PUBLIC_SUPABASE_URL` | `Supabase 프로젝트 URL` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `Supabase 익명 키` | All |
| `SUPABASE_SERVICE_ROLE_KEY` | `Supabase 서비스 롤 키` | All |

## Vercel 배포

### 1. GitHub 연동 배포 (권장)
1. Vercel Dashboard 접속
2. "New Project" 클릭
3. GitHub 리포지토리 선택
4. 프레임워크 프리셋: "Next.js" 선택
5. 환경 변수 설정
6. "Deploy" 클릭

### 2. Vercel CLI 배포
```bash
# Vercel CLI 로그인
vercel login

# 프로젝트 초기화
vercel

# 환경 변수 설정
vercel env add NEXTAUTH_SECRET production
vercel env add GOOGLE_CLIENT_ID production
# ... 기타 환경 변수

# 배포
vercel --prod
```

### 3. 배포 설정 확인
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm ci`
- Node.js Version: `18.x`

## GitHub Actions 설정

### 1. GitHub Secrets 설정
Repository Settings > Secrets and variables > Actions에서 설정:

```
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXTAUTH_URL=your-production-url
NEXTAUTH_SECRET=your-nextauth-secret
```

### 2. Vercel 토큰 생성
1. Vercel Dashboard > Settings > Tokens
2. "Create Token" 클릭
3. 토큰 이름 입력 및 생성
4. GitHub Secrets에 `VERCEL_TOKEN`으로 저장

### 3. 프로젝트 ID 확인
```bash
# Vercel CLI로 확인
vercel project ls

# 또는 Vercel Dashboard의 프로젝트 설정에서 확인
```

## 데이터베이스 설정

### 1. Supabase 프로젝트 생성
1. [Supabase](https://supabase.com) 접속
2. "New Project" 생성
3. 데이터베이스 비밀번호 설정
4. 리전 선택: `Northeast Asia (Seoul)`

### 2. 데이터베이스 마이그레이션
```sql
-- database/migrations/ 폴더의 SQL 파일들을 순서대로 실행
-- Supabase Dashboard > SQL Editor에서 실행

-- 1. 01_schema.sql
-- 2. 02_functions.sql
-- 3. 03_triggers.sql
-- 4. 04_rls.sql
-- 5. 05_indexes.sql
```

### 3. RLS (Row Level Security) 설정
```sql
-- 모든 테이블에 대해 RLS 활성화
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ... 기타 테이블

-- 정책 생성 (04_rls.sql 참조)
```

### 4. Google OAuth 설정
1. Supabase Dashboard > Authentication > Providers
2. Google 프로바이더 활성화
3. Google Cloud Console에서 생성한 클라이언트 ID/Secret 입력

## 도메인 및 SSL 설정

### 1. 커스텀 도메인 설정 (선택사항)
1. Vercel Dashboard > 프로젝트 > Settings > Domains
2. 도메인 입력 및 추가
3. DNS 설정 업데이트
4. SSL 인증서 자동 생성 확인

### 2. DNS 설정 예시
```
Type: CNAME
Name: your-subdomain (또는 @)
Value: your-project.vercel.app
```

## 모니터링 및 로그

### 1. Vercel Analytics
```bash
# 패키지 설치
npm install @vercel/analytics

# app/layout.tsx에 추가
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### 2. 로그 모니터링
- Vercel Dashboard > Functions 탭에서 로그 확인
- Supabase Dashboard > Logs에서 데이터베이스 로그 확인

### 3. 성능 모니터링
```bash
# Lighthouse 스코어 확인
npm run lighthouse

# 번들 크기 분석
npm run analyze
```

## 배포 후 확인사항

### 1. 기능 테스트 체크리스트
- [ ] 사용자 로그인/로그아웃
- [ ] 견적서 생성/수정/삭제
- [ ] 견적서 목록 조회 및 필터링
- [ ] 견적서 PDF 생성 및 다운로드
- [ ] 반응형 디자인 확인 (모바일/태블릿)
- [ ] 브라우저 호환성 확인

### 2. 성능 테스트
```bash
# Lighthouse 스코어 확인
npx lighthouse https://your-domain.com --output=json

# 목표 스코어
# Performance: 90+
# Accessibility: 95+
# Best Practices: 95+
# SEO: 90+
```

### 3. 보안 테스트
- [ ] HTTPS 리다이렉트 확인
- [ ] 보안 헤더 확인
- [ ] CSP (Content Security Policy) 정상 작동
- [ ] XSS 방지 확인
- [ ] SQL Injection 방지 확인

### 4. 모니터링 설정
- [ ] Vercel Analytics 데이터 수집 확인
- [ ] 에러 로그 모니터링 설정
- [ ] 알림 설정 (선택사항)

## 트러블슈팅

### 일반적인 문제 해결

#### 1. 빌드 실패
```bash
# 로컬에서 빌드 테스트
npm run build

# 타입 에러 확인
npm run type-check

# Lint 에러 확인
npm run lint
```

#### 2. 환경 변수 문제
- Vercel Dashboard에서 환경 변수 재확인
- `NEXT_PUBLIC_` 접두사 확인
- 특수 문자 이스케이프 처리

#### 3. 데이터베이스 연결 문제
- Supabase URL 및 키 확인
- RLS 정책 확인
- 네트워크 연결 상태 확인

#### 4. OAuth 로그인 문제
- Google Cloud Console에서 도메인 설정 확인
- 리다이렉트 URI 설정 확인
- NEXTAUTH_URL 환경 변수 확인

## 정기 유지보수

### 주간 작업
- [ ] 의존성 업데이트 검토
- [ ] 보안 패치 적용
- [ ] 성능 지표 확인

### 월간 작업
- [ ] 전체 백업 수행
- [ ] 로그 분석 및 정리
- [ ] 사용자 피드백 검토

### 분기별 작업
- [ ] 보안 감사 수행
- [ ] 성능 최적화 검토
- [ ] 비즈니스 요구사항 검토

---

## 추가 리소스

- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)
- [Vercel 문서](https://vercel.com/docs)
- [Supabase 문서](https://supabase.com/docs)
- [GitHub Actions 문서](https://docs.github.com/en/actions)

## 지원 및 문의

배포 과정에서 문제가 발생하면:
1. 이 문서의 트러블슈팅 섹션 확인
2. GitHub Issues에 문제 리포트
3. 개발팀에 직접 문의