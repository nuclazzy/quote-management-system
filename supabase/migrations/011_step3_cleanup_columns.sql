-- 4단계 구조 복원 - 3단계: 컬럼 정리

-- 1. 의존성 객체들 삭제
DROP POLICY IF EXISTS quote_items_access ON quote_items;
DROP POLICY IF EXISTS quote_items_select ON quote_items;
DROP POLICY IF EXISTS quote_items_insert ON quote_items;
DROP POLICY IF EXISTS quote_items_update ON quote_items;
DROP POLICY IF EXISTS quote_items_delete ON quote_items;
DROP VIEW IF EXISTS quote_summary;

-- 2. 불필요한 컬럼들 제거 (존재하는 경우에만)
DO $$
BEGIN
    -- quote_id 컬럼 제거
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'quote_items' AND column_name = 'quote_id') THEN
        ALTER TABLE quote_items DROP COLUMN quote_id;
    END IF;
    
    -- 기타 데이터 컬럼들 제거
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'quote_items' AND column_name = 'name') THEN
        ALTER TABLE quote_items DROP COLUMN name;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'quote_items' AND column_name = 'description') THEN
        ALTER TABLE quote_items DROP COLUMN description;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'quote_items' AND column_name = 'quantity') THEN
        ALTER TABLE quote_items DROP COLUMN quantity;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'quote_items' AND column_name = 'days') THEN
        ALTER TABLE quote_items DROP COLUMN days;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'quote_items' AND column_name = 'unit') THEN
        ALTER TABLE quote_items DROP COLUMN unit;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'quote_items' AND column_name = 'unit_price') THEN
        ALTER TABLE quote_items DROP COLUMN unit_price;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'quote_items' AND column_name = 'cost_price') THEN
        ALTER TABLE quote_items DROP COLUMN cost_price;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'quote_items' AND column_name = 'supplier_id') THEN
        ALTER TABLE quote_items DROP COLUMN supplier_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'quote_items' AND column_name = 'supplier_name') THEN
        ALTER TABLE quote_items DROP COLUMN supplier_name;
    END IF;
END $$;

-- 3. sort_order 컬럼 추가
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 4. 제약 조건 설정
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM quote_items WHERE quote_group_id IS NOT NULL LIMIT 1) THEN
        ALTER TABLE quote_items ALTER COLUMN quote_group_id SET NOT NULL;
    END IF;
END $$;