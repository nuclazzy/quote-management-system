# 코드 스타일 및 컨벤션

## TypeScript 설정
- **Target**: ES2017
- **Module**: ESNext with bundler resolution
- **Strict Mode**: Enabled
- **Path Mapping**: `@/*` for src directory imports
- 사용하지 않는 변수/매개변수 경고 비활성화 (실용적 접근)

## ESLint 규칙
- **Base Config**: `next/core-web-vitals`
- **Custom Rules**:
  - `react/no-unescaped-entities`: off
  - `@typescript-eslint/no-explicit-any`: off (유연성 제공)
  - `@typescript-eslint/ban-ts-comment`: off
  - React Hooks 규칙: warn 레벨

## 코드 스타일
- **Naming Convention**: 
  - camelCase for variables/functions
  - PascalCase for components/types
  - kebab-case for file names
- **File Organization**:
  - Components in `/src/components`
  - Types in `/src/types`
  - Hooks in `/src/hooks`
  - Utils in `/src/utils`
  - API routes in `/src/app/api`

## React/Next.js 패턴
- **Components**: Functional components with TypeScript
- **Hooks**: Custom hooks for business logic
- **State Management**: Zustand for global state
- **API**: Next.js API routes with proper error handling
- **Error Boundaries**: Global and component-level error handling

## Database/API 패턴
- **Database**: Supabase with PostgreSQL
- **Auth**: Row Level Security (RLS) policies
- **API Validation**: Zod schemas for request/response validation
- **Error Handling**: Standardized API error responses