-- 프로젝트 테이블에 누락된 비용 관련 컬럼 추가 (선택적)

-- actual_cost 컬럼 추가 (없는 경우만)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'actual_cost'
  ) THEN
    ALTER TABLE projects ADD COLUMN actual_cost NUMERIC DEFAULT 0;
    COMMENT ON COLUMN projects.actual_cost IS '실제 발생 비용';
  END IF;
END $$;

-- budget_amount 컬럼 추가 (없는 경우만)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'budget_amount'
  ) THEN
    ALTER TABLE projects ADD COLUMN budget_amount NUMERIC DEFAULT 0;
    COMMENT ON COLUMN projects.budget_amount IS '예산 금액';
  END IF;
END $$;

-- 전체 기능이 포함된 프로젝트 상태 요약 뷰 (비용 컬럼만 포함, 날짜는 제외)
DROP VIEW IF EXISTS project_status_summary_full;
CREATE VIEW project_status_summary_full AS
SELECT 
  p.id,
  p.project_number,
  p.name,
  p.client_id,
  c.name as client_name,
  p.status,
  COALESCE(p.actual_amount, 0) as contract_amount,
  COALESCE(p.actual_cost, 0) as actual_cost,
  COALESCE(p.budget_amount, 0) as budget_amount,
  (COALESCE(p.actual_amount, 0) - COALESCE(p.actual_cost, 0)) as remaining_budget,
  p.created_at,
  p.updated_at
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id;