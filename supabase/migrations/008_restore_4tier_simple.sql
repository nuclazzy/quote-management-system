-- 4단계 견적서 구조 복원 마이그레이션 (단순 버전)
-- quotes → quote_groups → quote_items → quote_details

-- 1. 기존 테이블 백업
CREATE TABLE IF NOT EXISTS quote_items_backup AS SELECT * FROM quote_items;

-- 2. 새 테이블들 생성
CREATE TABLE IF NOT EXISTS quote_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    include_in_fee BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_item_id UUID NOT NULL REFERENCES quote_items(id) ON DELETE CASCADE,
    
    -- 스냅샷 데이터
    name TEXT NOT NULL,
    description TEXT,
    quantity NUMERIC DEFAULT 1,
    days NUMERIC DEFAULT 1,
    unit TEXT DEFAULT '개',
    unit_price NUMERIC DEFAULT 0,
    is_service BOOLEAN DEFAULT false,
    cost_price NUMERIC DEFAULT 0,
    supplier_id UUID REFERENCES suppliers(id),
    supplier_name_snapshot TEXT,
    master_item_id UUID REFERENCES items(id),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. quote_items 테이블에 필요한 컬럼만 추가 (sort_order 제외)
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS quote_group_id UUID REFERENCES quote_groups(id);
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS include_in_fee BOOLEAN DEFAULT true;

-- 4. 기존 데이터 마이그레이션 (sort_order 없이)
DO $$
DECLARE
    quote_rec RECORD;
    group_id UUID;
    item_rec RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM quote_items WHERE quote_id IS NOT NULL LIMIT 1) THEN
        FOR quote_rec IN SELECT DISTINCT quote_id FROM quote_items WHERE quote_id IS NOT NULL
        LOOP
            -- 기본 그룹 생성
            INSERT INTO quote_groups (quote_id, name, sort_order, include_in_fee)
            VALUES (quote_rec.quote_id, '기본 그룹', 0, true)
            RETURNING id INTO group_id;
            
            -- items를 새 그룹에 연결
            UPDATE quote_items 
            SET quote_group_id = group_id, include_in_fee = true
            WHERE quote_id = quote_rec.quote_id AND quote_group_id IS NULL;
            
            -- 기본 detail 데이터 생성
            FOR item_rec IN SELECT id FROM quote_items WHERE quote_group_id = group_id
            LOOP
                INSERT INTO quote_details (
                    quote_item_id, name, description, quantity, days, 
                    unit, unit_price, cost_price, sort_order
                ) VALUES (
                    item_rec.id, '품목', '', 1, 1, '개', 0, 0, 0
                );
            END LOOP;
        END LOOP;
    END IF;
END $$;

-- 5. 의존성 객체 삭제
DO $$
BEGIN
    DROP POLICY IF EXISTS quote_items_access ON quote_items;
    DROP POLICY IF EXISTS quote_items_select ON quote_items;
    DROP POLICY IF EXISTS quote_items_insert ON quote_items;
    DROP POLICY IF EXISTS quote_items_update ON quote_items;
    DROP POLICY IF EXISTS quote_items_delete ON quote_items;
    DROP VIEW IF EXISTS quote_summary;
END $$;

-- 6. 불필요한 컬럼 제거 (존재하는 경우에만)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_items' AND column_name = 'quote_id') THEN
        ALTER TABLE quote_items DROP COLUMN quote_id;
    END IF;
    
    -- 다른 컬럼들도 안전하게 제거
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

-- 7. 이제 sort_order 컬럼 추가
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 8. NOT NULL 제약 조건
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM quote_items WHERE quote_group_id IS NOT NULL LIMIT 1) THEN
        ALTER TABLE quote_items ALTER COLUMN quote_group_id SET NOT NULL;
    END IF;
END $$;

-- 9. RLS 정책 설정
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

-- 10. 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quote_groups_updated_at BEFORE UPDATE ON quote_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_details_updated_at BEFORE UPDATE ON quote_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. quote_items RLS 정책 재생성
CREATE POLICY "quote_items_select" ON quote_items FOR SELECT USING (true);
CREATE POLICY "quote_items_insert" ON quote_items FOR INSERT WITH CHECK (true);
CREATE POLICY "quote_items_update" ON quote_items FOR UPDATE USING (true);
CREATE POLICY "quote_items_delete" ON quote_items FOR DELETE USING (true);

-- 12. quote_summary 뷰 재생성
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
    (
        SELECT COUNT(*)
        FROM quote_groups qg
        JOIN quote_items qi ON qg.id = qi.quote_group_id
        JOIN quote_details qd ON qi.id = qd.quote_item_id
        WHERE qg.quote_id = q.id
    ) as item_count,
    q.total_amount as calculated_total,
    q.created_by,
    COALESCE(p.full_name, p.email, '') as created_by_name,
    q.created_at
FROM quotes q
LEFT JOIN clients c ON q.client_id = c.id
LEFT JOIN profiles p ON q.created_by = p.id
WHERE q.is_active = true;

-- 13. 계산 함수 생성 (sort_order 사용)
CREATE OR REPLACE FUNCTION calculate_quote_total_4tier(quote_id_param UUID)
RETURNS TABLE (
    subtotal NUMERIC,
    fee_applicable_amount NUMERIC,
    fee_excluded_amount NUMERIC,
    agency_fee NUMERIC,
    discount_amount NUMERIC,
    vat_amount NUMERIC,
    final_total NUMERIC,
    total_cost NUMERIC,
    total_profit NUMERIC,
    profit_margin_percentage NUMERIC
) AS $$
DECLARE
    quote_rec RECORD;
    group_rec RECORD;
    item_rec RECORD;
    detail_rec RECORD;
    group_subtotal NUMERIC;
    item_subtotal NUMERIC;
    detail_subtotal NUMERIC;
    
    total_subtotal NUMERIC := 0;
    total_fee_applicable NUMERIC := 0;
    total_fee_excluded NUMERIC := 0;
    total_agency_fee NUMERIC := 0;
    total_discount NUMERIC := 0;
    total_vat NUMERIC := 0;
    total_final NUMERIC := 0;
    total_cost_amount NUMERIC := 0;
    total_profit_amount NUMERIC := 0;
    profit_margin NUMERIC := 0;
BEGIN
    SELECT * INTO quote_rec FROM quotes WHERE id = quote_id_param;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    FOR group_rec IN 
        SELECT g.*, g.include_in_fee as group_include_fee
        FROM quote_groups g 
        WHERE g.quote_id = quote_id_param 
        ORDER BY g.sort_order
    LOOP
        group_subtotal := 0;
        
        FOR item_rec IN 
            SELECT i.*, i.include_in_fee as item_include_fee
            FROM quote_items i 
            WHERE i.quote_group_id = group_rec.id 
            ORDER BY i.sort_order
        LOOP
            item_subtotal := 0;
            
            FOR detail_rec IN 
                SELECT d.*
                FROM quote_details d 
                WHERE d.quote_item_id = item_rec.id 
                ORDER BY d.sort_order
            LOOP
                detail_subtotal := detail_rec.quantity * detail_rec.days * detail_rec.unit_price;
                item_subtotal := item_subtotal + detail_subtotal;
                total_cost_amount := total_cost_amount + (detail_rec.quantity * detail_rec.days * COALESCE(detail_rec.cost_price, 0));
            END LOOP;
            
            group_subtotal := group_subtotal + item_subtotal;
        END LOOP;
        
        total_subtotal := total_subtotal + group_subtotal;
        
        IF group_rec.group_include_fee THEN
            total_fee_applicable := total_fee_applicable + group_subtotal;
        ELSE
            total_fee_excluded := total_fee_excluded + group_subtotal;
        END IF;
    END LOOP;
    
    total_agency_fee := total_fee_applicable * COALESCE(quote_rec.agency_fee_rate, 0);
    total_discount := COALESCE(quote_rec.discount_amount, 0);
    
    IF quote_rec.vat_type = 'exclusive' THEN
        total_vat := (total_subtotal + total_agency_fee - total_discount) * 0.1;
        total_final := total_subtotal + total_agency_fee - total_discount + total_vat;
    ELSE
        total_final := total_subtotal + total_agency_fee - total_discount;
        total_vat := total_final * 0.1 / 1.1;
    END IF;
    
    total_profit_amount := total_final - total_cost_amount;
    
    IF total_final > 0 THEN
        profit_margin := (total_profit_amount / total_final) * 100;
    END IF;
    
    subtotal := total_subtotal;
    fee_applicable_amount := total_fee_applicable;
    fee_excluded_amount := total_fee_excluded;
    agency_fee := total_agency_fee;
    discount_amount := total_discount;
    vat_amount := total_vat;
    final_total := total_final;
    total_cost := total_cost_amount;
    total_profit := total_profit_amount;
    profit_margin_percentage := profit_margin;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 14. 인덱스 생성 (마지막)
CREATE INDEX IF NOT EXISTS idx_quote_groups_quote_id ON quote_groups(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_groups_sort_order ON quote_groups(quote_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_quote_items_group_id ON quote_items(quote_group_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_sort_order ON quote_items(quote_group_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_quote_details_item_id ON quote_details(quote_item_id);
CREATE INDEX IF NOT EXISTS idx_quote_details_sort_order ON quote_details(quote_item_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_quote_details_master_item ON quote_details(master_item_id);