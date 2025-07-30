-- 견적서 관리 시스템 핵심 비즈니스 스키마
-- 고객사, 공급업체, 품목, 견적서, 프로젝트 테이블 생성

-- 1. 고객사(클라이언트) 테이블
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  business_registration_number VARCHAR(50) UNIQUE,
  contact_person VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  postal_code VARCHAR(20),
  website VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- 2. 공급업체 테이블
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  business_registration_number VARCHAR(50) UNIQUE,
  contact_person VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  postal_code VARCHAR(20),
  website VARCHAR(255),
  payment_terms VARCHAR(100), -- 결제 조건
  lead_time_days INTEGER DEFAULT 0, -- 납기일수
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5), -- 품질 평가 (1-5)
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- 3. 품목 카테고리 테이블
CREATE TABLE IF NOT EXISTS item_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  parent_category_id UUID REFERENCES item_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id)
);

-- 4. 품목 테이블
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku VARCHAR(100) NOT NULL UNIQUE, -- Stock Keeping Unit
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES item_categories(id),
  supplier_id UUID REFERENCES suppliers(id),
  unit VARCHAR(50) NOT NULL DEFAULT '개', -- 단위 (개, kg, m, etc.)
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(15,2), -- 원가 (선택사항)
  stock_quantity INTEGER DEFAULT 0,
  minimum_stock INTEGER DEFAULT 0, -- 최소 재고 수준
  maximum_stock INTEGER, -- 최대 재고 수준
  specifications JSONB, -- 기술 사양 (JSON)
  image_urls TEXT[], -- 이미지 URL 배열
  barcode VARCHAR(100),
  weight DECIMAL(10,3), -- 무게 (kg)
  dimensions JSONB, -- 치수 정보 (JSON: {length, width, height})
  warranty_months INTEGER DEFAULT 0, -- 보증 기간 (개월)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- 5. 프로젝트 테이블
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  client_id UUID NOT NULL REFERENCES clients(id),
  project_manager_id UUID REFERENCES profiles(id),
  status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  budget_amount DECIMAL(15,2),
  actual_amount DECIMAL(15,2) DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- 6. 견적서 테이블
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_number VARCHAR(50) NOT NULL UNIQUE, -- 견적서 번호 (자동 생성)
  title VARCHAR(255) NOT NULL,
  description TEXT,
  client_id UUID NOT NULL REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  assigned_to UUID REFERENCES profiles(id), -- 담당자
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'expired')),
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE, -- 견적 유효기간
  subtotal_amount DECIMAL(15,2) NOT NULL DEFAULT 0, -- 소계
  tax_rate DECIMAL(5,4) DEFAULT 0.10, -- 세율 (기본 10%)
  tax_amount DECIMAL(15,2) DEFAULT 0, -- 세액
  discount_rate DECIMAL(5,4) DEFAULT 0, -- 할인율
  discount_amount DECIMAL(15,2) DEFAULT 0, -- 할인액
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0, -- 총액
  currency VARCHAR(3) DEFAULT 'KRW', -- 통화
  payment_terms TEXT, -- 결제 조건
  delivery_terms TEXT, -- 납기 조건
  special_terms TEXT, -- 특별 조건
  internal_notes TEXT, -- 내부 메모 (고객에게 보이지 않음)
  approval_requested_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES profiles(id),
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  version INTEGER DEFAULT 1, -- 버전 관리
  parent_quote_id UUID REFERENCES quotes(id), -- 원본 견적서 (수정시)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- 7. 견적서 품목 연결 테이블
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  item_name VARCHAR(255) NOT NULL, -- 견적서 작성 시점의 품목명 (스냅샷)
  item_description TEXT, -- 견적서 작성 시점의 품목 설명
  item_sku VARCHAR(100) NOT NULL, -- 견적서 작성 시점의 SKU
  quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(50) NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  discount_rate DECIMAL(5,4) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  line_total DECIMAL(15,2) NOT NULL, -- quantity * unit_price - discount_amount
  notes TEXT,
  sort_order INTEGER DEFAULT 0, -- 견적서 내 표시 순서
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 견적서 번호 시퀀스 관리 테이블
CREATE TABLE IF NOT EXISTS quote_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  sequence_number INTEGER NOT NULL DEFAULT 1,
  prefix VARCHAR(10) DEFAULT 'Q', -- 견적서 번호 접두사
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(year, month)
);

-- 9. 가격 이력 테이블 (품목 가격 변동 추적)
CREATE TABLE IF NOT EXISTS item_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  old_price DECIMAL(15,2),
  new_price DECIMAL(15,2) NOT NULL,
  change_reason VARCHAR(255),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id)
);

-- 10. 재고 이동 이력 테이블
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity DECIMAL(10,3) NOT NULL,
  previous_stock DECIMAL(10,3) NOT NULL,
  new_stock DECIMAL(10,3) NOT NULL,
  reference_type VARCHAR(50), -- 'quote', 'purchase', 'adjustment' etc.
  reference_id UUID, -- 관련 문서 ID
  reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_suppliers_created_by ON suppliers(created_by);

CREATE INDEX IF NOT EXISTS idx_item_categories_parent ON item_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_item_categories_active ON item_categories(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_supplier ON items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_items_active ON items(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_items_stock ON items(stock_quantity);

CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_manager ON projects(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_quotes_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_client ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_project ON quotes(project_id);
CREATE INDEX IF NOT EXISTS idx_quotes_assigned ON quotes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_date ON quotes(quote_date);
CREATE INDEX IF NOT EXISTS idx_quotes_active ON quotes(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_item ON quote_items(item_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_sort ON quote_items(quote_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_item_price_history_item ON item_price_history(item_id);
CREATE INDEX IF NOT EXISTS idx_item_price_history_date ON item_price_history(effective_date);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- RLS 정책 활성화
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성 (사용자는 자신이 접근 권한이 있는 데이터만 조회/수정 가능)

-- 고객사 정책
CREATE POLICY clients_access ON clients FOR ALL TO authenticated 
USING (
  -- 최고관리자는 모든 접근 가능
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  -- 권한 확인
  check_user_permission(auth.uid(), 'customers.view')
)
WITH CHECK (
  -- 최고관리자는 모든 수정 가능
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  -- 생성 권한 확인
  (TG_OP = 'INSERT' AND check_user_permission(auth.uid(), 'customers.create')) OR
  -- 수정 권한 확인
  (TG_OP = 'UPDATE' AND check_user_permission(auth.uid(), 'customers.edit')) OR
  -- 삭제 권한 확인
  (TG_OP = 'DELETE' AND check_user_permission(auth.uid(), 'customers.delete'))
);

-- 공급업체 정책
CREATE POLICY suppliers_access ON suppliers FOR ALL TO authenticated 
USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  check_user_permission(auth.uid(), 'suppliers.view')
)
WITH CHECK (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  (TG_OP = 'INSERT' AND check_user_permission(auth.uid(), 'suppliers.create')) OR
  (TG_OP = 'UPDATE' AND check_user_permission(auth.uid(), 'suppliers.edit')) OR
  (TG_OP = 'DELETE' AND check_user_permission(auth.uid(), 'suppliers.delete'))
);

-- 품목 카테고리 정책
CREATE POLICY item_categories_access ON item_categories FOR ALL TO authenticated 
USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  check_user_permission(auth.uid(), 'items.view')
)
WITH CHECK (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  (TG_OP = 'INSERT' AND check_user_permission(auth.uid(), 'items.create')) OR
  (TG_OP = 'UPDATE' AND check_user_permission(auth.uid(), 'items.edit')) OR
  (TG_OP = 'DELETE' AND check_user_permission(auth.uid(), 'items.delete'))
);

-- 품목 정책
CREATE POLICY items_access ON items FOR ALL TO authenticated 
USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  check_user_permission(auth.uid(), 'items.view')
)
WITH CHECK (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  (TG_OP = 'INSERT' AND check_user_permission(auth.uid(), 'items.create')) OR
  (TG_OP = 'UPDATE' AND check_user_permission(auth.uid(), 'items.edit')) OR
  (TG_OP = 'DELETE' AND check_user_permission(auth.uid(), 'items.delete'))
);

-- 프로젝트 정책
CREATE POLICY projects_access ON projects FOR ALL TO authenticated 
USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  check_user_permission(auth.uid(), 'quotes.view') OR
  project_manager_id = auth.uid()
)
WITH CHECK (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  (TG_OP = 'INSERT' AND check_user_permission(auth.uid(), 'quotes.create')) OR
  (TG_OP = 'UPDATE' AND (check_user_permission(auth.uid(), 'quotes.edit') OR project_manager_id = auth.uid())) OR
  (TG_OP = 'DELETE' AND check_user_permission(auth.uid(), 'quotes.delete'))
);

-- 견적서 정책
CREATE POLICY quotes_access ON quotes FOR ALL TO authenticated 
USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  check_user_permission(auth.uid(), 'quotes.view') OR
  assigned_to = auth.uid() OR
  created_by = auth.uid()
)
WITH CHECK (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  (TG_OP = 'INSERT' AND check_user_permission(auth.uid(), 'quotes.create')) OR
  (TG_OP = 'UPDATE' AND (check_user_permission(auth.uid(), 'quotes.edit') OR assigned_to = auth.uid() OR created_by = auth.uid())) OR
  (TG_OP = 'DELETE' AND check_user_permission(auth.uid(), 'quotes.delete'))
);

-- 견적서 품목 정책
CREATE POLICY quote_items_access ON quote_items FOR ALL TO authenticated 
USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  EXISTS(
    SELECT 1 FROM quotes q 
    WHERE q.id = quote_id 
    AND (
      check_user_permission(auth.uid(), 'quotes.view') OR
      q.assigned_to = auth.uid() OR
      q.created_by = auth.uid()
    )
  )
);

-- 기타 테이블들 (읽기 전용 또는 관리자만 접근)
CREATE POLICY quote_sequences_admin ON quote_sequences FOR ALL TO authenticated 
USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));

CREATE POLICY item_price_history_read ON item_price_history FOR SELECT TO authenticated 
USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  check_user_permission(auth.uid(), 'items.view')
);

CREATE POLICY stock_movements_read ON stock_movements FOR SELECT TO authenticated 
USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  check_user_permission(auth.uid(), 'items.view')
);

-- 트리거 함수들

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거 추가
CREATE TRIGGER trigger_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_quote_items_updated_at BEFORE UPDATE ON quote_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 견적서 번호 자동 생성 함수
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
    current_year INTEGER;
    current_month INTEGER;
    seq_num INTEGER;
    new_quote_number VARCHAR(50);
BEGIN
    -- 현재 년도와 월 가져오기
    current_year := EXTRACT(YEAR FROM NEW.quote_date);
    current_month := EXTRACT(MONTH FROM NEW.quote_date);
    
    -- 해당 년월의 시퀀스 번호 가져오기/생성
    INSERT INTO quote_sequences (year, month, sequence_number)
    VALUES (current_year, current_month, 1)
    ON CONFLICT (year, month) 
    DO UPDATE SET sequence_number = quote_sequences.sequence_number + 1
    RETURNING sequence_number INTO seq_num;
    
    -- 견적서 번호 생성: Q-YYYY-MM-NNNN 형식
    new_quote_number := 'Q-' || current_year || '-' || LPAD(current_month::text, 2, '0') || '-' || LPAD(seq_num::text, 4, '0');
    
    -- 견적서 번호가 비어있을 때만 설정
    IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
        NEW.quote_number := new_quote_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 견적서 번호 생성 트리거
CREATE TRIGGER trigger_generate_quote_number 
    BEFORE INSERT ON quotes 
    FOR EACH ROW 
    EXECUTE FUNCTION generate_quote_number();

-- 견적서 총액 계산 함수
CREATE OR REPLACE FUNCTION calculate_quote_totals()
RETURNS TRIGGER AS $$
DECLARE
    quote_record RECORD;
    subtotal DECIMAL(15,2);
    tax_amt DECIMAL(15,2);
    discount_amt DECIMAL(15,2);
    total_amt DECIMAL(15,2);
BEGIN
    -- 견적서 품목들의 합계 계산
    SELECT 
        COALESCE(SUM(line_total), 0) as item_total
    INTO subtotal
    FROM quote_items 
    WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id);
    
    -- 견적서 정보 가져오기
    SELECT tax_rate, discount_rate, discount_amount
    INTO quote_record
    FROM quotes 
    WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
    
    -- 할인액 계산
    IF quote_record.discount_amount > 0 THEN
        discount_amt := quote_record.discount_amount;
    ELSE
        discount_amt := subtotal * COALESCE(quote_record.discount_rate, 0);
    END IF;
    
    -- 세액 계산 (할인 후 금액에 대해)
    tax_amt := (subtotal - discount_amt) * COALESCE(quote_record.tax_rate, 0);
    
    -- 총액 계산
    total_amt := subtotal - discount_amt + tax_amt;
    
    -- 견적서 금액 업데이트
    UPDATE quotes 
    SET 
        subtotal_amount = subtotal,
        tax_amount = tax_amt,
        discount_amount = discount_amt,
        total_amount = total_amt,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 견적서 품목 변경시 총액 재계산 트리거
CREATE TRIGGER trigger_recalculate_quote_totals_insert
    AFTER INSERT ON quote_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_quote_totals();

CREATE TRIGGER trigger_recalculate_quote_totals_update
    AFTER UPDATE ON quote_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_quote_totals();

CREATE TRIGGER trigger_recalculate_quote_totals_delete
    AFTER DELETE ON quote_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_quote_totals();

-- 재고 이동 추적 함수
CREATE OR REPLACE FUNCTION track_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
    -- 재고 수량 변경시 이력 추가
    IF TG_OP = 'UPDATE' AND OLD.stock_quantity != NEW.stock_quantity THEN
        INSERT INTO stock_movements (
            item_id,
            movement_type,
            quantity,
            previous_stock,
            new_stock,
            reason,
            created_by
        ) VALUES (
            NEW.id,
            CASE 
                WHEN NEW.stock_quantity > OLD.stock_quantity THEN 'in'
                ELSE 'out'
            END,
            ABS(NEW.stock_quantity - OLD.stock_quantity),
            OLD.stock_quantity,
            NEW.stock_quantity,
            '재고 조정',
            NEW.updated_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 재고 이동 추적 트리거
CREATE TRIGGER trigger_track_stock_movement
    AFTER UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION track_stock_movement();

-- 가격 변경 이력 추적 함수
CREATE OR REPLACE FUNCTION track_price_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 가격 변경시 이력 추가
    IF TG_OP = 'UPDATE' AND OLD.unit_price != NEW.unit_price THEN
        INSERT INTO item_price_history (
            item_id,
            old_price,
            new_price,
            change_reason,
            created_by
        ) VALUES (
            NEW.id,
            OLD.unit_price,
            NEW.unit_price,
            '가격 조정',
            NEW.updated_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 가격 변경 이력 트리거
CREATE TRIGGER trigger_track_price_change
    AFTER UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION track_price_change();

-- 기본 데이터 삽입

-- 기본 품목 카테고리
INSERT INTO item_categories (name, description, created_by) VALUES
('일반', '일반 품목', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('전자제품', '전자 부품 및 제품', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('기계부품', '기계 부품 및 장비', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('소모품', '소모성 재료 및 부품', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('서비스', '용역 및 서비스', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1))
ON CONFLICT (name) DO NOTHING;

-- 테이블 코멘트 추가
COMMENT ON TABLE clients IS '고객사 정보 관리';
COMMENT ON TABLE suppliers IS '공급업체 정보 관리';
COMMENT ON TABLE item_categories IS '품목 카테고리 분류';
COMMENT ON TABLE items IS '품목 마스터 데이터';
COMMENT ON TABLE projects IS '프로젝트 관리';
COMMENT ON TABLE quotes IS '견적서 마스터';
COMMENT ON TABLE quote_items IS '견적서 품목 상세';
COMMENT ON TABLE quote_sequences IS '견적서 번호 시퀀스 관리';
COMMENT ON TABLE item_price_history IS '품목 가격 변경 이력';
COMMENT ON TABLE stock_movements IS '재고 이동 이력';

-- 함수 코멘트 추가
COMMENT ON FUNCTION generate_quote_number IS '견적서 번호 자동 생성 (Q-YYYY-MM-NNNN 형식)';
COMMENT ON FUNCTION calculate_quote_totals IS '견적서 품목 변경시 총액 자동 계산';
COMMENT ON FUNCTION track_stock_movement IS '재고 수량 변경 이력 자동 추적';
COMMENT ON FUNCTION track_price_change IS '품목 가격 변경 이력 자동 추적';