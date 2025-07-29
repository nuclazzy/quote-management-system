# 견적 관리 시스템 데이터베이스 스키마

## 개요

이 데이터베이스 스키마는 작업지시서의 요구사항에 따라 설계된 견적 관리 시스템의 완전한 PostgreSQL 스키마입니다.

## 핵심 특징

### 1. 데이터 불변성 (스냅샷) 구현
- `quote_details` 테이블에 `master_items` 정보의 스냅샷 저장
- `quotes` 테이블에 `customer_name_snapshot` 필드
- `quote_details` 테이블에 `supplier_name_snapshot` 필드
- 트리거를 통한 자동 스냅샷 생성

### 2. Google OAuth + 도메인 제한
- `@motionsense.co.kr` 도메인만 허용하는 트리거
- 자동 프로필 생성 트리거
- `lewis@motionsense.co.kr`는 자동으로 admin 권한 부여

### 3. 완전한 비즈니스 로직
- 견적서 → 프로젝트 전환 함수
- 견적서 버전 관리 (수정 시 새 버전 생성)
- 자동 총액 계산 및 업데이트
- 알림 시스템 (마감일 임박, 이슈 발생 등)

## 파일 구조

```
database/migrations/
├── 01_schema.sql      # 기본 테이블 구조 및 뷰
├── 02_functions.sql   # 비즈니스 로직 함수들
├── 03_triggers.sql    # 자동화 트리거들
├── 04_rls.sql        # Row Level Security 정책
├── 05_indexes.sql    # 성능 최적화 인덱스
└── README.md         # 이 파일
```

## 실행 순서

Supabase SQL Editor에서 다음 순서로 실행하세요:

### 1. 기본 스키마 생성
```sql
-- 01_schema.sql 파일의 내용을 복사하여 실행
```

### 2. 비즈니스 로직 함수 생성
```sql
-- 02_functions.sql 파일의 내용을 복사하여 실행
```

### 3. 자동화 트리거 생성
```sql
-- 03_triggers.sql 파일의 내용을 복사하여 실행
```

### 4. 보안 정책 설정
```sql
-- 04_rls.sql 파일의 내용을 복사하여 실행
```

### 5. 성능 최적화 인덱스 생성
```sql
-- 05_indexes.sql 파일의 내용을 복사하여 실행
```

## 테이블 구조

### 핵심 테이블
1. **profiles** - 사용자 프로필 및 권한
2. **customers** - 고객사 정보
3. **suppliers** - 공급처/매입처 정보
4. **master_items** - 마스터 품목 정보
5. **quotes** - 견적서 메인 정보
6. **quote_groups** - 견적서 내 그룹
7. **quote_items** - 견적서 내 품목
8. **quote_details** - 견적서 세부 내용 (스냅샷)
9. **projects** - 계약 완료된 프로젝트
10. **transactions** - 공식 매입/매출 정산
11. **project_expenses** - 프로젝트 기타 경비
12. **notifications** - 사용자 알림

### 유틸리티 테이블
- **quote_templates** - 견적서 템플릿
- **user_activity_logs** - 사용자 활동 로그

## 주요 함수

### 견적서 관련
- `calculate_quote_total(quote_id)` - 견적서 총액 계산
- `generate_quote_number()` - 견적서 번호 자동 생성
- `create_quote_revision(quote_id)` - 견적서 수정 시 새 버전 생성

### 프로젝트 관련
- `convert_quote_to_project(quote_id, payment_schedule)` - 견적서를 프로젝트로 전환
- `update_project_costs(project_id)` - 프로젝트 비용 재계산

### 알림 관련
- `create_notification()` - 개별 알림 생성
- `notify_all_admins()` - 모든 관리자에게 알림 발송
- `check_payment_due_notifications()` - 마감일 임박 알림 체크
- `check_overdue_payment_notifications()` - 마감일 경과 알림 체크

## 보안 특징

### Row Level Security (RLS)
- 모든 테이블에 RLS 활성화
- 역할 기반 접근 제어 (admin/member)
- 사용자는 자신이 생성한 데이터만 수정 가능
- 관리자는 모든 데이터에 접근 가능

### 도메인 제한
- Google OAuth 로그인 시 `@motionsense.co.kr` 도메인만 허용
- 자동 프로필 생성 및 권한 설정

## 성능 최적화

### 인덱스
- 기본 검색용 인덱스 (이름, 상태, 날짜 등)
- 관계 테이블 조인용 인덱스
- 전문 검색용 GIN 인덱스
- 부분 인덱스 (조건부 인덱스)

### 뷰
- `quote_totals` - 견적서 총액 계산 뷰
- `project_profitability` - 프로젝트 수익성 계산 뷰
- `index_usage_stats` - 인덱스 사용 통계 뷰

## Google OAuth 설정

Supabase 대시보드에서 다음과 같이 설정하세요:

1. **Authentication > Providers > Google** 활성화
2. **Site URL**: 프론트엔드 도메인 설정
3. **Redirect URLs**: 적절한 콜백 URL 설정

## 초기 데이터 설정

### 관리자 계정 설정
```sql
-- Google OAuth로 lewis@motionsense.co.kr 계정이 생성된 후
-- 자동으로 admin 권한이 부여됩니다 (트리거에 의해)
```

### 기본 템플릿 및 품목
- 기본 견적서 템플릿 2개 자동 생성
- 기본 마스터 품목 6개 자동 생성

## 모니터링 및 관리

### 성능 모니터링
```sql
-- 인덱스 사용 통계 확인
SELECT * FROM index_usage_stats;

-- 테이블 크기 확인
SELECT * FROM table_sizes;

-- 사용되지 않는 인덱스 확인
SELECT * FROM unused_indexes;
```

### 사용자 권한 확인
```sql
-- 현재 사용자 권한 확인
SELECT * FROM check_current_user_permissions();

-- RLS 정책 목록 확인
SELECT * FROM rls_policies;
```

### 트리거 상태 확인
```sql
-- 활성화된 트리거 목록 확인
SELECT * FROM trigger_status;
```

## 주의사항

1. **데이터 삭제 방지**: 승인된 견적서는 삭제할 수 없습니다.
2. **스냅샷 무결성**: 견적서의 과거 데이터는 master_items 변경에 영향받지 않습니다.
3. **권한 관리**: 관리자는 자신의 관리자 권한을 스스로 제거할 수 없습니다.
4. **알림 시스템**: 정기적인 알림 체크를 위해서는 별도의 스케줄러 구성이 필요합니다.

## 백업 및 복구

정기적인 백업을 위해 Supabase의 자동 백업 기능을 활용하거나, 다음 명령으로 수동 백업을 수행하세요:

```bash
pg_dump --host=your-project.supabase.co --port=5432 --username=postgres --dbname=postgres > backup.sql
```

## 문제 해결

### 트리거 오류 시
```sql
-- 트리거 비활성화
ALTER TABLE table_name DISABLE TRIGGER trigger_name;

-- 트리거 재활성화
ALTER TABLE table_name ENABLE TRIGGER trigger_name;
```

### 성능 이슈 시
```sql
-- 통계 정보 업데이트
ANALYZE;

-- 특정 테이블 통계 업데이트
ANALYZE table_name;
```

이 스키마는 작업지시서의 모든 요구사항을 충족하며, 확장 가능하고 안전한 구조로 설계되었습니다.