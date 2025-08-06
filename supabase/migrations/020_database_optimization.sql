-- 4단계 견적서 구조 데이터베이스 최적화 및 정리

-- 1. 성능 최적화: 필수 인덱스 생성
-- 외래키 컬럼들에 인덱스 생성 (성능 향상을 위해)

-- quote_groups 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_quote_groups_quote_id 
ON quote_groups(quote_id);

CREATE INDEX IF NOT EXISTS idx_quote_groups_sort_order 
ON quote_groups(quote_id, sort_order);

-- quote_items_motionsense 테이블 인덱스  
CREATE INDEX IF NOT EXISTS idx_quote_items_motionsense_quote_group_id 
ON quote_items_motionsense(quote_group_id);

CREATE INDEX IF NOT EXISTS idx_quote_items_motionsense_sort_order 
ON quote_items_motionsense(quote_group_id, sort_order);

-- quote_details 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_quote_details_quote_item_id 
ON quote_details(quote_item_id);

CREATE INDEX IF NOT EXISTS idx_quote_details_master_item 
ON quote_details(master_item_id) WHERE master_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quote_details_supplier 
ON quote_details(supplier_id) WHERE supplier_id IS NOT NULL;

-- quotes 테이블 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_quotes_client_status 
ON quotes(client_id, status) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_quotes_issue_date 
ON quotes(issue_date DESC) WHERE is_active = true;

-- 2. 불필요한 테이블 정리 (백업 및 마이그레이션 잔여물)
-- 주의: 데이터 백업 후 실행하는 것을 권장

-- quote_items 테이블 삭제 (quote_items_motionsense가 실제 4단계 구조)
DROP TABLE IF EXISTS quote_items CASCADE;

-- 백업 테이블들 정리
DROP TABLE IF EXISTS quote_items_backup CASCADE;

-- 임시 뷰나 함수 정리
DROP VIEW IF EXISTS quote_summary_old CASCADE;
DROP FUNCTION IF EXISTS calculate_quote_total_old CASCADE;

-- 3. 4단계 구조 전용 함수 최적화
CREATE OR REPLACE FUNCTION calculate_quote_total_4tier_optimized(quote_id_param UUID)
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
    total_subtotal NUMERIC := 0;
    total_fee_applicable NUMERIC := 0;
    total_fee_excluded NUMERIC := 0;
    total_cost_amount NUMERIC := 0;
    total_agency_fee NUMERIC := 0;
    total_discount NUMERIC := 0;
    total_vat NUMERIC := 0;
    total_final NUMERIC := 0;
    total_profit_amount NUMERIC := 0;
    profit_margin NUMERIC := 0;
BEGIN
    -- 견적서 기본 정보 가져오기
    SELECT * INTO quote_rec FROM quotes WHERE id = quote_id_param;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- 4단계 구조로 최적화된 계산 (단일 쿼리로 처리)
    SELECT 
        COALESCE(SUM(
            CASE WHEN qg.include_in_fee AND qi.include_in_fee 
                 THEN qd.quantity * qd.days * qd.unit_price 
                 ELSE 0 
            END
        ), 0),
        COALESCE(SUM(
            CASE WHEN NOT (qg.include_in_fee AND qi.include_in_fee) 
                 THEN qd.quantity * qd.days * qd.unit_price 
                 ELSE 0 
            END
        ), 0),
        COALESCE(SUM(qd.quantity * qd.days * qd.unit_price), 0),
        COALESCE(SUM(qd.quantity * qd.days * COALESCE(qd.cost_price, 0)), 0)
    INTO total_fee_applicable, total_fee_excluded, total_subtotal, total_cost_amount
    FROM quote_groups qg
    JOIN quote_items_motionsense qi ON qg.id = qi.quote_group_id
    JOIN quote_details qd ON qi.id = qd.quote_item_id
    WHERE qg.quote_id = quote_id_param;
    
    -- 수수료, 할인, VAT 계산
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
    profit_margin := CASE WHEN total_final > 0 THEN (total_profit_amount / total_final) * 100 ELSE 0 END;
    
    -- 결과 반환
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

-- 4. 4단계 구조 전용 뷰 최적화
CREATE OR REPLACE VIEW quote_4tier_summary AS
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
    COUNT(DISTINCT qg.id) as group_count,
    COUNT(DISTINCT qi.id) as item_count,
    COUNT(qd.id) as detail_count,
    q.created_by,
    COALESCE(p.full_name, p.email, '') as created_by_name,
    q.created_at,
    q.updated_at
FROM quotes q
LEFT JOIN clients c ON q.client_id = c.id
LEFT JOIN profiles p ON q.created_by = p.id
LEFT JOIN quote_groups qg ON q.id = qg.quote_id
LEFT JOIN quote_items_motionsense qi ON qg.id = qi.quote_group_id  
LEFT JOIN quote_details qd ON qi.id = qd.quote_item_id
WHERE q.is_active = true
GROUP BY q.id, c.name, p.full_name, p.email
ORDER BY q.created_at DESC;

-- 5. 트리거 함수 최적화 (updated_at 자동 업데이트)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성 (없는 경우에만)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quote_groups_updated_at') THEN
        CREATE TRIGGER update_quote_groups_updated_at 
            BEFORE UPDATE ON quote_groups
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quote_items_motionsense_updated_at') THEN
        CREATE TRIGGER update_quote_items_motionsense_updated_at 
            BEFORE UPDATE ON quote_items_motionsense
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quote_details_updated_at') THEN
        CREATE TRIGGER update_quote_details_updated_at 
            BEFORE UPDATE ON quote_details
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 6. 데이터베이스 통계 업데이트 (성능 최적화)
ANALYZE quotes;
ANALYZE quote_groups;
ANALYZE quote_items_motionsense;
ANALYZE quote_details;

-- 7. 최종 확인 쿼리
SELECT 
    'Optimization Complete' as status,
    'Tables: ' || COUNT(CASE WHEN table_name IN ('quotes', 'quote_groups', 'quote_items_motionsense', 'quote_details') THEN 1 END) as core_tables,
    'Indexes: ' || COUNT(CASE WHEN tablename IN ('quotes', 'quote_groups', 'quote_items_motionsense', 'quote_details') THEN 1 END) as total_indexes
FROM information_schema.tables t
CROSS JOIN pg_indexes i
WHERE t.table_schema = 'public' AND i.schemaname = 'public';

-- 8. 성능 테스트 쿼리 (옵션)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT q.*, calc.*
FROM quotes q
CROSS JOIN LATERAL calculate_quote_total_4tier_optimized(q.id) calc
WHERE q.project_title = '4단계 구조 테스트 견적서';

SELECT '✅ 데이터베이스 최적화 완료' as message;