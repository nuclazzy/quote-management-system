-- ========================================
-- 역할 제약 조건 수정 (super_admin 추가)
-- 13_fix_role_constraint.sql
-- ========================================

-- 기존 제약 조건 확인 및 삭제
DO $$
BEGIN
    -- profiles_role_check 제약 조건이 존재하면 삭제
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_role_check' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
        RAISE NOTICE '기존 profiles_role_check 제약 조건을 삭제했습니다.';
    END IF;
END $$;

-- 새로운 제약 조건 추가 (super_admin 포함)
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('member', 'admin', 'super_admin'));

DO $$
BEGIN
    RAISE NOTICE '새로운 profiles_role_check 제약 조건을 추가했습니다 (super_admin 포함).';
END $$;

-- 제약 조건 확인
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'profiles_role_check';