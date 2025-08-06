-- 4단계 견적서 구조 테이블들의 RLS 비활성화

-- RLS 정책들 삭제
DROP POLICY IF EXISTS "Enable all for authenticated users" ON quote_details;
DROP POLICY IF EXISTS "quote_details_select" ON quote_details;
DROP POLICY IF EXISTS "quote_details_insert" ON quote_details;
DROP POLICY IF EXISTS "quote_details_update" ON quote_details;
DROP POLICY IF EXISTS "quote_details_delete" ON quote_details;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON quote_groups;
DROP POLICY IF EXISTS "quote_groups_select" ON quote_groups;
DROP POLICY IF EXISTS "quote_groups_insert" ON quote_groups;
DROP POLICY IF EXISTS "quote_groups_update" ON quote_groups;
DROP POLICY IF EXISTS "quote_groups_delete" ON quote_groups;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON quote_items;
DROP POLICY IF EXISTS "Users can manage quote items" ON quote_items;
DROP POLICY IF EXISTS "Users can view all quote items" ON quote_items;
DROP POLICY IF EXISTS "quote_items_select" ON quote_items;
DROP POLICY IF EXISTS "quote_items_insert" ON quote_items;
DROP POLICY IF EXISTS "quote_items_update" ON quote_items;
DROP POLICY IF EXISTS "quote_items_delete" ON quote_items;

DROP POLICY IF EXISTS "quotes_select" ON quotes;
DROP POLICY IF EXISTS "quotes_insert" ON quotes;
DROP POLICY IF EXISTS "quotes_update" ON quotes;
DROP POLICY IF EXISTS "quotes_delete" ON quotes;

-- RLS 비활성화
ALTER TABLE quote_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE quote_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes DISABLE ROW LEVEL SECURITY;

-- 확인용 메시지
SELECT 'RLS가 모든 4단계 구조 테이블에서 비활성화되었습니다.' as message;