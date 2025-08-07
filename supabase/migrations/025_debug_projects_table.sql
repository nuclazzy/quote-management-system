-- projects 테이블 문제 디버깅 및 해결

-- 1. 현재 존재하는 모든 프로젝트 관련 테이블 확인
SELECT 
    'Tables' as category,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
AND (table_name LIKE '%project%' OR table_name = 'projects')
ORDER BY table_name;

-- 2. projects 테이블이 존재하는지 확인
SELECT 
    EXISTS(
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'projects'
    ) as projects_exists,
    EXISTS(
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'projects_motionsense'
    ) as projects_motionsense_exists;

-- 3. 만약 projects가 뷰라면 정의 확인
SELECT 
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public' 
AND viewname = 'projects';

-- 4. RLS 상태 확인
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    tablename = 'projects' as is_projects_table
FROM pg_tables
WHERE schemaname = 'public'
AND (tablename = 'projects' OR tablename = 'projects_motionsense')
ORDER BY tablename;

-- 5. 현재 활성화된 RLS 정책 확인
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('projects', 'projects_motionsense')
ORDER BY tablename, policyname;

-- 6. 테이블 소유자 확인
SELECT 
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
AND (tablename = 'projects' OR tablename = 'projects_motionsense');

-- 7. 현재 사용자 권한 확인
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name IN ('projects', 'projects_motionsense')
ORDER BY table_name, grantee, privilege_type;

-- 8. projects 테이블이 실제로 존재한다면 RLS 비활성화 시도
DO $$
BEGIN
    -- projects 테이블이 존재하는 경우
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'projects'
    ) THEN
        -- 모든 RLS 정책 삭제
        PERFORM format('DROP POLICY IF EXISTS %I ON projects', policyname)
        FROM pg_policies 
        WHERE tablename = 'projects';
        
        -- RLS 비활성화
        EXECUTE 'ALTER TABLE projects DISABLE ROW LEVEL SECURITY';
        
        -- anon과 authenticated 역할에 권한 부여
        EXECUTE 'GRANT ALL ON projects TO anon, authenticated';
        
        RAISE NOTICE '✅ projects 테이블 RLS 비활성화 및 권한 부여 완료';
    ELSE
        RAISE NOTICE '⚠️ projects 테이블이 존재하지 않습니다';
    END IF;
    
    -- projects_motionsense 테이블이 존재하는 경우
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'projects_motionsense'
    ) THEN
        -- 모든 RLS 정책 삭제
        PERFORM format('DROP POLICY IF EXISTS %I ON projects_motionsense', policyname)
        FROM pg_policies 
        WHERE tablename = 'projects_motionsense';
        
        -- RLS 비활성화
        EXECUTE 'ALTER TABLE projects_motionsense DISABLE ROW LEVEL SECURITY';
        
        -- anon과 authenticated 역할에 권한 부여
        EXECUTE 'GRANT ALL ON projects_motionsense TO anon, authenticated';
        
        RAISE NOTICE '✅ projects_motionsense 테이블 RLS 비활성화 및 권한 부여 완료';
    END IF;
END $$;

-- 9. 만약 projects가 없고 projects_motionsense만 있다면 별칭 생성
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'projects'
    ) AND EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'projects_motionsense'
    ) THEN
        -- 기존 뷰가 있다면 삭제
        DROP VIEW IF EXISTS projects CASCADE;
        
        -- projects_motionsense를 가리키는 뷰 생성
        CREATE VIEW projects AS 
        SELECT * FROM projects_motionsense;
        
        -- 뷰에 대한 권한 부여
        GRANT ALL ON projects TO anon, authenticated;
        
        RAISE NOTICE '✅ projects 뷰 생성 완료 (projects_motionsense 참조)';
    END IF;
END $$;

-- 10. 최종 상태 확인
SELECT 
    'Final Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'projects' AND rowsecurity = false) 
        THEN '✅ projects 테이블 RLS 비활성화됨'
        WHEN EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'projects')
        THEN '✅ projects 뷰 존재함'
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'projects_motionsense' AND rowsecurity = false)
        THEN '✅ projects_motionsense 테이블 RLS 비활성화됨 (projects 테이블 없음)'
        ELSE '❌ projects 관련 테이블/뷰를 찾을 수 없음'
    END as status;

-- 11. 권한 확인
SELECT 
    'Permissions' as check_type,
    COUNT(*) as permission_count,
    string_agg(DISTINCT privilege_type, ', ') as privileges
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name IN ('projects', 'projects_motionsense')
AND grantee IN ('anon', 'authenticated');