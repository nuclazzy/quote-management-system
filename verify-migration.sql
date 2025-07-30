-- 마이그레이션 완료 후 확인용 SQL
-- Supabase Studio SQL Editor에서 실행하여 테이블이 정상 생성되었는지 확인

-- 1. 생성된 테이블 목록 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('clients', 'suppliers', 'item_categories', 'items', 'projects', 'quotes', 'quote_items', 'quote_sequences', 'item_price_history', 'stock_movements')
ORDER BY table_name;

-- 2. clients 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. 외래키 제약조건 확인 (client_id 참조)
SELECT 
    tc.table_name, 
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
AND ccu.table_name = 'clients';

-- 4. RLS 정책 활성화 상태 확인
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('clients', 'suppliers', 'items', 'projects', 'quotes')
AND schemaname = 'public';

-- 5. 인덱스 생성 확인
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('clients', 'quotes', 'projects')
AND schemaname = 'public'
ORDER BY tablename, indexname;