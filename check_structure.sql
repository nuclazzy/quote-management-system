-- 현재 4단계 구조 상태 확인
-- psql -h aws-0-ap-northeast-2.pooler.supabase.com -p 6543 -U postgres.xbkzzpewdfmykcosfkly -d postgres -f check_structure.sql

-- 1. 기존 테이블 목록 확인
\echo '=== 기존 테이블 목록 ==='
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%quote%'
ORDER BY table_name;

-- 2. quote_items 테이블 구조 확인
\echo '=== quote_items 테이블 구조 ==='
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'quote_items' 
ORDER BY ordinal_position;

-- 3. quote_groups 테이블 구조 확인 (존재한다면)
\echo '=== quote_groups 테이블 구조 ==='
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'quote_groups' 
ORDER BY ordinal_position;

-- 4. quote_details 테이블 구조 확인 (존재한다면)
\echo '=== quote_details 테이블 구조 ==='
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'quote_details' 
ORDER BY ordinal_position;

-- 5. 데이터 존재 여부 확인
\echo '=== 데이터 존재 여부 ==='
SELECT 
    'quotes' as table_name, 
    COUNT(*) as row_count
FROM quotes
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes')

UNION ALL

SELECT 
    'quote_groups' as table_name, 
    COUNT(*) as row_count
FROM quote_groups
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_groups')

UNION ALL

SELECT 
    'quote_items' as table_name, 
    COUNT(*) as row_count
FROM quote_items
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_items')

UNION ALL

SELECT 
    'quote_details' as table_name, 
    COUNT(*) as row_count
FROM quote_details
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_details');