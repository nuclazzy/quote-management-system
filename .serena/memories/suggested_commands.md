# 추천 개발 명령어

## 개발 서버
```bash
npm run dev              # 개발 서버 시작 (localhost:3000)
```

## 빌드 및 배포
```bash
npm run build           # 프로덕션 빌드
npm run start           # 프로덕션 서버 시작
npm run clean           # 빌드 캐시 정리
```

## 코드 품질 관리
```bash
npm run lint            # ESLint 검사
npm run lint:fix        # ESLint 자동 수정
npm run type-check      # TypeScript 타입 검사
npm run type-check:watch # TypeScript 타입 검사 (watch 모드)
npm run format          # Prettier 포맷팅
npm run format:check    # Prettier 포맷 검사
```

## 분석 도구
```bash
npm run analyze         # 번들 크기 분석
npm run bundle-analyzer # 번들 분석기 실행
npm run lighthouse      # Lighthouse 성능 측정
```

## 데이터베이스
```bash
npm run db:migrate      # 데이터베이스 마이그레이션 실행
npm run db:seed         # 테스트 데이터 시드
npm run db:reset        # 데이터베이스 리셋 (Supabase 대시보드 사용)
```

## 테스트
```bash
npm run test            # 테스트 실행 (아직 구성되지 않음)
npm run test:watch      # 테스트 watch 모드 (아직 구성되지 않음)
```

## Git Hooks
```bash
npm run prepare         # Husky Git hooks 설치
```

## Darwin (macOS) 시스템 명령어
```bash
ls -la                  # 파일 목록 (숨김 파일 포함)
find . -name "*.tsx"    # TSX 파일 찾기
grep -r "searchterm"    # 텍스트 검색
open .                  # Finder에서 현재 디렉토리 열기
```