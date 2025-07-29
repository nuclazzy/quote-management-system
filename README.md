# 견적서 관리 시스템

MotionSense를 위한 전문적인 견적서 관리 시스템입니다.

## 🚀 로컬 개발 환경 설정

### 1. 환경 변수 설정

`.env.local` 파일의 다음 값들을 실제 값으로 교체하세요:

```bash
# Supabase Configuration (필수)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth Configuration (필수)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Application Settings
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Company Information
NEXT_PUBLIC_COMPANY_NAME=MotionSense
NEXT_PUBLIC_COMPANY_EMAIL=contact@motionsense.co.kr
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 데이터베이스 설정

Supabase 콘솔에서 다음 SQL 파일들을 순서대로 실행하세요:

1. `database/migrations/001_initial_schema.sql` - 기본 테이블 구조
2. `database/seed/development.sql` - 테스트 데이터

### 4. Google OAuth 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. OAuth 2.0 클라이언트 ID 생성
3. 승인된 리디렉션 URI 추가:
   - `http://localhost:3000/api/auth/callback`
   - `https://your-project.supabase.co/auth/v1/callback`

### 5. Supabase 인증 설정

Supabase 대시보드 > Authentication > Providers에서:
- Google 프로바이더 활성화
- Client ID와 Client Secret 입력

### 6. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`을 열어 확인하세요.

## 🔐 로그인 계정

다음 이메일 주소로만 로그인 가능합니다:
- lewis@motionsense.co.kr (관리자)
- jinah@motionsense.co.kr
- ke.kim@motionsense.co.kr  
- jw.han@motionsense.co.kr

## 📋 기능 테스트

### 1. 인증 테스트
- `/login` - Google OAuth 로그인
- 허용되지 않은 이메일로 로그인 시도 (거부되어야 함)

### 2. 견적서 관리 테스트
- `/dashboard` - 대시보드 접근
- `/quotes` - 견적서 목록 (시드 데이터 확인)
- 견적서 필터링 및 검색
- PDF 다운로드 버튼 클릭

### 3. API 엔드포인트 테스트

브라우저 개발자 도구 Network 탭에서 확인:

```bash
# 견적서 목록 조회
GET /api/quotes

# 특정 견적서 조회  
GET /api/quotes/{id}

# 견적서 PDF 다운로드
GET /api/quotes/{id}/pdf

# 고객 목록 조회
GET /api/customers
```

## 📁 프로젝트 구조

```
src/
├── app/                          # Next.js 14 App Router
│   ├── (auth)/                   # 인증 관련 페이지
│   ├── (dashboard)/              # 보호된 대시보드 페이지
│   └── api/                      # API 라우트
│       ├── quotes/               # 견적서 API
│       └── customers/            # 고객 API
├── components/                   # React 컴포넌트
│   ├── auth/                     # 인증 컴포넌트
│   ├── layout/                   # 레이아웃 컴포넌트
│   └── quotes/                   # 견적서 컴포넌트
├── lib/                          # 유틸리티 라이브러리
│   ├── api/                      # API 공통 로직
│   ├── pdf/                      # PDF 생성
│   └── supabase/                 # Supabase 클라이언트
├── contexts/                     # React Context
└── types/                        # TypeScript 타입 정의
```

## 🛠️ 주요 기능

### ✅ 구현 완료
- [x] Google OAuth 2.0 인증
- [x] 역할 기반 접근 제어
- [x] 견적서 CRUD API
- [x] 견적서 목록 조회 (필터링, 검색)
- [x] PDF 생성 및 다운로드
- [x] 고객 관리 API
- [x] 반응형 대시보드 레이아웃

### 🚧 개발 예정
- [ ] 견적서 작성/편집 폼
- [ ] 고객/공급업체 관리 페이지
- [ ] 프로젝트 관리
- [ ] 매출 관리 대시보드
- [ ] 알림 시스템

## 🔧 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 타입 체크
npm run type-check

# 린트 실행
npm run lint

# 코드 포맷팅
npm run format
```

## 📞 문제 해결

### 자주 발생하는 문제

1. **OAuth 로그인 실패**
   - Google Cloud Console 설정 확인
   - Supabase 프로바이더 설정 확인
   - 환경 변수 값 확인

2. **데이터베이스 연결 실패**
   - Supabase URL과 API 키 확인
   - 데이터베이스 마이그레이션 실행 여부 확인

3. **권한 오류**
   - 허용된 이메일 목록 확인
   - 사용자 역할 설정 확인

### 로그 확인

```bash
# 브라우저 개발자 도구 Console 탭
# 네트워크 요청은 Network 탭에서 확인
```

## 📊 성능 모니터링

```bash
# 번들 분석
npm run analyze

# Lighthouse 테스트
npm run lighthouse
```

---

**MotionSense 견적서 관리 시스템 v1.0**  
개발팀: Claude AI Assistant
# Quote Management System

Modern quote management system built with Next.js 14, Supabase, and Material-UI.

## Features
- Quote creation and management
- PDF generation
- Customer management
- Project conversion
- Material-UI theme system with dark mode
- Google OAuth authentication

## Deployment
Automatically deployed to Vercel on push to main branch.

## OAuth Configuration

Production redirect URI configured for Vercel deployment.
