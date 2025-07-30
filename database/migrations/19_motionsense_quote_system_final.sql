-- 모션센스 맞춤형 견적서 시스템 데이터베이스 스키마 (최종 수정버전)
-- Migration: 19_motionsense_quote_system_final.sql
-- 작업지시서 기반 복잡한 견적서 구조 구현

-- 1. 기존 quotes 테이블 수정 (새로운 필드 추가)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_number TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS project_title TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_name_snapshot TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS issue_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS vat_type TEXT DEFAULT 'exclusive';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS agency_fee_rate NUMERIC DEFAULT 0.15;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS parent_quote_id UUID;

-- 기존 quotes 테이블의 created_by 컬럼이 없으면 추가
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS created_by UUID;

-- 외래키 제약조건 추가 (존재하지 않는 경우에만)
DO $$
BEGIN
    -- customer_id 외래키 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'quotes_customer_id_fkey' 
        AND table_name = 'quotes'
    ) THEN
        ALTER TABLE quotes ADD CONSTRAINT quotes_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES clients(id);
    END IF;
    
    -- parent_quote_id 외래키 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'quotes_parent_quote_id_fkey' 
        AND table_name = 'quotes'
    ) THEN
        ALTER TABLE quotes ADD CONSTRAINT quotes_parent_quote_id_fkey 
        FOREIGN KEY (parent_quote_id) REFERENCES quotes(id);
    END IF;
    
    -- created_by 외래키 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'quotes_created_by_fkey' 
        AND table_name = 'quotes'
    ) THEN
        ALTER TABLE quotes ADD CONSTRAINT quotes_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES profiles(id);
    END IF;
END $$;

-- vat_type CHECK 제약조건 추가
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'quotes_vat_type_check'
    ) THEN
        ALTER TABLE quotes ADD CONSTRAINT quotes_vat_type_check 
        CHECK (vat_type IN ('exclusive', 'inclusive'));
    END IF;
END $$;

-- 2. 공급처/매입처 테이블 생성 (기존 suppliers와 중복 방지)
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
    category_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- category_id 외래키 제약조건 (item_categories 테이블이 존재하는 경우에만)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'item_categories') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'master_items_category_id_fkey' 
            AND table_name = 'master_items'
        ) THEN
            ALTER TABLE master_items ADD CONSTRAINT master_items_category_id_fkey
            FOREIGN KEY (category_id) REFERENCES item_categories(id);
        END IF;
    END IF;
END $$;

-- 4. 견적서 템플릿 테이블
CREATE TABLE IF NOT EXISTS quote_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    template_data JSONB NOT NULL,
    created_by UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- created_by 외래키 제약조건
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'quote_templates_created_by_fkey' 
        AND table_name = 'quote_templates'
    ) THEN
        ALTER TABLE quote_templates ADD CONSTRAINT quote_templates_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES profiles(id);
    END IF;
END $$;

-- 5. 견적서 내 그룹 테이블
CREATE TABLE IF NOT EXISTS quote_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    include_in_fee BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- quote_id 외래키 제약조건
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'quote_groups_quote_id_fkey' 
        AND table_name = 'quote_groups'
    ) THEN
        ALTER TABLE quote_groups ADD CONSTRAINT quote_groups_quote_id_fkey
        FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 6. 견적서 내 항목 테이블
CREATE TABLE IF NOT EXISTS quote_items_motionsense (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_group_id UUID NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    include_in_fee BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- quote_group_id 외래키 제약조건
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'quote_items_motionsense_quote_group_id_fkey' 
        AND table_name = 'quote_items_motionsense'
    ) THEN
        ALTER TABLE quote_items_motionsense ADD CONSTRAINT quote_items_motionsense_quote_group_id_fkey
        FOREIGN KEY (quote_group_id) REFERENCES quote_groups(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 7. 견적서 내 세부내용 테이블 (스냅샷 적용)
CREATE TABLE IF NOT EXISTS quote_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_item_id UUID NOT NULL,
    
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
    supplier_id UUID,
    supplier_name_snapshot TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 외래키 제약조건들
DO $$
BEGIN
    -- quote_item_id 외래키
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'quote_details_quote_item_id_fkey' 
        AND table_name = 'quote_details'
    ) THEN
        ALTER TABLE quote_details ADD CONSTRAINT quote_details_quote_item_id_fkey
        FOREIGN KEY (quote_item_id) REFERENCES quote_items_motionsense(id) ON DELETE CASCADE;
    END IF;
    
    -- supplier_id 외래키 (suppliers 테이블이 존재하는 경우에만)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'suppliers') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'quote_details_supplier_id_fkey' 
            AND table_name = 'quote_details'
        ) THEN
            ALTER TABLE quote_details ADD CONSTRAINT quote_details_supplier_id_fkey
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
        END IF;
    END IF;
END $$;

-- 8. 프로젝트 테이블 (계약 완료 건)
CREATE TABLE IF NOT EXISTS projects_motionsense (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL,
    name TEXT NOT NULL,
    total_revenue NUMERIC DEFAULT 0,
    total_cost NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active',
    parent_project_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 외래키 및 체크 제약조건
DO $$
BEGIN
    -- quote_id 외래키
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projects_motionsense_quote_id_fkey' 
        AND table_name = 'projects_motionsense'
    ) THEN
        ALTER TABLE projects_motionsense ADD CONSTRAINT projects_motionsense_quote_id_fkey
        FOREIGN KEY (quote_id) REFERENCES quotes(id);
    END IF;
    
    -- parent_project_id 외래키
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projects_motionsense_parent_project_id_fkey' 
        AND table_name = 'projects_motionsense'
    ) THEN
        ALTER TABLE projects_motionsense ADD CONSTRAINT projects_motionsense_parent_project_id_fkey
        FOREIGN KEY (parent_project_id) REFERENCES projects_motionsense(id);
    END IF;
    
    -- status 체크 제약조건
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'projects_motionsense_status_check'
    ) THEN
        ALTER TABLE projects_motionsense ADD CONSTRAINT projects_motionsense_status_check
        CHECK (status IN ('active', 'completed', 'cancelled'));
    END IF;
END $$;

-- 9. 정산 관리 테이블 (공식 매입/매출)
CREATE TABLE IF NOT EXISTS transactions_motionsense (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    type TEXT NOT NULL,
    partner_name TEXT NOT NULL,
    item_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'pending',
    tax_invoice_status TEXT DEFAULT 'none',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 외래키 및 체크 제약조건
DO $$
BEGIN
    -- project_id 외래키
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transactions_motionsense_project_id_fkey' 
        AND table_name = 'transactions_motionsense'
    ) THEN
        ALTER TABLE transactions_motionsense ADD CONSTRAINT transactions_motionsense_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES projects_motionsense(id);
    END IF;
    
    -- type 체크 제약조건
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'transactions_motionsense_type_check'
    ) THEN
        ALTER TABLE transactions_motionsense ADD CONSTRAINT transactions_motionsense_type_check
        CHECK (type IN ('income', 'expense'));
    END IF;
    
    -- status 체크 제약조건
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'transactions_motionsense_status_check'
    ) THEN
        ALTER TABLE transactions_motionsense ADD CONSTRAINT transactions_motionsense_status_check
        CHECK (status IN ('pending', 'processing', 'completed', 'issue'));
    END IF;
    
    -- tax_invoice_status 체크 제약조건
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'transactions_motionsense_tax_invoice_status_check'
    ) THEN
        ALTER TABLE transactions_motionsense ADD CONSTRAINT transactions_motionsense_tax_invoice_status_check
        CHECK (tax_invoice_status IN ('none', 'requested', 'issued'));
    END IF;
END $$;

-- 10. 프로젝트 기타 경비 테이블
CREATE TABLE IF NOT EXISTS project_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- project_id 외래키 제약조건
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'project_expenses_project_id_fkey' 
        AND table_name = 'project_expenses'
    ) THEN
        ALTER TABLE project_expenses ADD CONSTRAINT project_expenses_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES projects_motionsense(id);
    END IF;
END $$;

-- 11. 알림 테이블 (기존과 중복 방지)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            message TEXT NOT NULL,
            link_url TEXT,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- user_id 외래키 제약조건
        ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES profiles(id);
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

-- 견적서 번호 자동 생성 함수
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
DROP POLICY IF EXISTS "Enable all for authenticated users" ON master_items;
CREATE POLICY "Enable all for authenticated users" ON master_items FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all for authenticated users" ON quote_templates;
CREATE POLICY "Enable all for authenticated users" ON quote_templates FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all for authenticated users" ON quote_groups;
CREATE POLICY "Enable all for authenticated users" ON quote_groups FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all for authenticated users" ON quote_items_motionsense;
CREATE POLICY "Enable all for authenticated users" ON quote_items_motionsense FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all for authenticated users" ON quote_details;
CREATE POLICY "Enable all for authenticated users" ON quote_details FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all for authenticated users" ON projects_motionsense;
CREATE POLICY "Enable all for authenticated users" ON projects_motionsense FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all for authenticated users" ON transactions_motionsense;
CREATE POLICY "Enable all for authenticated users" ON transactions_motionsense FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all for authenticated users" ON project_expenses;
CREATE POLICY "Enable all for authenticated users" ON project_expenses FOR ALL USING (auth.role() = 'authenticated');

-- 샘플 데이터 삽입 (UNIQUE 제약조건 없으므로 중복 방지를 위해 EXISTS 확인)
DO $$
BEGIN
    -- 마스터 품목 데이터
    IF NOT EXISTS (SELECT 1 FROM master_items WHERE name = '메인 카메라 촬영') THEN
        INSERT INTO master_items (name, description, default_unit_price, default_unit) VALUES
        ('메인 카메라 촬영', '4K 메인 카메라 촬영 (1일)', 1000000, '일');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM master_items WHERE name = '보조 카메라 촬영') THEN
        INSERT INTO master_items (name, description, default_unit_price, default_unit) VALUES
        ('보조 카메라 촬영', '보조 카메라 촬영 (1일)', 500000, '일');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM master_items WHERE name = '드론 촬영') THEN
        INSERT INTO master_items (name, description, default_unit_price, default_unit) VALUES
        ('드론 촬영', '드론 항공 촬영 (반일)', 800000, '반일');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM master_items WHERE name = '무선 마이크') THEN
        INSERT INTO master_items (name, description, default_unit_price, default_unit) VALUES
        ('무선 마이크', '무선 마이크 장비 렌탈 (1일)', 200000, '일');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM master_items WHERE name = '믹서 장비') THEN
        INSERT INTO master_items (name, description, default_unit_price, default_unit) VALUES
        ('믹서 장비', '음향 믹서 장비 렌탈 (1일)', 150000, '일');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM master_items WHERE name = '1차 편집') THEN
        INSERT INTO master_items (name, description, default_unit_price, default_unit) VALUES
        ('1차 편집', '영상 1차 편집 작업', 1500000, '건');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM master_items WHERE name = '최종 편집') THEN
        INSERT INTO master_items (name, description, default_unit_price, default_unit) VALUES
        ('최종 편집', '영상 최종 편집 작업', 1000000, '건');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM master_items WHERE name = '인트로/아웃트로 제작') THEN
        INSERT INTO master_items (name, description, default_unit_price, default_unit) VALUES
        ('인트로/아웃트로 제작', '오프닝/엔딩 그래픽 제작', 500000, '건');
    END IF;
    
    -- 견적서 템플릿 데이터
    IF NOT EXISTS (SELECT 1 FROM quote_templates WHERE name = '기본 행사 패키지') THEN
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
        }');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM quote_templates WHERE name = '기본 영상 제작 패키지') THEN
        INSERT INTO quote_templates (name, template_data) VALUES
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
        }');
    END IF;
END $$;

-- 테이블 코멘트
COMMENT ON TABLE quotes IS '견적서 메인 테이블 (Motionsense 확장)';
COMMENT ON TABLE quote_groups IS '견적서 내 그룹 (행사 진행, 영상 제작 등)';
COMMENT ON TABLE quote_items_motionsense IS '견적서 내 항목 (촬영 서비스, 편집 작업 등)';
COMMENT ON TABLE quote_details IS '견적서 내 세부내용 (메인 카메라 촬영, 1차 편집 등) - 스냅샷 적용';
COMMENT ON TABLE master_items IS '마스터 품목 (세부내용 단위)';
COMMENT ON TABLE projects_motionsense IS '프로젝트 (계약 완료된 견적서)';
COMMENT ON TABLE transactions_motionsense IS '정산 관리 (공식 매입/매출)';
COMMENT ON TABLE project_expenses IS '프로젝트 기타 경비';

-- 완료 메시지
SELECT 'Motionsense Quote System Database Schema Created Successfully! (Final Version)' as status;