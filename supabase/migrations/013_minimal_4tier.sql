-- 최소한의 4단계 구조 복원 (모든 외래키 제약 제거)

-- 1. 백업
CREATE TABLE IF NOT EXISTS quote_items_backup AS SELECT * FROM quote_items;

-- 2. 최소한의 quote_groups 테이블
CREATE TABLE IF NOT EXISTS quote_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL,
    name TEXT NOT NULL DEFAULT '기본 그룹',
    sort_order INTEGER DEFAULT 0,
    include_in_fee BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 최소한의 quote_details 테이블 (외래키 제약 없이)
CREATE TABLE IF NOT EXISTS quote_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_item_id UUID NOT NULL,
    name TEXT NOT NULL DEFAULT '품목',
    description TEXT DEFAULT '',
    quantity NUMERIC DEFAULT 1,
    days NUMERIC DEFAULT 1,
    unit TEXT DEFAULT '개',
    unit_price NUMERIC DEFAULT 0,
    is_service BOOLEAN DEFAULT false,
    cost_price NUMERIC DEFAULT 0,
    supplier_id UUID,
    supplier_name_snapshot TEXT DEFAULT '',
    master_item_id UUID,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. quote_items에 최소한의 컬럼 추가
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS quote_group_id UUID;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS include_in_fee BOOLEAN DEFAULT true;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 5. 데이터 마이그레이션 (가장 단순하게)
DO $$
DECLARE
    quote_rec RECORD;
    group_id UUID;
    item_rec RECORD;
BEGIN
    -- 기존 데이터가 있으면 처리
    IF EXISTS (SELECT 1 FROM quote_items WHERE quote_id IS NOT NULL LIMIT 1) THEN
        
        FOR quote_rec IN SELECT DISTINCT quote_id FROM quote_items WHERE quote_id IS NOT NULL
        LOOP
            -- 기본 그룹 생성
            INSERT INTO quote_groups (quote_id, name)
            VALUES (quote_rec.quote_id, '기본 그룹')
            RETURNING id INTO group_id;
            
            -- items를 그룹에 연결
            UPDATE quote_items 
            SET quote_group_id = group_id, include_in_fee = true, sort_order = 0
            WHERE quote_id = quote_rec.quote_id AND quote_group_id IS NULL;
            
            -- 각 item에 기본 detail 생성
            FOR item_rec IN SELECT id FROM quote_items WHERE quote_group_id = group_id
            LOOP
                INSERT INTO quote_details (quote_item_id, name, sort_order) 
                VALUES (item_rec.id, '품목', 0);
            END LOOP;
        END LOOP;
    END IF;
END $$;

-- 6. 의존성 객체 삭제
DROP POLICY IF EXISTS quote_items_access ON quote_items;
DROP POLICY IF EXISTS quote_items_select ON quote_items;
DROP POLICY IF EXISTS quote_items_insert ON quote_items;
DROP POLICY IF EXISTS quote_items_update ON quote_items;
DROP POLICY IF EXISTS quote_items_delete ON quote_items;
DROP VIEW IF EXISTS quote_summary;

-- 7. 불필요한 컬럼 제거
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_items' AND column_name = 'quote_id') THEN
        ALTER TABLE quote_items DROP COLUMN quote_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_items' AND column_name = 'name') THEN
        ALTER TABLE quote_items DROP COLUMN name;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_items' AND column_name = 'description') THEN
        ALTER TABLE quote_items DROP COLUMN description;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_items' AND column_name = 'quantity') THEN
        ALTER TABLE quote_items DROP COLUMN quantity;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_items' AND column_name = 'days') THEN
        ALTER TABLE quote_items DROP COLUMN days;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_items' AND column_name = 'unit') THEN
        ALTER TABLE quote_items DROP COLUMN unit;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_items' AND column_name = 'unit_price') THEN
        ALTER TABLE quote_items DROP COLUMN unit_price;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_items' AND column_name = 'cost_price') THEN
        ALTER TABLE quote_items DROP COLUMN cost_price;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_items' AND column_name = 'supplier_id') THEN
        ALTER TABLE quote_items DROP COLUMN supplier_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_items' AND column_name = 'supplier_name') THEN
        ALTER TABLE quote_items DROP COLUMN supplier_name;
    END IF;
END $$;

-- 8. RLS 정책 설정
ALTER TABLE quote_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_groups_select" ON quote_groups FOR SELECT USING (true);
CREATE POLICY "quote_groups_insert" ON quote_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "quote_groups_update" ON quote_groups FOR UPDATE USING (true);
CREATE POLICY "quote_groups_delete" ON quote_groups FOR DELETE USING (true);

CREATE POLICY "quote_details_select" ON quote_details FOR SELECT USING (true);
CREATE POLICY "quote_details_insert" ON quote_details FOR INSERT WITH CHECK (true);
CREATE POLICY "quote_details_update" ON quote_details FOR UPDATE USING (true);
CREATE POLICY "quote_details_delete" ON quote_details FOR DELETE USING (true);

CREATE POLICY "quote_items_select" ON quote_items FOR SELECT USING (true);
CREATE POLICY "quote_items_insert" ON quote_items FOR INSERT WITH CHECK (true);
CREATE POLICY "quote_items_update" ON quote_items FOR UPDATE USING (true);
CREATE POLICY "quote_items_delete" ON quote_items FOR DELETE USING (true);

-- 9. 기본 뷰 재생성 (단순하게)
CREATE OR REPLACE VIEW quote_summary AS
SELECT 
    q.id,
    q.quote_number,
    COALESCE(q.project_title, q.title, '') as title,
    q.client_id,
    COALESCE(c.name, q.customer_name_snapshot, '') as client_name,
    q.status,
    COALESCE(q.issue_date, q.quote_date) as quote_date,
    q.valid_until,
    q.total_amount,
    0 as item_count,  -- 단순화
    q.total_amount as calculated_total,
    q.created_by,
    COALESCE(p.full_name, p.email, '') as created_by_name,
    q.created_at
FROM quotes q
LEFT JOIN clients c ON q.client_id = c.id
LEFT JOIN profiles p ON q.created_by = p.id
WHERE q.is_active = true;

-- 10. 기본 인덱스
CREATE INDEX IF NOT EXISTS idx_quote_groups_quote_id ON quote_groups(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_group_id ON quote_items(quote_group_id);
CREATE INDEX IF NOT EXISTS idx_quote_details_item_id ON quote_details(quote_item_id);