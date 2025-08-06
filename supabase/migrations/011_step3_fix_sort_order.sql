-- 3단계 수정: sort_order 컬럼이 확실히 추가되도록

-- 1. sort_order 컬럼 추가 확인
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 2. 컬럼이 제대로 추가되었는지 확인용 쿼리 (주석으로 제공)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'quote_items' AND column_name = 'sort_order';

-- 3. 기존 데이터에 sort_order 값 설정
UPDATE quote_items SET sort_order = 0 WHERE sort_order IS NULL;