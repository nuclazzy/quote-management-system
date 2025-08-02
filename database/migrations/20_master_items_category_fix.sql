-- ========================================
-- 마스터 품목 테이블 카테고리 필드 추가
-- 20_master_items_category_fix.sql
-- ========================================

-- master_items 테이블에 category 필드 추가
ALTER TABLE master_items 
ADD COLUMN category TEXT DEFAULT '기타';

-- quote_templates 테이블에 description과 category 필드 추가
ALTER TABLE quote_templates 
ADD COLUMN description TEXT,
ADD COLUMN category TEXT DEFAULT '기본';

-- 인덱스 추가
CREATE INDEX idx_master_items_category ON master_items(category);
CREATE INDEX idx_quote_templates_category ON quote_templates(category);

-- 코멘트 업데이트
COMMENT ON COLUMN master_items.category IS '품목 카테고리 (편집, 제작, 촬영 등)';
COMMENT ON COLUMN quote_templates.description IS '템플릿 설명';
COMMENT ON COLUMN quote_templates.category IS '템플릿 카테고리';