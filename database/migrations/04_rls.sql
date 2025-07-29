-- ========================================
-- 견적 관리 시스템 Row Level Security 정책
-- 04_rls.sql
-- ========================================

-- ========================================
-- RLS 활성화 및 기본 설정
-- ========================================

-- 모든 테이블에 RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 유틸리티 함수들
-- ========================================

-- 현재 사용자 ID 조회 함수
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT auth.uid();
$$;

-- 현재 사용자 역할 조회 함수
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 현재 사용자가 관리자인지 확인 함수
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
          AND role = 'admin' 
          AND is_active = true
    );
$$;

-- 현재 사용자가 활성 사용자인지 확인 함수
CREATE OR REPLACE FUNCTION is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
          AND is_active = true
    );
$$;

-- ========================================
-- 1. PROFILES 테이블 RLS 정책
-- ========================================

-- 모든 활성 사용자는 다른 사용자의 기본 정보를 볼 수 있음
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT
    USING (
        is_active_user() AND 
        (is_active = true OR id = auth.uid())
    );

-- 사용자는 자신의 프로필만 수정 가능
CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 관리자만 다른 사용자의 역할과 활성화 상태 변경 가능
CREATE POLICY "profiles_admin_update_policy" ON profiles
    FOR UPDATE
    USING (
        is_admin() AND 
        id != auth.uid() -- 자신의 관리자 권한은 스스로 제거할 수 없음
    )
    WITH CHECK (
        is_admin() AND 
        id != auth.uid()
    );

-- 신규 사용자 프로필은 트리거에서만 생성 (일반 사용자는 직접 생성 불가)
CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT
    WITH CHECK (false); -- 모든 직접 삽입 차단

-- ========================================
-- 2. CUSTOMERS 테이블 RLS 정책
-- ========================================

-- 활성 사용자는 모든 고객 정보를 볼 수 있음
CREATE POLICY "customers_select_policy" ON customers
    FOR SELECT
    USING (is_active_user());

-- 활성 사용자는 고객 정보를 생성할 수 있음
CREATE POLICY "customers_insert_policy" ON customers
    FOR INSERT
    WITH CHECK (
        is_active_user() AND 
        created_by = auth.uid()
    );

-- 활성 사용자는 고객 정보를 수정할 수 있음 (비활성화만 관리자)
CREATE POLICY "customers_update_policy" ON customers
    FOR UPDATE
    USING (is_active_user())
    WITH CHECK (
        is_active_user() AND
        (is_admin() OR is_active = OLD.is_active) -- 비활성화는 관리자만
    );

-- 삭제는 관리자만 가능
CREATE POLICY "customers_delete_policy" ON customers
    FOR DELETE
    USING (is_admin());

-- ========================================
-- 3. SUPPLIERS 테이블 RLS 정책 (고객과 동일)
-- ========================================

CREATE POLICY "suppliers_select_policy" ON suppliers
    FOR SELECT
    USING (is_active_user());

CREATE POLICY "suppliers_insert_policy" ON suppliers
    FOR INSERT
    WITH CHECK (
        is_active_user() AND 
        created_by = auth.uid()
    );

CREATE POLICY "suppliers_update_policy" ON suppliers
    FOR UPDATE
    USING (is_active_user())
    WITH CHECK (
        is_active_user() AND
        (is_admin() OR is_active = OLD.is_active)
    );

CREATE POLICY "suppliers_delete_policy" ON suppliers
    FOR DELETE
    USING (is_admin());

-- ========================================
-- 4. MASTER_ITEMS 테이블 RLS 정책
-- ========================================

CREATE POLICY "master_items_select_policy" ON master_items
    FOR SELECT
    USING (is_active_user());

CREATE POLICY "master_items_insert_policy" ON master_items
    FOR INSERT
    WITH CHECK (
        is_active_user() AND 
        created_by = auth.uid()
    );

CREATE POLICY "master_items_update_policy" ON master_items
    FOR UPDATE
    USING (is_active_user())
    WITH CHECK (
        is_active_user() AND
        (is_admin() OR is_active = OLD.is_active)
    );

CREATE POLICY "master_items_delete_policy" ON master_items
    FOR DELETE
    USING (is_admin());

-- ========================================
-- 5. QUOTE_TEMPLATES 테이블 RLS 정책
-- ========================================

CREATE POLICY "quote_templates_select_policy" ON quote_templates
    FOR SELECT
    USING (is_active_user());

CREATE POLICY "quote_templates_insert_policy" ON quote_templates
    FOR INSERT
    WITH CHECK (
        is_active_user() AND 
        created_by = auth.uid()
    );

CREATE POLICY "quote_templates_update_policy" ON quote_templates
    FOR UPDATE
    USING (
        is_active_user() AND
        (is_admin() OR created_by = auth.uid())
    )
    WITH CHECK (
        is_active_user() AND
        (is_admin() OR created_by = auth.uid())
    );

CREATE POLICY "quote_templates_delete_policy" ON quote_templates
    FOR DELETE
    USING (
        is_admin() OR created_by = auth.uid()
    );

-- ========================================
-- 6. QUOTES 테이블 RLS 정책
-- ========================================

-- 모든 활성 사용자는 모든 견적서를 볼 수 있음 (팀워크를 위해)
CREATE POLICY "quotes_select_policy" ON quotes
    FOR SELECT
    USING (is_active_user());

-- 활성 사용자는 견적서를 생성할 수 있음
CREATE POLICY "quotes_insert_policy" ON quotes
    FOR INSERT
    WITH CHECK (
        is_active_user() AND 
        created_by = auth.uid()
    );

-- 견적서 수정은 작성자 또는 관리자만 가능
CREATE POLICY "quotes_update_policy" ON quotes
    FOR UPDATE
    USING (
        is_active_user() AND
        (is_admin() OR created_by = auth.uid())
    )
    WITH CHECK (
        is_active_user() AND
        (is_admin() OR created_by = auth.uid())
    );

-- 견적서 삭제는 관리자 또는 작성자만 가능 (단, 승인된 견적서는 트리거에서 방지)
CREATE POLICY "quotes_delete_policy" ON quotes
    FOR DELETE
    USING (
        is_admin() OR created_by = auth.uid()
    );

-- ========================================
-- 7. QUOTE_GROUPS 테이블 RLS 정책
-- ========================================

-- 견적서를 볼 수 있는 사용자는 그룹도 볼 수 있음
CREATE POLICY "quote_groups_select_policy" ON quote_groups
    FOR SELECT
    USING (
        is_active_user() AND
        EXISTS (
            SELECT 1 FROM quotes q 
            WHERE q.id = quote_id
        )
    );

-- 견적서를 수정할 수 있는 사용자는 그룹도 수정 가능
CREATE POLICY "quote_groups_modify_policy" ON quote_groups
    FOR ALL
    USING (
        is_active_user() AND
        EXISTS (
            SELECT 1 FROM quotes q 
            WHERE q.id = quote_id 
              AND (is_admin() OR q.created_by = auth.uid())
        )
    )
    WITH CHECK (
        is_active_user() AND
        EXISTS (
            SELECT 1 FROM quotes q 
            WHERE q.id = quote_id 
              AND (is_admin() OR q.created_by = auth.uid())
        )
    );

-- ========================================
-- 8. QUOTE_ITEMS 테이블 RLS 정책
-- ========================================

CREATE POLICY "quote_items_select_policy" ON quote_items
    FOR SELECT
    USING (
        is_active_user() AND
        EXISTS (
            SELECT 1 FROM quote_groups qg
            JOIN quotes q ON qg.quote_id = q.id
            WHERE qg.id = quote_group_id
        )
    );

CREATE POLICY "quote_items_modify_policy" ON quote_items
    FOR ALL
    USING (
        is_active_user() AND
        EXISTS (
            SELECT 1 FROM quote_groups qg
            JOIN quotes q ON qg.quote_id = q.id
            WHERE qg.id = quote_group_id 
              AND (is_admin() OR q.created_by = auth.uid())
        )
    )
    WITH CHECK (
        is_active_user() AND
        EXISTS (
            SELECT 1 FROM quote_groups qg
            JOIN quotes q ON qg.quote_id = q.id
            WHERE qg.id = quote_group_id 
              AND (is_admin() OR q.created_by = auth.uid())
        )
    );

-- ========================================
-- 9. QUOTE_DETAILS 테이블 RLS 정책
-- ========================================

CREATE POLICY "quote_details_select_policy" ON quote_details
    FOR SELECT
    USING (
        is_active_user() AND
        EXISTS (
            SELECT 1 FROM quote_items qi
            JOIN quote_groups qg ON qi.quote_group_id = qg.id
            JOIN quotes q ON qg.quote_id = q.id
            WHERE qi.id = quote_item_id
        )
    );

CREATE POLICY "quote_details_modify_policy" ON quote_details
    FOR ALL
    USING (
        is_active_user() AND
        EXISTS (
            SELECT 1 FROM quote_items qi
            JOIN quote_groups qg ON qi.quote_group_id = qg.id
            JOIN quotes q ON qg.quote_id = q.id
            WHERE qi.id = quote_item_id 
              AND (is_admin() OR q.created_by = auth.uid())
        )
    )
    WITH CHECK (
        is_active_user() AND
        EXISTS (
            SELECT 1 FROM quote_items qi
            JOIN quote_groups qg ON qi.quote_group_id = qg.id
            JOIN quotes q ON qg.quote_id = q.id
            WHERE qi.id = quote_item_id 
              AND (is_admin() OR q.created_by = auth.uid())
        )
    );

-- ========================================
-- 10. PROJECTS 테이블 RLS 정책
-- ========================================

-- 모든 활성 사용자는 모든 프로젝트를 볼 수 있음
CREATE POLICY "projects_select_policy" ON projects
    FOR SELECT
    USING (is_active_user());

-- 프로젝트 생성은 함수를 통해서만 (직접 생성 제한)
CREATE POLICY "projects_insert_policy" ON projects
    FOR INSERT
    WITH CHECK (
        is_active_user() AND 
        created_by = auth.uid()
    );

-- 프로젝트 수정은 작성자 또는 관리자만 가능
CREATE POLICY "projects_update_policy" ON projects
    FOR UPDATE
    USING (
        is_active_user() AND
        (is_admin() OR created_by = auth.uid())
    )
    WITH CHECK (
        is_active_user() AND
        (is_admin() OR created_by = auth.uid())
    );

-- 프로젝트 삭제는 관리자만 가능
CREATE POLICY "projects_delete_policy" ON projects
    FOR DELETE
    USING (is_admin());

-- ========================================
-- 11. TRANSACTIONS 테이블 RLS 정책
-- ========================================

CREATE POLICY "transactions_select_policy" ON transactions
    FOR SELECT
    USING (is_active_user());

CREATE POLICY "transactions_insert_policy" ON transactions
    FOR INSERT
    WITH CHECK (
        is_active_user() AND 
        created_by = auth.uid()
    );

CREATE POLICY "transactions_update_policy" ON transactions
    FOR UPDATE
    USING (
        is_active_user() AND
        (is_admin() OR created_by = auth.uid())
    )
    WITH CHECK (
        is_active_user() AND
        (is_admin() OR created_by = auth.uid())
    );

CREATE POLICY "transactions_delete_policy" ON transactions
    FOR DELETE
    USING (
        is_admin() OR created_by = auth.uid()
    );

-- ========================================
-- 12. PROJECT_EXPENSES 테이블 RLS 정책
-- ========================================

CREATE POLICY "project_expenses_select_policy" ON project_expenses
    FOR SELECT
    USING (is_active_user());

CREATE POLICY "project_expenses_insert_policy" ON project_expenses
    FOR INSERT
    WITH CHECK (
        is_active_user() AND 
        created_by = auth.uid()
    );

CREATE POLICY "project_expenses_update_policy" ON project_expenses
    FOR UPDATE
    USING (
        is_active_user() AND
        (is_admin() OR created_by = auth.uid())
    )
    WITH CHECK (
        is_active_user() AND
        (is_admin() OR created_by = auth.uid())
    );

CREATE POLICY "project_expenses_delete_policy" ON project_expenses
    FOR DELETE
    USING (
        is_admin() OR created_by = auth.uid()
    );

-- ========================================
-- 13. NOTIFICATIONS 테이블 RLS 정책
-- ========================================

-- 사용자는 자신의 알림만 볼 수 있음
CREATE POLICY "notifications_select_policy" ON notifications
    FOR SELECT
    USING (
        is_active_user() AND 
        user_id = auth.uid()
    );

-- 시스템 함수에서만 알림 생성 가능 (직접 생성 불가)
CREATE POLICY "notifications_insert_policy" ON notifications
    FOR INSERT
    WITH CHECK (false); -- 모든 직접 삽입 차단

-- 사용자는 자신의 알림 읽음 상태만 변경 가능
CREATE POLICY "notifications_update_policy" ON notifications
    FOR UPDATE
    USING (
        is_active_user() AND 
        user_id = auth.uid()
    )
    WITH CHECK (
        is_active_user() AND 
        user_id = auth.uid() AND
        user_id = OLD.user_id -- user_id 변경 방지
    );

-- 알림 삭제는 본인 것만 가능
CREATE POLICY "notifications_delete_policy" ON notifications
    FOR DELETE
    USING (
        is_active_user() AND 
        user_id = auth.uid()
    );

-- ========================================
-- 14. USER_ACTIVITY_LOGS 테이블 RLS 정책
-- ========================================

-- 관리자만 활동 로그를 볼 수 있음
CREATE POLICY "user_activity_logs_select_policy" ON user_activity_logs
    FOR SELECT
    USING (is_admin());

-- 시스템에서만 로그 생성 (직접 생성 불가)
CREATE POLICY "user_activity_logs_insert_policy" ON user_activity_logs
    FOR INSERT
    WITH CHECK (false); -- 모든 직접 삽입 차단

-- 로그는 수정/삭제 불가
CREATE POLICY "user_activity_logs_no_modify_policy" ON user_activity_logs
    FOR UPDATE
    USING (false);

CREATE POLICY "user_activity_logs_no_delete_policy" ON user_activity_logs
    FOR DELETE
    USING (false);

-- ========================================
-- 15. 뷰에 대한 보안 설정
-- ========================================

-- 뷰들은 기본적으로 테이블의 RLS 정책을 상속받지만, 
-- 추가적인 접근 제어가 필요한 경우 SECURITY DEFINER 함수로 래핑

-- 견적서 총액 조회 함수 (보안 컨텍스트)
CREATE OR REPLACE FUNCTION get_quote_totals_secure()
RETURNS TABLE(
    quote_id UUID,
    quote_number TEXT,
    project_title TEXT,
    customer_name_snapshot TEXT,
    status TEXT,
    vat_type TEXT,
    discount_amount NUMERIC,
    agency_fee_rate NUMERIC,
    subtotal NUMERIC,
    fee_applicable_amount NUMERIC,
    total_cost_price NUMERIC
)
SECURITY DEFINER
LANGUAGE sql
AS $$
    SELECT * FROM quote_totals 
    WHERE is_active_user();
$$;

-- 프로젝트 수익성 조회 함수 (보안 컨텍스트)
CREATE OR REPLACE FUNCTION get_project_profitability_secure()
RETURNS TABLE(
    project_id UUID,
    project_name TEXT,
    total_revenue NUMERIC,
    total_cost NUMERIC,
    actual_total_cost NUMERIC,
    net_profit NUMERIC,
    profit_margin_percent NUMERIC
)
SECURITY DEFINER
LANGUAGE sql
AS $$
    SELECT * FROM project_profitability 
    WHERE is_active_user();
$$;

-- ========================================
-- 16. API 키를 위한 서비스 역할 설정
-- ========================================

-- 서비스 키로 접근할 때의 정책 (모든 작업 허용)
-- Supabase의 service_role은 RLS를 우회함

-- ========================================
-- 17. 정책 테스트를 위한 헬퍼 함수들
-- ========================================

-- 현재 사용자의 권한 정보 조회
CREATE OR REPLACE FUNCTION check_current_user_permissions()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    role TEXT,
    is_active BOOLEAN,
    can_admin BOOLEAN
)
SECURITY DEFINER
LANGUAGE sql
AS $$
    SELECT 
        p.id,
        p.email,
        p.role,
        p.is_active,
        is_admin()
    FROM profiles p
    WHERE p.id = auth.uid();
$$;

-- RLS 정책 목록 조회
CREATE OR REPLACE VIEW rls_policies AS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

COMMENT ON VIEW rls_policies IS 'RLS 정책 목록 조회용 뷰';

-- ========================================
-- 초기 데이터에 대한 RLS 예외 처리
-- ========================================

-- 초기 데이터 삽입을 위한 임시 정책들은 수동으로 관리
-- 실제 운영에서는 서비스 키를 통해 초기 데이터를 삽입해야 함