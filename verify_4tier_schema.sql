-- 4단계 구조 스키마 상세 확인

-- 1. quote_groups 테이블 구조
SELECT 'quote_groups' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'quote_groups' 
ORDER BY ordinal_position;

-- 2. quote_items 테이블 구조  
SELECT 'quote_items' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'quote_items' 
ORDER BY ordinal_position;

-- 3. quote_details 테이블 구조
SELECT 'quote_details' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'quote_details' 
ORDER BY ordinal_position;

-- 4. 외래키 제약조건 확인
SELECT 
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
    AND tc.table_name IN ('quote_groups', 'quote_items', 'quote_details');

-- 5. 인덱스 확인
SELECT 
    indexname, 
    tablename, 
    indexdef
FROM pg_indexes 
WHERE tablename IN ('quote_groups', 'quote_items', 'quote_details')
ORDER BY tablename, indexname;

-- 6. RLS 정책 확인
SELECT 
    schemaname, 
    tablename, 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('quote_groups', 'quote_items', 'quote_details')
ORDER BY tablename, policyname;