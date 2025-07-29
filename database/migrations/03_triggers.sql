-- ========================================
-- 견적 관리 시스템 자동화 트리거들
-- 03_triggers.sql
-- ========================================

-- ========================================
-- 1. Google OAuth 사용자 자동 프로필 생성 트리거
-- ========================================

-- 사용자 생성 시 자동으로 profiles 테이블에 레코드 생성
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_email TEXT;
    user_name TEXT;
    user_role TEXT := 'member';
BEGIN
    -- auth.users에서 이메일 정보 추출
    user_email := NEW.email;
    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
    
    -- @motionsense.co.kr 도메인 체크
    IF user_email NOT LIKE '%@motionsense.co.kr' THEN
        RAISE EXCEPTION '허용되지 않는 도메인입니다. motionsense.co.kr 도메인만 사용 가능합니다.';
    END IF;
    
    -- lewis@motionsense.co.kr은 자동으로 admin 권한 부여
    IF user_email = 'lewis@motionsense.co.kr' THEN
        user_role := 'admin';
    END IF;
    
    -- profiles 테이블에 사용자 정보 삽입
    INSERT INTO public.profiles (id, email, full_name, role, is_active)
    VALUES (NEW.id, user_email, user_name, user_role, true)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;

-- auth.users 테이블에 트리거 등록
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ========================================
-- 2. 견적서 스냅샷 데이터 자동 생성 트리거
-- ========================================

-- 견적서 생성 시 고객사명 스냅샷 생성
CREATE TRIGGER create_quote_customer_snapshot
    BEFORE INSERT OR UPDATE ON quotes
    FOR EACH ROW 
    EXECUTE FUNCTION create_snapshot_data();

-- 견적 세부내용 생성 시 공급처명 스냅샷 생성
CREATE TRIGGER create_quote_detail_supplier_snapshot
    BEFORE INSERT OR UPDATE ON quote_details
    FOR EACH ROW 
    EXECUTE FUNCTION create_snapshot_data();

-- ========================================
-- 3. 견적서 번호 자동 생성 트리거
-- ========================================

CREATE OR REPLACE FUNCTION auto_generate_quote_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- quote_number가 비어있을 경우에만 자동 생성
    IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
        NEW.quote_number := generate_quote_number();
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER generate_quote_number_trigger
    BEFORE INSERT ON quotes
    FOR EACH ROW 
    EXECUTE FUNCTION auto_generate_quote_number();

-- ========================================
-- 4. 견적서 총액 자동 업데이트 트리거
-- ========================================

CREATE OR REPLACE FUNCTION update_quote_total_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    quote_id_var UUID;
    total_calc RECORD;
BEGIN
    -- 변경된 견적서 ID 추출
    IF TG_OP = 'DELETE' THEN
        SELECT qg.quote_id INTO quote_id_var
        FROM quote_groups qg
        JOIN quote_items qi ON qg.id = qi.quote_group_id
        WHERE qi.id = OLD.quote_item_id;
    ELSE
        SELECT qg.quote_id INTO quote_id_var
        FROM quote_groups qg
        JOIN quote_items qi ON qg.id = qi.quote_group_id
        WHERE qi.id = COALESCE(NEW.quote_item_id, OLD.quote_item_id);
    END IF;
    
    -- 총액 계산 및 업데이트
    SELECT * INTO total_calc FROM calculate_quote_total(quote_id_var);
    
    UPDATE quotes 
    SET total_amount = total_calc.total_amount,
        updated_at = NOW()
    WHERE id = quote_id_var;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- quote_details 변경 시 견적서 총액 업데이트
CREATE TRIGGER update_quote_total_on_detail_change
    AFTER INSERT OR UPDATE OR DELETE ON quote_details
    FOR EACH ROW 
    EXECUTE FUNCTION update_quote_total_amount();

-- quotes 테이블의 할인금액, 수수료율, 부가세 타입 변경 시에도 총액 재계산
CREATE OR REPLACE FUNCTION update_quote_total_on_quote_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    total_calc RECORD;
BEGIN
    -- 할인금액, 수수료율, 부가세 타입이 변경된 경우에만 실행
    IF OLD.discount_amount != NEW.discount_amount OR 
       OLD.agency_fee_rate != NEW.agency_fee_rate OR 
       OLD.vat_type != NEW.vat_type THEN
        
        SELECT * INTO total_calc FROM calculate_quote_total(NEW.id);
        NEW.total_amount := total_calc.total_amount;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_quote_total_on_quote_update
    BEFORE UPDATE ON quotes
    FOR EACH ROW 
    EXECUTE FUNCTION update_quote_total_on_quote_change();

-- ========================================
-- 5. 프로젝트 생성 알림 트리거
-- ========================================

CREATE OR REPLACE FUNCTION notify_project_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    message TEXT;
    link_url TEXT;
BEGIN
    -- 견적서가 accepted 상태로 변경될 때만 실행
    IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
        message := NEW.customer_name_snapshot || ' - ' || NEW.project_title || ' 프로젝트가 생성되었습니다.';
        link_url := '/quotes/' || NEW.id::text;
        
        -- 모든 관리자에게 알림 발송
        PERFORM notify_all_admins(message, link_url, 'project_created');
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_project_creation
    AFTER UPDATE ON quotes
    FOR EACH ROW 
    EXECUTE FUNCTION notify_project_creation();

-- ========================================
-- 6. 프로젝트 비용 자동 업데이트 트리거
-- ========================================

-- transactions 테이블 변경 시 프로젝트 비용 업데이트
CREATE OR REPLACE FUNCTION auto_update_project_cost_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    project_id_var UUID;
BEGIN
    project_id_var := COALESCE(NEW.project_id, OLD.project_id);
    
    -- 프로젝트 비용 재계산
    PERFORM update_project_costs(project_id_var);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_project_cost_on_transaction_change
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW 
    EXECUTE FUNCTION auto_update_project_cost_from_transaction();

-- project_expenses 테이블 변경 시 프로젝트 비용 업데이트
CREATE OR REPLACE FUNCTION auto_update_project_cost_from_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    project_id_var UUID;
BEGIN
    project_id_var := COALESCE(NEW.project_id, OLD.project_id);
    
    -- 프로젝트 비용 재계산
    PERFORM update_project_costs(project_id_var);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_project_cost_on_expense_change
    AFTER INSERT OR UPDATE OR DELETE ON project_expenses
    FOR EACH ROW 
    EXECUTE FUNCTION auto_update_project_cost_from_expense();

-- ========================================
-- 7. 거래 상태 변경 알림 트리거
-- ========================================

CREATE OR REPLACE FUNCTION notify_transaction_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    message TEXT;
    link_url TEXT;
    project_name TEXT;
BEGIN
    -- 상태가 issue로 변경된 경우
    IF OLD.status != 'issue' AND NEW.status = 'issue' THEN
        SELECT name INTO project_name FROM projects WHERE id = NEW.project_id;
        
        IF NEW.type = 'income' THEN
            message := project_name || ' - ' || NEW.item_name || ' 수금에 문제가 발생했습니다.';
        ELSE
            message := project_name || ' - ' || NEW.partner_name || ' 지급에 문제가 발생했습니다.';
        END IF;
        
        link_url := '/projects/' || NEW.project_id::text;
        
        -- 모든 관리자에게 알림 발송
        PERFORM notify_all_admins(message, link_url, 'issue');
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_transaction_issue
    AFTER UPDATE ON transactions
    FOR EACH ROW 
    EXECUTE FUNCTION notify_transaction_status_change();

-- 매출 인식 트리거 (거래 완료 시점)
CREATE TRIGGER recognize_revenue_on_transaction_completion
    AFTER UPDATE ON transactions
    FOR EACH ROW 
    EXECUTE FUNCTION recognize_revenue_on_completion();

-- ========================================
-- 8. 사용자 활동 로그 트리거 (선택사항)
-- ========================================

-- 사용자 활동 로그 테이블 생성
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 중요한 테이블의 변경사항 로그
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    user_id_var UUID;
    action_var TEXT;
    old_data_var JSONB;
    new_data_var JSONB;
BEGIN
    -- 작업 유형 결정
    CASE TG_OP
        WHEN 'INSERT' THEN 
            action_var := 'INSERT';
            new_data_var := to_jsonb(NEW);
            user_id_var := NEW.created_by;
        WHEN 'UPDATE' THEN 
            action_var := 'UPDATE';
            old_data_var := to_jsonb(OLD);
            new_data_var := to_jsonb(NEW);
            user_id_var := COALESCE(NEW.created_by, OLD.created_by);
        WHEN 'DELETE' THEN 
            action_var := 'DELETE';
            old_data_var := to_jsonb(OLD);
            user_id_var := OLD.created_by;
    END CASE;
    
    -- 로그 기록 (중요한 테이블만)
    IF TG_TABLE_NAME IN ('quotes', 'projects', 'transactions') THEN
        INSERT INTO user_activity_logs (
            user_id,
            action,
            table_name,
            record_id,
            old_data,
            new_data
        ) VALUES (
            user_id_var,
            action_var,
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            old_data_var,
            new_data_var
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 활동 로그 트리거 적용
CREATE TRIGGER log_quotes_activity
    AFTER INSERT OR UPDATE OR DELETE ON quotes
    FOR EACH ROW EXECUTE FUNCTION log_user_activity();

CREATE TRIGGER log_projects_activity
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION log_user_activity();

CREATE TRIGGER log_transactions_activity
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION log_user_activity();

-- ========================================
-- 9. 데이터 정합성 체크 트리거
-- ========================================

-- 견적서 삭제 방지 (accepted 상태인 경우)
CREATE OR REPLACE FUNCTION prevent_accepted_quote_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status = 'accepted' THEN
        RAISE EXCEPTION '승인된 견적서는 삭제할 수 없습니다. 견적서 번호: %', OLD.quote_number;
    END IF;
    
    RETURN OLD;
END;
$$;

CREATE TRIGGER prevent_accepted_quote_deletion_trigger
    BEFORE DELETE ON quotes
    FOR EACH ROW EXECUTE FUNCTION prevent_accepted_quote_deletion();

-- 프로젝트와 연결된 견적서 상태 변경 방지
CREATE OR REPLACE FUNCTION prevent_project_quote_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- 프로젝트가 존재하는 견적서의 상태를 accepted가 아닌 다른 상태로 변경하려 할 때
    IF OLD.status = 'accepted' AND NEW.status != 'accepted' THEN
        IF EXISTS (SELECT 1 FROM projects WHERE quote_id = NEW.id) THEN
            RAISE EXCEPTION '프로젝트가 생성된 견적서의 상태는 변경할 수 없습니다. 견적서 번호: %', NEW.quote_number;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_project_quote_status_change_trigger
    BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION prevent_project_quote_status_change();

-- ========================================
-- 10. 정기 알림 체크를 위한 스케줄러 설정 (pg_cron 확장 필요)
-- ========================================

-- pg_cron 확장이 설치된 경우에만 실행 (Supabase에서는 다른 방법 필요)
/*
-- 매일 자정에 마감일 임박 알림 체크
SELECT cron.schedule('check-payment-due', '0 0 * * *', 'SELECT check_payment_due_notifications();');

-- 매일 자정에 마감일 경과 알림 체크  
SELECT cron.schedule('check-overdue-payments', '0 0 * * *', 'SELECT check_overdue_payment_notifications();');
*/

-- ========================================
-- 트리거 활성화 확인을 위한 뷰
-- ========================================

CREATE OR REPLACE VIEW trigger_status AS
SELECT 
    schemaname,
    tablename,
    triggername,
    tgtype,
    tgenabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND NOT tgisinternal
ORDER BY tablename, triggername;

COMMENT ON VIEW trigger_status IS '현재 활성화된 트리거 목록 조회용 뷰';