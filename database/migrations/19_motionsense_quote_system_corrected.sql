-- 모션센스 맞춤형 견적서 시스템 데이터베이스 스키마 (수정버전)
-- Migration: 19_motionsense_quote_system_corrected.sql
-- 작업지시서 기반 복잡한 견적서 구조 구현

-- 1. 기존 quotes 테이블 수정 (새로운 필드 추가)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_number TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS project_title TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES clients(id);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_name_snapshot TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS issue_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS vat_type TEXT DEFAULT 'exclusive' CHECK (vat_type IN ('exclusive', 'inclusive'));
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS agency_fee_rate NUMERIC DEFAULT 0.15;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS parent_quote_id UUID REFERENCES quotes(id);

-- 기존 quotes 테이블의 created_by 컬럼이 없으면 추가
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- 2. 공급처/매입처 테이블 생성 (기존 suppliers와 중복 방지)
-- 기존 suppliers 테이블이 있으면 건너뛰고, 없으면 생성
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'suppliers') THEN
        CREATE TABLE suppliers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            contact_person TEXT,
            phone TEXT,
            email TEXT,
            memo TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 3. 마스터 품목 테이블 (세부내용 단위)
CREATE TABLE IF NOT EXISTS master_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    default_unit_price NUMERIC DEFAULT 0,
    default_unit TEXT DEFAULT '개',
    category_id UUID REFERENCES item_categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 견적서 템플릿 테이블
CREATE TABLE IF NOT EXISTS quote_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    template_data JSONB NOT NULL,
    created_by UUID REFERENCES profiles(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 견적서 내 그룹 테이블
CREATE TABLE IF NOT EXISTS quote_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    include_in_fee BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 견적서 내 항목 테이블
CREATE TABLE IF NOT EXISTS quote_items_motionsense (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_group_id UUID NOT NULL REFERENCES quote_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    include_in_fee BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 견적서 내 세부내용 테이블 (스냅샷 적용)
CREATE TABLE IF NOT EXISTS quote_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_item_id UUID NOT NULL REFERENCES quote_items_motionsense(id) ON DELETE CASCADE,
    
    -- 스냅샷된 품목 정보 (master_items에서 복사)
    name TEXT NOT NULL,
    description TEXT,
    quantity NUMERIC DEFAULT 1,
    days NUMERIC DEFAULT 1,
    unit TEXT DEFAULT '개',
    unit_price NUMERIC NOT NULL,
    
    -- 원가 관리
    is_service BOOLEAN DEFAULT false,
    cost_price NUMERIC DEFAULT 0,
    supplier_id UUID REFERENCES suppliers(id),
    supplier_name_snapshot TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 프로젝트 테이블 (계약 완료 건) - 기존과 중복 방지
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'projects_motionsense') THEN
        CREATE TABLE projects_motionsense (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            quote_id UUID NOT NULL REFERENCES quotes(id),
            name TEXT NOT NULL,
            total_revenue NUMERIC DEFAULT 0,
            total_cost NUMERIC DEFAULT 0,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
            parent_project_id UUID REFERENCES projects_motionsense(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 9. 정산 관리 테이블 (공식 매입/매출)
CREATE TABLE IF NOT EXISTS transactions_motionsense (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects_motionsense(id),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    partner_name TEXT NOT NULL,
    item_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'issue')),
    tax_invoice_status TEXT DEFAULT 'none' CHECK (tax_invoice_status IN ('none', 'requested', 'issued')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. 프로젝트 기타 경비 테이블
CREATE TABLE IF NOT EXISTS project_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects_motionsense(id),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. 알림 테이블 (기존과 중복 방지)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES profiles(id),
            message TEXT NOT NULL,
            link_url TEXT,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id_motionsense ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status_motionsense ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_by_motionsense ON quotes(created_by);
CREATE INDEX IF NOT EXISTS idx_quote_groups_quote_id ON quote_groups(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_group_id_motionsense ON quote_items_motionsense(quote_group_id);
CREATE INDEX IF NOT EXISTS idx_quote_details_item_id ON quote_details(quote_item_id);
CREATE INDEX IF NOT EXISTS idx_projects_quote_id_motionsense ON projects_motionsense(quote_id);
CREATE INDEX IF NOT EXISTS idx_transactions_project_id_motionsense ON transactions_motionsense(project_id);

-- 견적서 번호 자동 생성 함수 (기존과 중복 방지)
CREATE OR REPLACE FUNCTION generate_motionsense_quote_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    current_month TEXT;
    sequence_num INTEGER;
    quote_number_result TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    current_month := LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::TEXT, 2, '0');
    
    -- 해당 월의 다음 시퀀스 번호 계산
    SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 'Q-' || current_year || '-' || current_month || '-(.*)') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM quotes 
    WHERE quote_number LIKE 'Q-' || current_year || '-' || current_month || '-%'
    AND quote_number IS NOT NULL;
    
    quote_number_result := 'Q-' || current_year || '-' || current_month || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN quote_number_result;
END;
$$ LANGUAGE plpgsql;

-- 견적서 생성 시 자동으로 견적서 번호 생성하는 트리거
CREATE OR REPLACE FUNCTION set_motionsense_quote_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quote_number IS NULL THEN
        NEW.quote_number := generate_motionsense_quote_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS trigger_set_motionsense_quote_number ON quotes;
CREATE TRIGGER trigger_set_motionsense_quote_number
    BEFORE INSERT ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION set_motionsense_quote_number();

-- 프로젝트 총 비용 자동 계산 함수
CREATE OR REPLACE FUNCTION update_motionsense_project_total_cost()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE projects_motionsense 
    SET total_cost = (
        SELECT COALESCE(SUM(amount), 0) 
        FROM transactions_motionsense 
        WHERE project_id = NEW.project_id AND type = 'expense'
    ) + (
        SELECT COALESCE(SUM(amount), 0) 
        FROM project_expenses 
        WHERE project_id = NEW.project_id
    )
    WHERE id = NEW.project_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 프로젝트 경비 변경 시 총 비용 업데이트 트리거
DROP TRIGGER IF EXISTS trigger_update_motionsense_project_cost_expenses ON project_expenses;
CREATE TRIGGER trigger_update_motionsense_project_cost_expenses
    AFTER INSERT OR UPDATE OR DELETE ON project_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_motionsense_project_total_cost();

DROP TRIGGER IF EXISTS trigger_update_motionsense_project_cost_transactions ON transactions_motionsense;
CREATE TRIGGER trigger_update_motionsense_project_cost_transactions
    AFTER INSERT OR UPDATE OR DELETE ON transactions_motionsense
    FOR EACH ROW
    EXECUTE FUNCTION update_motionsense_project_total_cost();

-- Row Level Security 정책
ALTER TABLE master_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items_motionsense ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects_motionsense ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_motionsense ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;

-- 기본 RLS 정책 (인증된 사용자만 접근)
CREATE POLICY "Enable all for authenticated users" ON master_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON quote_templates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON quote_groups FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON quote_items_motionsense FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON quote_details FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON projects_motionsense FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON transactions_motionsense FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON project_expenses FOR ALL USING (auth.role() = 'authenticated');

-- 샘플 데이터 삽입
INSERT INTO master_items (name, description, default_unit_price, default_unit) VALUES
('메인 카메라 촬영', '4K 메인 카메라 촬영 (1일)', 1000000, '일'),
('보조 카메라 촬영', '보조 카메라 촬영 (1일)', 500000, '일'),
('드론 촬영', '드론 항공 촬영 (반일)', 800000, '반일'),
('무선 마이크', '무선 마이크 장비 렌탈 (1일)', 200000, '일'),
('믹서 장비', '음향 믹서 장비 렌탈 (1일)', 150000, '일'),
('1차 편집', '영상 1차 편집 작업', 1500000, '건'),
('최종 편집', '영상 최종 편집 작업', 1000000, '건'),
('인트로/아웃트로 제작', '오프닝/엔딩 그래픽 제작', 500000, '건')
ON CONFLICT (name) DO NOTHING;

-- 견적서 템플릿 샘플
INSERT INTO quote_templates (name, template_data) VALUES
('기본 행사 패키지', '{
  "groups": [
    {
      "name": "행사 진행",
      "include_in_fee": true,
      "items": [
        {
          "name": "촬영 서비스",
          "include_in_fee": true,
          "details": [
            {"name": "메인 카메라 촬영", "quantity": 1, "days": 1, "unit_price": 1000000},
            {"name": "보조 카메라 촬영", "quantity": 1, "days": 1, "unit_price": 500000}
          ]
        }
      ]
    }
  ]
}'),
('기본 영상 제작 패키지', '{
  "groups": [
    {
      "name": "영상 제작",
      "include_in_fee": false,
      "items": [
        {
          "name": "편집 작업",
          "include_in_fee": false,
          "details": [
            {"name": "1차 편집", "quantity": 1, "days": 3, "unit_price": 1500000},
            {"name": "최종 편집", "quantity": 1, "days": 2, "unit_price": 1000000}
          ]
        }
      ]
    }
  ]
}')
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE quotes IS '견적서 메인 테이블 (Motionsense 확장)';
COMMENT ON TABLE quote_groups IS '견적서 내 그룹 (행사 진행, 영상 제작 등)';
COMMENT ON TABLE quote_items_motionsense IS '견적서 내 항목 (촬영 서비스, 편집 작업 등)';
COMMENT ON TABLE quote_details IS '견적서 내 세부내용 (메인 카메라 촬영, 1차 편집 등) - 스냅샷 적용';
COMMENT ON TABLE master_items IS '마스터 품목 (세부내용 단위)';
COMMENT ON TABLE projects_motionsense IS '프로젝트 (계약 완료된 견적서)';
COMMENT ON TABLE transactions_motionsense IS '정산 관리 (공식 매입/매출)';
COMMENT ON TABLE project_expenses IS '프로젝트 기타 경비';

-- 완료 메시지
SELECT 'Motionsense Quote System Database Schema Created Successfully! (Corrected Version)' as status;