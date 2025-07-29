-- ========================================
-- 견적 관리 시스템 성능 최적화 인덱스
-- 05_indexes.sql
-- ========================================

-- ========================================
-- 1. 기본 검색 및 조회 성능 인덱스
-- ========================================

-- profiles 테이블 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_role_active ON profiles(role, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_active ON profiles(is_active);

-- customers 테이블 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_active ON customers(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_created_by ON customers(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_business_number ON customers(business_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_email ON customers(email);

-- suppliers 테이블 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_created_by ON suppliers(created_by);

-- master_items 테이블 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_master_items_name ON master_items(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_master_items_active ON master_items(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_master_items_created_by ON master_items(created_by);

-- ========================================
-- 2. 견적서 관련 성능 인덱스
-- ========================================

-- quotes 테이블 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_created_by ON quotes(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_issue_date ON quotes(issue_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_parent_quote_id ON quotes(parent_quote_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_version ON quotes(version);

-- 복합 인덱스 (자주 함께 조회되는 컬럼들)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_status_created_by ON quotes(status, created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_customer_status ON quotes(customer_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_issue_date_status ON quotes(issue_date, status);

-- 견적서 구조 테이블들의 관계 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quote_groups_quote_id ON quote_groups(quote_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quote_groups_sort_order ON quote_groups(quote_id, sort_order);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quote_items_group_id ON quote_items(quote_group_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quote_items_sort_order ON quote_items(quote_group_id, sort_order);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quote_details_item_id ON quote_details(quote_item_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quote_details_supplier_id ON quote_details(supplier_id);

-- ========================================
-- 3. 프로젝트 및 정산 관련 인덱스
-- ========================================

-- projects 테이블 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_quote_id ON projects(quote_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_parent_project_id ON projects(parent_project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_start_date ON projects(start_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_end_date ON projects(end_date);

-- transactions 테이블 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_project_id ON transactions(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_due_date ON transactions(due_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);

-- 복합 인덱스 (정산 관리용)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_project_type ON transactions(project_id, type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_status_due_date ON transactions(status, due_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_type_status ON transactions(type, status);

-- project_expenses 테이블 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_expenses_project_id ON project_expenses(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_expenses_expense_date ON project_expenses(expense_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_expenses_created_by ON project_expenses(created_by);

-- ========================================
-- 4. 알림 시스템 인덱스
-- ========================================

-- notifications 테이블 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- 복합 인덱스 (알림 조회 최적화)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, is_read, created_at DESC);

-- ========================================
-- 5. 활동 로그 인덱스
-- ========================================

-- user_activity_logs 테이블 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_table_name ON user_activity_logs(table_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_action ON user_activity_logs(action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_created_at ON user_activity_logs(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_record_id ON user_activity_logs(record_id);

-- 복합 인덱스 (로그 조회 최적화)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_table_record ON user_activity_logs(table_name, record_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_user_created ON user_activity_logs(user_id, created_at DESC);

-- ========================================
-- 6. 전문 검색 인덱스 (Full-Text Search)
-- ========================================

-- 고객사명 전문 검색
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_name_gin ON customers USING gin(to_tsvector('korean', name));

-- 프로젝트명 전문 검색
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_project_title_gin ON quotes USING gin(to_tsvector('korean', project_title));

-- 품목명 전문 검색
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_master_items_name_gin ON master_items USING gin(to_tsvector('korean', name));

-- ========================================
-- 7. JSON 데이터 인덱스 (template_data)
-- ========================================

-- 템플릿 데이터에서 특정 키 검색
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quote_templates_name_gin ON quote_templates USING gin(template_data);

-- ========================================
-- 8. 날짜 범위 검색 최적화 인덱스
-- ========================================

-- 견적서 발행일 범위 검색
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_issue_date_btree ON quotes USING btree(issue_date);

-- 프로젝트 기간 검색
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_date_range ON projects(start_date, end_date);

-- 거래 마감일 범위 검색
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_due_date_btree ON transactions USING btree(due_date);

-- 경비 발생일 범위 검색
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_expenses_date_btree ON project_expenses USING btree(expense_date);

-- ========================================
-- 9. 집계 함수 최적화 인덱스
-- ========================================

-- 견적서 총액 계산 최적화
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quote_totals_calc ON quote_details(quote_item_id, quantity, days, unit_price, is_service);

-- 프로젝트 비용 계산 최적화
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_amount_calc ON transactions(project_id, type, amount, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_amount_calc ON project_expenses(project_id, amount);

-- ========================================
-- 10. 부분 인덱스 (Partial Indexes) - 조건부 인덱스
-- ========================================

-- 활성 상태인 항목들만 인덱싱
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_active_only ON customers(name) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_active_only ON suppliers(name) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_master_items_active_only ON master_items(name) WHERE is_active = true;

-- 처리 중인 거래들만 인덱싱
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_pending ON transactions(due_date, project_id) 
WHERE status IN ('pending', 'processing');

-- 읽지 않은 알림들만 인덱싱
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread ON notifications(user_id, created_at DESC) 
WHERE is_read = false;

-- 초안 상태인 견적서들만 인덱싱
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_draft ON quotes(created_by, created_at DESC) 
WHERE status = 'draft';

-- ========================================
-- 11. 고유 제약조건을 위한 인덱스
-- ========================================

-- 견적서 번호 중복 방지 (이미 UNIQUE 제약조건으로 자동 생성됨)
-- 사용자 이메일 중복 방지 (이미 UNIQUE 제약조건으로 자동 생성됨)

-- ========================================
-- 12. 리포팅 및 분석용 인덱스
-- ========================================

-- 월별 매출 분석용
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_monthly_revenue ON projects(
    date_trunc('month', start_date), 
    total_revenue
) WHERE status = 'completed';

-- 고객별 매출 분석용
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_customer_revenue ON quotes(
    customer_id, 
    total_amount, 
    issue_date
) WHERE status = 'accepted';

-- 공급처별 매입 분석용
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_supplier_expenses ON transactions(
    partner_name, 
    amount, 
    created_at
) WHERE type = 'expense' AND status = 'completed';

-- ========================================
-- 13. 성능 모니터링을 위한 뷰
-- ========================================

-- 인덱스 사용 통계 뷰
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE 
        WHEN idx_scan > 0 THEN round((idx_tup_fetch::numeric / idx_scan), 2)
        ELSE 0 
    END as avg_tuples_per_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- 테이블별 크기 및 인덱스 크기 뷰
CREATE OR REPLACE VIEW table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
    round(
        100.0 * (pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) / 
        pg_total_relation_size(schemaname||'.'||tablename), 2
    ) as index_ratio_percent
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 사용되지 않는 인덱스 조회 뷰
CREATE OR REPLACE VIEW unused_indexes AS
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexname NOT LIKE '%_pkey'  -- Primary key 제외
ORDER BY pg_relation_size(indexrelid) DESC;

-- ========================================
-- 14. 데이터베이스 성능 최적화 설정
-- ========================================

-- 통계 정보 업데이트 (필요시 실행)
-- ANALYZE;

-- 인덱스 리빌드 (필요시 실행)
-- REINDEX DATABASE;

-- ========================================
-- 15. 인덱스 생성 완료 확인
-- ========================================

-- 생성된 인덱스 목록 조회
CREATE OR REPLACE VIEW created_indexes AS
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 인덱스 생성 스크립트 실행 확인
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%';
    
    RAISE NOTICE '총 % 개의 성능 최적화 인덱스가 생성되었습니다.', index_count;
END $$;

COMMENT ON VIEW index_usage_stats IS '인덱스 사용 통계 모니터링용 뷰';
COMMENT ON VIEW table_sizes IS '테이블 및 인덱스 크기 모니터링용 뷰';
COMMENT ON VIEW unused_indexes IS '사용되지 않는 인덱스 조회용 뷰';
COMMENT ON VIEW created_indexes IS '생성된 모든 인덱스 목록 조회용 뷰';