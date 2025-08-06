-- 프로젝트 테이블에 날짜 관련 컬럼 추가 (선택적)

-- planned_start_date 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'planned_start_date'
  ) THEN
    ALTER TABLE projects ADD COLUMN planned_start_date DATE;
    COMMENT ON COLUMN projects.planned_start_date IS '계획된 시작일';
  END IF;
END $$;

-- planned_end_date 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'planned_end_date'
  ) THEN
    ALTER TABLE projects ADD COLUMN planned_end_date DATE;
    COMMENT ON COLUMN projects.planned_end_date IS '계획된 종료일';
  END IF;
END $$;

-- actual_start_date 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'actual_start_date'
  ) THEN
    ALTER TABLE projects ADD COLUMN actual_start_date DATE;
    COMMENT ON COLUMN projects.actual_start_date IS '실제 시작일';
  END IF;
END $$;

-- actual_end_date 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'actual_end_date'
  ) THEN
    ALTER TABLE projects ADD COLUMN actual_end_date DATE;
    COMMENT ON COLUMN projects.actual_end_date IS '실제 종료일';
  END IF;
END $$;

-- progress_percentage 컬럼 추가 (없는 경우)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'progress_percentage'
  ) THEN
    ALTER TABLE projects ADD COLUMN progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
    COMMENT ON COLUMN projects.progress_percentage IS '진행률 (0-100)';
  END IF;
END $$;

-- project_manager_id 컬럼 추가 (없는 경우)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'project_manager_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN project_manager_id UUID REFERENCES profiles(id);
    CREATE INDEX idx_projects_project_manager_id ON projects(project_manager_id);
    COMMENT ON COLUMN projects.project_manager_id IS '프로젝트 매니저 ID';
  END IF;
END $$;