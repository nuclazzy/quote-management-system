-- 기존 구조에 관계없이 새로운 4단계 구조 생성

-- 1. 현재 quote_items 백업 (어떤 구조든 백업)
CREATE TABLE IF NOT EXISTS quote_items_backup AS SELECT * FROM quote_items;

-- 2. 새로운 4단계 구조 테이블들 생성
CREATE TABLE IF NOT EXISTS quote_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL,
    name TEXT NOT NULL DEFAULT '기본 그룹',
    sort_order INTEGER DEFAULT 0,
    include_in_fee BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. quote_details 테이블 (완전히 새로 생성)
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

-- 4. quote_items 테이블을 4단계 구조에 맞게 변경
-- 먼저 필요한 컬럼들을 추가
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS quote_group_id UUID;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS include_in_fee BOOLEAN DEFAULT true;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '품목';

-- 5. 기존 quotes 테이블과 연결을 위한 샘플 데이터 생성 (테스트용)
-- 실제 quotes 데이터가 있다면 해당 데이터에 연결
DO $$
DECLARE
    quote_rec RECORD;
    group_id UUID;
    item_id UUID;
BEGIN
    -- quotes 테이블에서 기존 데이터 확인
    IF EXISTS (SELECT 1 FROM quotes LIMIT 1) THEN
        
        -- 각 견적서에 대해 기본 구조 생성
        FOR quote_rec IN SELECT id FROM quotes LIMIT 5  -- 처음 5개만 테스트
        LOOP
            -- 기본 그룹 생성
            INSERT INTO quote_groups (quote_id, name, sort_order, include_in_fee)
            VALUES (quote_rec.id, '기본 그룹', 0, true)
            RETURNING id INTO group_id;
            
            -- quote_items가 비어있다면 기본 item 생성
            IF NOT EXISTS (SELECT 1 FROM quote_items LIMIT 1) THEN
                INSERT INTO quote_items (quote_group_id, name, include_in_fee, sort_order)
                VALUES (group_id, '기본 품목', true, 0)
                RETURNING id INTO item_id;
                
                -- 기본 detail 생성
                INSERT INTO quote_details (
                    quote_item_id, name, description, quantity, days, 
                    unit, unit_price, cost_price, sort_order
                ) VALUES (
                    item_id, '기본 세부내용', '4단계 구조 테스트', 1, 1, '개', 0, 0, 0
                );
            END IF;
        END LOOP;
    ELSE
        RAISE NOTICE '견적서 데이터가 없습니다. 4단계 구조만 생성되었습니다.';
    END IF;
END $$;

-- 6. RLS 정책 설정
ALTER TABLE quote_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "quote_groups_select" ON quote_groups FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "quote_groups_insert" ON quote_groups FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "quote_groups_update" ON quote_groups FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "quote_groups_delete" ON quote_groups FOR DELETE USING (true);

CREATE POLICY IF NOT EXISTS "quote_details_select" ON quote_details FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "quote_details_insert" ON quote_details FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "quote_details_update" ON quote_details FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "quote_details_delete" ON quote_details FOR DELETE USING (true);

-- 기존 quote_items 정책도 재생성
DROP POLICY IF EXISTS quote_items_select ON quote_items;
DROP POLICY IF EXISTS quote_items_insert ON quote_items;
DROP POLICY IF EXISTS quote_items_update ON quote_items;
DROP POLICY IF EXISTS quote_items_delete ON quote_items;

CREATE POLICY "quote_items_select" ON quote_items FOR SELECT USING (true);
CREATE POLICY "quote_items_insert" ON quote_items FOR INSERT WITH CHECK (true);
CREATE POLICY "quote_items_update" ON quote_items FOR UPDATE USING (true);
CREATE POLICY "quote_items_delete" ON quote_items FOR DELETE USING (true);

-- 7. 기본 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_quote_groups_quote_id ON quote_groups(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_group_id ON quote_items(quote_group_id);
CREATE INDEX IF NOT EXISTS idx_quote_details_item_id ON quote_details(quote_item_id);

-- 8. 확인용 뷰 생성
CREATE OR REPLACE VIEW quote_4tier_structure AS
SELECT 
    q.id as quote_id,
    q.quote_number,
    qg.id as group_id,
    qg.name as group_name,
    qi.id as item_id, 
    qi.name as item_name,
    qd.id as detail_id,
    qd.name as detail_name,
    qd.quantity,
    qd.unit_price
FROM quotes q
LEFT JOIN quote_groups qg ON q.id = qg.quote_id  
LEFT JOIN quote_items qi ON qg.id = qi.quote_group_id
LEFT JOIN quote_details qd ON qi.id = qd.quote_item_id
ORDER BY q.id, qg.sort_order, qi.sort_order, qd.sort_order;