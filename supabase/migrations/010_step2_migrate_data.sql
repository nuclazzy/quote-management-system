-- 4단계 구조 복원 - 2단계: 데이터 마이그레이션

-- 1. 외래키 제약 조건 추가
ALTER TABLE quote_items ADD CONSTRAINT fk_quote_items_quote_group_id 
    FOREIGN KEY (quote_group_id) REFERENCES quote_groups(id);

-- 2. 기본 데이터 마이그레이션
DO $$
DECLARE
    quote_rec RECORD;
    group_id UUID;
    item_rec RECORD;
BEGIN
    -- quote_items에 기존 데이터가 있으면 처리
    IF EXISTS (SELECT 1 FROM quote_items WHERE quote_id IS NOT NULL LIMIT 1) THEN
        
        -- 각 견적서별로 기본 그룹 생성
        FOR quote_rec IN SELECT DISTINCT quote_id FROM quote_items WHERE quote_id IS NOT NULL
        LOOP
            -- 기본 그룹 생성 (명시적 컬럼 지정)
            INSERT INTO quote_groups (quote_id, name, sort_order, include_in_fee)
            VALUES (quote_rec.quote_id, '기본 그룹', 0, true)
            RETURNING id INTO group_id;
            
            -- 해당 견적서의 모든 items를 새 그룹에 연결
            UPDATE quote_items 
            SET quote_group_id = group_id, include_in_fee = true
            WHERE quote_id = quote_rec.quote_id AND quote_group_id IS NULL;
            
            -- 각 item에 대해 기본 detail 생성
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