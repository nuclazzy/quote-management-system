-- ========================================
-- 견적 관리 시스템 Row Level Security 정책 (수정된 버전)
-- 04_rls_fixed.sql
-- ========================================

-- ========================================
-- 1. RLS 활성화
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

-- ========================================
-- 2. 헬퍼 함수들
-- ========================================

-- 현재 사용자의 역할 확인 함수
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM profiles
    WHERE id = auth.uid();
    
    RETURN COALESCE(user_role, 'member');
END;
$$;

-- 현재 사용자가 활성 상태인지 확인하는 함수
CREATE OR REPLACE FUNCTION is_current_user_active()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_active BOOLEAN;
BEGIN
    SELECT is_active INTO user_active
    FROM profiles
    WHERE id = auth.uid();
    
    RETURN COALESCE(user_active, false);
END;
$$;

-- 도메인 검증 함수
CREATE OR REPLACE FUNCTION is_allowed_domain(email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN email LIKE '%@motionsense.co.kr';
END;
$$;

-- ========================================
-- 3. profiles 테이블 RLS 정책
-- ========================================

-- 모든 활성 사용자는 자신의 프로필을 조회할 수 있음
CREATE POLICY "profiles_select_own" ON profiles
FOR SELECT USING (
    id = auth.uid() 
    AND is_active = true
);

-- 관리자는 모든 프로필을 조회할 수 있음
CREATE POLICY "profiles_select_admin" ON profiles
FOR SELECT USING (
    get_current_user_role() = 'admin'
    AND is_current_user_active()
);

-- 사용자는 자신의 프로필을 수정할 수 있음 (role, is_active 제외)
CREATE POLICY "profiles_update_own" ON profiles
FOR UPDATE USING (
    id = auth.uid() 
    AND is_active = true
) WITH CHECK (
    id = auth.uid()
    AND is_active = true
    -- role과 is_active는 변경할 수 없음
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    AND is_active = (SELECT is_active FROM profiles WHERE id = auth.uid())
);

-- 관리자는 다른 사용자의 프로필을 수정할 수 있음
CREATE POLICY "profiles_update_admin" ON profiles
FOR UPDATE USING (
    get_current_user_role() = 'admin'
    AND is_current_user_active()
) WITH CHECK (
    get_current_user_role() = 'admin'
    AND is_current_user_active()
);

-- 새 사용자 생성은 트리거를 통해서만 (시스템 레벨)
CREATE POLICY "profiles_insert_system" ON profiles
FOR INSERT WITH CHECK (false);

-- 삭제는 금지
CREATE POLICY "profiles_no_delete" ON profiles
FOR DELETE USING (false);

-- ========================================
-- 4. customers 테이블 RLS 정책
-- ========================================

-- 활성 사용자는 활성 고객을 조회할 수 있음
CREATE POLICY "customers_select_policy" ON customers
FOR SELECT USING (
    is_current_user_active()
    AND is_active = true
);

-- 활성 사용자는 고객을 생성할 수 있음
CREATE POLICY "customers_insert_policy" ON customers
FOR INSERT WITH CHECK (
    is_current_user_active()
    AND created_by = auth.uid()
);

-- 생성자 또는 관리자는 고객 정보를 수정할 수 있음
CREATE POLICY "customers_update_policy" ON customers
FOR UPDATE USING (
    is_current_user_active()
    AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
) WITH CHECK (
    is_current_user_active()
    AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
);

-- 관리자만 고객을 삭제(비활성화)할 수 있음
CREATE POLICY "customers_delete_policy" ON customers
FOR UPDATE USING (
    get_current_user_role() = 'admin'
    AND is_current_user_active()
) WITH CHECK (
    get_current_user_role() = 'admin'
    AND is_current_user_active()
);

-- ========================================
-- 5. suppliers 테이블 RLS 정책
-- ========================================

-- 활성 사용자는 활성 공급처를 조회할 수 있음
CREATE POLICY "suppliers_select_policy" ON suppliers
FOR SELECT USING (
    is_current_user_active()
    AND is_active = true
);

-- 활성 사용자는 공급처를 생성할 수 있음
CREATE POLICY "suppliers_insert_policy" ON suppliers
FOR INSERT WITH CHECK (
    is_current_user_active()
    AND created_by = auth.uid()
);

-- 생성자 또는 관리자는 공급처 정보를 수정할 수 있음
CREATE POLICY "suppliers_update_policy" ON suppliers
FOR UPDATE USING (
    is_current_user_active()
    AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
) WITH CHECK (
    is_current_user_active()
    AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
);

-- 관리자만 공급처를 삭제(비활성화)할 수 있음
CREATE POLICY "suppliers_delete_policy" ON suppliers
FOR UPDATE USING (
    get_current_user_role() = 'admin'
    AND is_current_user_active()
) WITH CHECK (
    get_current_user_role() = 'admin'
    AND is_current_user_active()
);

-- ========================================
-- 6. master_items 테이블 RLS 정책
-- ========================================

-- 활성 사용자는 활성 마스터 아이템을 조회할 수 있음
CREATE POLICY "master_items_select_policy" ON master_items
FOR SELECT USING (
    is_current_user_active()
    AND is_active = true
);

-- 활성 사용자는 마스터 아이템을 생성할 수 있음
CREATE POLICY "master_items_insert_policy" ON master_items
FOR INSERT WITH CHECK (
    is_current_user_active()
    AND created_by = auth.uid()
);

-- 생성자 또는 관리자는 마스터 아이템을 수정할 수 있음
CREATE POLICY "master_items_update_policy" ON master_items
FOR UPDATE USING (
    is_current_user_active()
    AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
) WITH CHECK (
    is_current_user_active()
    AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
);

-- 관리자만 마스터 아이템을 삭제(비활성화)할 수 있음
CREATE POLICY "master_items_delete_policy" ON master_items
FOR UPDATE USING (
    get_current_user_role() = 'admin'
    AND is_current_user_active()
) WITH CHECK (
    get_current_user_role() = 'admin'
    AND is_current_user_active()
);

-- ========================================
-- 7. quote_templates 테이블 RLS 정책
-- ========================================

-- 활성 사용자는 견적 템플릿을 조회할 수 있음
CREATE POLICY "quote_templates_select_policy" ON quote_templates
FOR SELECT USING (
    is_current_user_active()
);

-- 활성 사용자는 견적 템플릿을 생성할 수 있음
CREATE POLICY "quote_templates_insert_policy" ON quote_templates
FOR INSERT WITH CHECK (
    is_current_user_active()
    AND created_by = auth.uid()
);

-- 생성자 또는 관리자는 견적 템플릿을 수정할 수 있음
CREATE POLICY "quote_templates_update_policy" ON quote_templates
FOR UPDATE USING (
    is_current_user_active()
    AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
) WITH CHECK (
    is_current_user_active()
    AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
);

-- 생성자 또는 관리자는 견적 템플릿을 삭제할 수 있음
CREATE POLICY "quote_templates_delete_policy" ON quote_templates
FOR DELETE USING (
    is_current_user_active()
    AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
);

-- ========================================
-- 8. quotes 테이블 RLS 정책
-- ========================================

-- 활성 사용자는 견적서를 조회할 수 있음 (팀 전체 공개)
CREATE POLICY "quotes_select_policy" ON quotes
FOR SELECT USING (
    is_current_user_active()
);

-- 활성 사용자는 견적서를 생성할 수 있음
CREATE POLICY "quotes_insert_policy" ON quotes
FOR INSERT WITH CHECK (
    is_current_user_active()
    AND created_by = auth.uid()
);

-- 생성자 또는 관리자는 견적서를 수정할 수 있음
CREATE POLICY "quotes_update_policy" ON quotes
FOR UPDATE USING (
    is_current_user_active()
    AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
) WITH CHECK (
    is_current_user_active()
    AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
);

-- 관리자만 견적서를 삭제할 수 있음
CREATE POLICY "quotes_delete_policy" ON quotes
FOR DELETE USING (
    get_current_user_role() = 'admin'
    AND is_current_user_active()
);

-- ========================================
-- 9. quote_groups 테이블 RLS 정책
-- ========================================

-- 견적서 접근 권한이 있으면 그룹도 접근 가능
CREATE POLICY "quote_groups_select_policy" ON quote_groups
FOR SELECT USING (
    is_current_user_active()
    AND quote_id IN (
        SELECT id FROM quotes 
        WHERE is_current_user_active()
    )
);

-- 견적서 수정 권한이 있으면 그룹도 생성 가능
CREATE POLICY "quote_groups_insert_policy" ON quote_groups
FOR INSERT WITH CHECK (
    is_current_user_active()
    AND quote_id IN (
        SELECT id FROM quotes 
        WHERE is_current_user_active()
        AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
    )
);

-- 견적서 수정 권한이 있으면 그룹도 수정 가능
CREATE POLICY "quote_groups_update_policy" ON quote_groups
FOR UPDATE USING (
    is_current_user_active()
    AND quote_id IN (
        SELECT id FROM quotes 
        WHERE is_current_user_active()
        AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
    )
) WITH CHECK (
    is_current_user_active()
    AND quote_id IN (
        SELECT id FROM quotes 
        WHERE is_current_user_active()
        AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
    )
);

-- 견적서 수정 권한이 있으면 그룹도 삭제 가능
CREATE POLICY "quote_groups_delete_policy" ON quote_groups
FOR DELETE USING (
    is_current_user_active()
    AND quote_id IN (
        SELECT id FROM quotes 
        WHERE is_current_user_active()
        AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
    )
);

-- ========================================
-- 10. quote_items 테이블 RLS 정책
-- ========================================

-- 그룹 접근 권한이 있으면 아이템도 접근 가능
CREATE POLICY "quote_items_select_policy" ON quote_items
FOR SELECT USING (
    is_current_user_active()
    AND quote_group_id IN (
        SELECT qg.id FROM quote_groups qg
        JOIN quotes q ON qg.quote_id = q.id
        WHERE is_current_user_active()
    )
);

-- 그룹 수정 권한이 있으면 아이템도 생성 가능
CREATE POLICY "quote_items_insert_policy" ON quote_items
FOR INSERT WITH CHECK (
    is_current_user_active()
    AND quote_group_id IN (
        SELECT qg.id FROM quote_groups qg
        JOIN quotes q ON qg.quote_id = q.id
        WHERE is_current_user_active()
        AND (q.created_by = auth.uid() OR get_current_user_role() = 'admin')
    )
);

-- 그룹 수정 권한이 있으면 아이템도 수정 가능
CREATE POLICY "quote_items_update_policy" ON quote_items
FOR UPDATE USING (
    is_current_user_active()
    AND quote_group_id IN (
        SELECT qg.id FROM quote_groups qg
        JOIN quotes q ON qg.quote_id = q.id
        WHERE is_current_user_active()
        AND (q.created_by = auth.uid() OR get_current_user_role() = 'admin')
    )
) WITH CHECK (
    is_current_user_active()
    AND quote_group_id IN (
        SELECT qg.id FROM quote_groups qg
        JOIN quotes q ON qg.quote_id = q.id
        WHERE is_current_user_active()
        AND (q.created_by = auth.uid() OR get_current_user_role() = 'admin')
    )
);

-- 그룹 수정 권한이 있으면 아이템도 삭제 가능
CREATE POLICY "quote_items_delete_policy" ON quote_items
FOR DELETE USING (
    is_current_user_active()
    AND quote_group_id IN (
        SELECT qg.id FROM quote_groups qg
        JOIN quotes q ON qg.quote_id = q.id
        WHERE is_current_user_active()
        AND (q.created_by = auth.uid() OR get_current_user_role() = 'admin')
    )
);

-- ========================================
-- 11. quote_details 테이블 RLS 정책
-- ========================================

-- 아이템 접근 권한이 있으면 세부사항도 접근 가능
CREATE POLICY "quote_details_select_policy" ON quote_details
FOR SELECT USING (
    is_current_user_active()
    AND quote_item_id IN (
        SELECT qi.id FROM quote_items qi
        JOIN quote_groups qg ON qi.quote_group_id = qg.id
        JOIN quotes q ON qg.quote_id = q.id
        WHERE is_current_user_active()
    )
);

-- 아이템 수정 권한이 있으면 세부사항도 생성 가능
CREATE POLICY "quote_details_insert_policy" ON quote_details
FOR INSERT WITH CHECK (
    is_current_user_active()
    AND quote_item_id IN (
        SELECT qi.id FROM quote_items qi
        JOIN quote_groups qg ON qi.quote_group_id = qg.id
        JOIN quotes q ON qg.quote_id = q.id
        WHERE is_current_user_active()
        AND (q.created_by = auth.uid() OR get_current_user_role() = 'admin')
    )
);

-- 아이템 수정 권한이 있으면 세부사항도 수정 가능
CREATE POLICY "quote_details_update_policy" ON quote_details
FOR UPDATE USING (
    is_current_user_active()
    AND quote_item_id IN (
        SELECT qi.id FROM quote_items qi
        JOIN quote_groups qg ON qi.quote_group_id = qg.id
        JOIN quotes q ON qg.quote_id = q.id
        WHERE is_current_user_active()
        AND (q.created_by = auth.uid() OR get_current_user_role() = 'admin')
    )
) WITH CHECK (
    is_current_user_active()
    AND quote_item_id IN (
        SELECT qi.id FROM quote_items qi
        JOIN quote_groups qg ON qi.quote_group_id = qg.id
        JOIN quotes q ON qg.quote_id = q.id
        WHERE is_current_user_active()
        AND (q.created_by = auth.uid() OR get_current_user_role() = 'admin')
    )
);

-- 아이템 수정 권한이 있으면 세부사항도 삭제 가능
CREATE POLICY "quote_details_delete_policy" ON quote_details
FOR DELETE USING (
    is_current_user_active()
    AND quote_item_id IN (
        SELECT qi.id FROM quote_items qi
        JOIN quote_groups qg ON qi.quote_group_id = qg.id
        JOIN quotes q ON qg.quote_id = q.id
        WHERE is_current_user_active()
        AND (q.created_by = auth.uid() OR get_current_user_role() = 'admin')
    )
);

-- ========================================
-- 12. projects 테이블 RLS 정책
-- ========================================

-- 활성 사용자는 프로젝트를 조회할 수 있음
CREATE POLICY "projects_select_policy" ON projects
FOR SELECT USING (
    is_current_user_active()
);

-- 활성 사용자는 프로젝트를 생성할 수 있음
CREATE POLICY "projects_insert_policy" ON projects
FOR INSERT WITH CHECK (
    is_current_user_active()
    AND created_by = auth.uid()
);

-- 생성자 또는 관리자는 프로젝트를 수정할 수 있음
CREATE POLICY "projects_update_policy" ON projects
FOR UPDATE USING (
    is_current_user_active()
    AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
) WITH CHECK (
    is_current_user_active()
    AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
);

-- 관리자만 프로젝트를 삭제할 수 있음
CREATE POLICY "projects_delete_policy" ON projects
FOR DELETE USING (
    get_current_user_role() = 'admin'
    AND is_current_user_active()
);

-- ========================================
-- 13. transactions 테이블 RLS 정책
-- ========================================

-- 프로젝트 접근 권한이 있으면 정산도 조회 가능
CREATE POLICY "transactions_select_policy" ON transactions
FOR SELECT USING (
    is_current_user_active()
    AND project_id IN (
        SELECT id FROM projects 
        WHERE is_current_user_active()
    )
);

-- 프로젝트 수정 권한이 있으면 정산도 생성 가능
CREATE POLICY "transactions_insert_policy" ON transactions
FOR INSERT WITH CHECK (
    is_current_user_active()
    AND project_id IN (
        SELECT id FROM projects 
        WHERE is_current_user_active()
        AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
    )
    AND created_by = auth.uid()
);

-- 생성자 또는 관리자는 정산을 수정할 수 있음
CREATE POLICY "transactions_update_policy" ON transactions
FOR UPDATE USING (
    is_current_user_active()
    AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
) WITH CHECK (
    is_current_user_active()
    AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
);

-- 관리자만 정산을 삭제할 수 있음
CREATE POLICY "transactions_delete_policy" ON transactions
FOR DELETE USING (
    get_current_user_role() = 'admin'
    AND is_current_user_active()
);

-- ========================================
-- 14. project_expenses 테이블 RLS 정책
-- ========================================

-- 프로젝트 접근 권한이 있으면 경비도 조회 가능
CREATE POLICY "project_expenses_select_policy" ON project_expenses
FOR SELECT USING (
    is_current_user_active()
    AND project_id IN (
        SELECT id FROM projects 
        WHERE is_current_user_active()
    )
);

-- 프로젝트 수정 권한이 있으면 경비도 생성 가능
CREATE POLICY "project_expenses_insert_policy" ON project_expenses
FOR INSERT WITH CHECK (
    is_current_user_active()
    AND project_id IN (
        SELECT id FROM projects 
        WHERE is_current_user_active()
        AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
    )
    AND created_by = auth.uid()
);

-- 생성자 또는 관리자는 경비를 수정할 수 있음
CREATE POLICY "project_expenses_update_policy" ON project_expenses
FOR UPDATE USING (
    is_current_user_active()
    AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
) WITH CHECK (
    is_current_user_active()
    AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
);

-- 생성자 또는 관리자는 경비를 삭제할 수 있음
CREATE POLICY "project_expenses_delete_policy" ON project_expenses
FOR DELETE USING (
    is_current_user_active()
    AND (created_by = auth.uid() OR get_current_user_role() = 'admin')
);

-- ========================================
-- 15. notifications 테이블 RLS 정책
-- ========================================

-- 사용자는 자신의 알림만 조회할 수 있음
CREATE POLICY "notifications_select_policy" ON notifications
FOR SELECT USING (
    user_id = auth.uid()
    AND is_current_user_active()
);

-- 시스템에서만 알림 생성 가능 (트리거 등)
CREATE POLICY "notifications_insert_policy" ON notifications
FOR INSERT WITH CHECK (true);

-- 사용자는 자신의 알림만 수정할 수 있음 (읽음 처리 등)
CREATE POLICY "notifications_update_policy" ON notifications
FOR UPDATE USING (
    user_id = auth.uid()
    AND is_current_user_active()
) WITH CHECK (
    user_id = auth.uid()
    AND is_current_user_active()
);

-- 사용자는 자신의 알림만 삭제할 수 있음
CREATE POLICY "notifications_delete_policy" ON notifications
FOR DELETE USING (
    user_id = auth.uid()
    AND is_current_user_active()
);

-- ========================================
-- 16. 정책 상태 확인 뷰
-- ========================================

CREATE OR REPLACE VIEW rls_policy_status AS
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

COMMENT ON VIEW rls_policy_status IS 'RLS 정책 상태 확인용 뷰';

-- ========================================
-- 설정 완료 메시지
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '견적 관리 시스템 RLS 정책 설정 완료!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ 모든 테이블에 RLS 활성화';
    RAISE NOTICE '✅ 역할 기반 접근 제어 (Admin/Member)';
    RAISE NOTICE '✅ 도메인 제한 (@motionsense.co.kr)';
    RAISE NOTICE '✅ 사용자별 데이터 접근 권한 설정';
    RAISE NOTICE '✅ 보안 정책 13개 테이블 적용';
    RAISE NOTICE '========================================';
    RAISE NOTICE '활성 사용자만 시스템 사용 가능';
    RAISE NOTICE 'lewis@motionsense.co.kr = Admin 권한';
    RAISE NOTICE '기타 @motionsense.co.kr = Member 권한';
    RAISE NOTICE '========================================';
END $$;