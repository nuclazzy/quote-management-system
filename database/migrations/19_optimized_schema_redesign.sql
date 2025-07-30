-- 견적서 관리 시스템 최적화된 스키마 재설계
-- 한국 비즈니스 환경에 특화된 구조

-- ================================
-- 1. 기존 테이블 정리 및 통합
-- ================================

-- customers 테이블 삭제 (clients로 통합)
DROP TABLE IF EXISTS customers CASCADE;

-- 기존 quote 관련 테이블들 정리 (구조 변경을 위해)
DROP TABLE IF EXISTS quote_details CASCADE;
DROP TABLE IF EXISTS quote_items CASCADE;  
DROP TABLE IF EXISTS quote_groups CASCADE;

-- ================================
-- 2. 핵심 엔티티 테이블 재정의
-- ================================

-- 2.1 사용자 프로필 (권한 체계 명확화)
DROP TABLE IF EXISTS profiles CASCADE;
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(100),
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
  department VARCHAR(100), -- 부서 정보 추가
  position VARCHAR(100),   -- 직책 정보 추가
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2 권한 시스템 (세밀한 권한 제어)
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  resource VARCHAR(50) NOT NULL, -- 'clients', 'suppliers', 'items', 'quotes', 'projects'
  action VARCHAR(20) NOT NULL,   -- 'view', 'create', 'edit', 'delete', 'approve'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

-- 2.3 고객사 테이블 (clients로 통합, 한국 비즈니스 특화)
-- 기존 clients 테이블 수정
ALTER TABLE clients DROP COLUMN IF EXISTS business_registration_number;
ALTER TABLE clients ADD COLUMN business_registration_number VARCHAR(12) UNIQUE; -- 한국 사업자등록번호 (10자리 + 하이픈)
ALTER TABLE clients ADD COLUMN tax_invoice_email VARCHAR(255); -- 세금계산서 발송 이메일
ALTER TABLE clients ADD COLUMN industry_type VARCHAR(100);     -- 업종
ALTER TABLE clients ADD COLUMN company_size VARCHAR(20) CHECK (company_size IN ('startup', 'small', 'medium', 'large')); -- 기업 규모
ALTER TABLE clients ADD COLUMN credit_rating INTEGER CHECK (credit_rating >= 1 AND credit_rating <= 5); -- 신용 등급
ALTER TABLE clients ADD COLUMN payment_terms_days INTEGER DEFAULT 30; -- 결제 조건 (일수)

-- 2.4 공급업체 테이블 개선
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS business_registration_number VARCHAR(12) UNIQUE;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_invoice_email VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS industry_type VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank_account VARCHAR(100); -- 계좌 정보
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(50);

-- 2.5 품목 관리 (items 테이블 개선)
-- 기존 items 테이블에 한국 비즈니스 특화 필드 추가
ALTER TABLE items ADD COLUMN IF NOT EXISTS hs_code VARCHAR(20);           -- HS 코드 (수출입 시 필요)
ALTER TABLE items ADD COLUMN IF NOT EXISTS origin_country VARCHAR(50);    -- 원산지
ALTER TABLE items ADD COLUMN IF NOT EXISTS safety_stock INTEGER DEFAULT 0; -- 안전 재고
ALTER TABLE items ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 0; -- 재주문점
ALTER TABLE items ADD COLUMN IF NOT EXISTS tax_type VARCHAR(20) DEFAULT 'taxable' CHECK (tax_type IN ('taxable', 'zero_rated', 'exempt')); -- 과세 유형

-- ================================
-- 3. 견적서 시스템 재설계
-- ================================

-- 3.1 견적서 마스터 (quotes 테이블 개선)
-- 기존 quotes 테이블 컬럼 조정
ALTER TABLE quotes DROP COLUMN IF EXISTS project_id; -- 프로젝트 관계는 별도 처리
ALTER TABLE quotes ADD COLUMN business_registration_number VARCHAR(12); -- 고객사 사업자등록번호 스냅샷
ALTER TABLE quotes ADD COLUMN quote_type VARCHAR(20) DEFAULT 'standard' CHECK (quote_type IN ('standard', 'framework', 'service_only', 'goods_only')); -- 견적서 유형
ALTER TABLE quotes ADD COLUMN expected_order_date DATE; -- 예상 주문일
ALTER TABLE quotes ADD COLUMN delivery_location TEXT;   -- 납품 장소
ALTER TABLE quotes ADD COLUMN warranty_period INTEGER DEFAULT 12; -- 보증 기간 (개월)

-- 견적서 승인 워크플로우 강화
ALTER TABLE quotes ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotes ADD COLUMN submitted_by UUID REFERENCES profiles(id);
ALTER TABLE quotes ADD COLUMN review_notes TEXT; -- 검토 의견

-- 3.2 견적서 품목 (단순화된 구조)
-- 기존 복잡한 4단계 구조를 2단계로 단순화
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id), -- NULL 가능 (직접 입력 품목)
  
  -- 품목 정보 스냅샷 (견적서 작성 시점 고정)
  item_name VARCHAR(255) NOT NULL,
  item_description TEXT,
  item_sku VARCHAR(100),
  specifications JSONB, -- 기술 사양
  
  -- 수량 및 가격 정보
  quantity DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(50) NOT NULL DEFAULT '개',
  unit_price DECIMAL(15,2) NOT NULL CHECK (unit_price >= 0),
  
  -- 원가 및 공급업체 정보
  cost_price DECIMAL(15,2) DEFAULT 0,
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name VARCHAR(255), -- 공급업체명 스냅샷
  
  -- 할인 및 계산 정보
  discount_rate DECIMAL(5,4) DEFAULT 0 CHECK (discount_rate >= 0 AND discount_rate <= 1),
  discount_amount DECIMAL(15,2) DEFAULT 0,
  line_total DECIMAL(15,2) NOT NULL, -- 라인 총액 (자동 계산)
  
  -- 분류 및 정렬
  category VARCHAR(100),    -- 품목 분류 (그룹핑용)
  sort_order INTEGER DEFAULT 0,
  is_optional BOOLEAN DEFAULT false, -- 선택 사항 여부
  
  -- 납기 및 배송 정보
  lead_time_days INTEGER DEFAULT 0,
  delivery_terms TEXT,
  
  -- 메타 정보
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- 4. 프로젝트 관리 시스템
-- ================================

-- 프로젝트 테이블 재설계
DROP TABLE IF EXISTS projects CASCADE;
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_number VARCHAR(50) NOT NULL UNIQUE, -- 프로젝트 번호 (자동 생성)
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- 연관 관계
  client_id UUID NOT NULL REFERENCES clients(id),
  quote_id UUID REFERENCES quotes(id), -- 기준 견적서
  project_manager_id UUID REFERENCES profiles(id),
  
  -- 프로젝트 상태 및 진행도
  status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  
  -- 일정 관리
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  
  -- 예산 및 비용 관리
  contract_amount DECIMAL(15,2), -- 계약 금액
  budget_amount DECIMAL(15,2),   -- 예산
  actual_cost DECIMAL(15,2) DEFAULT 0, -- 실제 비용
  
  -- 우선순위 및 분류
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  project_type VARCHAR(50),      -- 프로젝트 유형
  
  -- 메타 정보
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- ================================
-- 5. 알림 시스템 개선
-- ================================

-- 알림 테이블 (기존 유지하되 일부 개선)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_required BOOLEAN DEFAULT false;

-- ================================
-- 6. 인덱스 최적화
-- ================================

-- 기존 인덱스 삭제 후 재생성
DROP INDEX IF EXISTS idx_clients_name;
DROP INDEX IF EXISTS idx_clients_active;
DROP INDEX IF EXISTS idx_quotes_number;
DROP INDEX IF EXISTS idx_quotes_client;
DROP INDEX IF EXISTS idx_quotes_status;

-- 최적화된 인덱스 생성
-- 고객사 관련
CREATE INDEX idx_clients_name_active ON clients(name) WHERE is_active = true;
CREATE INDEX idx_clients_business_reg ON clients(business_registration_number) WHERE business_registration_number IS NOT NULL;
CREATE INDEX idx_clients_created_by_date ON clients(created_by, created_at);

-- 견적서 관련 (가장 중요한 성능 최적화)
CREATE INDEX idx_quotes_composite ON quotes(client_id, status, quote_date);
CREATE INDEX idx_quotes_number_unique ON quotes(quote_number);
CREATE INDEX idx_quotes_assigned_status ON quotes(assigned_to, status) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_quotes_created_date ON quotes(created_by, created_at);

-- 견적서 품목 관련
CREATE INDEX idx_quote_items_quote_sort ON quote_items(quote_id, sort_order);
CREATE INDEX idx_quote_items_item_ref ON quote_items(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX idx_quote_items_supplier ON quote_items(supplier_id) WHERE supplier_id IS NOT NULL;

-- 프로젝트 관련
CREATE INDEX idx_projects_client_status ON projects(client_id, status);
CREATE INDEX idx_projects_manager_active ON projects(project_manager_id) WHERE is_active = true;
CREATE INDEX idx_projects_quote ON projects(quote_id) WHERE quote_id IS NOT NULL;

-- 권한 관련
CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);

-- ================================
-- 7. 트리거 함수 업데이트
-- ================================

-- 프로젝트 번호 자동 생성 함수
CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TRIGGER AS $$
DECLARE
    current_year INTEGER;
    seq_num INTEGER;
    new_project_number VARCHAR(50);
BEGIN
    current_year := EXTRACT(YEAR FROM NOW());
    
    -- 해당 년도의 프로젝트 수 계산
    SELECT COUNT(*) + 1
    INTO seq_num
    FROM projects 
    WHERE EXTRACT(YEAR FROM created_at) = current_year;
    
    -- 프로젝트 번호 생성: P-YYYY-NNNN 형식
    new_project_number := 'P-' || current_year || '-' || LPAD(seq_num::text, 4, '0');
    
    IF NEW.project_number IS NULL OR NEW.project_number = '' THEN
        NEW.project_number := new_project_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 프로젝트 번호 생성 트리거
CREATE TRIGGER trigger_generate_project_number 
    BEFORE INSERT ON projects 
    FOR EACH ROW 
    EXECUTE FUNCTION generate_project_number();

-- 견적서 품목 라인 총액 자동 계산 함수
CREATE OR REPLACE FUNCTION calculate_quote_item_line_total()
RETURNS TRIGGER AS $$
BEGIN
    -- 라인 총액 계산: (수량 * 단가) - 할인액
    IF NEW.discount_amount > 0 THEN
        NEW.line_total := (NEW.quantity * NEW.unit_price) - NEW.discount_amount;
    ELSE
        NEW.line_total := (NEW.quantity * NEW.unit_price) * (1 - COALESCE(NEW.discount_rate, 0));
    END IF;
    
    -- 음수 방지
    IF NEW.line_total < 0 THEN
        NEW.line_total := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 견적서 품목 라인 총액 계산 트리거
CREATE TRIGGER trigger_calculate_quote_item_line_total
    BEFORE INSERT OR UPDATE ON quote_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_quote_item_line_total();

-- ================================
-- 8. RLS 정책 재설정
-- ================================

-- 모든 테이블에 대한 RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 프로필 정책 (자신의 정보만 조회 가능, 관리자는 모든 정보 조회 가능)
CREATE POLICY profiles_access ON profiles FOR ALL TO authenticated 
USING (
  id = auth.uid() OR
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

-- 권한 정책 (관리자만 권한 관리 가능)
CREATE POLICY permissions_admin_only ON permissions FOR ALL TO authenticated 
USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));

CREATE POLICY user_permissions_admin_only ON user_permissions FOR ALL TO authenticated 
USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));

-- 프로젝트 정책 (기존 견적서 정책과 연동)
CREATE POLICY projects_access ON projects FOR ALL TO authenticated 
USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  project_manager_id = auth.uid() OR
  created_by = auth.uid() OR
  EXISTS(
    SELECT 1 FROM quotes q 
    WHERE q.id = quote_id 
    AND (q.assigned_to = auth.uid() OR q.created_by = auth.uid())
  )
);

-- ================================
-- 9. 기본 데이터 삽입
-- ================================

-- 기본 권한 데이터
INSERT INTO permissions (name, description, resource, action) VALUES
-- 고객사 관련
('clients.view', '고객사 조회', 'clients', 'view'),
('clients.create', '고객사 생성', 'clients', 'create'),
('clients.edit', '고객사 수정', 'clients', 'edit'),
('clients.delete', '고객사 삭제', 'clients', 'delete'),

-- 공급업체 관련
('suppliers.view', '공급업체 조회', 'suppliers', 'view'),
('suppliers.create', '공급업체 생성', 'suppliers', 'create'),
('suppliers.edit', '공급업체 수정', 'suppliers', 'edit'),
('suppliers.delete', '공급업체 삭제', 'suppliers', 'delete'),

-- 품목 관련
('items.view', '품목 조회', 'items', 'view'),
('items.create', '품목 생성', 'items', 'create'),
('items.edit', '품목 수정', 'items', 'edit'),
('items.delete', '품목 삭제', 'items', 'delete'),

-- 견적서 관련
('quotes.view', '견적서 조회', 'quotes', 'view'),
('quotes.create', '견적서 생성', 'quotes', 'create'),
('quotes.edit', '견적서 수정', 'quotes', 'edit'),
('quotes.delete', '견적서 삭제', 'quotes', 'delete'),
('quotes.approve', '견적서 승인', 'quotes', 'approve'),

-- 프로젝트 관련
('projects.view', '프로젝트 조회', 'projects', 'view'),
('projects.create', '프로젝트 생성', 'projects', 'create'),
('projects.edit', '프로젝트 수정', 'projects', 'edit'),
('projects.delete', '프로젝트 삭제', 'projects', 'delete')

ON CONFLICT (name) DO NOTHING;

-- ================================
-- 10. 유용한 뷰 생성
-- ================================

-- 견적서 요약 뷰
CREATE OR REPLACE VIEW quote_summary AS
SELECT 
  q.id,
  q.quote_number,
  q.title,
  q.client_id,
  c.name as client_name,
  q.status,
  q.quote_date,
  q.valid_until,
  q.total_amount,
  COUNT(qi.id) as item_count,
  SUM(qi.line_total) as calculated_total,
  q.created_by,
  p.full_name as created_by_name,
  q.created_at
FROM quotes q
LEFT JOIN clients c ON q.client_id = c.id
LEFT JOIN quote_items qi ON q.id = qi.quote_id
LEFT JOIN profiles p ON q.created_by = p.id
GROUP BY q.id, c.name, p.full_name;

-- 프로젝트 진행 현황 뷰
CREATE OR REPLACE VIEW project_status_summary AS
SELECT 
  p.id,
  p.project_number,
  p.name,
  p.client_id,
  c.name as client_name,
  p.status,
  p.progress_percentage,
  p.contract_amount,
  p.actual_cost,
  p.contract_amount - p.actual_cost as remaining_budget,
  p.planned_start_date,
  p.planned_end_date,
  p.project_manager_id,
  pm.full_name as project_manager_name
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN profiles pm ON p.project_manager_id = pm.id;

-- ================================
-- 11. 유지보수를 위한 코멘트
-- ================================

COMMENT ON TABLE profiles IS '사용자 프로필 - 권한 체계 포함';
COMMENT ON TABLE permissions IS '시스템 권한 정의';
COMMENT ON TABLE user_permissions IS '사용자별 권한 할당';
COMMENT ON TABLE clients IS '고객사 정보 - 한국 비즈니스 환경 특화';
COMMENT ON TABLE suppliers IS '공급업체 정보 - 한국 비즈니스 환경 특화';
COMMENT ON TABLE items IS '품목 마스터 - 재고 관리 포함';
COMMENT ON TABLE quotes IS '견적서 마스터';
COMMENT ON TABLE quote_items IS '견적서 품목 - 단순화된 구조';
COMMENT ON TABLE projects IS '프로젝트 관리';

COMMENT ON FUNCTION generate_quote_number IS '견적서 번호 자동 생성 (Q-YYYY-MM-NNNN)';
COMMENT ON FUNCTION generate_project_number IS '프로젝트 번호 자동 생성 (P-YYYY-NNNN)';
COMMENT ON FUNCTION calculate_quote_item_line_total IS '견적서 품목 라인 총액 자동 계산';

-- 마이그레이션 완료 로그
INSERT INTO quote_sequences (year, month, sequence_number, prefix) 
VALUES (EXTRACT(YEAR FROM NOW()), EXTRACT(MONTH FROM NOW()), 1, 'Q')
ON CONFLICT (year, month) DO NOTHING;