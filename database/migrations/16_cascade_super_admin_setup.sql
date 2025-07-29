-- ========================================
-- 의존성 포함 슈퍼 관리자 시스템 설정
-- 16_cascade_super_admin_setup.sql
-- ========================================

-- 1. 의존성 있는 뷰들 삭제
DROP VIEW IF EXISTS user_management_view CASCADE;

-- 2. 기존 정책들 삭제
DROP POLICY IF EXISTS "profiles_select_super_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_super_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_system" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;

-- 3. 기존 함수들 CASCADE로 삭제
DROP FUNCTION IF EXISTS is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS get_current_user_role() CASCADE;
DROP FUNCTION IF EXISTS is_current_user_active() CASCADE;
DROP FUNCTION IF EXISTS upsert_user_profile(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS invite_user(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS change_user_role(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS deactivate_user(UUID) CASCADE;

-- 4. 기존 트리거 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 5. 역할 제약 조건 수정
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('member', 'admin', 'super_admin'));

-- 6. 슈퍼 관리자 계정 설정
INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'lewis@motionsense.co.kr',
    'Lewis Kim (Super Admin)',
    'super_admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    role = 'super_admin',
    is_active = true,
    updated_at = NOW();

-- 7. 핵심 함수들 생성
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN auth.email() = 'lewis@motionsense.co.kr';
END;
$$;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
BEGIN
    IF auth.email() = 'lewis@motionsense.co.kr' THEN
        RETURN 'super_admin';
    END IF;
    
    SELECT role INTO user_role FROM profiles WHERE id = auth.uid();
    RETURN COALESCE(user_role, 'member');
END;
$$;

CREATE OR REPLACE FUNCTION is_current_user_active()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_active BOOLEAN;
BEGIN
    IF auth.email() = 'lewis@motionsense.co.kr' THEN
        RETURN true;
    END IF;
    
    SELECT is_active INTO user_active FROM profiles WHERE id = auth.uid();
    RETURN COALESCE(user_active, false);
END;
$$;

CREATE OR REPLACE FUNCTION upsert_user_profile(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT DEFAULT NULL
)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_profile profiles;
    default_role TEXT := 'member';
BEGIN
    IF p_email = 'lewis@motionsense.co.kr' THEN
        default_role := 'super_admin';
    END IF;
    
    INSERT INTO profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_email,
        COALESCE(p_full_name, SPLIT_PART(p_email, '@', 1)),
        default_role,
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        role = CASE 
            WHEN EXCLUDED.email = 'lewis@motionsense.co.kr' THEN 'super_admin'
            ELSE profiles.role
        END,
        is_active = CASE
            WHEN EXCLUDED.email = 'lewis@motionsense.co.kr' THEN true
            ELSE profiles.is_active
        END,
        updated_at = NOW()
    RETURNING * INTO result_profile;
    
    RETURN result_profile;
END;
$$;

-- 8. RLS 정책 생성
CREATE POLICY "profiles_select_super_admin" ON profiles
FOR SELECT USING (is_super_admin());

CREATE POLICY "profiles_select_own" ON profiles
FOR SELECT USING (id = auth.uid() AND is_active = true);

CREATE POLICY "profiles_select_admin" ON profiles
FOR SELECT USING (get_current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "profiles_insert_system" ON profiles
FOR INSERT WITH CHECK (email LIKE '%@motionsense.co.kr');

CREATE POLICY "profiles_update_own" ON profiles
FOR UPDATE USING (id = auth.uid() AND is_active = true);

-- 9. Auth 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.email NOT LIKE '%@motionsense.co.kr' THEN
        RAISE EXCEPTION '허용되지 않은 도메인입니다.';
    END IF;
    
    PERFORM upsert_user_profile(
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
    );
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 10. 사용자 관리 뷰 재생성
CREATE OR REPLACE VIEW user_management_view AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.is_active,
    p.created_at,
    p.updated_at,
    CASE 
        WHEN p.email = 'lewis@motionsense.co.kr' THEN 'Super Admin'
        WHEN p.role = 'admin' THEN 'Administrator'
        ELSE 'Member'
    END as role_display,
    CASE 
        WHEN au.last_sign_in_at IS NOT NULL THEN au.last_sign_in_at
        ELSE NULL
    END as last_login
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE 
    is_super_admin()
    OR 
    (get_current_user_role() = 'admin' AND is_current_user_active() AND p.role != 'super_admin')
ORDER BY p.created_at DESC;