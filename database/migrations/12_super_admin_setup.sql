-- ========================================
-- 슈퍼 관리자 계정 설정 및 사용자 관리 시스템
-- 12_super_admin_setup.sql
-- ========================================

-- ========================================
-- 1. 슈퍼 관리자 프로필 사전 생성
-- ========================================

-- lewis@motionsense.co.kr 슈퍼 관리자 계정 생성
-- UUID는 실제 Google OAuth 로그인 시 업데이트됨
INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001', -- 임시 UUID (실제 로그인 시 업데이트)
    'lewis@motionsense.co.kr',
    'Lewis Kim (Super Admin)',
    'super_admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    role = 'super_admin',
    is_active = true,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

-- ========================================
-- 2. 슈퍼 관리자 권한 체크 함수 개선
-- ========================================

-- 슈퍼 관리자 확인 함수
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_email TEXT;
    user_role TEXT;
BEGIN
    -- 현재 사용자의 이메일과 역할 가져오기
    SELECT auth.email(), get_current_user_role() INTO user_email, user_role;
    
    -- lewis@motionsense.co.kr이거나 super_admin 역할인 경우
    RETURN (user_email = 'lewis@motionsense.co.kr' OR user_role = 'super_admin');
END;
$$;

-- 현재 사용자 역할 확인 함수 개선
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
    user_email TEXT;
BEGIN
    -- 현재 사용자 이메일 가져오기
    SELECT auth.email() INTO user_email;
    
    -- lewis@motionsense.co.kr은 항상 super_admin
    IF user_email = 'lewis@motionsense.co.kr' THEN
        RETURN 'super_admin';
    END IF;
    
    -- 일반 사용자 역할 조회
    SELECT role INTO user_role
    FROM profiles
    WHERE id = auth.uid();
    
    RETURN COALESCE(user_role, 'member');
END;
$$;

-- 현재 사용자 활성 상태 확인 함수 개선
CREATE OR REPLACE FUNCTION is_current_user_active()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_active BOOLEAN;
    user_email TEXT;
BEGIN
    -- 현재 사용자 이메일 가져오기
    SELECT auth.email() INTO user_email;
    
    -- lewis@motionsense.co.kr은 항상 활성
    IF user_email = 'lewis@motionsense.co.kr' THEN
        RETURN true;
    END IF;
    
    -- 일반 사용자 활성 상태 조회
    SELECT is_active INTO user_active
    FROM profiles
    WHERE id = auth.uid();
    
    RETURN COALESCE(user_active, false);
END;
$$;

-- ========================================
-- 3. 프로필 생성/업데이트 함수
-- ========================================

-- 사용자 프로필 자동 생성/업데이트 함수
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
    -- lewis@motionsense.co.kr은 super_admin 역할
    IF p_email = 'lewis@motionsense.co.kr' THEN
        default_role := 'super_admin';
    END IF;
    
    -- 프로필 생성 또는 업데이트
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
    
    -- lewis@motionsense.co.kr의 경우 이메일로도 업데이트
    IF p_email = 'lewis@motionsense.co.kr' THEN
        UPDATE profiles 
        SET 
            id = p_user_id,
            role = 'super_admin',
            is_active = true,
            updated_at = NOW()
        WHERE email = 'lewis@motionsense.co.kr' AND id != p_user_id;
    END IF;
    
    RETURN result_profile;
END;
$$;

-- ========================================
-- 4. RLS 정책 업데이트
-- ========================================

-- 기존 profiles 정책 삭제
DROP POLICY IF EXISTS "profiles_insert_system" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;

-- 새로운 profiles 정책 생성
-- 슈퍼 관리자는 모든 프로필 조회 가능
CREATE POLICY "profiles_select_super_admin" ON profiles
FOR SELECT USING (
    is_super_admin()
);

-- 활성 사용자는 자신의 프로필 조회 가능
CREATE POLICY "profiles_select_own" ON profiles
FOR SELECT USING (
    id = auth.uid() 
    AND is_active = true
);

-- 관리자는 모든 프로필 조회 가능
CREATE POLICY "profiles_select_admin" ON profiles
FOR SELECT USING (
    get_current_user_role() IN ('admin', 'super_admin')
    AND is_current_user_active()
);

-- 슈퍼 관리자는 프로필 생성 가능
CREATE POLICY "profiles_insert_super_admin" ON profiles
FOR INSERT WITH CHECK (
    is_super_admin()
);

-- 시스템 함수를 통한 프로필 생성 허용
CREATE POLICY "profiles_insert_system" ON profiles
FOR INSERT WITH CHECK (
    -- 도메인 검증
    is_allowed_domain(email)
);

-- ========================================
-- 5. 사용자 관리 함수들
-- ========================================

-- 사용자 초대 함수 (슈퍼 관리자/관리자만 사용 가능)
CREATE OR REPLACE FUNCTION invite_user(
    p_email TEXT,
    p_full_name TEXT DEFAULT NULL,
    p_role TEXT DEFAULT 'member'
)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_profile profiles;
BEGIN
    -- 권한 확인
    IF NOT (get_current_user_role() IN ('super_admin', 'admin') AND is_current_user_active()) THEN
        RAISE EXCEPTION '사용자 초대 권한이 없습니다.';
    END IF;
    
    -- 도메인 검증
    IF NOT is_allowed_domain(p_email) THEN
        RAISE EXCEPTION '허용되지 않은 도메인입니다. @motionsense.co.kr 계정만 가능합니다.';
    END IF;
    
    -- 역할 검증
    IF p_role NOT IN ('member', 'admin') THEN
        RAISE EXCEPTION '잘못된 역할입니다. member 또는 admin만 가능합니다.';
    END IF;
    
    -- 임시 사용자 프로필 생성 (실제 로그인 시 업데이트됨)
    INSERT INTO profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        p_email,
        COALESCE(p_full_name, SPLIT_PART(p_email, '@', 1)),
        p_role,
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        role = EXCLUDED.role,
        is_active = true,
        updated_at = NOW()
    RETURNING * INTO result_profile;
    
    RETURN result_profile;
END;
$$;

-- 사용자 역할 변경 함수
CREATE OR REPLACE FUNCTION change_user_role(
    p_user_id UUID,
    p_new_role TEXT
)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_profile profiles;
    target_email TEXT;
BEGIN
    -- 권한 확인
    IF NOT (get_current_user_role() IN ('super_admin', 'admin') AND is_current_user_active()) THEN
        RAISE EXCEPTION '사용자 역할 변경 권한이 없습니다.';
    END IF;
    
    -- 대상 사용자 이메일 확인
    SELECT email INTO target_email FROM profiles WHERE id = p_user_id;
    
    -- lewis@motionsense.co.kr은 변경 불가
    IF target_email = 'lewis@motionsense.co.kr' THEN
        RAISE EXCEPTION 'Super Admin 계정의 역할은 변경할 수 없습니다.';
    END IF;
    
    -- 역할 검증
    IF p_new_role NOT IN ('member', 'admin') THEN
        RAISE EXCEPTION '잘못된 역할입니다. member 또는 admin만 가능합니다.';
    END IF;
    
    -- 역할 업데이트
    UPDATE profiles 
    SET 
        role = p_new_role,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING * INTO result_profile;
    
    RETURN result_profile;
END;
$$;

-- 사용자 비활성화 함수
CREATE OR REPLACE FUNCTION deactivate_user(p_user_id UUID)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_profile profiles;
    target_email TEXT;
BEGIN
    -- 권한 확인
    IF NOT (get_current_user_role() IN ('super_admin', 'admin') AND is_current_user_active()) THEN
        RAISE EXCEPTION '사용자 비활성화 권한이 없습니다.';
    END IF;
    
    -- 대상 사용자 이메일 확인
    SELECT email INTO target_email FROM profiles WHERE id = p_user_id;
    
    -- lewis@motionsense.co.kr은 비활성화 불가
    IF target_email = 'lewis@motionsense.co.kr' THEN
        RAISE EXCEPTION 'Super Admin 계정은 비활성화할 수 없습니다.';
    END IF;
    
    -- 사용자 비활성화
    UPDATE profiles 
    SET 
        is_active = false,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING * INTO result_profile;
    
    RETURN result_profile;
END;
$$;

-- ========================================
-- 6. Auth 트리거 개선
-- ========================================

-- 사용자 생성 트리거 함수 개선
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_email TEXT;
    user_name TEXT;
BEGIN
    -- 사용자 정보 추출
    user_email := NEW.email;
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        SPLIT_PART(user_email, '@', 1)
    );
    
    -- 도메인 검증
    IF NOT is_allowed_domain(user_email) THEN
        RAISE EXCEPTION '허용되지 않은 도메인입니다. @motionsense.co.kr 계정만 가능합니다.';
    END IF;
    
    -- 프로필 생성/업데이트
    PERFORM upsert_user_profile(NEW.id, user_email, user_name);
    
    RETURN NEW;
END;
$$;

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ========================================
-- 7. 사용자 관리 뷰
-- ========================================

-- 사용자 관리 뷰 (관리자용)
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
    -- 슈퍼 관리자는 모든 사용자 조회 가능
    is_super_admin()
    OR 
    -- 관리자는 super_admin 제외한 사용자 조회 가능
    (get_current_user_role() = 'admin' AND is_current_user_active() AND p.role != 'super_admin')
ORDER BY p.created_at DESC;

COMMENT ON VIEW user_management_view IS '사용자 관리용 뷰 (관리자 전용)';

-- ========================================
-- 완료 메시지
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '슈퍼 관리자 시스템 설정 완료!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ lewis@motionsense.co.kr → Super Admin 등록';
    RAISE NOTICE '✅ 자동 프로필 생성/업데이트 시스템';
    RAISE NOTICE '✅ 사용자 초대 및 관리 함수';
    RAISE NOTICE '✅ 역할 기반 권한 관리';
    RAISE NOTICE '✅ 도메인 제한 (@motionsense.co.kr)';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Super Admin: lewis@motionsense.co.kr';
    RAISE NOTICE '- 모든 시스템 권한';
    RAISE NOTICE '- 사용자 초대/관리 가능';
    RAISE NOTICE '- 역할 변경 가능';
    RAISE NOTICE '========================================';
END $$;