-- 4단계 견적서 구조 완성 후 최종 정리
-- RLS 정책 완전 비활성화 및 데이터베이스 최적화

-- 1. 모든 RLS 정책 비활성화 (사용자 요청사항)
DO $$
DECLARE
    table_record RECORD;
    policy_record RECORD;
BEGIN
    -- 4단계 구조 관련 테이블들의 RLS 비활성화
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('quotes', 'quote_groups', 'quote_items_motionsense', 'quote_details', 
                          'master_items', 'quote_templates', 'projects_motionsense', 
                          'transactions_motionsense', 'project_expenses', 'clients', 'suppliers')
    LOOP
        -- 기존 정책 삭제
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = table_record.table_name
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, table_record.table_name);
        END LOOP;
        
        -- RLS 비활성화
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_record.table_name);
        
        RAISE NOTICE 'RLS disabled for table: %', table_record.table_name;
    END LOOP;
END $$;

-- 2. 성능 최적화를 위한 필수 인덱스 생성
-- (020_database_optimization.sql의 핵심 인덱스들만 추출)

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

-- quotes 테이블 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_quotes_client_status 
ON quotes(client_id, status) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_quotes_issue_date 
ON quotes(issue_date DESC) WHERE is_active = true;

-- master_items 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_master_items_category_active
ON master_items(category_id, is_active) WHERE is_active = true;

-- 3. 4단계 구조 전용 최적화 함수 (단순화 버전)
CREATE OR REPLACE FUNCTION calculate_quote_total_4tier_simple(quote_id_param UUID)
RETURNS TABLE (
    subtotal NUMERIC,
    agency_fee NUMERIC,
    discount_amount NUMERIC,
    vat_amount NUMERIC,
    final_total NUMERIC
) AS $$
DECLARE
    quote_rec RECORD;
    total_subtotal NUMERIC := 0;
    total_agency_fee NUMERIC := 0;
    total_discount NUMERIC := 0;
    total_vat NUMERIC := 0;
    total_final NUMERIC := 0;
BEGIN
    -- 견적서 기본 정보 가져오기
    SELECT * INTO quote_rec FROM quotes WHERE id = quote_id_param;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- 4단계 구조에서 총액 계산 (단일 쿼리)
    SELECT COALESCE(SUM(qd.quantity * qd.days * qd.unit_price), 0)
    INTO total_subtotal
    FROM quote_groups qg
    JOIN quote_items_motionsense qi ON qg.id = qi.quote_group_id
    JOIN quote_details qd ON qi.id = qd.quote_item_id
    WHERE qg.quote_id = quote_id_param;
    
    -- 수수료, 할인, VAT 계산
    total_agency_fee := total_subtotal * COALESCE(quote_rec.agency_fee_rate, 0);
    total_discount := COALESCE(quote_rec.discount_amount, 0);
    
    IF quote_rec.vat_type = 'exclusive' THEN
        total_vat := (total_subtotal + total_agency_fee - total_discount) * 0.1;
        total_final := total_subtotal + total_agency_fee - total_discount + total_vat;
    ELSE
        total_final := total_subtotal + total_agency_fee - total_discount;
        total_vat := total_final * 0.1 / 1.1;
    END IF;
    
    -- 결과 반환
    subtotal := total_subtotal;
    agency_fee := total_agency_fee;
    discount_amount := total_discount;
    vat_amount := total_vat;
    final_total := total_final;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 4. 4단계 구조 전용 요약 뷰 (RLS 없는 버전)
CREATE OR REPLACE VIEW quote_4tier_summary_no_rls AS
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
    q.created_at,
    q.updated_at
FROM quotes q
LEFT JOIN clients c ON q.client_id = c.id
LEFT JOIN quote_groups qg ON q.id = qg.quote_id
LEFT JOIN quote_items_motionsense qi ON qg.id = qi.quote_group_id  
LEFT JOIN quote_details qd ON qi.id = qd.quote_item_id
WHERE q.is_active = true
GROUP BY q.id, c.name
ORDER BY q.created_at DESC;

-- 5. 불필요한 테이블 정리 (백업 확인 후)
-- 주의: 실제 운영에서는 데이터 백업 후 실행 권장

-- quote_items 테이블 확인 (quote_items_motionsense가 실제 구조)
DO $$
BEGIN
    -- quote_items 테이블이 존재하고 quote_items_motionsense도 존재하는 경우
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'quote_items') 
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'quote_items_motionsense') THEN
        
        -- 데이터가 비어있는 경우에만 삭제 (안전장치)
        IF (SELECT COUNT(*) FROM quote_items) = 0 THEN
            DROP TABLE quote_items CASCADE;
            RAISE NOTICE 'Dropped empty quote_items table';
        ELSE
            RAISE NOTICE 'quote_items table has data - manual review required';
        END IF;
    END IF;
    
    -- backup 테이블들 정리 (데이터가 없는 경우에만)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'quote_items_backup') THEN
        IF (SELECT COUNT(*) FROM quote_items_backup) = 0 THEN
            DROP TABLE quote_items_backup CASCADE;
            RAISE NOTICE 'Dropped empty quote_items_backup table';
        ELSE
            RAISE NOTICE 'quote_items_backup table has data - manual review required';
        END IF;
    END IF;
END $$;

-- 6. 트리거 및 함수 정리
-- updated_at 자동 업데이트 트리거 함수 최적화
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 필요한 트리거들 생성 (중복 방지)
DO $$
BEGIN
    -- quote_groups
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quote_groups_updated_at') THEN
        CREATE TRIGGER update_quote_groups_updated_at 
            BEFORE UPDATE ON quote_groups
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- quote_items_motionsense
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quote_items_motionsense_updated_at') THEN
        CREATE TRIGGER update_quote_items_motionsense_updated_at 
            BEFORE UPDATE ON quote_items_motionsense
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- quote_details
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quote_details_updated_at') THEN
        CREATE TRIGGER update_quote_details_updated_at 
            BEFORE UPDATE ON quote_details
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- quotes (기존 트리거와 충돌하지 않도록)
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quotes_updated_at' AND tgrelid = 'quotes'::regclass) THEN
        CREATE TRIGGER update_quotes_updated_at 
            BEFORE UPDATE ON quotes
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 7. 데이터베이스 통계 업데이트 (쿼리 플래너 최적화)
ANALYZE quotes;
ANALYZE quote_groups;
ANALYZE quote_items_motionsense;
ANALYZE quote_details;
ANALYZE master_items;
ANALYZE clients;

-- 8. 최종 상태 확인
SELECT 
    '✅ RLS Policies Disabled' as status,
    'All RLS policies removed from 4-tier structure tables' as description

UNION ALL

SELECT 
    '✅ Performance Indexes Created' as status,
    'Essential indexes for foreign keys and queries added' as description

UNION ALL

SELECT 
    '✅ Optimized Functions Created' as status,
    'Simplified calculation functions without RLS complexity' as description

UNION ALL

SELECT 
    '✅ Database Statistics Updated' as status,
    'ANALYZE commands executed for query planner optimization' as description

UNION ALL

SELECT 
    '✅ 4-Tier Structure Ready' as status,
    'quotes → quote_groups → quote_items_motionsense → quote_details' as description;

-- 9. 4단계 구조 테스트 쿼리 (성능 검증)
SELECT 
    '=== 4-TIER STRUCTURE TEST ===' as test_section,
    '' as result;

-- 테스트 견적서가 있는 경우 구조 확인
SELECT 
    '4-Tier Test' as test_section,
    q.project_title,
    COUNT(DISTINCT qg.id) as groups,
    COUNT(DISTINCT qi.id) as items,
    COUNT(qd.id) as details,
    SUM(qd.quantity * qd.days * qd.unit_price) as calculated_total,
    '✅ Structure Complete' as result
FROM quotes q
LEFT JOIN quote_groups qg ON q.id = qg.quote_id
LEFT JOIN quote_items_motionsense qi ON qg.id = qi.quote_group_id
LEFT JOIN quote_details qd ON qi.id = qd.quote_item_id
WHERE q.project_title = '4단계 구조 테스트 견적서'
GROUP BY q.id, q.project_title
HAVING COUNT(DISTINCT qg.id) > 0 AND COUNT(DISTINCT qi.id) > 0 AND COUNT(qd.id) > 0;

SELECT '🎉 4단계 견적서 구조 최종 완성 및 RLS 비활성화 완료' as final_message;