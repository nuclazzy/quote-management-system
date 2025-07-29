# 배포 체크리스트

## 배포 전 준비사항

### 코드 품질 검증
- [ ] 모든 TypeScript 에러 해결 (`npm run type-check`)
- [ ] ESLint 규칙 통과 (`npm run lint`)
- [ ] Prettier 포맷팅 적용 (`npm run format`)
- [ ] 로컬 빌드 성공 확인 (`npm run build`)
- [ ] 모든 테스트 통과 (현재 테스트 없음)

### 환경 설정 확인
- [ ] `.env.example` 파일 최신화 완료
- [ ] 프로덕션 환경 변수 준비 완료
- [ ] Supabase 프로젝트 생성 및 설정 완료
- [ ] Google OAuth 설정 완료
- [ ] 데이터베이스 마이그레이션 파일 준비 완료

### 보안 검증
- [ ] 민감한 정보가 코드에 하드코딩되지 않음
- [ ] `.env` 파일이 `.gitignore`에 포함됨
- [ ] 보안 헤더 설정 완료
- [ ] CORS 설정 검토 완료
- [ ] CSP (Content Security Policy) 설정 완료

## Vercel 배포 설정

### 1. Vercel 프로젝트 생성
- [ ] Vercel 계정 생성/로그인
- [ ] GitHub 리포지토리 연동
- [ ] 프로젝트 생성 완료
- [ ] 빌드 설정 확인
  - [ ] Framework Preset: Next.js
  - [ ] Build Command: `npm run build`
  - [ ] Output Directory: `.next`
  - [ ] Install Command: `npm ci`
  - [ ] Node.js Version: 18.x

### 2. 환경 변수 설정
- [ ] `NEXTAUTH_URL` (프로덕션 도메인)
- [ ] `NEXTAUTH_SECRET` (생성된 시크릿 키)
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

### 3. 도메인 설정 (선택사항)
- [ ] 커스텀 도메인 추가
- [ ] DNS 설정 업데이트
- [ ] SSL 인증서 확인

## GitHub Actions 설정

### 1. GitHub Secrets 설정
- [ ] `VERCEL_TOKEN`
- [ ] `VERCEL_ORG_ID`
- [ ] `VERCEL_PROJECT_ID`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `NEXTAUTH_URL`
- [ ] `NEXTAUTH_SECRET`

### 2. 워크플로우 확인
- [ ] CI/CD 파이프라인 작동 확인
- [ ] 코드 품질 검사 통과
- [ ] 자동 배포 성공
- [ ] 의존성 업데이트 워크플로우 확인

## 데이터베이스 설정

### 1. Supabase 프로젝트 설정
- [ ] 프로젝트 생성 완료
- [ ] 데이터베이스 리전 설정 (Seoul 권장)
- [ ] 프로젝트 URL 및 키 확인

### 2. 스키마 마이그레이션
- [ ] `01_schema.sql` 실행
- [ ] `02_functions.sql` 실행
- [ ] `03_triggers.sql` 실행
- [ ] `04_rls.sql` 실행
- [ ] `05_indexes.sql` 실행

### 3. 인증 설정
- [ ] Google OAuth 프로바이더 활성화
- [ ] 클라이언트 ID/Secret 설정
- [ ] 리다이렉트 URL 설정
- [ ] RLS 정책 활성화

## 배포 실행

### 1. 최종 커밋 및 푸시
```bash
# 모든 변경사항 스테이징
git add .

# 배포 커밋
git commit -m "feat: ready for production deployment

- Add Vercel configuration
- Set up GitHub Actions CI/CD
- Configure security headers
- Add deployment documentation

🤖 Generated with Claude Code"

# 메인 브랜치에 푸시
git push origin main
```

### 2. 배포 확인
- [ ] Vercel 대시보드에서 배포 상태 확인
- [ ] GitHub Actions 워크플로우 성공 확인
- [ ] 배포된 사이트 접속 확인

## 배포 후 검증

### 1. 기능 테스트
- [ ] 홈페이지 로딩 확인
- [ ] Google 로그인 기능 테스트
- [ ] 견적서 생성 기능 테스트
- [ ] 견적서 목록 조회 테스트
- [ ] 견적서 수정/삭제 테스트
- [ ] 견적서 PDF 다운로드 테스트
- [ ] 반응형 디자인 확인 (모바일/태블릿)

### 2. 성능 테스트
```bash
# Lighthouse 테스트 실행
npx lighthouse https://your-domain.com

# 목표 스코어
# Performance: 90+
# Accessibility: 95+
# Best Practices: 95+
# SEO: 90+
```

### 3. 보안 테스트
- [ ] HTTPS 강제 리다이렉트 확인
- [ ] 보안 헤더 적용 확인
- [ ] CSP 정책 작동 확인
- [ ] 민감한 정보 노출 확인

### 4. 브라우저 호환성 테스트
- [ ] Chrome (최신)
- [ ] Firefox (최신)
- [ ] Safari (최신)
- [ ] Edge (최신)
- [ ] 모바일 브라우저 (iOS Safari, Android Chrome)

## 모니터링 설정

### 1. 분석 도구 설정
- [ ] Vercel Analytics 활성화
- [ ] Google Analytics 설정 (선택사항)
- [ ] 에러 추적 도구 설정 (Sentry 등, 선택사항)

### 2. 알림 설정
- [ ] 배포 실패 알림
- [ ] 성능 저하 알림
- [ ] 에러 발생 알림

## 문서화 완료

### 1. 사용자 가이드
- [ ] README.md 업데이트
- [ ] 사용법 가이드 작성
- [ ] API 문서 작성 (해당시)

### 2. 개발자 가이드
- [ ] DEPLOYMENT.md 검토
- [ ] 코드 주석 정리
- [ ] 기술 문서 업데이트

## 배포 완료 확인

### 최종 체크
- [ ] 모든 기능이 프로덕션에서 정상 작동
- [ ] 성능 지표가 목표치에 도달
- [ ] 보안 설정이 모두 적용됨
- [ ] 모니터링 도구가 정상 작동
- [ ] 문서가 모두 최신화됨

### 배포 완료 시 할 일
1. [ ] 팀원들에게 배포 완료 알림
2. [ ] 사용자들에게 서비스 런칭 안내
3. [ ] 정기 모니터링 일정 설정
4. [ ] 백업 계획 수립
5. [ ] 유지보수 계획 수립

---

## 긴급 상황 대응

### 배포 롤백 절차
1. Vercel 대시보드에서 이전 버전으로 롤백
2. 또는 GitHub에서 이전 커밋으로 revert
3. 문제 원인 파악 및 수정
4. 재배포 실행

### 연락처
- 개발팀: [개발팀 연락처]
- DevOps: [DevOps 팀 연락처]
- 긴급 상황: [긴급 연락처]

---

**배포 완료 날짜:** ___________  
**배포 담당자:** ___________  
**검토자:** ___________