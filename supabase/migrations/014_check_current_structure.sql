-- 현재 데이터베이스 구조 확인

-- 1. quote_items 테이블 구조 확인
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'quote_items' 
ORDER BY ordinal_position;

-- 2. quotes 테이블 구조 확인  
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'quotes' 
ORDER BY ordinal_position;

-- 3. 기존 관련 테이블들 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%quote%'
ORDER BY table_name;