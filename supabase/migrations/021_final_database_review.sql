-- 최종 데이터베이스 종합 검토 및 정리
-- 4단계 견적서 구조 완성 후 전체 데이터베이스 상태 점검

-- 1. 현재 데이터베이스 테이블 현황
SELECT 
    '=== DATABASE OVERVIEW ===' as section,
    '' as info;

SELECT 
    'Tables Status' as section,
    table_name,
    (SELECT count(*) 
     FROM information_schema.columns 
     WHERE table_name = t.table_name AND table_schema = 'public') as column_count,
    CASE 
        WHEN table_name = 'quotes' THEN (SELECT count(*) FROM quotes WHERE quotes.id IS NOT NULL)
        WHEN table_name = 'quote_groups' THEN (SELECT count(*) FROM quote_groups WHERE quote_groups.id IS NOT NULL)
        WHEN table_name = 'quote_items_motionsense' THEN (SELECT count(*) FROM quote_items_motionsense WHERE quote_items_motionsense.id IS NOT NULL)
        WHEN table_name = 'quote_details' THEN (SELECT count(*) FROM quote_details WHERE quote_details.id IS NOT NULL)
        WHEN table_name = 'master_items' THEN (SELECT count(*) FROM master_items WHERE master_items.id IS NOT NULL)
        WHEN table_name = 'clients' THEN (SELECT count(*) FROM clients WHERE clients.id IS NOT NULL)
        WHEN table_name = 'suppliers' THEN (SELECT count(*) FROM suppliers WHERE suppliers.id IS NOT NULL)
        ELSE 0
    END as row_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN ('quotes', 'quote_groups', 'quote_items_motionsense', 'quote_details', 
                       'master_items', 'clients', 'suppliers', 'projects_motionsense', 
                       'transactions_motionsense', 'project_expenses', 'quote_templates')
ORDER BY table_name;

-- 2. 4단계 구조 무결성 검증
SELECT 
    '=== 4-TIER STRUCTURE INTEGRITY ===' as section,
    '' as info;

WITH integrity_check AS (
    SELECT 
        q.id as quote_id,
        q.project_title,
        COUNT(DISTINCT qg.id) as groups_count,
        COUNT(DISTINCT qi.id) as items_count,
        COUNT(qd.id) as details_count,
        SUM(qd.quantity * qd.days * qd.unit_price) as total_calculated,
        q.total_amount as quote_total
    FROM quotes q
    LEFT JOIN quote_groups qg ON q.id = qg.quote_id
    LEFT JOIN quote_items_motionsense qi ON qg.id = qi.quote_group_id
    LEFT JOIN quote_details qd ON qi.id = qd.quote_item_id
    WHERE q.project_title IS NOT NULL
    GROUP BY q.id, q.project_title, q.total_amount
)
SELECT 
    'Data Integrity' as section,
    quote_id,
    project_title,
    groups_count,
    items_count,
    details_count,
    total_calculated,
    quote_total,
    CASE 
        WHEN groups_count > 0 AND items_count > 0 AND details_count > 0 THEN '✅ Complete Structure'
        WHEN groups_count > 0 AND items_count > 0 THEN '⚠️ Missing Details'
        WHEN groups_count > 0 THEN '⚠️ Missing Items & Details'
        ELSE '❌ Empty Quote'
    END as status
FROM integrity_check
ORDER BY quote_id;

-- 3. 외래키 관계 검증
SELECT 
    '=== FOREIGN KEY RELATIONSHIPS ===' as section,
    '' as info;

SELECT 
    'Foreign Keys' as section,
    tc.table_name as from_table,
    kcu.column_name as from_column,
    ccu.table_name as to_table,
    ccu.column_name as to_column,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('quotes', 'quote_groups', 'quote_items_motionsense', 'quote_details')
ORDER BY tc.table_name, tc.constraint_name;

-- 4. 인덱스 현황 분석
SELECT 
    '=== INDEXES STATUS ===' as section,
    '' as info;

SELECT 
    'Indexes' as section,
    tablename,
    indexname,
    CASE 
        WHEN indexdef LIKE '%UNIQUE%' THEN 'UNIQUE'
        WHEN indexdef LIKE '%PRIMARY KEY%' THEN 'PRIMARY'
        ELSE 'INDEX'
    END as index_type,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('quotes', 'quote_groups', 'quote_items_motionsense', 'quote_details', 'master_items')
    AND schemaname = 'public'
ORDER BY tablename, indexname;

-- 5. RLS 정책 현황 (사용자가 RLS 비활성화 요청)
SELECT 
    '=== RLS POLICIES STATUS ===' as section,
    '' as info;

SELECT 
    'RLS Policies' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    'Found - Will be disabled' as note
FROM pg_policies 
WHERE tablename IN ('quotes', 'quote_groups', 'quote_items_motionsense', 'quote_details', 'master_items')
ORDER BY tablename, policyname;

-- 6. 중복 또는 불필요한 테이블 확인
SELECT 
    '=== CLEANUP CANDIDATES ===' as section,
    '' as info;

SELECT 
    'Cleanup Review' as section,
    table_name,
    CASE 
        WHEN table_name LIKE '%backup%' THEN '🗑️ Backup table - Consider removal'
        WHEN table_name LIKE '%old%' THEN '🗑️ Old version - Consider removal'
        WHEN table_name = 'quote_items' AND EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_items_motionsense')
             THEN '⚠️ Superseded by quote_items_motionsense'
        ELSE '✅ Active table'
    END as status,
    (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND (table_name LIKE '%quote%' OR table_name LIKE '%backup%' OR table_name LIKE '%old%')
ORDER BY 
    CASE 
        WHEN table_name LIKE '%backup%' THEN 1
        WHEN table_name LIKE '%old%' THEN 2
        ELSE 3
    END,
    table_name;

-- 7. 함수 및 뷰 현황
SELECT 
    '=== FUNCTIONS AND VIEWS ===' as section,
    '' as info;

-- 함수 현황
SELECT 
    'Functions' as section,
    routine_name,
    routine_type,
    CASE 
        WHEN routine_name LIKE '%4tier%' THEN '✅ 4-tier related'
        WHEN routine_name LIKE '%motionsense%' THEN '✅ Motionsense related'
        WHEN routine_name LIKE '%calculate%' THEN '✅ Calculation function'
        ELSE '📋 Other'
    END as category
FROM information_schema.routines
WHERE routine_schema = 'public' 
    AND (routine_name LIKE '%quote%' OR routine_name LIKE '%calculate%' OR routine_name LIKE '%motionsense%')
ORDER BY routine_name;

-- 뷰 현황
SELECT 
    'Views' as section,
    table_name as view_name,
    'VIEW' as type,
    CASE 
        WHEN table_name LIKE '%4tier%' THEN '✅ 4-tier related'
        WHEN table_name LIKE '%test%' THEN '🧪 Test view'
        ELSE '📋 Other'
    END as category
FROM information_schema.views
WHERE table_schema = 'public' 
    AND table_name LIKE '%quote%'
ORDER BY table_name;

-- 8. 성능 분석 및 권장사항
SELECT 
    '=== PERFORMANCE RECOMMENDATIONS ===' as section,
    '' as info;

-- 필수 인덱스 누락 확인
SELECT 
    'Missing Indexes' as section,
    'quote_groups.quote_id' as recommendation,
    CASE 
        WHEN EXISTS(SELECT 1 FROM pg_indexes WHERE tablename = 'quote_groups' AND indexdef LIKE '%quote_id%')
        THEN '✅ Index exists'
        ELSE '❌ Missing - CREATE INDEX idx_quote_groups_quote_id ON quote_groups(quote_id)'
    END as status

UNION ALL

SELECT 
    'Missing Indexes' as section,
    'quote_items_motionsense.quote_group_id' as recommendation,
    CASE 
        WHEN EXISTS(SELECT 1 FROM pg_indexes WHERE tablename = 'quote_items_motionsense' AND indexdef LIKE '%quote_group_id%')
        THEN '✅ Index exists'
        ELSE '❌ Missing - CREATE INDEX idx_quote_items_motionsense_group_id ON quote_items_motionsense(quote_group_id)'
    END as status

UNION ALL

SELECT 
    'Missing Indexes' as section,
    'quote_details.quote_item_id' as recommendation,
    CASE 
        WHEN EXISTS(SELECT 1 FROM pg_indexes WHERE tablename = 'quote_details' AND indexdef LIKE '%quote_item_id%')
        THEN '✅ Index exists'
        ELSE '❌ Missing - CREATE INDEX idx_quote_details_quote_item_id ON quote_details(quote_item_id)'
    END as status

UNION ALL

SELECT 
    'Missing Indexes' as section,
    'quotes.client_id' as recommendation,
    CASE 
        WHEN EXISTS(SELECT 1 FROM pg_indexes WHERE tablename = 'quotes' AND indexdef LIKE '%client_id%')
        THEN '✅ Index exists'
        ELSE '❌ Missing - CREATE INDEX idx_quotes_client_id ON quotes(client_id)'
    END as status;

-- 9. 고아 레코드 확인
SELECT 
    '=== ORPHANED RECORDS CHECK ===' as section,
    '' as info;

SELECT 
    'Orphaned Records' as section,
    'quote_groups' as table_name,
    COUNT(*) as orphaned_count,
    'Groups without parent quote' as description
FROM quote_groups qg
WHERE NOT EXISTS (SELECT 1 FROM quotes q WHERE q.id = qg.quote_id)

UNION ALL

SELECT 
    'Orphaned Records' as section,
    'quote_items_motionsense' as table_name,
    COUNT(*) as orphaned_count,
    'Items without parent group' as description
FROM quote_items_motionsense qi
WHERE NOT EXISTS (SELECT 1 FROM quote_groups qg WHERE qg.id = qi.quote_group_id)

UNION ALL

SELECT 
    'Orphaned Records' as section,
    'quote_details' as table_name,
    COUNT(*) as orphaned_count,
    'Details without parent item' as description
FROM quote_details qd
WHERE NOT EXISTS (SELECT 1 FROM quote_items_motionsense qi WHERE qi.id = qd.quote_item_id);

-- 10. 마스터 데이터 상태 확인
SELECT 
    '=== MASTER DATA STATUS ===' as section,
    '' as info;

SELECT 
    'Master Data' as section,
    'master_items' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_count,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_count
FROM master_items

UNION ALL

SELECT 
    'Master Data' as section,
    'clients' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_count,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_count
FROM clients WHERE id IS NOT NULL

UNION ALL

SELECT 
    'Master Data' as section,
    'quote_templates' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_count,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_count
FROM quote_templates WHERE id IS NOT NULL;

-- 11. 최종 권장사항 요약
SELECT 
    '=== FINAL RECOMMENDATIONS ===' as section,
    '' as info;

SELECT 
    'Action Items' as section,
    '1. Disable RLS policies as requested' as item,
    '사용자 요청: RLS 정책 비활성화' as description

UNION ALL

SELECT 
    'Action Items' as section,
    '2. Execute 020_database_optimization.sql' as item,
    '성능 인덱스 생성 및 최적화 함수 적용' as description

UNION ALL

SELECT 
    'Action Items' as section,
    '3. Clean up backup/old tables' as item,
    'quote_items, quote_items_backup 등 불필요한 테이블 정리' as description

UNION ALL

SELECT 
    'Action Items' as section,
    '4. Update statistics' as item,
    'ANALYZE 명령으로 쿼리 플래너 최적화' as description;

SELECT '✅ 데이터베이스 종합 검토 완료' as final_status;