# 기술 스택

## Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.3.3
- **UI Library**: Material-UI (MUI) v5.15.10
- **State Management**: Zustand 4.5.0
- **Forms**: React Hook Form 7.49.3
- **Data Fetching**: React Query 3.39.3
- **Styling**: Emotion (CSS-in-JS)

## Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + Google OAuth
- **API**: Next.js API Routes
- **Real-time**: Supabase Realtime

## Development Tools
- **Type Checking**: TypeScript (strict mode enabled)
- **Linting**: ESLint (Next.js config + custom rules)
- **Formatting**: Prettier
- **Git Hooks**: Husky + lint-staged
- **Bundle Analysis**: @next/bundle-analyzer

## Deployment & CI/CD
- **Hosting**: Vercel
- **Version Control**: Git + GitHub
- **CI/CD**: GitHub Actions
- **Security**: Audit CI for dependency vulnerabilities

## Key Dependencies
- `@supabase/supabase-js`: Database and auth client
- `dayjs`: Date manipulation
- `jspdf` + `jspdf-autotable`: PDF generation
- `html2canvas`: Screenshot functionality
- `zod`: Schema validation