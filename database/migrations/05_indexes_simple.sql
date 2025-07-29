-- ========================================
-- 견적 관리 시스템 성능 최적화 인덱스 (단순 버전)
-- 05_indexes_simple.sql
-- ========================================

-- ========================================
-- 1. 기본 테이블 인덱스
-- ========================================

-- profiles 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role_active ON profiles(role, is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);

-- customers 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_business_number ON customers(business_number);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- suppliers 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_created_by ON suppliers(created_by);

-- master_items 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_master_items_name ON master_items(name);
CREATE INDEX IF NOT EXISTS idx_master_items_active ON master_items(is_active);
CREATE INDEX IF NOT EXISTS idx_master_items_created_by ON master_items(created_by);

-- quote_templates 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_quote_templates_name ON quote_templates(name);
CREATE INDEX IF NOT EXISTS idx_quote_templates_created_by ON quote_templates(created_by);

-- ========================================
-- 2. 견적서 관련 핵심 인덱스
-- ========================================

-- quotes 테이블 기본 인덱스
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON quotes(created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_issue_date ON quotes(issue_date);
CREATE INDEX IF NOT EXISTS idx_quotes_parent_quote_id ON quotes(parent_quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_version ON quotes(version);

-- quotes 테이블 복합 인덱스 (필터링 성능 향상)
CREATE INDEX IF NOT EXISTS idx_quotes_status_created_by ON quotes(status, created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_status ON quotes(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_issue_date_status ON quotes(issue_date, status);

-- quote_groups 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_quote_groups_quote_id ON quote_groups(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_groups_sort_order ON quote_groups(quote_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_quote_items_group_id ON quote_items(quote_group_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_sort_order ON quote_items(quote_group_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_quote_details_item_id ON quote_details(quote_item_id);
CREATE INDEX IF NOT EXISTS idx_quote_details_supplier_id ON quote_details(supplier_id);

-- ========================================
-- 3. 프로젝트 및 정산 관련 인덱스
-- ========================================

-- projects 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_projects_quote_id ON projects(quote_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_parent_project_id ON projects(parent_project_id);
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON projects(start_date);
CREATE INDEX IF NOT EXISTS idx_projects_end_date ON projects(end_date);

-- transactions 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_transactions_project_id ON transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_due_date ON transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);

-- transactions 테이블 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_transactions_project_type ON transactions(project_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_status_due_date ON transactions(status, due_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(type, status);

-- project_expenses 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_project_expenses_project_id ON project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_expense_date ON project_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_project_expenses_created_by ON project_expenses(created_by);

-- ========================================
-- 4. 알림 시스템 인덱스
-- ========================================

-- notifications 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- notifications 복합 인덱스 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, is_read, created_at DESC);

-- ========================================
-- 5. 시간 기반 인덱스 (날짜 범위 검색 최적화)
-- ========================================

-- 견적서 발행일 범위 검색 최적화
CREATE INDEX IF NOT EXISTS idx_quotes_issue_date_btree ON quotes USING btree(issue_date);

-- 프로젝트 기간 검색 최적화
CREATE INDEX IF NOT EXISTS idx_projects_date_range ON projects(start_date, end_date);

-- 정산 마감일 검색 최적화
CREATE INDEX IF NOT EXISTS idx_transactions_due_date_btree ON transactions USING btree(due_date);

-- 프로젝트 경비 날짜 검색 최적화
CREATE INDEX IF NOT EXISTS idx_project_expenses_date_btree ON project_expenses USING btree(expense_date);

-- ========================================
-- 6. 계산 최적화 인덱스
-- ========================================

-- 견적서 총액 계산 최적화
CREATE INDEX IF NOT EXISTS idx_quote_totals_calc ON quote_details(quote_item_id, quantity, days, unit_price);

-- 프로젝트 손익 계산 최적화
CREATE INDEX IF NOT EXISTS idx_transactions_amount_calc ON transactions(project_id, type, amount, status);
CREATE INDEX IF NOT EXISTS idx_expenses_amount_calc ON project_expenses(project_id, amount);

-- ========================================
-- 7. 부분 인덱스 (조건부 인덱스로 성능 향상)
-- ========================================

-- 활성 상태인 레코드만 인덱싱
CREATE INDEX IF NOT EXISTS idx_customers_active_only ON customers(name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_suppliers_active_only ON suppliers(name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_master_items_active_only ON master_items(name) WHERE is_active = true;

-- 대기 중인 정산만 인덱싱 (알림 시스템에서 사용)
CREATE INDEX IF NOT EXISTS idx_transactions_pending ON transactions(due_date, project_id) 
WHERE status IN ('pending', 'processing');

-- 읽지 않은 알림만 인덱싱
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, created_at DESC) 
WHERE is_read = false;

-- 초안 상태 견적서만 인덱싱 (자주 조회되는 상태)
CREATE INDEX IF NOT EXISTS idx_quotes_draft ON quotes(created_by, created_at DESC) 
WHERE status = 'draft';

-- ========================================
-- 8. 리포트 및 대시보드용 인덱스
-- ========================================

-- 고객별 매출 분석 최적화
CREATE INDEX IF NOT EXISTS idx_quotes_customer_revenue ON quotes(
    customer_id,
    status,
    total_amount,
    issue_date
) WHERE status = 'accepted';

-- 공급처별 매입 분석 최적화  
CREATE INDEX IF NOT EXISTS idx_transactions_supplier_expenses ON transactions(
    partner_name,
    type,
    amount,
    due_date
) WHERE type = 'expense';

-- ========================================
-- 9. 성능 모니터링용 뷰
-- ========================================

-- 인덱스 사용률 모니터링 뷰
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE 
        WHEN idx_scan = 0 THEN 'Not Used'
        WHEN idx_scan < 100 THEN 'Low Usage'
        WHEN idx_scan < 1000 THEN 'Medium Usage'
        ELSE 'High Usage'
    END as usage_level
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

COMMENT ON VIEW index_usage_stats IS '인덱스 사용률 통계 뷰';

-- 테이블 크기 및 성능 통계 뷰
CREATE OR REPLACE VIEW table_performance_stats AS
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

COMMENT ON VIEW table_performance_stats IS '테이블 성능 및 관리 통계 뷰';

-- ========================================
-- 설정 완료 메시지
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '견적 관리 시스템 인덱스 설정 완료!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ 기본 테이블 인덱스 (40개+)';
    RAISE NOTICE '✅ 부분 인덱스 (조건부 최적화)';
    RAISE NOTICE '✅ 시간 기반 범위 검색 인덱스';
    RAISE NOTICE '✅ 계산 최적화 인덱스';
    RAISE NOTICE '✅ 리포트용 복합 인덱스';
    RAISE NOTICE '✅ 성능 모니터링 뷰';
    RAISE NOTICE '========================================';
    RAISE NOTICE '⚡ 조회 성능 대폭 향상';
    RAISE NOTICE '🔍 강력한 필터 기능 지원';
    RAISE NOTICE '📊 리포트 및 대시보드 최적화';
    RAISE NOTICE '📈 성능 모니터링 도구 제공';
    RAISE NOTICE '========================================';
END $$;