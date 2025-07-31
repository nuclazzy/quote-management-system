# 프로젝트 구조

## 루트 디렉토리
```
├── src/                          # 소스 코드
├── database/                     # 데이터베이스 관련 파일
├── public/                       # 정적 파일
├── .github/                      # GitHub Actions 워크플로우
├── .taskmaster/                  # Task Master AI 설정
├── work/                         # 외부 도구 (Serena 등)
└── scripts/                      # 유틸리티 스크립트
```

## src/ 디렉토리 구조
```
src/
├── app/                          # Next.js 14 App Router
│   ├── (dashboard)/              # 대시보드 그룹 라우트
│   │   ├── quotes/               # 견적서 관리
│   │   ├── customers/            # 고객 관리
│   │   ├── suppliers/            # 공급업체 관리
│   │   ├── items/                # 품목 관리
│   │   └── admin/                # 관리자 기능
│   ├── auth/                     # 인증 관련 페이지
│   └── api/                      # API 라우트
├── components/                   # React 컴포넌트
│   ├── quotes/                   # 견적서 관련 컴포넌트
│   ├── common/                   # 공통 컴포넌트
│   ├── layout/                   # 레이아웃 컴포넌트
│   └── auth/                     # 인증 관련 컴포넌트
├── hooks/                        # Custom React Hooks
├── types/                        # TypeScript 타입 정의
├── lib/                          # 유틸리티 라이브러리
│   ├── supabase/                 # Supabase 설정
│   ├── auth/                     # 인증 로직
│   └── services/                 # 비즈니스 로직
├── contexts/                     # React Context
├── utils/                        # 헬퍼 함수
├── styles/                       # 스타일 관련
└── theme/                        # MUI 테마 설정
```

## 주요 컴포넌트 구조
- **견적서 시스템**: 복잡한 3단계 구조 (그룹 → 항목 → 세부내용)
- **모션센스 전용**: `useMotionsenseQuote` 훅으로 상태 관리
- **실시간 계산**: 수익률 및 총액 자동 계산
- **현대적 UI**: GlassCard, ModernBackground 등 2024 트렌드 적용

## 데이터베이스 구조
- **스냅샷 기반**: 데이터 불변성 보장
- **RLS 정책**: Row Level Security로 권한 관리
- **복잡한 관계**: 다대다 관계 지원