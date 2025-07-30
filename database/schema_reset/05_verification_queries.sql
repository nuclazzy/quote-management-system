-- ========================================
-- 견적서 관리 시스템 - 스키마 검증 쿼리
-- 05_verification_queries.sql
-- 스키마 생성 후 데이터 무결성 및 기능 확인
-- ========================================

-- ========================================
-- 1. 테이블 생성 확인
-- ========================================
SELECT 
    'Table Count Check' as check_type,
    COUNT(*) as result,
    'Expected: 16' as expected
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name IN (
    'profiles', 'customers', 'suppliers', 'master_items', 'quote_templates',
    'quotes', 'quote_groups', 'quote_items', 'quote_details', 'projects',
    'transactions', 'project_expenses', 'notifications', 'notification_settings',
    'permissions', 'user_permissions', 'user_invitations'
);

-- ========================================
-- 2. 뷰 생성 확인
-- ========================================
SELECT 
    'View Count Check' as check_type,
    COUNT(*) as result,
    'Expected: 2' as expected
FROM information_schema.views 
WHERE table_schema = 'public'
AND table_name IN ('quote_totals', 'project_profitability');

-- ========================================
-- 3. 함수 생성 확인
-- ========================================
SELECT 
    'Function Count Check' as check_type,
    COUNT(*) as result,
    'Expected: 8+' as expected
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
AND routine_name IN (
    'update_updated_at_column', 'generate_quote_number', 'calculate_quote_totals',
    'create_quote_transaction', 'create_notification', 'create_default_notification_settings',
    'check_user_permission', 'grant_user_permission', 'revoke_user_permission', 'invite_user'
);

-- ========================================
-- 4. RLS 정책 확인
-- ========================================
SELECT 
    'RLS Policy Count Check' as check_type,
    COUNT(*) as result,
    'Expected: 15+' as expected
FROM pg_policies 
WHERE schemaname = 'public';

-- ========================================
-- 5. 인덱스 확인
-- ========================================
SELECT 
    'Index Count Check' as check_type,
    COUNT(*) as result,
    'Expected: 35+' as expected
FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname NOT LIKE '%_pkey'  -- 기본키 제외
AND indexname NOT LIKE '%_unique'  -- 유니크 제약 제외
AND indexname LIKE 'idx_%';  -- 명시적으로 생성한 인덱스만

-- ========================================
-- 6. 권한 데이터 확인
-- ========================================
SELECT 
    'Permission Data Check' as check_type,
    COUNT(*) as result,
    'Expected: 24' as expected
FROM permissions;

-- 카테고리별 권한 분포
SELECT 
    category,
    COUNT(*) as permission_count
FROM permissions 
GROUP BY category 
ORDER BY category;

-- ========================================
-- 7. 초기 데이터 확인
-- ========================================
SELECT 'Master Items Count' as check_type, COUNT(*) as result FROM master_items;
SELECT 'Quote Templates Count' as check_type, COUNT(*) as result FROM quote_templates;
SELECT 'Sample Customers Count' as check_type, COUNT(*) as result FROM customers;
SELECT 'Sample Suppliers Count' as check_type, COUNT(*) as result FROM suppliers;
SELECT 'Sample Quotes Count' as check_type, COUNT(*) as result FROM quotes;

-- ========================================
-- 8. 외래키 제약조건 확인
-- ========================================
SELECT 
    'Foreign Key Constraints Check' as check_type,
    COUNT(*) as result,
    'Expected: 25+' as expected
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public';

-- ========================================
-- 9. 트리거 확인
-- ========================================
SELECT 
    'Trigger Count Check' as check_type,
    COUNT(*) as result,
    'Expected: 10+' as expected
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- ========================================
-- 10. 견적서 총액 계산 테스트
-- ========================================
-- 샘플 견적서의 총액이 올바르게 계산되었는지 확인
SELECT 
    'Quote Total Calculation Test' as check_type,
    q.quote_number,
    q.total_amount,
    qt.subtotal,
    qt.fee_applicable_amount,
    (qt.subtotal + (qt.fee_applicable_amount * q.agency_fee_rate / 100) + 
     ((qt.subtotal + (qt.fee_applicable_amount * q.agency_fee_rate / 100) - q.discount_amount) * 0.10) - 
     q.discount_amount) as calculated_total
FROM quotes q
LEFT JOIN quote_totals qt ON q.id = qt.quote_id
WHERE q.quote_number LIKE 'Q-%'
ORDER BY q.created_at DESC
LIMIT 1;

-- ========================================
-- 11. 권한 시스템 테스트
-- ========================================
-- 최고 관리자의 권한 할당 확인
SELECT 
    'Super Admin Permission Count' as check_type,
    COUNT(*) as granted_permissions,
    (SELECT COUNT(*) FROM permissions) as total_permissions,
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM permissions) THEN 'PASS'
        ELSE 'FAIL'
    END as test_result
FROM user_permissions up
JOIN profiles p ON up.user_id = p.id
WHERE p.role = 'super_admin' AND up.is_active = true;

-- ========================================
-- 12. 알림 설정 확인
-- ========================================
SELECT 
    'Notification Settings Check' as check_type,
    COUNT(*) as users_with_settings,
    (SELECT COUNT(*) FROM profiles) as total_users,
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM profiles) THEN 'PASS'
        ELSE 'FAIL'
    END as test_result
FROM notification_settings;

-- ========================================
-- 13. 데이터베이스 통계 요약
-- ========================================
SELECT '=== DATABASE STATISTICS SUMMARY ===' as summary;

SELECT 
    t.table_name,
    COALESCE(t.row_count, 0) as row_count,
    pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name))) as table_size
FROM (
    SELECT 
        schemaname,
        tablename as table_name,
        n_tup_ins - n_tup_del as row_count
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
    UNION ALL
    SELECT 'public', 'auth.users', 0  -- auth.users는 별도 스키마
) t
ORDER BY t.table_name;

-- ========================================
-- 14. 성능 관련 확인
-- ========================================
-- 자주 사용될 쿼리의 인덱스 사용 계획 확인
EXPLAIN (ANALYZE false, BUFFERS false) 
SELECT q.*, c.name as customer_name
FROM quotes q
JOIN customers c ON q.customer_id = c.id
WHERE q.status = 'draft'
ORDER BY q.created_at DESC
LIMIT 10;

-- ========================================
-- 15. 최종 검증 결과 요약
-- ========================================
DO $$
DECLARE
    table_count INT;
    view_count INT;
    function_count INT;
    policy_count INT;
    permission_count INT;
    super_admin_exists BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO table_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    SELECT COUNT(*) INTO view_count FROM information_schema.views 
    WHERE table_schema = 'public';
    
    SELECT COUNT(*) INTO function_count FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
    
    SELECT COUNT(*) INTO policy_count FROM pg_policies 
    WHERE schemaname = 'public';
    
    SELECT COUNT(*) INTO permission_count FROM permissions;
    
    SELECT EXISTS(SELECT 1 FROM profiles WHERE role = 'super_admin') INTO super_admin_exists;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE '견적서 관리 시스템 - 스키마 검증 결과';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✓ 테이블 생성: % 개', table_count;
    RAISE NOTICE '✓ 뷰 생성: % 개', view_count;
    RAISE NOTICE '✓ 함수 생성: % 개', function_count;
    RAISE NOTICE '✓ RLS 정책: % 개', policy_count;
    RAISE NOTICE '✓ 권한 정의: % 개', permission_count;
    RAISE NOTICE '✓ 최고 관리자 존재: %', CASE WHEN super_admin_exists THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '===========================================';
    
    IF table_count >= 16 AND view_count >= 2 AND function_count >= 8 AND 
       policy_count >= 15 AND permission_count = 24 THEN
        RAISE NOTICE '🎉 스키마 초기화 성공적으로 완료되었습니다!';
    ELSE
        RAISE NOTICE '⚠️  일부 구성 요소가 누락되었을 수 있습니다.';
    END IF;
    
    RAISE NOTICE '===========================================';
END $$;