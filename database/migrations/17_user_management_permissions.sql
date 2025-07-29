-- 사용자 관리 및 권한 시스템 구현
-- 최고 관리자용 사용자 추가/삭제 및 기능별 권한 부여

-- 1. 권한 테이블 생성
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 사용자 권한 매핑 테이블
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, permission_id)
);

-- 3. 사용자 초대 테이블
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  permissions UUID[] DEFAULT '{}',
  invitation_token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'))
);

-- 4. 기본 권한 데이터 삽입
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

-- 5. 최고 관리자에게 모든 권한 부여
DO $$
DECLARE
    super_admin_id UUID;
    perm_record RECORD;
BEGIN
    -- 최고 관리자 찾기
    SELECT id INTO super_admin_id 
    FROM profiles 
    WHERE role = 'super_admin' AND email = 'lewis@motionsense.co.kr'
    LIMIT 1;
    
    IF super_admin_id IS NOT NULL THEN
        -- 모든 권한을 최고 관리자에게 부여
        FOR perm_record IN SELECT id FROM permissions LOOP
            INSERT INTO user_permissions (user_id, permission_id, granted_by)
            VALUES (super_admin_id, perm_record.id, super_admin_id)
            ON CONFLICT (user_id, permission_id) DO NOTHING;
        END LOOP;
        
        RAISE NOTICE 'Super admin permissions granted successfully';
    ELSE
        RAISE NOTICE 'Super admin not found';
    END IF;
END $$;

-- 6. 사용자 관리 함수들
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

-- 7. 권한 확인 함수
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

-- 8. 사용자 권한 부여 함수
CREATE OR REPLACE FUNCTION grant_user_permission(
    p_user_id UUID,
    p_permission_name VARCHAR(100),
    p_granted_by UUID,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
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

-- 9. 사용자 권한 취소 함수
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

-- 10. RLS 정책
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- 권한 테이블 정책
CREATE POLICY permissions_select_all ON permissions FOR SELECT TO authenticated USING (true);

-- 사용자 권한 정책 - 본인 권한만 조회 가능, 최고관리자는 모든 권한 조회 가능
CREATE POLICY user_permissions_select ON user_permissions FOR SELECT TO authenticated 
USING (
    user_id = auth.uid() OR 
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 사용자 초대 정책 - 최고관리자만 접근 가능
CREATE POLICY user_invitations_super_admin ON user_invitations FOR ALL TO authenticated 
USING (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 11. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON user_permissions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);

COMMENT ON TABLE permissions IS '시스템 권한 정의 테이블';
COMMENT ON TABLE user_permissions IS '사용자별 권한 매핑 테이블';
COMMENT ON TABLE user_invitations IS '사용자 초대 관리 테이블';
COMMENT ON FUNCTION check_user_permission IS '사용자 권한 확인 함수';
COMMENT ON FUNCTION grant_user_permission IS '사용자 권한 부여 함수';
COMMENT ON FUNCTION revoke_user_permission IS '사용자 권한 취소 함수';