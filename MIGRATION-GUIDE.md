# 견적서 시스템 데이터 무결성 마이그레이션 가이드

## 🎯 목표
- **데이터 불변성 문제 해결**: 과거 견적서가 마스터 데이터 변경에 영향받지 않도록 스냅샷 구조 구현
- **API 구조 통일**: 프론트엔드와 백엔드 간 데이터 구조 일치
- **무중단 서비스**: 서비스 중단 없이 안전한 마이그레이션 수행

## ⚠️ 주의사항
- **반드시 백업 필수**: 모든 작업 전 데이터베이스 전체 백업
- **Staging 환경 테스트**: 프로덕션 적용 전 완전한 테스트 수행
- **단계별 진행**: 각 Phase를 순서대로 완료 후 다음 단계 진행

## 📋 마이그레이션 체크리스트

### Phase 1: 준비 단계 ✅
- [ ] **데이터베이스 백업 완료**
- [ ] **Staging 환경 준비**
- [ ] **스키마 확장 실행**
  ```sql
  -- quotes 테이블에 새로운 컬럼 추가
  ALTER TABLE quotes 
  ADD COLUMN name VARCHAR(200),
  ADD COLUMN items JSONB,
  ADD COLUMN include_in_fee BOOLEAN,
  ADD COLUMN quote_snapshot JSONB;
  ```
- [ ] **API v2 엔드포인트 배포**
- [ ] **기존 API v1 스냅샷 로직 추가**

### Phase 2: 데이터 마이그레이션 ✅
- [ ] **마이그레이션 스크립트 Staging 테스트**
  ```bash
  # 환경 변수 설정
  cp .env.example .env
  # NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY 설정
  
  # 스크립트 실행
  node scripts/migrate-quotes-to-snapshot.js
  ```
- [ ] **데이터 검증**
  - 견적서 개수 일치 확인
  - 스냅샷 데이터 정합성 검증
  - 계산 결과 일치 확인
- [ ] **프로덕션 마이그레이션 실행**

### Phase 3: 프론트엔드 전환 ✅
- [ ] **새로운 서비스 파일 적용**
  - `quote-service-v2.ts` → `quote-service.ts`로 교체
- [ ] **API 호출 URL 변경**
  - `/api/quotes` → `/api/v2/quotes`
- [ ] **컴포넌트 테스트**
  - 견적서 생성/수정/조회 기능 확인
  - 계산 로직 정확성 검증
- [ ] **배포 및 모니터링**

### Phase 4: 정리 단계 ✅
- [ ] **API v1 사용량 모니터링** (1-2주간)
- [ ] **문제 없음 확인 후 레거시 코드 제거**
- [ ] **불필요한 DB 컬럼 제거**
  ```sql
  -- 충분한 안정화 기간 후 실행
  ALTER TABLE quotes 
  DROP COLUMN title,
  DROP COLUMN quote_groups; -- 관련 테이블도 정리
  ```

## 🔧 실행 명령어

### 1. 환경 설정
```bash
# 의존성 설치
npm install

# 환경 변수 복사 및 설정
cp .env.example .env
# SUPABASE_SERVICE_ROLE_KEY 추가 필요
```

### 2. 마이그레이션 실행
```bash
# Staging 환경에서 테스트
NODE_ENV=staging node scripts/migrate-quotes-to-snapshot.js

# 프로덕션 실행
NODE_ENV=production node scripts/migrate-quotes-to-snapshot.js
```

### 3. 검증 쿼리
```sql
-- 마이그레이션 상태 확인
SELECT 
  COUNT(*) as total_quotes,
  COUNT(quote_snapshot) as quotes_with_snapshot,
  COUNT(name) as quotes_with_new_structure
FROM quotes;

-- 스냅샷 데이터 샘플 확인
SELECT id, name, quote_snapshot->'snapshot_metadata' as metadata
FROM quotes 
WHERE quote_snapshot IS NOT NULL 
LIMIT 5;
```

## 🚨 장애 대응 계획

### 즉시 롤백이 필요한 경우
1. **API v2 트래픽 차단**
   ```bash
   # API Gateway 또는 로드밸런서에서 v2 엔드포인트 비활성화
   ```
2. **프론트엔드 즉시 복구**
   ```bash
   # 이전 버전으로 롤백
   git revert [commit-hash]
   npm run build && npm run deploy
   ```
3. **데이터베이스 복구**
   ```bash
   # 백업에서 복구 (최후의 수단)
   ```

### 부분 장애 대응
- **API v2 문제**: v1으로 트래픽 라우팅
- **스냅샷 생성 실패**: 에러 로그 분석 후 수동 수정
- **계산 오류**: 계산 로직 핫픽스 배포

## 📊 모니터링 포인트

### 성능 메트릭
- API 응답 시간 (v1 vs v2 비교)
- 데이터베이스 쿼리 성능
- 메모리 사용량 (스냅샷 데이터로 인한 증가)

### 비즈니스 메트릭
- 견적서 생성 성공률
- 계산 결과 정확성
- 사용자 오류 신고

### 데이터 무결성 검증
```sql
-- 스냅샷 누락 견적서 확인
SELECT COUNT(*) FROM quotes WHERE quote_snapshot IS NULL;

-- 금액 계산 일치성 확인 (샘플)
SELECT id, total_amount, 
  (quote_snapshot->'groups'->0->'items'->0->'details'->0->>'unit_price')::numeric 
FROM quotes LIMIT 10;
```

## 🎉 성공 기준
1. **기능적 성공**
   - [ ] 모든 견적서가 스냅샷 데이터를 보유
   - [ ] 과거 견적서가 마스터 데이터 변경에 영향받지 않음
   - [ ] API v2가 정상적으로 동작

2. **성능적 성공**
   - [ ] API 응답 시간이 기존 대비 20% 이내 증가
   - [ ] 데이터베이스 용량 증가가 예상 범위 내

3. **비즈니스적 성공**
   - [ ] 사용자 불편 신고 없음
   - [ ] 견적서 금액 계산 정확성 100%
   - [ ] 시스템 안정성 유지

## 📞 연락처
- **기술 담당**: [개발팀 연락처]
- **비즈니스 담당**: [사업팀 연락처]
- **응급 상황**: [24시간 대응팀]