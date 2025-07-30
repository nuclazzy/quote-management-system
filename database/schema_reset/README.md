# 견적서 관리 시스템 - 데이터베이스 스키마 완전 초기화

## 개요

현재 견적서 관리 시스템의 데이터베이스 스키마에는 여러 마이그레이션 파일 간의 불일치로 인한 심각한 문제들이 있습니다:

- TypeScript 타입과 실제 테이블 구조 불일치
- API 코드에서 참조하는 테이블과 실제 스키마 불일치
- client_id vs customer_id 컬럼명 충돌
- 중복되고 모순된 마이그레이션 파일들
- 부분적으로만 생성된 테이블들로 인한 참조 오류

이 스키마 초기화 스크립트는 모든 기존 테이블을 삭제하고, TypeScript 타입 정의와 실제 API 사용에 정확히 부합하는 새로운 통합 스키마를 생성합니다.

## ⚠️ 주의사항

**이 스크립트는 기존 데이터를 모두 삭제합니다!**

- 실행 전에 반드시 데이터 백업을 수행하세요
- 개발 환경에서 먼저 테스트한 후 운영 환경에 적용하세요
- 실행 후에는 애플리케이션의 모든 기능을 다시 테스트해야 합니다

## 파일 구조

```
database/schema_reset/
├── README.md                    # 이 파일
├── EXECUTE_SCHEMA_RESET.sql     # 메인 실행 스크립트
├── 00_drop_all_tables.sql       # 기존 스키마 완전 삭제
├── 01_core_schema.sql           # 핵심 테이블 및 뷰 생성
├── 02_functions_and_triggers.sql # 비즈니스 로직 함수 및 트리거
├── 03_permissions_and_rls.sql   # 권한 관리 및 RLS 정책
├── 04_seed_data.sql             # 초기 데이터 및 샘플 데이터
└── 05_verification_queries.sql  # 스키마 검증 쿼리
```

## 실행 방법

### 방법 1: Supabase Dashboard 사용

1. Supabase Dashboard → SQL Editor 접속
2. `EXECUTE_SCHEMA_RESET.sql` 파일 내용을 복사하여 붙여넣기
3. **실행 전 주의사항 확인** 후 실행

### 방법 2: psql 사용

```bash
# 프로젝트 루트에서 실행
cd database/schema_reset
psql "postgresql://[username]:[password]@[host]:[port]/[database]" -f EXECUTE_SCHEMA_RESET.sql
```

### 방법 3: 개별 파일 실행

```sql
-- Supabase SQL Editor에서 순서대로 실행
\i 00_drop_all_tables.sql
\i 01_core_schema.sql
\i 02_functions_and_triggers.sql
\i 03_permissions_and_rls.sql
\i 04_seed_data.sql
\i 05_verification_queries.sql
```

## 실행 전 필수 설정

### 1. 실제 사용자 UUID 설정

`04_seed_data.sql` 파일에서 다음 부분을 실제 값으로 변경:

```sql
INSERT INTO profiles (id, email, full_name, role, is_active) 
VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',  -- 🔴 이 부분을 실제 UUID로 변경
    'lewis@motionsense.co.kr', 
    '박대표', 
    'super_admin',
    true
)
```

실제 사용자 UUID 확인 방법:
```sql
-- Supabase Dashboard → SQL Editor에서 실행
SELECT id, email FROM auth.users WHERE email = 'lewis@motionsense.co.kr';
```

## 생성되는 주요 구조

### 핵심 테이블
- `profiles` - 사용자 프로필 (auth.users와 1:1)
- `customers` - 고객사 관리
- `suppliers` - 공급업체 관리  
- `master_items` - 마스터 품목
- `quotes` - 견적서 메인
- `quote_groups` - 견적서 그룹
- `quote_items` - 견적서 품목
- `quote_details` - 견적서 세부사항
- `projects` - 프로젝트 관리
- `transactions` - 정산 관리

### 권한 관리
- `permissions` - 시스템 권한 정의
- `user_permissions` - 사용자별 권한 매핑
- `user_invitations` - 사용자 초대 관리

### 알림 시스템
- `notifications` - 사용자 알림
- `notification_settings` - 알림 설정

### 뷰 및 함수
- `quote_totals` - 견적서 총액 계산 뷰
- `project_profitability` - 프로젝트 수익성 뷰
- 견적서 번호 자동 생성 함수
- 권한 확인 함수들
- 알림 생성 함수들

## 실행 후 확인사항

### 1. TypeScript 타입 업데이트

`src/types/database.ts` 파일이 새 스키마와 일치하는지 확인하고 필요시 업데이트

### 2. API 엔드포인트 테스트

주요 API 엔드포인트들이 정상 작동하는지 확인:
- `/api/quotes` - 견적서 조회/생성
- `/api/customers` - 고객 관리
- `/api/suppliers` - 공급업체 관리
- `/api/items` - 품목 관리

### 3. 권한 시스템 테스트

```sql
-- 최고 관리자 권한 확인
SELECT check_user_permission(
    (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1),
    'quotes.create'
);
```

### 4. 견적서 생성 테스트

프론트엔드에서 새 견적서 생성이 정상 작동하는지 확인

## 주요 개선사항

### 1. 스키마 통합
- TypeScript 타입과 100% 일치하는 테이블 구조
- API 코드에서 사용하는 정확한 컬럼명 적용
- 불필요한 테이블 및 컬럼 제거

### 2. 데이터 무결성
- 적절한 외래키 제약조건
- 체크 제약조건으로 데이터 품질 보장
- 트리거를 통한 자동 계산 및 업데이트

### 3. 보안 강화
- 세밀한 RLS 정책
- 역할 기반 접근 제어
- 함수 레벨 보안 설정

### 4. 성능 최적화
- 적절한 인덱스 생성
- 뷰를 통한 복잡한 조회 최적화
- 트리거 최적화

## 문제 해결

### 일반적인 오류

1. **권한 오류**: Supabase 프로젝트에 적절한 권한이 있는지 확인
2. **연결 오류**: 데이터베이스 연결 정보 확인
3. **UUID 오류**: `04_seed_data.sql`의 사용자 UUID가 올바른지 확인

### 롤백 방법

문제 발생 시 기존 마이그레이션으로 롤백:
```bash
# 기존 마이그레이션 파일들 재실행
psql -f database/migrations/01_schema.sql
# ... 기타 필요한 마이그레이션들
```

## 지원

문제 발생 시 다음 정보와 함께 문의:
- 실행한 스크립트 버전
- 오류 메시지 전문
- 사용 중인 Supabase 프로젝트 정보
- 실행 환경 (Dashboard/psql/기타)

---

**⚠️ 다시 한번 강조: 이 스크립트는 모든 기존 데이터를 삭제합니다. 실행 전 반드시 백업하세요!**