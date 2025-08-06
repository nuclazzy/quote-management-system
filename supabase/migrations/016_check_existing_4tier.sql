-- 이미 존재하는 4단계 구조 테이블들의 상세 구조 확인

-- 1. quote_items 테이블 구조
SELECT 'quote_items' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'quote_items' 
ORDER BY ordinal_position;

-- 2. quote_groups 테이블 구조  
SELECT 'quote_groups' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'quote_groups' 
ORDER BY ordinal_position;

-- 3. quote_details 테이블 구조
SELECT 'quote_details' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'quote_details' 
ORDER BY ordinal_position;

-- 4. 데이터 존재 여부 확인
SELECT 
    'quote_groups' as table_name, 
    COUNT(*) as row_count,
    COUNT(DISTINCT quote_id) as quote_count
FROM quote_groups
UNION ALL
SELECT 
    'quote_items' as table_name, 
    COUNT(*) as row_count,
    COUNT(DISTINCT quote_group_id) as group_count
FROM quote_items  
UNION ALL
SELECT 
    'quote_details' as table_name, 
    COUNT(*) as row_count,
    COUNT(DISTINCT quote_item_id) as item_count
FROM quote_details;

-- 5. 4단계 구조 연결 상태 확인
SELECT 
    q.id as quote_id,
    q.quote_number,
    COUNT(qg.id) as group_count,
    COUNT(qi.id) as item_count,
    COUNT(qd.id) as detail_count
FROM quotes q
LEFT JOIN quote_groups qg ON q.id = qg.quote_id  
LEFT JOIN quote_items qi ON qg.id = qi.quote_group_id
LEFT JOIN quote_details qd ON qi.id = qd.quote_item_id
GROUP BY q.id, q.quote_number
ORDER BY q.created_at DESC
LIMIT 5;