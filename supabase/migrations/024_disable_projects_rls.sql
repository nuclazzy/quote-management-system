-- projects 테이블의 RLS 비활성화
-- permission denied 오류 해결

-- 1. projects 테이블의 기존 RLS 정책 모두 삭제
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'projects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON projects', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- 2. projects 테이블의 RLS 비활성화
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- 3. 상태 확인
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'projects';

-- 결과가 없어야 정상 (모든 정책이 삭제됨)

-- 4. RLS 상태 확인
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'projects';

-- rowsecurity가 false여야 정상

-- 5. 최종 확인 메시지
SELECT '✅ projects 테이블 RLS 비활성화 완료' as status;