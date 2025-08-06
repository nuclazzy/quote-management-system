# Supabase 마이그레이션 가이드

## 🚀 빠른 시작 (전체 기능 활성화)

### 방법 1: 자동 실행 스크립트 사용 (권장)
```bash
# 실행 권한 부여 (첫 실행시만)
chmod +x 000_run_all_migrations.sh

# 전체 마이그레이션 실행
./000_run_all_migrations.sh
```

### 방법 2: 수동 실행
```bash
# 순서대로 실행
psql $DATABASE_URL < 001_safe_minimal.sql
psql $DATABASE_URL < 003_add_project_columns.sql
psql $DATABASE_URL < 004_add_missing_cost_columns.sql
psql $DATABASE_URL < 005_add_project_date_columns.sql
psql $DATABASE_URL < 006_create_full_project_view.sql
```

## 📁 마이그레이션 파일 설명

### 1️⃣ `001_safe_minimal.sql`
**기본 함수와 뷰 생성**
- ✅ 견적서 총액 계산 함수
- ✅ 견적서 번호 자동 생성 트리거
- ✅ 기본 견적서/프로젝트 요약 뷰
- ✅ RLS 정책 설정

### 2️⃣ `003_add_project_columns.sql`
**프로젝트 식별 컬럼 추가**
- ✅ `project_number`: 프로젝트 번호 (PRJ-2024-001 형식)
- ✅ `quote_id`: 연결된 견적서 ID
- ✅ 프로젝트 번호 자동 생성 트리거

### 3️⃣ `004_add_missing_cost_columns.sql`
**비용 관리 컬럼 추가**
- ✅ `actual_cost`: 실제 발생 비용
- ✅ `budget_amount`: 예산 금액
- ✅ 비용 관련 요약 뷰

### 4️⃣ `005_add_project_date_columns.sql`
**일정 및 진행 관리 컬럼 추가**
- ✅ `planned_start_date`: 계획 시작일
- ✅ `planned_end_date`: 계획 종료일
- ✅ `actual_start_date`: 실제 시작일
- ✅ `actual_end_date`: 실제 종료일
- ✅ `progress_percentage`: 진행률 (0-100%)
- ✅ `project_manager_id`: 프로젝트 매니저

### 5️⃣ `006_create_full_project_view.sql`
**전체 기능 뷰 생성**
- ✅ 완전한 프로젝트 상태 요약 뷰
- ✅ 대시보드용 통계 뷰
- ✅ 성능 최적화 인덱스

## 🔍 적용 확인

### 테이블 구조 확인
```sql
-- 프로젝트 테이블 구조 확인
\d projects

-- 뷰 목록 확인
\dv

-- 함수 목록 확인
\df
```

### 데이터 확인
```sql
-- 프로젝트 요약 확인
SELECT * FROM project_status_summary LIMIT 5;

-- 대시보드 통계 확인
SELECT * FROM project_dashboard_summary;
```

## ⚠️ 주의사항

1. **DATABASE_URL 설정 필수**
   ```bash
   export DATABASE_URL='postgresql://user:password@host/database'
   ```

2. **실행 순서 중요**
   - 반드시 번호 순서대로 실행
   - 001 → 003 → 004 → 005 → 006

3. **오류 처리**
   - "already exists" 오류는 무시 가능
   - 실제 오류만 확인 필요

## 🔄 롤백 방법

문제 발생시 다음 명령으로 롤백:
```sql
-- 뷰 제거
DROP VIEW IF EXISTS project_status_summary CASCADE;
DROP VIEW IF EXISTS project_dashboard_summary CASCADE;
DROP VIEW IF EXISTS quote_summary CASCADE;

-- 함수 제거
DROP FUNCTION IF EXISTS calculate_quote_total CASCADE;
DROP FUNCTION IF EXISTS generate_quote_number CASCADE;
DROP FUNCTION IF EXISTS generate_project_number CASCADE;

-- 추가된 컬럼 제거 (주의: 데이터 손실)
ALTER TABLE projects DROP COLUMN IF EXISTS project_number;
ALTER TABLE projects DROP COLUMN IF EXISTS quote_id;
-- ... 필요한 컬럼 제거
```

## 📞 지원

문제 발생시:
1. 오류 메시지 전체 복사
2. `\d projects` 결과 확인
3. 개발팀에 문의