-- 021_rename_customers_to_clients.sql
-- customers 테이블을 clients로 이름 변경 및 관련 참조 업데이트

-- Step 1: customers 테이블을 clients로 이름 변경
DO $$ 
BEGIN
    -- customers 테이블이 존재하는지 확인하고 clients로 이름 변경
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
        -- 기존 clients 테이블이 있다면 제거
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clients') THEN
            DROP TABLE clients CASCADE;
        END IF;
        
        -- customers 테이블을 clients로 이름 변경
        ALTER TABLE customers RENAME TO clients;
        
        -- 인덱스 이름 변경
        ALTER INDEX IF EXISTS customers_pkey RENAME TO clients_pkey;
        ALTER INDEX IF EXISTS customers_name_key RENAME TO clients_name_key;
        ALTER INDEX IF EXISTS idx_customers_business_registration_number RENAME TO idx_clients_business_registration_number;
        ALTER INDEX IF EXISTS idx_customers_created_by RENAME TO idx_clients_created_by;
        ALTER INDEX IF EXISTS idx_customers_is_active RENAME TO idx_clients_is_active;
        
        -- 시퀀스 이름 변경 (존재하는 경우)
        ALTER SEQUENCE IF EXISTS customers_id_seq RENAME TO clients_id_seq;
        
        RAISE NOTICE 'customers 테이블이 clients로 성공적으로 이름 변경되었습니다.';
    ELSE
        RAISE NOTICE 'customers 테이블이 존재하지 않습니다. 이미 clients로 변경되었을 수 있습니다.';
    END IF;
END $$;

-- Step 2: 외래 키 참조 업데이트
DO $$
BEGIN
    -- quotes 테이블의 client_id 외래 키 제약 조건 업데이트
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'quotes' 
        AND constraint_type = 'FOREIGN KEY' 
        AND constraint_name LIKE '%customer%'
    ) THEN
        -- 기존 외래 키 제약 조건 제거 후 새로 추가
        ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_client_id_fkey;
        ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_customer_id_fkey;
        ALTER TABLE quotes ADD CONSTRAINT quotes_client_id_fkey 
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'quotes 테이블의 외래 키가 업데이트되었습니다.';
    END IF;
    
    -- projects 테이블의 client_id 외래 키 제약 조건 업데이트
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'projects' 
        AND constraint_type = 'FOREIGN KEY' 
        AND constraint_name LIKE '%customer%'
    ) THEN
        ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_client_id_fkey;
        ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_customer_id_fkey;
        ALTER TABLE projects ADD CONSTRAINT projects_client_id_fkey 
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'projects 테이블의 외래 키가 업데이트되었습니다.';
    END IF;
END $$;

-- Step 3: 프로필 테이블과의 관계 업데이트
DO $$
BEGIN
    -- customers_created_by_fkey를 clients_created_by_fkey로 업데이트
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'clients' 
        AND constraint_type = 'FOREIGN KEY' 
        AND constraint_name LIKE '%customer%'
    ) THEN
        ALTER TABLE clients DROP CONSTRAINT IF EXISTS customers_created_by_fkey;
        ALTER TABLE clients DROP CONSTRAINT IF EXISTS customers_updated_by_fkey;
        
        ALTER TABLE clients ADD CONSTRAINT clients_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES auth.users(id);
        ALTER TABLE clients ADD CONSTRAINT clients_updated_by_fkey 
            FOREIGN KEY (updated_by) REFERENCES auth.users(id);
        
        RAISE NOTICE 'clients 테이블의 사용자 참조 외래 키가 업데이트되었습니다.';
    END IF;
END $$;

-- Step 4: 뷰 업데이트 (quote_summary 뷰)
DROP VIEW IF EXISTS quote_summary CASCADE;
CREATE VIEW quote_summary AS
SELECT 
    q.id,
    q.quote_number,
    q.title,
    q.client_id,
    c.name as client_name,
    q.status,
    q.quote_date,
    q.valid_until,
    q.total_amount,
    (
        SELECT COUNT(*) 
        FROM quote_items qi 
        WHERE qi.quote_id = q.id
    ) as item_count,
    COALESCE(calculated_totals.calculated_total, 0) as calculated_total,
    q.created_by,
    p.full_name as created_by_name,
    q.created_at
FROM quotes q
LEFT JOIN clients c ON c.id = q.client_id
LEFT JOIN profiles p ON p.id = q.created_by
LEFT JOIN (
    SELECT 
        quote_id,
        SUM(quantity * unit_price) as calculated_total
    FROM quote_items
    GROUP BY quote_id
) calculated_totals ON calculated_totals.quote_id = q.id
WHERE q.is_active = true;

-- Step 5: project_status_summary 뷰 업데이트
DROP VIEW IF EXISTS project_status_summary CASCADE;
CREATE VIEW project_status_summary AS
SELECT 
    p.id,
    p.project_number,
    p.name,
    p.client_id,
    c.name as client_name,
    p.status,
    p.progress_percentage,
    p.actual_amount as contract_amount,
    p.actual_cost,
    (p.actual_amount - COALESCE(p.actual_cost, 0)) as remaining_budget,
    p.planned_start_date,
    p.planned_end_date,
    p.project_manager_id,
    pm.full_name as project_manager_name
FROM projects p
LEFT JOIN clients c ON c.id = p.client_id
LEFT JOIN profiles pm ON pm.id = p.project_manager_id
WHERE p.is_active = true;

-- Step 6: 정리 및 권한 설정
DO $$
BEGIN
    -- RLS 정책이 비활성화된 상태를 유지 (이전 마이그레이션에서 비활성화됨)
    
    -- 테이블 존재 여부 확인 후 작업
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clients') THEN
        -- 기존 정책들 정리 (있다면)
        DROP POLICY IF EXISTS "Enable read access for authenticated users" ON clients;
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON clients;
        DROP POLICY IF EXISTS "Enable update for authenticated users" ON clients;
        DROP POLICY IF EXISTS "Enable delete for authenticated users" ON clients;
        
        RAISE NOTICE '클라이언트 테이블 설정이 완료되었습니다.';
    END IF;
END $$;

-- Step 7: 데이터 검증 쿼리
DO $$
DECLARE
    client_count INTEGER;
    quote_count INTEGER;
    project_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO client_count FROM clients;
    SELECT COUNT(*) INTO quote_count FROM quotes WHERE client_id IS NOT NULL;
    SELECT COUNT(*) INTO project_count FROM projects WHERE client_id IS NOT NULL;
    
    RAISE NOTICE '마이그레이션 완료: 클라이언트 %개, 견적서 %개, 프로젝트 %개', 
                 client_count, quote_count, project_count;
END $$;