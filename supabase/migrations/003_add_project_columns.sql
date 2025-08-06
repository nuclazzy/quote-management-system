-- 프로젝트 테이블에 누락된 컬럼 추가 (조건부)

-- project_number 컬럼 추가 (없는 경우만)
DO $$
DECLARE
  counter INT := 1;
  rec RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'project_number'
  ) THEN
    ALTER TABLE projects ADD COLUMN project_number TEXT;
    
    -- 기존 프로젝트에 번호 생성 (cursor 사용)
    FOR rec IN (SELECT id, created_at FROM projects WHERE project_number IS NULL ORDER BY created_at)
    LOOP
      UPDATE projects 
      SET project_number = 'PRJ-' || EXTRACT(YEAR FROM rec.created_at) || '-' || LPAD(counter::TEXT, 3, '0')
      WHERE id = rec.id;
      counter := counter + 1;
    END LOOP;
    
    -- 고유 제약조건 추가
    ALTER TABLE projects ADD CONSTRAINT unique_project_number UNIQUE (project_number);
  END IF;
END $$;

-- quote_id 컬럼 추가 (없는 경우만)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'quote_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN quote_id UUID REFERENCES quotes(id);
    CREATE INDEX idx_projects_quote_id ON projects(quote_id);
  END IF;
END $$;

-- contract_amount 컬럼 추가 또는 actual_amount 별칭 생성
-- 실제 테이블에는 actual_amount가 있으므로, 호환성을 위해 뷰에서 처리
-- (이미 001_safe_minimal.sql에서 처리됨)

-- 프로젝트 번호 자동 생성 함수
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

-- 프로젝트 번호 자동 생성 트리거 (조건부)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'project_number'
  ) THEN
    DROP TRIGGER IF EXISTS auto_generate_project_number ON projects;
    
    CREATE TRIGGER auto_generate_project_number
      BEFORE INSERT ON projects
      FOR EACH ROW
      WHEN (NEW.project_number IS NULL)
      EXECUTE FUNCTION generate_project_number();
  END IF;
END $$;

-- 프로젝트 상태 요약 뷰 재생성 (최소 버전 - 확실히 존재하는 컬럼만 사용)
DROP VIEW IF EXISTS project_status_summary;
CREATE VIEW project_status_summary AS
SELECT 
  p.id,
  p.name,
  p.client_id,
  c.name as client_name,
  p.status,
  COALESCE(p.actual_amount, 0) as contract_amount,  -- actual_amount를 contract_amount로 매핑
  p.created_at
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id;