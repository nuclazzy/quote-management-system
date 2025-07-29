-- ========================================
-- 견적 관리 시스템 기본 스키마 정의
-- 01_schema.sql
-- ========================================

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. PROFILES 테이블 (사용자 프로필 및 권한)
-- ========================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 2. CUSTOMERS 테이블 (고객사)
-- ========================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    business_number TEXT,
    address TEXT,
    memo TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- ========================================
-- 3. SUPPLIERS 테이블 (공급처/매입처)
-- ========================================
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    memo TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- ========================================
-- 4. MASTER_ITEMS 테이블 (마스터 품목 - 세부내용 단위)
-- ========================================
CREATE TABLE master_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    default_unit_price NUMERIC(12,2) DEFAULT 0,
    default_unit TEXT DEFAULT 'EA',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- ========================================
-- 5. QUOTE_TEMPLATES 테이블 (견적서 템플릿)
-- ========================================
CREATE TABLE quote_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    template_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- ========================================
-- 6. QUOTES 테이블 (견적서)
-- ========================================
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_number TEXT UNIQUE NOT NULL,
    project_title TEXT NOT NULL,
    customer_id UUID REFERENCES customers(id),
    customer_name_snapshot TEXT NOT NULL, -- 스냅샷 적용
    issue_date DATE DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'sent', 'accepted', 'revised', 'canceled')
    ),
    total_amount NUMERIC(15,2) DEFAULT 0,
    vat_type TEXT DEFAULT 'exclusive' CHECK (vat_type IN ('exclusive', 'inclusive')),
    discount_amount NUMERIC(15,2) DEFAULT 0,
    agency_fee_rate NUMERIC(5,2) DEFAULT 0, -- 대행수수료율 (%)
    version INTEGER DEFAULT 1,
    parent_quote_id UUID REFERENCES quotes(id), -- 수정 시 원본 연결
    notes TEXT, -- 견적서 비고
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- ========================================
-- 7. QUOTE_GROUPS 테이블 (견적서 내 그룹)
-- ========================================
CREATE TABLE quote_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    include_in_fee BOOLEAN DEFAULT true, -- 수수료 포함 여부
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 8. QUOTE_ITEMS 테이블 (견적서 내 품목)
-- ========================================
CREATE TABLE quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_group_id UUID NOT NULL REFERENCES quote_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    include_in_fee BOOLEAN DEFAULT true, -- 수수료 포함 여부
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 9. QUOTE_DETAILS 테이블 (견적서 내 세부내용 - 스냅샷 적용)
-- ========================================
CREATE TABLE quote_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_item_id UUID NOT NULL REFERENCES quote_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- 스냅샷: master_items.name
    description TEXT, -- 스냅샷: master_items.description
    quantity NUMERIC(10,2) DEFAULT 1,
    days NUMERIC(5,2) DEFAULT 1,
    unit TEXT DEFAULT 'EA', -- 스냅샷: master_items.default_unit
    unit_price NUMERIC(12,2) DEFAULT 0, -- 스냅샷: master_items.default_unit_price
    is_service BOOLEAN DEFAULT false,
    cost_price NUMERIC(12,2) DEFAULT 0, -- 원가
    supplier_id UUID REFERENCES suppliers(id),
    supplier_name_snapshot TEXT, -- 스냅샷: suppliers.name
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 10. PROJECTS 테이블 (프로젝트 - 계약 완료 건)
-- ========================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id),
    name TEXT NOT NULL,
    total_revenue NUMERIC(15,2) DEFAULT 0,
    total_cost NUMERIC(15,2) DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (
        status IN ('active', 'completed', 'on_hold', 'canceled')
    ),
    parent_project_id UUID REFERENCES projects(id), -- 추가 계약 시 원본 연결
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- ========================================
-- 11. TRANSACTIONS 테이블 (정산 관리 - 공식 매입/매출)
-- ========================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    partner_name TEXT NOT NULL, -- 거래처명
    item_name TEXT NOT NULL, -- 항목명
    amount NUMERIC(15,2) NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'issue')
    ),
    tax_invoice_status TEXT DEFAULT 'not_issued' CHECK (
        tax_invoice_status IN ('not_issued', 'issued', 'received')
    ),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- ========================================
-- 12. PROJECT_EXPENSES 테이블 (프로젝트 기타 경비)
-- ========================================
CREATE TABLE project_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    receipt_url TEXT, -- 영수증 첨부 파일 URL (향후 확장)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- ========================================
-- 13. NOTIFICATIONS 테이블 (알림)
-- ========================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    link_url TEXT,
    is_read BOOLEAN DEFAULT false,
    notification_type TEXT DEFAULT 'general' CHECK (
        notification_type IN ('general', 'project_created', 'payment_due', 'payment_overdue', 'issue')
    ),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 계산된 컬럼을 위한 뷰 생성
-- ========================================

-- 견적서 총액 계산 뷰
CREATE OR REPLACE VIEW quote_totals AS
SELECT 
    q.id as quote_id,
    q.quote_number,
    q.project_title,
    q.customer_name_snapshot,
    q.status,
    q.vat_type,
    q.discount_amount,
    q.agency_fee_rate,
    COALESCE(SUM(
        CASE 
            WHEN qd.is_service THEN qd.quantity * qd.unit_price
            ELSE qd.quantity * qd.days * qd.unit_price
        END
    ), 0) as subtotal,
    COALESCE(SUM(
        CASE 
            WHEN qg.include_in_fee AND qi.include_in_fee THEN
                CASE 
                    WHEN qd.is_service THEN qd.quantity * qd.unit_price
                    ELSE qd.quantity * qd.days * qd.unit_price
                END
            ELSE 0
        END
    ), 0) as fee_applicable_amount,
    COALESCE(SUM(qd.cost_price * qd.quantity), 0) as total_cost_price
FROM quotes q
LEFT JOIN quote_groups qg ON q.id = qg.quote_id
LEFT JOIN quote_items qi ON qg.id = qi.quote_group_id
LEFT JOIN quote_details qd ON qi.id = qd.quote_item_id
GROUP BY q.id, q.quote_number, q.project_title, q.customer_name_snapshot, 
         q.status, q.vat_type, q.discount_amount, q.agency_fee_rate;

-- 프로젝트 수익성 계산 뷰
CREATE OR REPLACE VIEW project_profitability AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.total_revenue,
    p.total_cost,
    COALESCE(p.total_cost, 0) + COALESCE(expenses.total_expenses, 0) as actual_total_cost,
    p.total_revenue - (COALESCE(p.total_cost, 0) + COALESCE(expenses.total_expenses, 0)) as net_profit,
    CASE 
        WHEN p.total_revenue > 0 THEN 
            ROUND(((p.total_revenue - (COALESCE(p.total_cost, 0) + COALESCE(expenses.total_expenses, 0))) / p.total_revenue * 100), 2)
        ELSE 0 
    END as profit_margin_percent
FROM projects p
LEFT JOIN (
    SELECT 
        project_id,
        SUM(amount) as total_expenses
    FROM project_expenses
    GROUP BY project_id
) expenses ON p.id = expenses.project_id;

-- ========================================
-- 업데이트 타임스탬프를 위한 함수 생성
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 업데이트 트리거 적용
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_master_items_updated_at BEFORE UPDATE ON master_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_templates_updated_at BEFORE UPDATE ON quote_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 초기 데이터 삽입
-- ========================================

-- 기본 관리자 프로필 (수동으로 auth.users 테이블에 레코드가 생성된 후 실행)
-- INSERT INTO profiles (id, email, full_name, role) 
-- VALUES ('auth_user_id_here', 'lewis@motionsense.co.kr', '박대표', 'admin')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- 기본 견적서 템플릿
INSERT INTO quote_templates (name, template_data) VALUES 
('기본 워크샵 패키지', '{
    "groups": [
        {
            "name": "기획 및 운영",
            "items": [
                {
                    "name": "행사 기획",
                    "details": [
                        {"name": "행사 기획안 작성", "unit": "식", "unit_price": 500000}
                    ]
                }
            ]
        }
    ]
}'::jsonb),
('영상 제작 패키지', '{
    "groups": [
        {
            "name": "영상 제작",
            "items": [
                {
                    "name": "촬영",
                    "details": [
                        {"name": "기본 촬영", "unit": "일", "unit_price": 1000000}
                    ]
                }
            ]
        }
    ]
}'::jsonb);

-- 기본 마스터 품목
INSERT INTO master_items (name, description, default_unit_price, default_unit) VALUES 
('행사 기획안 작성', '행사 전체 기획 및 시나리오 작성', 500000, '식'),
('기본 촬영', '1일 기본 촬영 서비스', 1000000, '일'),
('영상 편집', '기본 영상 편집 작업', 800000, '편'),
('사회자', '행사 진행 사회자', 300000, '일'),
('음향 장비', '기본 음향 시스템 대여', 200000, '일'),
('조명 장비', '기본 조명 시스템 대여', 150000, '일');

COMMENT ON TABLE profiles IS '사용자 프로필 및 권한 관리';
COMMENT ON TABLE customers IS '고객사 정보 관리';
COMMENT ON TABLE suppliers IS '공급처/매입처 정보 관리';
COMMENT ON TABLE master_items IS '마스터 품목 정보 (견적 작성 시 참조용)';
COMMENT ON TABLE quote_templates IS '견적서 템플릿 저장';
COMMENT ON TABLE quotes IS '견적서 메인 정보';
COMMENT ON TABLE quote_groups IS '견적서 내 그룹 구조';
COMMENT ON TABLE quote_items IS '견적서 내 품목';
COMMENT ON TABLE quote_details IS '견적서 세부 내용 (스냅샷 데이터)';
COMMENT ON TABLE projects IS '계약 완료된 프로젝트';
COMMENT ON TABLE transactions IS '공식 매입/매출 정산 관리';
COMMENT ON TABLE project_expenses IS '프로젝트 기타 경비';
COMMENT ON TABLE notifications IS '사용자 알림';