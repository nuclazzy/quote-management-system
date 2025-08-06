-- 모든 컬럼이 추가된 후 실행할 전체 기능 뷰

-- 기존 뷰 제거
DROP VIEW IF EXISTS project_status_summary;
DROP VIEW IF EXISTS project_status_summary_full;

-- 전체 기능이 포함된 프로젝트 상태 요약 뷰
CREATE VIEW project_status_summary AS
SELECT 
  p.id,
  p.project_number,
  p.name,
  p.description,
  p.client_id,
  c.name as client_name,
  p.status,
  p.priority,
  p.progress_percentage,
  COALESCE(p.actual_amount, 0) as contract_amount,  -- actual_amount를 contract_amount로 매핑
  COALESCE(p.actual_cost, 0) as actual_cost,
  COALESCE(p.budget_amount, 0) as budget_amount,
  (COALESCE(p.actual_amount, 0) - COALESCE(p.actual_cost, 0)) as remaining_budget,
  
  -- 날짜 정보
  p.planned_start_date,
  p.planned_end_date,
  p.actual_start_date,
  p.actual_end_date,
  
  -- 프로젝트 기간 계산
  CASE 
    WHEN p.planned_start_date IS NOT NULL AND p.planned_end_date IS NOT NULL THEN
      p.planned_end_date - p.planned_start_date
    ELSE NULL
  END as planned_duration_days,
  
  CASE 
    WHEN p.actual_start_date IS NOT NULL AND p.actual_end_date IS NOT NULL THEN
      p.actual_end_date - p.actual_start_date
    WHEN p.actual_start_date IS NOT NULL THEN
      CURRENT_DATE - p.actual_start_date
    ELSE NULL
  END as actual_duration_days,
  
  -- 프로젝트 매니저 정보
  p.project_manager_id,
  pm.full_name as project_manager_name,
  
  -- 기타 정보
  p.is_active,
  p.created_at,
  p.updated_at,
  p.created_by,
  p.updated_by
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN profiles pm ON p.project_manager_id = pm.id;

-- 프로젝트 대시보드용 요약 뷰
CREATE VIEW project_dashboard_summary AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'planning') as planning_count,
  COUNT(*) FILTER (WHERE status = 'active') as active_count,
  COUNT(*) FILTER (WHERE status = 'on_hold') as on_hold_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
  COUNT(*) as total_count,
  
  SUM(COALESCE(actual_amount, 0)) as total_contract_amount,
  SUM(COALESCE(actual_cost, 0)) as total_actual_cost,
  SUM(COALESCE(budget_amount, 0)) as total_budget_amount,
  
  AVG(progress_percentage) FILTER (WHERE status = 'active') as avg_active_progress,
  
  COUNT(*) FILTER (WHERE status = 'active' AND planned_end_date < CURRENT_DATE) as overdue_count,
  COUNT(*) FILTER (WHERE status = 'active' AND planned_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days') as due_soon_count
FROM projects
WHERE is_active = true;

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_projects_client_status ON projects(client_id, status) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_projects_dates ON projects(planned_start_date, planned_end_date) WHERE is_active = true;