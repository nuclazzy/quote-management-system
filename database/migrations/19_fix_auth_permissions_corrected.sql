-- Google OAuth 로그인 무한 로딩 문제 해결을 위한 권한 수정 (수정버전)
-- check_user_permission 함수가 없어서 발생하는 RLS 정책 오류 수정

-- 1. 임시로 profiles 테이블의 RLS 정책을 비활성화하여 프로필 생성 허용
DROP POLICY IF EXISTS profiles_access ON profiles;

-- 2. profiles 테이블에 대한 새로운 RLS 정책 생성 (더 단순하고 안전한 방식)
CREATE POLICY profiles_access ON profiles FOR ALL TO authenticated 
USING (
  -- 사용자는 자신의 프로필만 조회 가능, super_admin은 모든 프로필 조회 가능
  id = auth.uid() OR 
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
)
WITH CHECK (
  -- 사용자는 자신의 프로필만 수정 가능, super_admin은 모든 프로필 수정 가능
  id = auth.uid() OR 
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 3. 프로필 생성을 위한 특별 정책 추가 (INSERT 시에만 적용)
CREATE POLICY profiles_insert_self ON profiles FOR INSERT TO authenticated 
WITH CHECK (
  -- 사용자는 자신의 ID로만 프로필 생성 가능
  id = auth.uid()
);

-- 4. check_user_permission 함수가 필요한 다른 테이블들의 RLS 정책을 임시로 단순화

-- 4-1. clients 테이블 정책 수정
DROP POLICY IF EXISTS clients_access ON clients;
CREATE POLICY clients_access ON clients FOR ALL TO authenticated 
USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
)
WITH CHECK (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
);

-- 4-2. suppliers 테이블 정책 수정
DROP POLICY IF EXISTS suppliers_access ON suppliers;
CREATE POLICY suppliers_access ON suppliers FOR ALL TO authenticated 
USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
)
WITH CHECK (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
);

-- 4-3. item_categories 테이블 정책 수정
DROP POLICY IF EXISTS item_categories_access ON item_categories;
CREATE POLICY item_categories_access ON item_categories FOR ALL TO authenticated 
USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
)
WITH CHECK (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
);

-- 4-4. items 테이블 정책 수정
DROP POLICY IF EXISTS items_access ON items;
CREATE POLICY items_access ON items FOR ALL TO authenticated 
USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
)
WITH CHECK (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
);

-- 4-5. projects 테이블 정책 수정
DROP POLICY IF EXISTS projects_access ON projects;
CREATE POLICY projects_access ON projects FOR ALL TO authenticated 
USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true) OR
  project_manager_id = auth.uid()
)
WITH CHECK (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true) OR
  project_manager_id = auth.uid()
);

-- 4-6. quotes 테이블 정책 수정
DROP POLICY IF EXISTS quotes_access ON quotes;
CREATE POLICY quotes_access ON quotes FOR ALL TO authenticated 
USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true) OR
  assigned_to = auth.uid() OR
  created_by = auth.uid()
)
WITH CHECK (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true) OR
  assigned_to = auth.uid() OR
  created_by = auth.uid()
);

-- 4-7. quote_items 테이블 정책 수정
DROP POLICY IF EXISTS quote_items_access ON quote_items;
CREATE POLICY quote_items_access ON quote_items FOR ALL TO authenticated 
USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') OR
  EXISTS(
    SELECT 1 FROM quotes q 
    WHERE q.id = quote_id 
    AND (
      EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true) OR
      q.assigned_to = auth.uid() OR
      q.created_by = auth.uid()
    )
  )
);

-- 5. 기본 권한 테이블 생성 (향후 proper permission system을 위한 준비)
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission VARCHAR(100) NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, permission)
);

-- 6. 기본 권한 부여 함수 (변수명 충돌 수정)
CREATE OR REPLACE FUNCTION grant_default_permissions(p_user_id UUID, p_user_role VARCHAR(50))
RETURNS VOID AS $$
BEGIN
  -- 기본 사용자 권한
  IF p_user_role IN ('user', 'member') THEN
    INSERT INTO user_permissions (user_id, permission, granted_by) VALUES
    (p_user_id, 'customers.view', p_user_id),
    (p_user_id, 'quotes.view', p_user_id),
    (p_user_id, 'quotes.create', p_user_id),
    (p_user_id, 'items.view', p_user_id)
    ON CONFLICT (user_id, permission) DO NOTHING;
  END IF;
  
  -- 관리자 권한
  IF p_user_role IN ('admin', 'super_admin') THEN
    INSERT INTO user_permissions (user_id, permission, granted_by) VALUES
    (p_user_id, 'customers.view', p_user_id),
    (p_user_id, 'customers.create', p_user_id),
    (p_user_id, 'customers.edit', p_user_id),
    (p_user_id, 'customers.delete', p_user_id),
    (p_user_id, 'suppliers.view', p_user_id),
    (p_user_id, 'suppliers.create', p_user_id),
    (p_user_id, 'suppliers.edit', p_user_id),
    (p_user_id, 'suppliers.delete', p_user_id),
    (p_user_id, 'items.view', p_user_id),
    (p_user_id, 'items.create', p_user_id),
    (p_user_id, 'items.edit', p_user_id),
    (p_user_id, 'items.delete', p_user_id),
    (p_user_id, 'quotes.view', p_user_id),
    (p_user_id, 'quotes.create', p_user_id),
    (p_user_id, 'quotes.edit', p_user_id),
    (p_user_id, 'quotes.delete', p_user_id),
    (p_user_id, 'quotes.approve', p_user_id)
    ON CONFLICT (user_id, permission) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. 프로필 생성 시 기본 권한 부여 트리거
CREATE OR REPLACE FUNCTION trigger_grant_default_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- 새 프로필 생성 시 기본 권한 부여
  PERFORM grant_default_permissions(NEW.id, NEW.role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_new_profile_permissions ON profiles;
CREATE TRIGGER trigger_new_profile_permissions
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_grant_default_permissions();

-- 8. check_user_permission 함수 생성 (향후 사용)
CREATE OR REPLACE FUNCTION check_user_permission(p_user_id UUID, p_permission_name VARCHAR(100))
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR(50);
  has_permission BOOLEAN DEFAULT FALSE;
BEGIN
  -- super_admin은 모든 권한 보유
  SELECT role INTO user_role FROM profiles WHERE id = p_user_id;
  
  IF user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- 권한 테이블에서 확인
  SELECT EXISTS(
    SELECT 1 FROM user_permissions 
    WHERE user_permissions.user_id = p_user_id 
    AND user_permissions.permission = p_permission_name 
    AND is_active = true
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 기존 사용자들에게 기본 권한 부여 (변수명 충돌 수정)
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN SELECT id, role FROM profiles LOOP
    PERFORM grant_default_permissions(profile_record.id, profile_record.role);
  END LOOP;
END $$;

-- 10. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission);
CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON user_permissions(user_id, permission) WHERE is_active = true;

-- 권한 시스템 완료 로그
DO $$
BEGIN
  RAISE NOTICE '✅ Google OAuth 로그인 권한 문제 해결 완료 (수정버전)';
  RAISE NOTICE '📝 RLS 정책이 단순화되었으며, 기본 권한 시스템이 구축되었습니다';
  RAISE NOTICE '🔐 사용자는 이제 프로필을 생성할 수 있으며, 기본 권한이 자동으로 부여됩니다';
  RAISE NOTICE '🔧 변수명 충돌 문제가 해결되었습니다';
END $$;