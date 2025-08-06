-- 안전한 최소 버전 - 실제 존재하는 컬럼만 사용

-- 견적서 총액 계산 함수
CREATE OR REPLACE FUNCTION calculate_quote_total(quote_id_param UUID)
RETURNS TABLE(
  subtotal_amount DECIMAL,
  tax_amount DECIMAL,
  discount_amount DECIMAL,
  total_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH item_totals AS (
    SELECT 
      COALESCE(SUM(qi.line_total), 0) as subtotal
    FROM quote_items qi
    WHERE qi.quote_id = quote_id_param
  ),
  quote_info AS (
    SELECT 
      COALESCE(q.tax_rate, 10) as tax_rate,
      COALESCE(q.discount_amount, 0) as discount
    FROM quotes q
    WHERE q.id = quote_id_param
  )
  SELECT 
    it.subtotal::DECIMAL as subtotal_amount,
    (it.subtotal * qi.tax_rate / 100)::DECIMAL as tax_amount,
    qi.discount::DECIMAL as discount_amount,
    (it.subtotal + (it.subtotal * qi.tax_rate / 100) - qi.discount)::DECIMAL as total_amount
  FROM item_totals it, quote_info qi;
END;
$$ LANGUAGE plpgsql;

-- 견적서 요약 뷰 (안전한 버전 - 존재하는 컬럼만 사용)
DROP VIEW IF EXISTS quote_summary;
CREATE VIEW quote_summary AS
SELECT 
  q.id,
  COALESCE(q.quote_number, 'N/A') as quote_number,
  COALESCE(q.title, q.description, 'Untitled') as title,
  q.client_id,
  c.name as client_name,
  q.status,
  q.created_at,
  COALESCE(q.total_amount, 0) as total_amount,
  (SELECT COUNT(*) FROM quote_items qi WHERE qi.quote_id = q.id) as item_count
FROM quotes q
LEFT JOIN clients c ON q.client_id = c.id;

-- 프로젝트 상태 요약 뷰 (안전한 버전 - 실제 존재하는 컬럼만 사용)
DROP VIEW IF EXISTS project_status_summary;
CREATE VIEW project_status_summary AS
SELECT 
  p.id,
  p.name,
  p.client_id,
  c.name as client_name,
  p.status,
  COALESCE(p.actual_amount, 0) as contract_amount,  -- actual_amount를 contract_amount로 별칭
  p.created_at
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id;

-- 견적서 번호 자동 생성 트리거 함수 (quote_number 컬럼이 있는 경우만)
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  new_number TEXT;
  current_year INT;
  max_number INT;
  has_column BOOLEAN;
BEGIN
  -- quote_number 컬럼 존재 여부 확인
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes' AND column_name = 'quote_number'
  ) INTO has_column;
  
  IF NOT has_column THEN
    RETURN NEW;
  END IF;
  
  -- 현재 연도 가져오기
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- 이번 연도의 최대 번호 찾기
  SELECT 
    COALESCE(MAX(CAST(SUBSTRING(quote_number FROM '\d+$') AS INT)), 0)
  INTO max_number
  FROM quotes
  WHERE quote_number LIKE 'QUOTE-' || current_year || '-%';
  
  -- 새 번호 생성
  new_number := 'QUOTE-' || current_year || '-' || LPAD((max_number + 1)::TEXT, 3, '0');
  
  NEW.quote_number := new_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 견적서 번호 자동 생성 트리거 (조건부)
DROP TRIGGER IF EXISTS auto_generate_quote_number ON quotes;

-- quote_number 컬럼이 있는 경우에만 트리거 생성
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes' AND column_name = 'quote_number'
  ) THEN
    CREATE TRIGGER auto_generate_quote_number
      BEFORE INSERT ON quotes
      FOR EACH ROW
      WHEN (NEW.quote_number IS NULL)
      EXECUTE FUNCTION generate_quote_number();
  END IF;
END $$;

-- RLS (Row Level Security) 정책 설정 - 기본적인 것만
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 견적서 RLS 정책
DROP POLICY IF EXISTS "Users can view all quotes" ON quotes;
CREATE POLICY "Users can view all quotes" ON quotes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create quotes" ON quotes;
CREATE POLICY "Users can create quotes" ON quotes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update quotes" ON quotes;
CREATE POLICY "Users can update quotes" ON quotes
  FOR UPDATE USING (true);

-- 견적서 항목 RLS 정책
DROP POLICY IF EXISTS "Users can view all quote items" ON quote_items;
CREATE POLICY "Users can view all quote items" ON quote_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage quote items" ON quote_items;
CREATE POLICY "Users can manage quote items" ON quote_items
  FOR ALL USING (true);

-- 클라이언트 RLS 정책
DROP POLICY IF EXISTS "Users can view all clients" ON clients;
CREATE POLICY "Users can view all clients" ON clients
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage clients" ON clients;
CREATE POLICY "Users can manage clients" ON clients
  FOR ALL USING (true);

-- 프로젝트 RLS 정책
DROP POLICY IF EXISTS "Users can view all projects" ON projects;
CREATE POLICY "Users can view all projects" ON projects
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage projects" ON projects;
CREATE POLICY "Users can manage projects" ON projects
  FOR ALL USING (true);

-- 기본 인덱스만 생성 (안전하게)
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active) WHERE is_active = true;