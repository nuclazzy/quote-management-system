-- 4단계 구조 복원 - 1단계: 백업 및 기본 테이블 생성

-- 1. 백업
CREATE TABLE IF NOT EXISTS quote_items_backup AS SELECT * FROM quote_items;

-- 2. quote_groups 테이블 생성
CREATE TABLE IF NOT EXISTS quote_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    include_in_fee BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. quote_details 테이블 생성  
CREATE TABLE IF NOT EXISTS quote_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_item_id UUID NOT NULL REFERENCES quote_items(id) ON DELETE CASCADE,
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

-- 4. quote_items에 기본 컬럼 추가
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS quote_group_id UUID;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS include_in_fee BOOLEAN DEFAULT true;