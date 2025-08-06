-- projects 테이블에 누락된 컬럼 추가
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS project_number TEXT;

-- 기존 프로젝트에 번호 생성
UPDATE projects 
SET project_number = 'PRJ-' || EXTRACT(YEAR FROM created_at) || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 3, '0')
WHERE project_number IS NULL;

-- project_number를 고유값으로 설정
ALTER TABLE projects 
ADD CONSTRAINT unique_project_number UNIQUE (project_number);

-- 프로젝트 번호 자동 생성 트리거 함수
CREATE OR REPLACE FUNCTION generate_project_number()
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
    COALESCE(MAX(CAST(SUBSTRING(project_number FROM '\d+$') AS INT)), 0)
  INTO max_number
  FROM projects
  WHERE project_number LIKE 'PRJ-' || current_year || '-%';
  
  -- 새 번호 생성
  new_number := 'PRJ-' || current_year || '-' || LPAD((max_number + 1)::TEXT, 3, '0');
  
  NEW.project_number := new_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 프로젝트 번호 자동 생성 트리거
DROP TRIGGER IF EXISTS auto_generate_project_number ON projects;
CREATE TRIGGER auto_generate_project_number
  BEFORE INSERT ON projects
  FOR EACH ROW
  WHEN (NEW.project_number IS NULL)
  EXECUTE FUNCTION generate_project_number();

-- 뷰 재생성 (project_number 포함)
DROP VIEW IF EXISTS project_status_summary;
CREATE VIEW project_status_summary AS
SELECT 
  p.id,
  p.project_number,
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