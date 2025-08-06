-- 고객사 테이블 확장: 거래 조건, 메모, 선호사항 필드 추가
-- Migration: 22_extend_customers_fields.sql

-- 1. 거래 조건 및 메모 필드 추가
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100) DEFAULT '월말 정산',
ADD COLUMN IF NOT EXISTS discount_rate DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- 2. 미팅 기록 테이블 생성
CREATE TABLE IF NOT EXISTS customer_meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  meeting_date TIMESTAMP NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  meeting_type VARCHAR(50) DEFAULT 'meeting', -- meeting, call, email, visit
  participants TEXT[], -- 참석자 목록
  agenda TEXT, -- 안건
  notes TEXT, -- 미팅 내용
  follow_up_actions TEXT, -- 후속 조치
  next_meeting_date TIMESTAMP,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_customer_meetings_customer_id ON customer_meetings(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_meetings_date ON customer_meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_customers_payment_terms ON customers(payment_terms);

-- 4. RLS 정책 설정
ALTER TABLE customer_meetings ENABLE ROW LEVEL SECURITY;

-- 미팅 기록 조회 정책
CREATE POLICY "Users can view meetings for their organization" ON customer_meetings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_meetings.customer_id
      AND c.user_id = auth.uid()
    )
  );

-- 미팅 기록 생성 정책
CREATE POLICY "Users can create meetings for their customers" ON customer_meetings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_meetings.customer_id
      AND c.user_id = auth.uid()
    )
  );

-- 미팅 기록 수정 정책
CREATE POLICY "Users can update meetings for their customers" ON customer_meetings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_meetings.customer_id
      AND c.user_id = auth.uid()
    )
  );

-- 미팅 기록 삭제 정책
CREATE POLICY "Users can delete meetings for their customers" ON customer_meetings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_meetings.customer_id
      AND c.user_id = auth.uid()
    )
  );

-- 5. 업데이트 트리거 생성
CREATE OR REPLACE FUNCTION update_customer_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_meetings_updated_at
  BEFORE UPDATE ON customer_meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_meetings_updated_at();

-- 6. 고객사별 거래 통계를 위한 뷰 생성
CREATE OR REPLACE VIEW customer_transaction_summary AS
SELECT 
  c.id as customer_id,
  c.name as customer_name,
  COUNT(DISTINCT q.id) as total_quotes,
  COUNT(DISTINCT p.id) as total_projects,
  COALESCE(SUM(CASE WHEN q.status = 'accepted' THEN q.total_amount ELSE 0 END), 0) as total_accepted_amount,
  COALESCE(SUM(p.total_revenue), 0) as total_project_revenue,
  MAX(q.created_at) as last_quote_date,
  MAX(p.created_at) as last_project_date
FROM customers c
LEFT JOIN quotes q ON c.id = q.customer_id
LEFT JOIN projects p ON c.id = p.customer_id
GROUP BY c.id, c.name;

COMMENT ON TABLE customers IS '고객사 정보 - 거래 조건, 메모, 선호사항 포함';
COMMENT ON TABLE customer_meetings IS '고객사 미팅 기록 및 관리';
COMMENT ON VIEW customer_transaction_summary IS '고객사별 거래 요약 통계';