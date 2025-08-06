-- quote_items_motionsense 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'quote_items_motionsense' 
ORDER BY ordinal_position;