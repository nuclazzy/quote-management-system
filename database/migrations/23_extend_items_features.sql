-- 품목관리 기능 확장 - 누락 기능 추가
-- 2024-12-19

-- 1. items 테이블에 누락된 필드 추가
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'product' CHECK (item_type IN ('product', 'service')),
ADD COLUMN IF NOT EXISTS barcode VARCHAR(200),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 기존 category 필드를 category_id로 변경 (이미 존재할 수 있으므로 안전하게 처리)
DO $$ 
BEGIN
  -- category_id 컬럼이 없으면 추가
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='category_id') THEN
    ALTER TABLE items ADD COLUMN category_id UUID REFERENCES item_categories(id);
  END IF;
END $$;

-- 2. 품목 즐겨찾기 테이블 생성
CREATE TABLE IF NOT EXISTS item_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  item_id UUID NOT NULL REFERENCES items(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- 3. 품목 가격 이력 테이블 생성
CREATE TABLE IF NOT EXISTS item_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id),
  old_price DECIMAL(12,2) NOT NULL,
  new_price DECIMAL(12,2) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 품목 사용 통계 뷰 생성
CREATE OR REPLACE VIEW item_usage_stats AS
SELECT 
  i.id,
  i.name,
  i.sku,
  COUNT(qi.id) as quote_count,
  COUNT(DISTINCT q.id) as unique_quotes,
  SUM(qi.quantity) as total_quantity_used,
  AVG(qi.unit_price) as avg_selling_price,
  MAX(qi.created_at) as last_used_at
FROM items i
LEFT JOIN quote_items qi ON i.id = qi.item_id
LEFT JOIN quotes q ON qi.quote_id = q.id
WHERE i.is_active = true
GROUP BY i.id, i.name, i.sku;

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_item_favorites_user_id ON item_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_item_favorites_item_id ON item_favorites(item_id);
CREATE INDEX IF NOT EXISTS idx_item_price_history_item_id ON item_price_history(item_id);
CREATE INDEX IF NOT EXISTS idx_item_price_history_changed_at ON item_price_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_items_item_type ON items(item_type);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode);
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);

-- 6. RLS 정책 설정
ALTER TABLE item_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_price_history ENABLE ROW LEVEL SECURITY;

-- item_favorites RLS 정책
DROP POLICY IF EXISTS "Users can view their own favorites" ON item_favorites;
CREATE POLICY "Users can view their own favorites" ON item_favorites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own favorites" ON item_favorites;
CREATE POLICY "Users can insert their own favorites" ON item_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own favorites" ON item_favorites;
CREATE POLICY "Users can delete their own favorites" ON item_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- item_price_history RLS 정책 (모든 사용자가 조회 가능, 삽입은 시스템에서만)
DROP POLICY IF EXISTS "Users can view price history" ON item_price_history;
CREATE POLICY "Users can view price history" ON item_price_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert price history" ON item_price_history;
CREATE POLICY "Authenticated users can insert price history" ON item_price_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 7. 가격 변경 트리거 함수 생성
CREATE OR REPLACE FUNCTION record_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- 가격이 변경된 경우에만 기록
  IF OLD.unit_price != NEW.unit_price THEN
    INSERT INTO item_price_history (
      item_id, 
      old_price, 
      new_price, 
      changed_by,
      change_reason
    ) VALUES (
      NEW.id, 
      OLD.unit_price, 
      NEW.unit_price, 
      auth.uid(),
      CASE 
        WHEN NEW.updated_by IS NOT NULL THEN '관리자에 의한 가격 수정'
        ELSE '가격 변경'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. 가격 변경 트리거 생성
DROP TRIGGER IF EXISTS items_price_change_trigger ON items;
CREATE TRIGGER items_price_change_trigger
  AFTER UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION record_price_change();

-- 9. 기존 데이터 정리 (필요한 경우)
-- user_id가 없는 기존 items에 기본값 설정 (첫 번째 사용자로 설정)
UPDATE items 
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL;

-- category가 텍스트인 경우 category_id로 매핑 (기존 카테고리 이름을 찾아서 ID로 변환)
UPDATE items 
SET category_id = (
  SELECT ic.id 
  FROM item_categories ic 
  WHERE ic.name = items.category 
  LIMIT 1
)
WHERE category_id IS NULL 
  AND category IS NOT NULL 
  AND EXISTS (SELECT 1 FROM item_categories ic WHERE ic.name = items.category);

-- 카테고리를 찾을 수 없는 경우 기본 카테고리 생성 후 할당
DO $$
DECLARE
  default_category_id UUID;
BEGIN
  -- 기본 카테고리가 없으면 생성
  INSERT INTO item_categories (name, description, created_by, updated_by)
  VALUES ('기타', '분류되지 않은 품목', 
          (SELECT id FROM auth.users LIMIT 1),
          (SELECT id FROM auth.users LIMIT 1))
  ON CONFLICT (name) DO NOTHING
  RETURNING id INTO default_category_id;
  
  -- 기본 카테고리 ID 조회
  IF default_category_id IS NULL THEN
    SELECT id INTO default_category_id FROM item_categories WHERE name = '기타' LIMIT 1;
  END IF;
  
  -- category_id가 여전히 NULL인 항목들을 기본 카테고리로 설정
  UPDATE items 
  SET category_id = default_category_id
  WHERE category_id IS NULL;
END $$;

-- 10. 필수 필드 제약조건 추가 (안전하게)
DO $$
BEGIN
  -- user_id NOT NULL 제약조건 추가
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE table_name = 'items' AND constraint_name = 'items_user_id_not_null') THEN
    ALTER TABLE items ALTER COLUMN user_id SET NOT NULL;
  END IF;
  
  -- category_id NOT NULL 제약조건 추가
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE table_name = 'items' AND constraint_name = 'items_category_id_not_null') THEN
    ALTER TABLE items ALTER COLUMN category_id SET NOT NULL;
  END IF;
END $$;