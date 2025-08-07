-- 모든 주요 테이블에 대한 권한 부여 및 RLS 비활성화

-- 1. 모든 테이블의 RLS 비활성화 및 권한 부여
DO $$
DECLARE
    r RECORD;
BEGIN
    -- 주요 테이블들의 RLS 비활성화 및 권한 부여
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'quotes', 
            'quote_groups', 
            'quote_items_motionsense', 
            'quote_details',
            'projects',
            'projects_motionsense',
            'clients',
            'suppliers',
            'master_items',
            'items',
            'item_categories',
            'transactions',
            'transactions_motionsense',
            'project_expenses',
            'quote_templates',
            'profiles',
            'error_logs'
        )
    LOOP
        -- RLS 정책 삭제
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = r.tablename
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, r.tablename);
        END LOOP;
        
        -- RLS 비활성화
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', r.tablename);
        
        -- 모든 권한 부여
        EXECUTE format('GRANT ALL ON %I TO anon, authenticated, service_role', r.tablename);
        
        RAISE NOTICE 'Processed table: %', r.tablename;
    END LOOP;
    
    -- 시퀀스에 대한 권한 부여
    EXECUTE 'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role';
    
    -- 함수에 대한 실행 권한 부여
    EXECUTE 'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated';
    
    RAISE NOTICE '✅ All permissions granted successfully';
END $$;

-- 2. 뷰가 있다면 권한 부여
DO $$
DECLARE
    v RECORD;
BEGIN
    FOR v IN 
        SELECT viewname 
        FROM pg_views 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('GRANT ALL ON %I TO anon, authenticated, service_role', v.viewname);
        RAISE NOTICE 'Granted permissions on view: %', v.viewname;
    END LOOP;
END $$;

-- 3. 권한 확인
SELECT 
    'Tables with RLS disabled' as category,
    COUNT(*) as count
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false
AND tablename IN (
    'quotes', 'projects', 'clients', 'suppliers', 
    'master_items', 'transactions', 'quote_templates'
)

UNION ALL

SELECT 
    'Tables with permissions' as category,
    COUNT(DISTINCT table_name) as count
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND grantee IN ('anon', 'authenticated')
AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE');

-- 4. 최종 상태 메시지
SELECT '✅ All tables permissions granted and RLS disabled' as status,
       'You may need to refresh your application for changes to take effect' as note;