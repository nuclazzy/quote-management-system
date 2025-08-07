-- projects 관련 테이블 확인 및 수정

-- 1. 현재 존재하는 projects 관련 테이블 확인
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name LIKE '%project%'
ORDER BY table_name;

-- 2. projects_motionsense 테이블의 RLS 정책 확인
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'projects_motionsense';

-- 3. projects_motionsense 테이블의 RLS 상태 확인
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'projects_motionsense';

-- 4. projects_motionsense 테이블의 RLS 비활성화
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- 기존 정책 삭제
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'projects_motionsense'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON projects_motionsense', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- RLS 비활성화
ALTER TABLE projects_motionsense DISABLE ROW LEVEL SECURITY;

-- 5. projects 뷰나 별칭이 있는지 확인
SELECT 
    viewname,
    definition
FROM pg_views
WHERE viewname = 'projects';

-- 6. projects라는 이름의 뷰가 없다면 생성 (projects_motionsense를 가리키도록)
DO $$
BEGIN
    -- projects 뷰가 없으면 생성
    IF NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'projects') THEN
        -- projects_motionsense 테이블을 projects로 접근할 수 있도록 뷰 생성
        EXECUTE 'CREATE VIEW projects AS SELECT * FROM projects_motionsense';
        RAISE NOTICE 'Created projects view pointing to projects_motionsense';
    END IF;
END $$;

-- 7. 최종 상태 확인
SELECT 
    'projects_motionsense' as table_name,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'projects_motionsense'

UNION ALL

SELECT 
    'projects (view)' as table_name,
    EXISTS(SELECT 1 FROM pg_views WHERE viewname = 'projects') as exists
;

SELECT '✅ projects_motionsense 테이블 RLS 비활성화 및 projects 뷰 생성 완료' as status;