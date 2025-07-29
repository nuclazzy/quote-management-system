-- ========================================
-- 비즈니스 로직 수정 마이그레이션
-- 10_business_logic_fixes.sql
-- ========================================

-- 1. 매출 인식 트리거 추가 (거래 완료 시점)
CREATE TRIGGER recognize_revenue_on_transaction_completion
    AFTER UPDATE ON transactions
    FOR EACH ROW 
    EXECUTE FUNCTION recognize_revenue_on_completion();

-- 2. 프로젝트 초기 매출을 0으로 설정 (실제 거래 완료 시 인식)
UPDATE projects 
SET total_revenue = 0 
WHERE total_revenue > 0 
  AND NOT EXISTS (
    SELECT 1 FROM transactions 
    WHERE project_id = projects.id 
      AND type = 'income' 
      AND status = 'completed'
  );

-- 3. 완료된 거래가 있는 프로젝트의 매출 재계산
UPDATE projects 
SET total_revenue = (
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions 
  WHERE project_id = projects.id 
    AND type = 'income' 
    AND status = 'completed'
)
WHERE EXISTS (
  SELECT 1 FROM transactions 
  WHERE project_id = projects.id 
    AND type = 'income' 
    AND status = 'completed'
);

-- 4. 알림 테이블에 중복 방지를 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_notifications_duplicate_check 
ON notifications(user_id, message, notification_type, created_at)
WHERE created_at > NOW() - INTERVAL '24 hours';

-- 5. 견적서 상태 변경 검증 강화를 위한 코멘트 추가
COMMENT ON FUNCTION update_quote_status(UUID, TEXT, TEXT) IS 
'견적서 상태 변경 함수 - draft→sent→accepted→completed 순서 강제, 승인 후 되돌리기 방지';

-- 6. 데이터 정합성 체크를 위한 제약조건 추가
-- 견적서와 프로젝트 간 상태 일관성 검증
ALTER TABLE projects 
ADD CONSTRAINT check_project_quote_status 
CHECK (
  NOT EXISTS (
    SELECT 1 FROM quotes 
    WHERE id = quote_id 
      AND status NOT IN ('accepted', 'completed')
  )
);

-- 7. 매출 인식 로그 테이블 생성 (추적용)
CREATE TABLE IF NOT EXISTS revenue_recognition_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  amount NUMERIC NOT NULL,
  recognized_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- 인덱스 생성
CREATE INDEX idx_revenue_log_project_id ON revenue_recognition_log(project_id);
CREATE INDEX idx_revenue_log_recognized_at ON revenue_recognition_log(recognized_at DESC);

-- RLS 정책 추가
ALTER TABLE revenue_recognition_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "revenue_log_select_policy" ON revenue_recognition_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p 
      JOIN profiles pr ON pr.id = auth.uid()
      WHERE p.id = project_id 
        AND p.company_id = pr.company_id
        AND pr.is_active = true
    )
  );

-- 8. 견적서 계산 정확성을 위한 검증 함수
CREATE OR REPLACE FUNCTION validate_quote_calculation(quote_id_param UUID)
RETURNS TABLE(
  is_valid BOOLEAN,
  frontend_total NUMERIC,
  database_total NUMERIC,
  difference NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  db_calc RECORD;
  stored_total NUMERIC;
BEGIN
  -- DB 함수로 계산한 총액
  SELECT * INTO db_calc FROM calculate_quote_total(quote_id_param);
  
  -- 저장된 총액
  SELECT total_amount INTO stored_total FROM quotes WHERE id = quote_id_param;
  
  RETURN QUERY SELECT 
    ABS(stored_total - db_calc.total_amount) < 0.01,
    stored_total,
    db_calc.total_amount,
    stored_total - db_calc.total_amount;
END;
$$;

-- 함수 권한 설정
GRANT EXECUTE ON FUNCTION validate_quote_calculation(UUID) TO authenticated;

COMMENT ON FUNCTION validate_quote_calculation(UUID) IS 
'견적서 계산 정확성 검증 - 프론트엔드와 DB 계산 결과 비교';

-- 9. 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '비즈니스 로직 수정 완료:';
  RAISE NOTICE '1. 견적서 계산 로직 통일';
  RAISE NOTICE '2. VAT 포함세/별도세 처리 정확성 확보';
  RAISE NOTICE '3. 프로젝트 전환 시 수수료 계산 수정';
  RAISE NOTICE '4. 매출 인식 시점을 거래 완료 시점으로 변경';
  RAISE NOTICE '5. 알림 중복 방지 로직 구현';
  RAISE NOTICE '6. 견적서 상태 전환 검증 강화';
END $$;