-- Supabase 데이터베이스 함수 및 뷰 생성 (project_number 없는 버전)

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
      q.tax_rate,
      q.discount_amount as discount
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

-- 견적서 요약 뷰
DROP VIEW IF EXISTS quote_summary;
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
  (SELECT COUNT(*) FROM quote_items qi WHERE qi.quote_id = q.id) as item_count,
  COALESCE((SELECT SUM(qi.line_total) FROM quote_items qi WHERE qi.quote_id = q.id), 0) as calculated_total,
  q.created_by,
  p.full_name as created_by_name,
  q.created_at
FROM quotes q
LEFT JOIN clients c ON q.client_id = c.id
LEFT JOIN profiles p ON q.created_by = p.id;

-- 프로젝트 상태 요약 뷰 (project_number 제외)
DROP VIEW IF EXISTS project_status_summary;
CREATE VIEW project_status_summary AS
SELECT 
  p.id,
  p.name,
  p.client_id,
  c.name as client_name,
  p.status,
  p.progress_percentage,
  p.contract_amount,
  p.actual_cost,
  (p.contract_amount - COALESCE(p.actual_cost, 0)) as remaining_budget,
  p.planned_start_date,
  p.planned_end_date,
  p.project_manager_id,
  pm.full_name as project_manager_name
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN profiles pm ON p.project_manager_id = pm.id;

-- 견적서 번호 자동 생성 트리거 함수
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  new_number TEXT;
  current_year INT;
  max_number INT;
BEGIN
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

-- 견적서 번호 자동 생성 트리거
DROP TRIGGER IF EXISTS auto_generate_quote_number ON quotes;
CREATE TRIGGER auto_generate_quote_number
  BEFORE INSERT ON quotes
  FOR EACH ROW
  WHEN (NEW.quote_number IS NULL)
  EXECUTE FUNCTION generate_quote_number();

-- 견적서 총액 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_quote_total()
RETURNS TRIGGER AS $$
DECLARE
  quote_totals RECORD;
BEGIN
  -- 견적서 총액 계산
  SELECT * INTO quote_totals
  FROM calculate_quote_total(
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.quote_id
      ELSE NEW.quote_id
    END
  );
  
  -- 견적서 업데이트
  UPDATE quotes
  SET 
    subtotal_amount = quote_totals.subtotal_amount,
    tax_amount = quote_totals.tax_amount,
    total_amount = quote_totals.total_amount,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = CASE 
    WHEN TG_OP = 'DELETE' THEN OLD.quote_id
    ELSE NEW.quote_id
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 견적서 항목 변경 시 총액 자동 업데이트 트리거
DROP TRIGGER IF EXISTS auto_update_quote_total ON quote_items;
CREATE TRIGGER auto_update_quote_total
  AFTER INSERT OR UPDATE OR DELETE ON quote_items
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_total();

-- RLS (Row Level Security) 정책 설정
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- 견적서 RLS 정책
CREATE POLICY "Users can view all quotes" ON quotes
  FOR SELECT USING (true);

CREATE POLICY "Users can create quotes" ON quotes
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own quotes" ON quotes
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own quotes" ON quotes
  FOR DELETE USING (auth.uid() = created_by);

-- 견적서 항목 RLS 정책
CREATE POLICY "Users can view all quote items" ON quote_items
  FOR SELECT USING (true);

CREATE POLICY "Users can manage quote items for own quotes" ON quote_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.created_by = auth.uid()
    )
  );

-- 클라이언트 RLS 정책
CREATE POLICY "Users can view all clients" ON clients
  FOR SELECT USING (true);

CREATE POLICY "Users can create clients" ON clients
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update clients" ON clients
  FOR UPDATE USING (true);

-- 프로젝트 RLS 정책
CREATE POLICY "Users can view all projects" ON projects
  FOR SELECT USING (true);

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update projects" ON projects
  FOR UPDATE USING (true);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_date ON quotes(quote_date);
CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON quotes(created_by);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_item_id ON quote_items(item_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_supplier_id ON quote_items(supplier_id);

CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_quote_id ON projects(quote_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active);
CREATE INDEX IF NOT EXISTS idx_items_is_active ON items(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);

-- 알림 트리거 함수 (견적서 상태 변경 시)
CREATE OR REPLACE FUNCTION notify_quote_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- 상태가 변경된 경우에만 알림 생성
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- 견적서 승인 알림
    IF NEW.status = 'approved' THEN
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        entity_type,
        entity_id,
        priority
      )
      VALUES (
        NEW.created_by,
        '견적서 승인됨',
        '견적서 "' || NEW.title || '"가 승인되었습니다.',
        'quote_approved',
        'quote',
        NEW.id,
        'high'
      );
    -- 견적서 거절 알림
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        entity_type,
        entity_id,
        priority
      )
      VALUES (
        NEW.created_by,
        '견적서 거절됨',
        '견적서 "' || NEW.title || '"가 거절되었습니다.',
        'quote_rejected',
        'quote',
        NEW.id,
        'high'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 견적서 상태 변경 알림 트리거
DROP TRIGGER IF EXISTS notify_on_quote_status_change ON quotes;
CREATE TRIGGER notify_on_quote_status_change
  AFTER UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION notify_quote_status_change();