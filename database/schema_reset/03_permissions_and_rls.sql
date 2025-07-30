-- ========================================
-- 견적서 관리 시스템 - 권한 관리 및 RLS 정책
-- 03_permissions_and_rls.sql
-- ========================================

-- ========================================
-- 1. 권한 관리 테이블들
-- ========================================

-- 권한 테이블
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 권한 매핑 테이블
CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES profiles(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, permission_id)
);

-- 사용자 초대 테이블
CREATE TABLE user_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    invited_by UUID NOT NULL REFERENCES profiles(id),
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    permissions UUID[] DEFAULT '{}',
    invitation_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'))
);

-- ========================================
-- 2. 기본 권한 데이터 삽입
-- ========================================
INSERT INTO permissions (name, description, category) VALUES
-- 견적서 관련 권한
('quotes.view', '견적서 조회', 'quotes'),
('quotes.create', '견적서 생성', 'quotes'),
('quotes.edit', '견적서 수정', 'quotes'),
('quotes.delete', '견적서 삭제', 'quotes'),
('quotes.approve', '견적서 승인', 'quotes'),
('quotes.export', '견적서 내보내기', 'quotes'),

-- 고객 관리 권한
('customers.view', '고객 조회', 'customers'),
('customers.create', '고객 생성', 'customers'),
('customers.edit', '고객 수정', 'customers'),
('customers.delete', '고객 삭제', 'customers'),

-- 공급업체 관리 권한
('suppliers.view', '공급업체 조회', 'suppliers'),
('suppliers.create', '공급업체 생성', 'suppliers'),
('suppliers.edit', '공급업체 수정', 'suppliers'),
('suppliers.delete', '공급업체 삭제', 'suppliers'),

-- 품목 관리 권한
('items.view', '품목 조회', 'items'),
('items.create', '품목 생성', 'items'),
('items.edit', '품목 수정', 'items'),
('items.delete', '품목 삭제', 'items'),

-- 프로젝트 관리 권한
('projects.view', '프로젝트 조회', 'projects'),
('projects.create', '프로젝트 생성', 'projects'),
('projects.edit', '프로젝트 수정', 'projects'),
('projects.delete', '프로젝트 삭제', 'projects'),

-- 보고서 권한
('reports.view', '보고서 조회', 'reports'),
('reports.export', '보고서 내보내기', 'reports'),

-- 시스템 관리 권한
('users.view', '사용자 조회', 'admin'),
('users.create', '사용자 생성', 'admin'),
('users.edit', '사용자 수정', 'admin'),
('users.delete', '사용자 삭제', 'admin'),
('permissions.manage', '권한 관리', 'admin'),
('system.settings', '시스템 설정', 'admin')

ON CONFLICT (name) DO NOTHING;

-- ========================================
-- 3. 권한 관리 함수들
-- ========================================

-- 권한 확인 함수
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_permission_name VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := false;
    user_role VARCHAR(20);
BEGIN
    -- 사용자 역할 확인
    SELECT role INTO user_role FROM profiles WHERE id = p_user_id;
    
    -- 최고 관리자는 모든 권한 보유
    IF user_role = 'super_admin' THEN
        RETURN true;
    END IF;
    
    -- 특정 권한 확인
    SELECT EXISTS(
        SELECT 1 
        FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = p_user_id 
        AND p.name = p_permission_name
        AND up.is_active = true
        AND (up.expires_at IS NULL OR up.expires_at > NOW())
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자 권한 부여 함수
CREATE OR REPLACE FUNCTION grant_user_permission(
    p_user_id UUID,
    p_permission_name VARCHAR(100),
    p_granted_by UUID,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    permission_id UUID;
BEGIN
    -- 권한 ID 찾기
    SELECT id INTO permission_id FROM permissions WHERE name = p_permission_name;
    
    IF permission_id IS NULL THEN
        RAISE EXCEPTION 'Permission not found: %', p_permission_name;
    END IF;
    
    -- 권한 부여
    INSERT INTO user_permissions (user_id, permission_id, granted_by, expires_at)
    VALUES (p_user_id, permission_id, p_granted_by, p_expires_at)
    ON CONFLICT (user_id, permission_id) 
    DO UPDATE SET 
        is_active = true,
        expires_at = p_expires_at,
        granted_by = p_granted_by,
        granted_at = NOW();
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to grant permission: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자 권한 취소 함수
CREATE OR REPLACE FUNCTION revoke_user_permission(
    p_user_id UUID,
    p_permission_name VARCHAR(100)
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_permissions 
    SET is_active = false
    WHERE user_id = p_user_id 
    AND permission_id = (SELECT id FROM permissions WHERE name = p_permission_name);
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자 초대 함수
CREATE OR REPLACE FUNCTION invite_user(
    p_email VARCHAR(255),
    p_role VARCHAR(20) DEFAULT 'member',
    p_invited_by UUID DEFAULT NULL,
    p_permissions UUID[] DEFAULT '{}'
)
RETURNS JSON AS $$
DECLARE
    invitation_token VARCHAR(255);
    invitation_id UUID;
    result JSON;
BEGIN
    -- 토큰 생성
    invitation_token := encode(gen_random_bytes(32), 'hex');
    
    -- 초대 레코드 생성
    INSERT INTO user_invitations (
        email, invited_by, role, permissions, invitation_token, expires_at
    ) VALUES (
        p_email, p_invited_by, p_role, p_permissions, invitation_token, NOW() + INTERVAL '7 days'
    ) RETURNING id INTO invitation_id;
    
    -- 결과 반환
    SELECT json_build_object(
        'success', true,
        'invitation_id', invitation_id,
        'invitation_token', invitation_token,
        'expires_at', NOW() + INTERVAL '7 days'
    ) INTO result;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 4. RLS 정책 활성화
-- ========================================
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
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 5. RLS 정책 생성
-- ========================================

-- profiles 테이블 정책
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated 
USING (
    -- 본인 프로필은 항상 조회 가능
    id = auth.uid() OR
    -- 최고관리자는 모든 프로필 조회 가능
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY profiles_update ON profiles FOR UPDATE TO authenticated 
USING (
    id = auth.uid() OR
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
)
WITH CHECK (
    id = auth.uid() OR
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- customers 테이블 정책
CREATE POLICY customers_access ON customers FOR ALL TO authenticated 
USING (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
    check_user_permission(auth.uid(), 'customers.view')
)
WITH CHECK (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
    (TG_OP = 'INSERT' AND check_user_permission(auth.uid(), 'customers.create')) OR
    (TG_OP = 'UPDATE' AND check_user_permission(auth.uid(), 'customers.edit')) OR
    (TG_OP = 'DELETE' AND check_user_permission(auth.uid(), 'customers.delete'))
);

-- suppliers 테이블 정책
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

-- master_items 테이블 정책
CREATE POLICY master_items_access ON master_items FOR ALL TO authenticated 
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

-- quote_templates 테이블 정책
CREATE POLICY quote_templates_access ON quote_templates FOR ALL TO authenticated 
USING (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
    check_user_permission(auth.uid(), 'quotes.view')
)
WITH CHECK (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
    (TG_OP = 'INSERT' AND check_user_permission(auth.uid(), 'quotes.create')) OR
    (TG_OP = 'UPDATE' AND check_user_permission(auth.uid(), 'quotes.edit')) OR
    (TG_OP = 'DELETE' AND check_user_permission(auth.uid(), 'quotes.delete'))
);

-- quotes 테이블 정책
CREATE POLICY quotes_access ON quotes FOR ALL TO authenticated 
USING (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
    check_user_permission(auth.uid(), 'quotes.view') OR
    created_by = auth.uid()
)
WITH CHECK (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
    (TG_OP = 'INSERT' AND check_user_permission(auth.uid(), 'quotes.create')) OR
    (TG_OP = 'UPDATE' AND (check_user_permission(auth.uid(), 'quotes.edit') OR created_by = auth.uid())) OR
    (TG_OP = 'DELETE' AND check_user_permission(auth.uid(), 'quotes.delete'))
);

-- quote_groups 테이블 정책 (quotes를 통한 접근 제어)
CREATE POLICY quote_groups_access ON quote_groups FOR ALL TO authenticated 
USING (
    EXISTS(
        SELECT 1 FROM quotes q 
        WHERE q.id = quote_id 
        AND (
            EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
            check_user_permission(auth.uid(), 'quotes.view') OR
            q.created_by = auth.uid()
        )
    )
);

-- quote_items 테이블 정책
CREATE POLICY quote_items_access ON quote_items FOR ALL TO authenticated 
USING (
    EXISTS(
        SELECT 1 FROM quotes q 
        JOIN quote_groups qg ON q.id = qg.quote_id
        WHERE qg.id = quote_group_id 
        AND (
            EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
            check_user_permission(auth.uid(), 'quotes.view') OR
            q.created_by = auth.uid()
        )
    )
);

-- quote_details 테이블 정책
CREATE POLICY quote_details_access ON quote_details FOR ALL TO authenticated 
USING (
    EXISTS(
        SELECT 1 FROM quotes q 
        JOIN quote_groups qg ON q.id = qg.quote_id
        JOIN quote_items qi ON qg.id = qi.quote_group_id
        WHERE qi.id = quote_item_id 
        AND (
            EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
            check_user_permission(auth.uid(), 'quotes.view') OR
            q.created_by = auth.uid()
        )
    )
);

-- projects 테이블 정책
CREATE POLICY projects_access ON projects FOR ALL TO authenticated 
USING (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
    check_user_permission(auth.uid(), 'projects.view') OR
    created_by = auth.uid()
)
WITH CHECK (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
    (TG_OP = 'INSERT' AND check_user_permission(auth.uid(), 'projects.create')) OR
    (TG_OP = 'UPDATE' AND (check_user_permission(auth.uid(), 'projects.edit') OR created_by = auth.uid())) OR
    (TG_OP = 'DELETE' AND check_user_permission(auth.uid(), 'projects.delete'))
);

-- transactions 테이블 정책
CREATE POLICY transactions_access ON transactions FOR ALL TO authenticated 
USING (
    EXISTS(
        SELECT 1 FROM projects p 
        WHERE p.id = project_id 
        AND (
            EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
            check_user_permission(auth.uid(), 'projects.view') OR
            p.created_by = auth.uid()
        )
    )
);

-- project_expenses 테이블 정책
CREATE POLICY project_expenses_access ON project_expenses FOR ALL TO authenticated 
USING (
    EXISTS(
        SELECT 1 FROM projects p 
        WHERE p.id = project_id 
        AND (
            EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
            check_user_permission(auth.uid(), 'projects.view') OR
            p.created_by = auth.uid()
        )
    )
);

-- notifications 테이블 정책
CREATE POLICY notifications_access ON notifications FOR ALL TO authenticated 
USING (
    user_id = auth.uid() OR
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
)
WITH CHECK (
    user_id = auth.uid() OR
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- notification_settings 테이블 정책
CREATE POLICY notification_settings_access ON notification_settings FOR ALL TO authenticated 
USING (
    user_id = auth.uid()
)
WITH CHECK (
    user_id = auth.uid()
);

-- permissions 테이블 정책 (모든 인증된 사용자가 조회 가능)
CREATE POLICY permissions_select ON permissions FOR SELECT TO authenticated 
USING (true);

-- user_permissions 테이블 정책
CREATE POLICY user_permissions_select ON user_permissions FOR SELECT TO authenticated 
USING (
    user_id = auth.uid() OR 
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- user_invitations 테이블 정책 (최고관리자만 접근)
CREATE POLICY user_invitations_access ON user_invitations FOR ALL TO authenticated 
USING (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
)
WITH CHECK (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- ========================================
-- 6. 인덱스 생성
-- ========================================
CREATE INDEX idx_permissions_name ON permissions(name);
CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission_id ON user_permissions(permission_id);
CREATE INDEX idx_user_permissions_active ON user_permissions(is_active) WHERE is_active = true;
CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_token ON user_invitations(invitation_token);
CREATE INDEX idx_user_invitations_status ON user_invitations(status);

-- ========================================
-- 테이블 코멘트
-- ========================================
COMMENT ON TABLE permissions IS '시스템 권한 정의';
COMMENT ON TABLE user_permissions IS '사용자별 권한 매핑';
COMMENT ON TABLE user_invitations IS '사용자 초대 관리';

COMMENT ON FUNCTION check_user_permission IS '사용자 권한 확인';
COMMENT ON FUNCTION grant_user_permission IS '사용자 권한 부여';
COMMENT ON FUNCTION revoke_user_permission IS '사용자 권한 취소';
COMMENT ON FUNCTION invite_user IS '사용자 초대';