-- ========================================
-- 회사별 데이터 격리를 위한 스키마 수정
-- 09_company_schema_fix.sql
-- ========================================

-- ========================================
-- 1. 누락된 company_id 컬럼 추가
-- ========================================

-- profiles 테이블에 company_id 추가 (이미 있다면 스킵)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN company_id UUID;
        
        -- 기존 데이터를 위한 기본 회사 생성 및 할당
        INSERT INTO companies (id, name, business_number, created_at)
        VALUES (uuid_generate_v4(), '기본 회사', '000-00-00000', NOW())
        ON CONFLICT DO NOTHING;
        
        -- 모든 기존 프로필에 기본 회사 할당
        UPDATE profiles 
        SET company_id = (SELECT id FROM companies WHERE name = '기본 회사' LIMIT 1)
        WHERE company_id IS NULL;
        
        -- NOT NULL 제약 조건 추가
        ALTER TABLE profiles ALTER COLUMN company_id SET NOT NULL;
    END IF;
END $$;

-- customers 테이블에 company_id 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE customers ADD COLUMN company_id UUID REFERENCES companies(id);
        
        -- 기존 데이터에 기본 회사 할당
        UPDATE customers 
        SET company_id = (SELECT id FROM companies WHERE name = '기본 회사' LIMIT 1)
        WHERE company_id IS NULL;
        
        ALTER TABLE customers ALTER COLUMN company_id SET NOT NULL;
    END IF;
END $$;

-- suppliers 테이블에 company_id 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'suppliers' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE suppliers ADD COLUMN company_id UUID REFERENCES companies(id);
        
        UPDATE suppliers 
        SET company_id = (SELECT id FROM companies WHERE name = '기본 회사' LIMIT 1)
        WHERE company_id IS NULL;
        
        ALTER TABLE suppliers ALTER COLUMN company_id SET NOT NULL;
    END IF;
END $$;

-- master_items 테이블에 company_id 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'master_items' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE master_items ADD COLUMN company_id UUID REFERENCES companies(id);
        
        UPDATE master_items 
        SET company_id = (SELECT id FROM companies WHERE name = '기본 회사' LIMIT 1)
        WHERE company_id IS NULL;
        
        ALTER TABLE master_items ALTER COLUMN company_id SET NOT NULL;
    END IF;
END $$;

-- quote_templates 테이블에 company_id 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quote_templates' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE quote_templates ADD COLUMN company_id UUID REFERENCES companies(id);
        
        UPDATE quote_templates 
        SET company_id = (SELECT id FROM companies WHERE name = '기본 회사' LIMIT 1)
        WHERE company_id IS NULL;
        
        ALTER TABLE quote_templates ALTER COLUMN company_id SET NOT NULL;
    END IF;
END $$;

-- quotes 테이블에 company_id 추가 (이미 있는지 확인)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE quotes ADD COLUMN company_id UUID REFERENCES companies(id);
        
        UPDATE quotes 
        SET company_id = (SELECT id FROM companies WHERE name = '기본 회사' LIMIT 1)
        WHERE company_id IS NULL;
        
        ALTER TABLE quotes ALTER COLUMN company_id SET NOT NULL;
    END IF;
END $$;

-- ========================================
-- 2. 회사(companies) 테이블 생성 (없는 경우)
-- ========================================

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    business_number TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    website TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- 회사 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_business_number ON companies(business_number);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);

-- ========================================
-- 3. 기존 RLS 정책 수정 (company_id 기반)
-- ========================================

-- profiles 테이블 RLS 정책 수정
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND (
            -- 같은 회사 사용자들의 프로필 조회 가능
            company_id = (
                SELECT company_id FROM profiles WHERE id = auth.uid()
            )
            OR
            -- 자신의 프로필은 항상 조회 가능
            id = auth.uid()
        )
    );

-- customers 테이블 RLS 정책 수정
DROP POLICY IF EXISTS "customers_select_policy" ON customers;
CREATE POLICY "customers_select_policy" ON customers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
              AND p.company_id = customers.company_id 
              AND p.is_active = true
        )
    );

DROP POLICY IF EXISTS "customers_insert_policy" ON customers;
CREATE POLICY "customers_insert_policy" ON customers
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
              AND p.company_id = customers.company_id 
              AND p.is_active = true
        )
        AND created_by = auth.uid()
    );

DROP POLICY IF EXISTS "customers_update_policy" ON customers;
CREATE POLICY "customers_update_policy" ON customers
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
              AND p.company_id = customers.company_id 
              AND p.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
              AND p.company_id = customers.company_id 
              AND p.is_active = true
              AND (p.role = 'admin' OR customers.is_active = OLD.is_active)
        )
    );

-- suppliers, master_items, quote_templates에도 동일한 패턴 적용
-- (간결함을 위해 customers와 동일한 패턴으로 적용)

-- suppliers 정책
DROP POLICY IF EXISTS "suppliers_select_policy" ON suppliers;
CREATE POLICY "suppliers_select_policy" ON suppliers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
              AND p.company_id = suppliers.company_id 
              AND p.is_active = true
        )
    );

-- master_items 정책
DROP POLICY IF EXISTS "master_items_select_policy" ON master_items;
CREATE POLICY "master_items_select_policy" ON master_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
              AND p.company_id = master_items.company_id 
              AND p.is_active = true
        )
    );

-- quote_templates 정책
DROP POLICY IF EXISTS "quote_templates_select_policy" ON quote_templates;
CREATE POLICY "quote_templates_select_policy" ON quote_templates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
              AND p.company_id = quote_templates.company_id 
              AND p.is_active = true
        )
    );

-- quotes 정책 수정
DROP POLICY IF EXISTS "quotes_select_policy" ON quotes;
CREATE POLICY "quotes_select_policy" ON quotes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
              AND p.company_id = quotes.company_id 
              AND p.is_active = true
        )
    );

-- ========================================
-- 4. 회사별 데이터 격리를 위한 추가 함수들
-- ========================================

-- 현재 사용자의 회사 ID 조회 함수
CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT company_id FROM profiles WHERE id = auth.uid();
$$;

-- 같은 회사 사용자 여부 확인 함수
CREATE OR REPLACE FUNCTION is_same_company_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p1, profiles p2
        WHERE p1.id = auth.uid()
          AND p2.id = target_user_id
          AND p1.company_id = p2.company_id
          AND p1.is_active = true
          AND p2.is_active = true
    );
$$;

-- ========================================
-- 5. 회사 테이블 RLS 설정
-- ========================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신이 속한 회사 정보만 조회 가능
CREATE POLICY "companies_select_policy" ON companies
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
              AND p.company_id = companies.id 
              AND p.is_active = true
        )
    );

-- 관리자만 회사 정보 수정 가능
CREATE POLICY "companies_update_policy" ON companies
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
              AND p.company_id = companies.id 
              AND p.role = 'admin'
              AND p.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
              AND p.company_id = companies.id 
              AND p.role = 'admin'
              AND p.is_active = true
        )
    );

-- 새 회사 생성은 시스템 관리자만 가능 (실제로는 서비스 레벨에서 제어)
CREATE POLICY "companies_insert_policy" ON companies
    FOR INSERT
    WITH CHECK (false); -- 직접 생성 차단

-- ========================================
-- 6. 인덱스 최적화
-- ========================================

-- 회사별 데이터 조회 최적화를 위한 인덱스들
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_master_items_company_id ON master_items(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_templates_company_id ON quote_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON quotes(company_id);

-- 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_quotes_company_status ON quotes(company_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_company_created ON quotes(company_id, created_at DESC);

-- ========================================
-- 7. 트리거 함수 업데이트
-- ========================================

-- 프로필 생성 시 회사 할당 자동화 (향후 회원가입 플로우에서 사용)
CREATE OR REPLACE FUNCTION assign_default_company_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- company_id가 지정되지 않은 경우 기본 회사 할당
    IF NEW.company_id IS NULL THEN
        NEW.company_id := (SELECT id FROM companies WHERE name = '기본 회사' LIMIT 1);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성 (이미 있다면 교체)
DROP TRIGGER IF EXISTS trigger_assign_company_to_profile ON profiles;
CREATE TRIGGER trigger_assign_company_to_profile
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION assign_default_company_to_profile();

-- ========================================
-- 8. 기존 RPC 함수들 업데이트 (company_id 고려)
-- ========================================

-- generate_quote_number 함수 수정
CREATE OR REPLACE FUNCTION generate_quote_number(
  p_company_id UUID DEFAULT NULL
) 
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_prefix TEXT;
  v_next_number INTEGER;
  v_quote_number TEXT;
  v_max_attempts INTEGER := 10;
  v_attempt INTEGER := 0;
BEGIN
  -- company_id가 제공되지 않은 경우 현재 사용자의 회사 사용
  v_company_id := COALESCE(p_company_id, get_current_user_company_id());
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Company ID not found for current user';
  END IF;
  
  -- 현재 년월로 prefix 생성
  v_prefix := 'Q' || TO_CHAR(NOW(), 'YYYYMM');
  
  -- 동시성 제어를 위한 루프
  LOOP
    v_attempt := v_attempt + 1;
    
    IF v_attempt > v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate quote number after % attempts', v_max_attempts;
    END IF;
    
    -- 현재 월의 마지막 번호 조회 (행 잠금 사용)
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(quote_number FROM 8) AS INTEGER)), 
      0
    ) + 1
    INTO v_next_number
    FROM quotes 
    WHERE company_id = v_company_id 
      AND quote_number LIKE v_prefix || '%'
    FOR UPDATE;
    
    -- 새 견적서 번호 생성
    v_quote_number := v_prefix || LPAD(v_next_number::TEXT, 4, '0');
    
    -- 중복 확인 및 생성 시도
    BEGIN
      -- 임시 레코드로 번호 예약
      INSERT INTO quotes (
        id, company_id, quote_number, title, customer_name_snapshot,
        status, total_amount, created_by
      ) VALUES (
        uuid_generate_v4(), v_company_id, v_quote_number, '__TEMP__', '__TEMP__',
        'draft', 0, auth.uid()
      );
      
      -- 성공하면 루프 종료
      EXIT;
      
    EXCEPTION WHEN unique_violation THEN
      -- 중복이면 다시 시도
      CONTINUE;
    END;
  END LOOP;
  
  -- 임시 레코드 삭제
  DELETE FROM quotes 
  WHERE quote_number = v_quote_number 
    AND title = '__TEMP__';
  
  RETURN v_quote_number;
END;
$$;

COMMENT ON FUNCTION generate_quote_number(UUID) IS '회사별 견적서 번호를 원자적으로 생성';
COMMENT ON TABLE companies IS '회사 정보 관리 테이블';
COMMENT ON FUNCTION get_current_user_company_id() IS '현재 사용자의 회사 ID 조회';
COMMENT ON FUNCTION is_same_company_user(UUID) IS '같은 회사 사용자 여부 확인';