-- ========================================
-- Add assignee fields to projects table
-- 21_add_assignee_fields.sql
-- ========================================

-- Add assignee fields to projects table
ALTER TABLE projects 
ADD COLUMN assignee_name TEXT,
ADD COLUMN assignee_email TEXT;

-- Add index for assignee email if needed for searches
CREATE INDEX IF NOT EXISTS idx_projects_assignee_email ON projects(assignee_email);

-- Add comment for documentation
COMMENT ON COLUMN projects.assignee_name IS 'Name of the project assignee';
COMMENT ON COLUMN projects.assignee_email IS 'Email of the project assignee';