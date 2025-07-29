-- ========================================
-- 기존 정책 정리 후 슈퍼 관리자 시스템 재설정
-- 14_clean_and_setup_super_admin.sql
-- ========================================

-- ========================================
-- 1. 기존 정책들 모두 삭제
-- ========================================

-- profiles 테이블의 모든 기존 정책 삭제
DROP POLICY IF EXISTS "profiles_select_super_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_super_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_system" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;

RAISE NOTICE '기존 profiles 정책들을 모두 삭제했습니다.';

-- ========================================
-- 2. 기존 함수들 정리
-- ========================================

-- 기존 함수가 있으면 덮어쓰기 (CREATE OR REPLACE 사용)
DROP FUNCTION IF EXISTS is_super_admin();
DROP FUNCTION IF EXISTS get_current_user_role();
DROP FUNCTION IF EXISTS is_current_user_active();
DROP FUNCTION IF EXISTS upsert_user_profile(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS invite_user(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS change_user_role(UUID, TEXT);
DROP FUNCTION IF EXISTS deactivate_user(UUID);
DROP FUNCTION IF EXISTS handle_new_user();

RAISE NOTICE '기존 함수들을 정리했습니다.';

-- ========================================
-- 3. 역할 제약 조건 수정
-- ========================================

-- 기존 제약 조건 삭제
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 새로운 제약 조건 추가 (super_admin 포함)
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('member', 'admin', 'super_admin'));

RAISE NOTICE '역할 제약 조건을 업데이트했습니다 (super_admin 포함).';

-- ========================================
-- 4. 슈퍼 관리자 계정 생성/업데이트
-- ========================================

-- lewis@motionsense.co.kr 슈퍼 관리자 계정 생성/업데이트
INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001', -- 임시 UUID
    'lewis@motionsense.co.kr',
    'Lewis Kim (Super Admin)',
    'super_admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    role = 'super_admin',
    is_active = true,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();

RAISE NOTICE 'lewis@motionsense.co.kr 슈퍼 관리자 계정을 설정했습니다.';

-- ========================================
-- 5. 권한 관리 함수들 재생성
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
    -- 현재 인증된 사용자 정보 가져오기
    SELECT auth.email() INTO user_email;
    
    -- 인증되지 않은 사용자는 false
    IF user_email IS NULL THEN
        RETURN false;
    END IF;
    
    -- lewis@motionsense.co.kr은 항상 super_admin
    IF user_email = 'lewis@motionsense.co.kr' THEN
        RETURN true;
    END IF;
    
    -- 일반 사용자 역할 확인
    SELECT role INTO user_role
    FROM profiles
    WHERE id = auth.uid() AND is_active = true;
    
    RETURN COALESCE(user_role = 'super_admin', false);
END;
$$;

-- 현재 사용자 역할 확인 함수
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
    user_email TEXT;
BEGIN
    -- 현재 사용자 정보 가져오기
    SELECT auth.email() INTO user_email;
    
    -- 인증되지 않은 사용자
    IF user_email IS NULL THEN
        RETURN 'anonymous';
    END IF;
    
    -- lewis@motionsense.co.kr은 항상 super_admin
    IF user_email = 'lewis@motionsense.co.kr' THEN
        RETURN 'super_admin';
    END IF;
    
    -- 일반 사용자 역할 조회
    SELECT role INTO user_role
    FROM profiles
    WHERE id = auth.uid() AND is_active = true;
    
    RETURN COALESCE(user_role, 'member');
END;
$$;

-- 현재 사용자 활성 상태 확인 함수
CREATE OR REPLACE FUNCTION is_current_user_active()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_active BOOLEAN;
    user_email TEXT;
BEGIN
    -- 현재 사용자 정보 가져오기
    SELECT auth.email() INTO user_email;
    
    -- 인증되지 않은 사용자
    IF user_email IS NULL THEN
        RETURN false;
    END IF;
    
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

RAISE NOTICE '권한 관리 함수들을 생성했습니다.';

-- ========================================
-- 6. 프로필 관리 함수
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
    
    -- lewis@motionsense.co.kr의 경우 이메일 기반으로도 업데이트
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

RAISE NOTICE 'upsert_user_profile 함수를 생성했습니다.';

-- ========================================
-- 7. 새로운 RLS 정책 생성
-- ========================================

-- 슈퍼 관리자는 모든 프로필 조회 가능
CREATE POLICY "profiles_select_super_admin" ON profiles
FOR SELECT USING (
    is_super_admin()
);

-- 활성 사용자는 자신의 프로필 조회 가능
CREATE POLICY "profiles_select_own" ON profiles
FOR SELECT USING (
    id = auth.uid() AND is_active = true
);

-- 관리자는 모든 프로필 조회 가능 (super_admin 제외)
CREATE POLICY "profiles_select_admin" ON profiles
FOR SELECT USING (
    get_current_user_role() IN ('admin', 'super_admin')
    AND is_current_user_active()
);

-- 시스템을 통한 프로필 생성 허용 (OAuth 콜백 등)
CREATE POLICY "profiles_insert_system" ON profiles
FOR INSERT WITH CHECK (
    -- 도메인 검증: @motionsense.co.kr만 허용
    email LIKE '%@motionsense.co.kr'
);

-- 슈퍼 관리자는 프로필 생성 가능
CREATE POLICY "profiles_insert_super_admin" ON profiles
FOR INSERT WITH CHECK (
    is_super_admin()
);

-- 자신의 프로필 업데이트 허용
CREATE POLICY "profiles_update_own" ON profiles
FOR UPDATE USING (
    id = auth.uid() AND is_active = true
) WITH CHECK (
    id = auth.uid() AND is_active = true
);

-- 관리자는 다른 사용자 프로필 업데이트 가능
CREATE POLICY "profiles_update_admin" ON profiles
FOR UPDATE USING (
    get_current_user_role() IN ('admin', 'super_admin')
    AND is_current_user_active()
) WITH CHECK (
    get_current_user_role() IN ('admin', 'super_admin')
    AND is_current_user_active()
);

RAISE NOTICE '새로운 RLS 정책들을 생성했습니다.';

-- ========================================
-- 8. Auth 트리거 설정
-- ========================================

-- 사용자 생성 트리거 함수
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
    IF user_email NOT LIKE '%@motionsense.co.kr' THEN
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

RAISE NOTICE 'Auth 트리거를 설정했습니다.';

-- ========================================
-- 9. 완료 메시지
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '슈퍼 관리자 시스템 재설정 완료!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ 기존 정책 및 함수 정리';
    RAISE NOTICE '✅ lewis@motionsense.co.kr → Super Admin';
    RAISE NOTICE '✅ upsert_user_profile 함수 생성';
    RAISE NOTICE '✅ 권한 관리 시스템 구축';
    RAISE NOTICE '✅ RLS 정책 재설정';
    RAISE NOTICE '✅ OAuth 트리거 설정';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Super Admin: lewis@motionsense.co.kr';
    RAISE NOTICE '- 모든 시스템 권한';
    RAISE NOTICE '- OAuth 로그인 시 자동 권한 부여';
    RAISE NOTICE '========================================';
END $$;