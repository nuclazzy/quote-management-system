# 작업 완료 후 실행할 명령어

## 필수 실행 명령어 (순서대로)

### 1. 코드 품질 검사
```bash
npm run lint            # ESLint 검사 - 코드 스타일 오류 확인
npm run type-check      # TypeScript 타입 검사 - 타입 오류 확인
```

### 2. 포맷팅
```bash
npm run format          # Prettier로 코드 포맷 통일
```

### 3. 빌드 테스트
```bash
npm run build           # 프로덕션 빌드 가능 여부 확인
```

## 선택적 실행 명령어

### 성능 분석 (필요시)
```bash
npm run analyze         # 번들 크기 분석
npm run lighthouse      # 성능 측정
```

### 보안 검사
```bash
npm audit               # 보안 취약점 검사
```

## GitHub Actions 확인사항
- **자동 실행**: Push/PR 시 자동으로 lint, type-check, build 실행
- **실패 시 대응**: Actions 탭에서 오류 로그 확인 후 수정

## 데이터베이스 변경 시
```bash
npm run db:migrate      # 마이그레이션 실행 (필요시)
```

## Vercel 배포 확인
- **자동 배포**: main 브랜치 push 시 자동 배포
- **프리뷰 배포**: PR 생성 시 프리뷰 URL 제공
- **배포 상태**: Vercel 대시보드에서 확인

## 작업 완료 체크리스트
- [ ] `npm run lint` 통과
- [ ] `npm run type-check` 통과  
- [ ] `npm run build` 성공
- [ ] GitHub Actions 모든 단계 통과
- [ ] Vercel 배포 성공
- [ ] 기능 테스트 완료