-- ========================================
-- 견적 관리 시스템 트리거 정리 및 재생성
-- 03_triggers_clean.sql
-- ========================================

-- ========================================
-- 1. 기존 트리거 및 함수 정리
-- ========================================

-- 기존 트리거들 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_quote_insert_generate_number ON quotes;
DROP TRIGGER IF EXISTS on_quote_details_change ON quote_details;
DROP TRIGGER IF EXISTS on_quote_items_change ON quote_items;
DROP TRIGGER IF EXISTS on_quote_groups_change ON quote_groups;
DROP TRIGGER IF EXISTS on_quotes_change ON quotes;
DROP TRIGGER IF EXISTS on_quote_detail_insert_snapshot ON quote_details;
DROP TRIGGER IF EXISTS on_quote_status_change ON quotes;
DROP TRIGGER IF EXISTS on_project_created ON projects;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
DROP TRIGGER IF EXISTS update_master_items_updated_at ON master_items;
DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;

-- 기존 함수들 삭제
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS generate_quote_number();
DROP FUNCTION IF EXISTS update_quote_totals();
DROP FUNCTION IF EXISTS create_quote_detail_snapshot();
DROP FUNCTION IF EXISTS create_quote_status_notification();
DROP FUNCTION IF EXISTS create_project_notification();
DROP FUNCTION IF EXISTS update_updated_at();

-- 기존 뷰 삭제
DROP VIEW IF EXISTS trigger_status;

-- ========================================
-- 2. Google OAuth 사용자 자동 프로필 생성 트리거
-- ========================================

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
-- 3. 견적서 번호 자동 생성 트리거
-- ========================================

CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    year_str TEXT;
    sequence_num INTEGER;
    new_quote_number TEXT;
BEGIN
    -- 년도 추출 (YYYY 형식)
    year_str := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- 해당 년도의 최대 시퀀스 번호 조회
    SELECT COALESCE(MAX(
        CASE 
            WHEN quote_number ~ ('^Q' || year_str || '-[0-9]+$') 
            THEN CAST(SUBSTRING(quote_number FROM '[0-9]+$') AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO sequence_num
    FROM quotes;
    
    -- 새 견적서 번호 생성 (Q2024-001 형식)
    new_quote_number := 'Q' || year_str || '-' || LPAD(sequence_num::TEXT, 3, '0');
    
    NEW.quote_number := new_quote_number;
    RETURN NEW;
END;
$$;

-- quotes 테이블에 트리거 등록
CREATE TRIGGER on_quote_insert_generate_number
    BEFORE INSERT ON quotes
    FOR EACH ROW 
    WHEN (NEW.quote_number IS NULL OR NEW.quote_number = '')
    EXECUTE FUNCTION generate_quote_number();

-- ========================================
-- 4. 견적서 총액 자동 계산 트리거
-- ========================================

CREATE OR REPLACE FUNCTION update_quote_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    quote_record RECORD;
    subtotal NUMERIC := 0;
    agency_fee_subtotal NUMERIC := 0;
    agency_fee_amount NUMERIC := 0;
    vat_amount NUMERIC := 0;
    final_total NUMERIC := 0;
BEGIN
    -- quote_id 결정
    IF TG_TABLE_NAME = 'quote_details' THEN
        SELECT q.id, q.agency_fee_rate, q.vat_type, q.discount_amount 
        INTO quote_record
        FROM quotes q
        JOIN quote_groups qg ON q.id = qg.quote_id
        JOIN quote_items qi ON qg.id = qi.quote_group_id
        WHERE qi.id = COALESCE(NEW.quote_item_id, OLD.quote_item_id);
    ELSIF TG_TABLE_NAME = 'quote_items' THEN
        SELECT q.id, q.agency_fee_rate, q.vat_type, q.discount_amount 
        INTO quote_record
        FROM quotes q
        JOIN quote_groups qg ON q.id = qg.quote_id
        WHERE qg.id = COALESCE(NEW.quote_group_id, OLD.quote_group_id);
    ELSIF TG_TABLE_NAME = 'quote_groups' THEN
        SELECT q.id, q.agency_fee_rate, q.vat_type, q.discount_amount 
        INTO quote_record
        FROM quotes q
        WHERE q.id = COALESCE(NEW.quote_id, OLD.quote_id);
    ELSIF TG_TABLE_NAME = 'quotes' THEN
        quote_record.id := COALESCE(NEW.id, OLD.id);
        quote_record.agency_fee_rate := COALESCE(NEW.agency_fee_rate, OLD.agency_fee_rate, 0);
        quote_record.vat_type := COALESCE(NEW.vat_type, OLD.vat_type, 'exclusive');
        quote_record.discount_amount := COALESCE(NEW.discount_amount, OLD.discount_amount, 0);
    END IF;

    -- 전체 소계 계산
    SELECT COALESCE(SUM(qd.quantity * qd.days * qd.unit_price), 0)
    INTO subtotal
    FROM quote_details qd
    JOIN quote_items qi ON qd.quote_item_id = qi.id
    JOIN quote_groups qg ON qi.quote_group_id = qg.id
    WHERE qg.quote_id = quote_record.id;

    -- 수수료 대상 소계 계산 (include_in_fee = true인 그룹과 품목만)
    SELECT COALESCE(SUM(qd.quantity * qd.days * qd.unit_price), 0)
    INTO agency_fee_subtotal
    FROM quote_details qd
    JOIN quote_items qi ON qd.quote_item_id = qi.id
    JOIN quote_groups qg ON qi.quote_group_id = qg.id
    WHERE qg.quote_id = quote_record.id
    AND qg.include_in_fee = true
    AND qi.include_in_fee = true;

    -- 수수료 계산
    agency_fee_amount := agency_fee_subtotal * (quote_record.agency_fee_rate / 100);

    -- 할인 적용
    subtotal := subtotal - quote_record.discount_amount;
    agency_fee_amount := GREATEST(0, agency_fee_amount);

    -- VAT 계산
    IF quote_record.vat_type = 'exclusive' THEN
        vat_amount := (subtotal + agency_fee_amount) * 0.10;
        final_total := subtotal + agency_fee_amount + vat_amount;
    ELSE -- inclusive
        final_total := subtotal + agency_fee_amount;
        vat_amount := final_total * 0.10 / 1.10;
    END IF;

    -- quotes 테이블 업데이트
    UPDATE quotes 
    SET 
        subtotal = subtotal,
        agency_fee_amount = agency_fee_amount,
        vat_amount = vat_amount,
        total_amount = final_total,
        updated_at = NOW()
    WHERE id = quote_record.id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 관련 테이블들에 트리거 등록
CREATE TRIGGER on_quote_details_change
    AFTER INSERT OR UPDATE OR DELETE ON quote_details
    FOR EACH ROW EXECUTE FUNCTION update_quote_totals();

CREATE TRIGGER on_quote_items_change
    AFTER INSERT OR UPDATE OR DELETE ON quote_items
    FOR EACH ROW EXECUTE FUNCTION update_quote_totals();

CREATE TRIGGER on_quote_groups_change
    AFTER INSERT OR UPDATE OR DELETE ON quote_groups
    FOR EACH ROW EXECUTE FUNCTION update_quote_totals();

CREATE TRIGGER on_quotes_change
    AFTER UPDATE OF agency_fee_rate, vat_type, discount_amount ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_quote_totals();

-- ========================================
-- 5. 스냅샷 데이터 자동 생성 트리거
-- ========================================

CREATE OR REPLACE FUNCTION create_quote_detail_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    master_item RECORD;
    supplier_name TEXT;
BEGIN
    -- master_item_id가 제공된 경우에만 스냅샷 생성
    IF NEW.master_item_id IS NOT NULL THEN
        -- master_items에서 현재 정보 조회
        SELECT * INTO master_item
        FROM master_items
        WHERE id = NEW.master_item_id;
        
        IF FOUND THEN
            -- 스냅샷 필드들이 비어있으면 master_items 데이터로 채움
            NEW.name := COALESCE(NEW.name, master_item.name);
            NEW.description := COALESCE(NEW.description, master_item.description);
            NEW.unit_price := COALESCE(NEW.unit_price, master_item.default_unit_price);
            NEW.unit := COALESCE(NEW.unit, master_item.default_unit);
        END IF;
    END IF;

    -- supplier_id가 제공된 경우 공급처명 스냅샷 생성
    IF NEW.supplier_id IS NOT NULL THEN
        SELECT name INTO supplier_name
        FROM suppliers
        WHERE id = NEW.supplier_id;
        
        IF FOUND THEN
            NEW.supplier_name_snapshot := COALESCE(NEW.supplier_name_snapshot, supplier_name);
        END IF;
    END IF;

    -- 기본값 설정
    NEW.quantity := COALESCE(NEW.quantity, 1);
    NEW.days := COALESCE(NEW.days, 1);
    NEW.is_service := COALESCE(NEW.is_service, false);
    
    RETURN NEW;
END;
$$;

-- quote_details 테이블에 트리거 등록
CREATE TRIGGER on_quote_detail_insert_snapshot
    BEFORE INSERT ON quote_details
    FOR EACH ROW EXECUTE FUNCTION create_quote_detail_snapshot();

-- ========================================
-- 6. 견적서 상태 변경 알림 트리거
-- ========================================

CREATE OR REPLACE FUNCTION create_quote_status_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    notification_message TEXT;
    customer_name TEXT;
BEGIN
    -- 상태가 변경된 경우에만 알림 생성
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- 고객명 조회
        SELECT name INTO customer_name
        FROM customers
        WHERE id = NEW.customer_id;
        
        -- 상태별 알림 메시지 생성
        CASE NEW.status
            WHEN 'sent' THEN
                notification_message := customer_name || ' 견적서가 발송되었습니다. (견적번호: ' || NEW.quote_number || ')';
            WHEN 'accepted' THEN
                notification_message := customer_name || ' 견적서가 수주 확정되었습니다! (견적번호: ' || NEW.quote_number || ')';
            WHEN 'rejected' THEN
                notification_message := customer_name || ' 견적서가 거절되었습니다. (견적번호: ' || NEW.quote_number || ')';
            WHEN 'expired' THEN
                notification_message := customer_name || ' 견적서가 만료되었습니다. (견적번호: ' || NEW.quote_number || ')';
            ELSE
                notification_message := NULL;
        END CASE;
        
        -- 알림 생성 (메시지가 있는 경우에만)
        IF notification_message IS NOT NULL THEN
            INSERT INTO notifications (user_id, message, link_url, notification_type)
            VALUES (
                NEW.created_by,
                notification_message,
                '/quotes/' || NEW.id,
                'quote_status_change'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- quotes 테이블에 트리거 등록
CREATE TRIGGER on_quote_status_change
    AFTER UPDATE OF status ON quotes
    FOR EACH ROW EXECUTE FUNCTION create_quote_status_notification();

-- ========================================
-- 7. 프로젝트 생성 알림 트리거
-- ========================================

CREATE OR REPLACE FUNCTION create_project_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    quote_info RECORD;
    notification_message TEXT;
BEGIN
    -- 관련 견적서 정보 조회
    SELECT q.quote_number, q.project_title, c.name as customer_name
    INTO quote_info
    FROM quotes q
    LEFT JOIN customers c ON q.customer_id = c.id
    WHERE q.id = NEW.quote_id;
    
    -- 알림 메시지 생성
    notification_message := quote_info.customer_name || ' 프로젝트가 생성되었습니다: ' || 
                           quote_info.project_title || ' (견적번호: ' || quote_info.quote_number || ')';
    
    -- 알림 생성
    INSERT INTO notifications (user_id, message, link_url, notification_type)
    VALUES (
        NEW.created_by,
        notification_message,
        '/projects/' || NEW.id,
        'project_created'
    );
    
    RETURN NEW;
END;
$$;

-- projects 테이블에 트리거 등록
CREATE TRIGGER on_project_created
    AFTER INSERT ON projects
    FOR EACH ROW EXECUTE FUNCTION create_project_notification();

-- ========================================
-- 8. updated_at 자동 업데이트 트리거
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 모든 테이블에 updated_at 트리거 적용
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_master_items_updated_at
    BEFORE UPDATE ON master_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_quotes_updated_at
    BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================================
-- 9. 트리거 활성화 확인을 위한 뷰
-- ========================================

CREATE OR REPLACE VIEW trigger_status AS
SELECT 
    n.nspname as schemaname,
    c.relname as tablename,
    t.tgname as triggername,
    t.tgtype,
    t.tgenabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

COMMENT ON VIEW trigger_status IS '현재 활성화된 트리거 목록 조회용 뷰';

-- ========================================
-- 설정 완료 메시지
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '견적 관리 시스템 트리거 정리 및 재설정 완료!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ 기존 트리거 및 함수 정리';
    RAISE NOTICE '✅ Google OAuth 사용자 자동 생성 트리거';
    RAISE NOTICE '✅ 견적서 번호 자동 생성 트리거';
    RAISE NOTICE '✅ 견적서 총액 자동 계산 트리거';
    RAISE NOTICE '✅ 스냅샷 데이터 자동 생성 트리거';
    RAISE NOTICE '✅ 견적서 상태 변경 알림 트리거';
    RAISE NOTICE '✅ 프로젝트 생성 알림 트리거';
    RAISE NOTICE '✅ updated_at 자동 업데이트 트리거';
    RAISE NOTICE '========================================';
END $$;