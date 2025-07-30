-- ========================================
-- 견적서 관리 시스템 - 완전 스키마 초기화 실행 스크립트
-- EXECUTE_SCHEMA_RESET.sql
-- 
-- 주의사항:
-- 1. 이 스크립트는 기존 데이터를 모두 삭제합니다.
-- 2. 실행 전에 데이터 백업을 필수적으로 수행하세요.
-- 3. 04_seed_data.sql에서 실제 사용자 UUID를 설정해야 합니다.
-- 4. Supabase Dashboard에서 실행하거나 psql을 통해 실행하세요.
-- ========================================

-- 실행 시작 로그
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '견적서 관리 시스템 스키마 초기화 시작';
    RAISE NOTICE '시작 시간: %', NOW();
    RAISE NOTICE '===========================================';
END $$;

-- ========================================
-- 단계 1: 기존 스키마 완전 삭제
-- ========================================
\echo '단계 1: 기존 스키마 삭제 중...'
\i 00_drop_all_tables.sql

-- ========================================
-- 단계 2: 핵심 스키마 생성
-- ========================================
\echo '단계 2: 핵심 스키마 생성 중...'
\i 01_core_schema.sql

-- ========================================
-- 단계 3: 비즈니스 로직 함수 및 트리거 생성
-- ========================================
\echo '단계 3: 함수 및 트리거 생성 중...'
\i 02_functions_and_triggers.sql

-- ========================================
-- 단계 4: 권한 관리 및 RLS 정책 설정
-- ========================================
\echo '단계 4: 권한 및 보안 정책 설정 중...'
\i 03_permissions_and_rls.sql

-- ========================================
-- 단계 5: 초기 데이터 삽입
-- ========================================
\echo '단계 5: 초기 데이터 삽입 중...'
\i 04_seed_data.sql

-- ========================================
-- 단계 6: 스키마 검증
-- ========================================
\echo '단계 6: 스키마 검증 중...'
\i 05_verification_queries.sql

-- ========================================
-- 완료 로그 및 다음 단계 안내
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '견적서 관리 시스템 스키마 초기화 완료';
    RAISE NOTICE '완료 시간: %', NOW();
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ 다음 단계:';
    RAISE NOTICE '1. 04_seed_data.sql에서 실제 사용자 UUID 설정';
    RAISE NOTICE '2. TypeScript 타입 정의 업데이트 (src/types/database.ts)';
    RAISE NOTICE '3. API 엔드포인트 테스트';
    RAISE NOTICE '4. 프론트엔드 컴포넌트 연동 테스트';
    RAISE NOTICE '5. 권한 시스템 테스트';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  중요 사항:';
    RAISE NOTICE '- auth.users 테이블의 실제 사용자 ID를 확인하여';
    RAISE NOTICE '  04_seed_data.sql의 super_admin_id를 업데이트하세요.';
    RAISE NOTICE '- 기존 API 호출이 정상 작동하는지 확인하세요.';
    RAISE NOTICE '===========================================';
END $$;

-- ========================================
-- 스키마 정보 출력 (참고용)
-- ========================================
\echo ''
\echo '=== 생성된 테이블 목록 ==='
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

\echo ''
\echo '=== 생성된 뷰 목록 ==='
SELECT 
    table_name as view_name
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

\echo ''
\echo '=== 생성된 함수 목록 ==='
SELECT 
    routine_name as function_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

\echo ''
\echo '=== RLS 정책 목록 ==='
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

\echo ''
\echo '스키마 초기화가 완료되었습니다.'
\echo '위의 안내사항을 따라 다음 단계를 진행하세요.'