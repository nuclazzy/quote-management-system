-- ========================================
-- 견적서 관리 시스템 - 통합 핵심 스키마
-- 01_core_schema.sql
-- TypeScript 타입 정의 및 실제 API 사용에 기반한 정확한 스키마
-- ========================================

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. PROFILES 테이블 (사용자 프로필)
-- auth.users와 1:1 관계, 실제 API에서 사용되는 구조
-- ========================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('super_admin', 'admin', 'member')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 2. CUSTOMERS 테이블 (고객사)
-- API에서 실제 사용되는 필드 구조 반영
-- ========================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    business_number TEXT, -- business_registration_number 대신 간단히
    address TEXT,
    memo TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- ========================================
-- 3. SUPPLIERS 테이블 (공급업체)
-- TypeScript 정의와 일치하는 구조
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
-- 4. MASTER_ITEMS 테이블 (마스터 품목)
-- TypeScript 타입과 일치
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
-- 6. QUOTES 테이블 (견적서 메인)
-- TypeScript 타입 정의와 정확히 일치하는 구조
-- ========================================
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_number TEXT UNIQUE NOT NULL,
    project_title TEXT NOT NULL,
    customer_id UUID REFERENCES customers(id),
    customer_name_snapshot TEXT NOT NULL, -- 스냅샷
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
    notes TEXT,
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
-- 9. QUOTE_DETAILS 테이블 (견적서 세부 내용)
-- TypeScript 타입과 정확히 일치
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
-- 10. PROJECTS 테이블 (프로젝트)
-- TypeScript 타입과 일치
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
-- 11. TRANSACTIONS 테이블 (정산 관리)
-- TypeScript 타입 정의와 정확히 일치
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
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- ========================================
-- 13. NOTIFICATIONS 테이블 (알림)
-- TypeScript 타입과 정확히 일치
-- ========================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general' CHECK (type IN (
        'quote_created', 'quote_approved', 'quote_rejected', 'quote_expiring',
        'project_created', 'project_status_changed', 'project_deadline_approaching',
        'settlement_due', 'settlement_completed', 'settlement_overdue',
        'system_user_joined', 'system_permission_changed', 'general'
    )),
    link_url TEXT,
    is_read BOOLEAN DEFAULT false,
    entity_type TEXT, -- quote, project, transaction, user
    entity_id UUID,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 14. NOTIFICATION_SETTINGS 테이블 (알림 설정)
-- TypeScript 타입과 정확히 일치
-- ========================================
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    quote_created BOOLEAN DEFAULT true,
    quote_approved BOOLEAN DEFAULT true,
    quote_rejected BOOLEAN DEFAULT true,
    quote_expiring BOOLEAN DEFAULT true,
    project_created BOOLEAN DEFAULT true,
    project_status_changed BOOLEAN DEFAULT true,
    project_deadline_approaching BOOLEAN DEFAULT true,
    settlement_due BOOLEAN DEFAULT true,
    settlement_completed BOOLEAN DEFAULT true,
    settlement_overdue BOOLEAN DEFAULT true,
    system_user_joined BOOLEAN DEFAULT true,
    system_permission_changed BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    browser_notifications BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ========================================
-- 뷰 생성 (TypeScript 타입의 Views와 일치)
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
-- 인덱스 생성 (성능 최적화)
-- ========================================

-- profiles 인덱스
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_is_active ON profiles(is_active) WHERE is_active = true;

-- customers 인덱스
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_is_active ON customers(is_active) WHERE is_active = true;
CREATE INDEX idx_customers_created_by ON customers(created_by);

-- suppliers 인덱스
CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active) WHERE is_active = true;
CREATE INDEX idx_suppliers_created_by ON suppliers(created_by);

-- master_items 인덱스
CREATE INDEX idx_master_items_name ON master_items(name);
CREATE INDEX idx_master_items_is_active ON master_items(is_active) WHERE is_active = true;

-- quotes 인덱스
CREATE INDEX idx_quotes_number ON quotes(quote_number);
CREATE INDEX idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_issue_date ON quotes(issue_date);
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX idx_quotes_created_by ON quotes(created_by);

-- quote_groups 인덱스
CREATE INDEX idx_quote_groups_quote_id ON quote_groups(quote_id);
CREATE INDEX idx_quote_groups_sort_order ON quote_groups(quote_id, sort_order);

-- quote_items 인덱스
CREATE INDEX idx_quote_items_group_id ON quote_items(quote_group_id);
CREATE INDEX idx_quote_items_sort_order ON quote_items(quote_group_id, sort_order);

-- quote_details 인덱스
CREATE INDEX idx_quote_details_item_id ON quote_details(quote_item_id);
CREATE INDEX idx_quote_details_supplier_id ON quote_details(supplier_id);

-- projects 인덱스
CREATE INDEX idx_projects_quote_id ON projects(quote_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);

-- transactions 인덱스
CREATE INDEX idx_transactions_project_id ON transactions(project_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_due_date ON transactions(due_date);

-- notifications 인덱스
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);

-- notification_settings 인덱스
CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);

-- ========================================
-- 테이블 코멘트
-- ========================================
COMMENT ON TABLE profiles IS '사용자 프로필 및 권한 관리';
COMMENT ON TABLE customers IS '고객사 정보 관리';
COMMENT ON TABLE suppliers IS '공급업체 정보 관리';
COMMENT ON TABLE master_items IS '마스터 품목 정보';
COMMENT ON TABLE quote_templates IS '견적서 템플릿';
COMMENT ON TABLE quotes IS '견적서 메인 정보';
COMMENT ON TABLE quote_groups IS '견적서 그룹 구조';
COMMENT ON TABLE quote_items IS '견적서 품목';
COMMENT ON TABLE quote_details IS '견적서 세부 내용 (스냅샷)';
COMMENT ON TABLE projects IS '프로젝트 관리';
COMMENT ON TABLE transactions IS '정산 관리';
COMMENT ON TABLE project_expenses IS '프로젝트 기타 경비';
COMMENT ON TABLE notifications IS '사용자 알림';
COMMENT ON TABLE notification_settings IS '알림 설정';

COMMENT ON VIEW quote_totals IS '견적서 총액 계산 뷰';
COMMENT ON VIEW project_profitability IS '프로젝트 수익성 분석 뷰';