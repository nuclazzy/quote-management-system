-- 4단계 견적서 구조 완성 후 종합적인 데이터베이스 검토

-- 1. 모든 4단계 구조 관련 테이블 현황
SELECT 
    'Table Overview' as section,
    table_name,
    (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count,
    CASE 
        WHEN table_name = 'quotes' THEN (SELECT count(*) FROM quotes)
        WHEN table_name = 'quote_groups' THEN (SELECT count(*) FROM quote_groups)
        WHEN table_name = 'quote_items_motionsense' THEN (SELECT count(*) FROM quote_items_motionsense)
        WHEN table_name = 'quote_details' THEN (SELECT count(*) FROM quote_details)
        ELSE 0
    END as row_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_name IN ('quotes', 'quote_groups', 'quote_items_motionsense', 'quote_details')
ORDER BY table_name;

-- 2. 외래키 제약조건 전체 검토
SELECT 
    'Foreign Keys' as section,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
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

-- 3. 인덱스 현황 검토
SELECT 
    'Indexes' as section,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('quotes', 'quote_groups', 'quote_items_motionsense', 'quote_details')
    AND schemaname = 'public'
ORDER BY tablename, indexname;

-- 4. RLS 정책 현황
SELECT 
    'RLS Policies' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('quotes', 'quote_groups', 'quote_items_motionsense', 'quote_details')
ORDER BY tablename, policyname;

-- 5. 함수 및 뷰 현황
SELECT 
    'Functions and Views' as section,
    routine_type,
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public' 
    AND routine_name LIKE '%quote%4tier%' OR routine_name LIKE '%calculate_quote%'
UNION ALL
SELECT 
    'Functions and Views' as section,
    'VIEW' as routine_type,
    table_name as routine_name,
    view_definition as routine_definition
FROM information_schema.views
WHERE table_schema = 'public' 
    AND table_name LIKE '%quote%4tier%';

-- 6. 잠재적인 문제점 체크

-- 6-1. 고아 레코드 확인 (외래키 관계가 깨진 데이터)
SELECT 
    'Orphaned Records Check' as section,
    'quote_groups' as table_name,
    count(*) as orphaned_count
FROM quote_groups qg
WHERE NOT EXISTS (SELECT 1 FROM quotes q WHERE q.id = qg.quote_id)

UNION ALL

SELECT 
    'Orphaned Records Check' as section,
    'quote_items_motionsense' as table_name,
    count(*) as orphaned_count
FROM quote_items_motionsense qi
WHERE NOT EXISTS (SELECT 1 FROM quote_groups qg WHERE qg.id = qi.quote_group_id)

UNION ALL

SELECT 
    'Orphaned Records Check' as section,
    'quote_details' as table_name,
    count(*) as orphaned_count
FROM quote_details qd
WHERE NOT EXISTS (SELECT 1 FROM quote_items_motionsense qi WHERE qi.id = qd.quote_item_id);

-- 6-2. 중복 테이블 및 마이그레이션 잔여물 확인
SELECT 
    'Migration Artifacts' as section,
    table_name,
    'Backup or old table - consider cleanup' as note
FROM information_schema.tables
WHERE table_schema = 'public' 
    AND (table_name LIKE '%backup%' OR table_name LIKE '%old%' OR table_name = 'quote_items')
    AND table_name != 'quote_items_motionsense'
ORDER BY table_name;

-- 7. 성능 관련 권장사항
SELECT 
    'Performance Recommendations' as section,
    'Missing Index' as issue_type,
    'quote_groups.quote_id' as recommendation
WHERE NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'quote_groups' 
    AND indexdef LIKE '%quote_id%'
)

UNION ALL

SELECT 
    'Performance Recommendations' as section,
    'Missing Index' as issue_type,
    'quote_items_motionsense.quote_group_id' as recommendation
WHERE NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'quote_items_motionsense' 
    AND indexdef LIKE '%quote_group_id%'
)

UNION ALL

SELECT 
    'Performance Recommendations' as section,
    'Missing Index' as issue_type,
    'quote_details.quote_item_id' as recommendation
WHERE NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'quote_details' 
    AND indexdef LIKE '%quote_item_id%'
);

-- 8. 4단계 구조 데이터 무결성 테스트
WITH quote_structure_check AS (
    SELECT 
        q.id as quote_id,
        q.project_title,
        COUNT(DISTINCT qg.id) as group_count,
        COUNT(DISTINCT qi.id) as item_count,
        COUNT(qd.id) as detail_count,
        SUM(qd.quantity * qd.days * qd.unit_price) as calculated_total
    FROM quotes q
    LEFT JOIN quote_groups qg ON q.id = qg.quote_id
    LEFT JOIN quote_items_motionsense qi ON qg.id = qi.quote_group_id
    LEFT JOIN quote_details qd ON qi.id = qd.quote_item_id
    WHERE q.project_title = '4단계 구조 테스트 견적서'
    GROUP BY q.id, q.project_title
)
SELECT 
    'Data Integrity Test' as section,
    quote_id,
    project_title,
    group_count,
    item_count,
    detail_count,
    calculated_total,
    CASE 
        WHEN group_count > 0 AND item_count > 0 AND detail_count > 0 THEN '✅ Healthy'
        ELSE '❌ Missing Data'
    END as status
FROM quote_structure_check;