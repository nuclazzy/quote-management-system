-- ========================================
-- 견적서 관리 시스템 - 완전 스키마 초기화
-- 00_drop_all_tables.sql
-- 모든 기존 테이블, 뷰, 함수, 트리거를 삭제
-- ========================================

-- 모든 테이블 순서대로 삭제 (외래키 의존성 고려)
-- 1. 가장 의존적인 테이블들부터 삭제

-- 알림 관련
DROP TABLE IF EXISTS notification_settings CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- 견적서 관련 상세 테이블들
DROP TABLE IF EXISTS quote_details CASCADE;
DROP TABLE IF EXISTS quote_items CASCADE;
DROP TABLE IF EXISTS quote_groups CASCADE;

-- 프로젝트 관련
DROP TABLE IF EXISTS project_expenses CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- 견적서 및 품목 관련
DROP TABLE IF EXISTS quote_sequences CASCADE;
DROP TABLE IF EXISTS item_price_history CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS item_categories CASCADE;
DROP TABLE IF EXISTS master_items CASCADE;
DROP TABLE IF EXISTS quote_templates CASCADE;

-- 고객사, 공급업체
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- 권한 관리
DROP TABLE IF EXISTS user_invitations CASCADE;
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;

-- 회사 및 사용자
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 뷰 삭제
DROP VIEW IF EXISTS project_profitability CASCADE;
DROP VIEW IF EXISTS quote_totals CASCADE;

-- 함수 삭제
DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_default_notification_settings() CASCADE;
DROP FUNCTION IF EXISTS invite_user(VARCHAR, VARCHAR, UUID, UUID[]) CASCADE;
DROP FUNCTION IF EXISTS check_user_permission(UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS grant_user_permission(UUID, VARCHAR, UUID, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS revoke_user_permission(UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS generate_quote_number(UUID) CASCADE;
DROP FUNCTION IF EXISTS generate_quote_number() CASCADE;
DROP FUNCTION IF EXISTS calculate_quote_totals() CASCADE;
DROP FUNCTION IF EXISTS track_stock_movement() CASCADE;
DROP FUNCTION IF EXISTS track_price_change() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_current_user_company_id() CASCADE;
DROP FUNCTION IF EXISTS is_same_company_user(UUID) CASCADE;
DROP FUNCTION IF EXISTS assign_default_company_to_profile() CASCADE;
DROP FUNCTION IF EXISTS create_quote_transaction(JSONB) CASCADE;

-- 트리거 삭제 (CASCADE로 대부분 삭제되지만 명시적으로)
DROP TRIGGER IF EXISTS trigger_create_notification_settings ON auth.users CASCADE;
DROP TRIGGER IF EXISTS trigger_generate_quote_number ON quotes CASCADE;
DROP TRIGGER IF EXISTS trigger_recalculate_quote_totals_insert ON quote_items CASCADE;
DROP TRIGGER IF EXISTS trigger_recalculate_quote_totals_update ON quote_items CASCADE;
DROP TRIGGER IF EXISTS trigger_recalculate_quote_totals_delete ON quote_items CASCADE;
DROP TRIGGER IF EXISTS trigger_track_stock_movement ON items CASCADE;
DROP TRIGGER IF EXISTS trigger_track_price_change ON items CASCADE;
DROP TRIGGER IF EXISTS trigger_assign_company_to_profile ON profiles CASCADE;

-- 시퀀스 삭제 (있다면)
DROP SEQUENCE IF EXISTS quote_number_seq CASCADE;

-- 타입 삭제 (있다면)
DROP TYPE IF EXISTS quote_status CASCADE;
DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- 확장 기능은 유지 (다른 애플리케이션에서 사용할 수 있음)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- 유지

COMMENT ON SCHEMA public IS '견적서 관리 시스템 스키마가 완전히 초기화되었습니다.';