-- ========================================
-- 견적서 관리 시스템 - 비즈니스 로직 함수 및 트리거
-- 02_functions_and_triggers.sql
-- ========================================

-- ========================================
-- 1. 유틸리티 함수들
-- ========================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 2. 견적서 번호 생성 함수
-- ========================================
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prefix TEXT;
    v_next_number INTEGER;
    v_quote_number TEXT;
    v_max_attempts INTEGER := 10;
    v_attempt INTEGER := 0;
BEGIN
    -- 현재 년월로 prefix 생성 (Q-YYYYMM 형식)
    v_prefix := 'Q-' || TO_CHAR(NOW(), 'YYYYMM');
    
    -- 동시성 제어를 위한 루프
    LOOP
        v_attempt := v_attempt + 1;
        
        IF v_attempt > v_max_attempts THEN
            RAISE EXCEPTION 'Failed to generate quote number after % attempts', v_max_attempts;
        END IF;
        
        -- 현재 월의 마지막 번호 조회
        SELECT COALESCE(
            MAX(CAST(SUBSTRING(quote_number FROM 9) AS INTEGER)), 
            0
        ) + 1
        INTO v_next_number
        FROM quotes 
        WHERE quote_number LIKE v_prefix || '%';
        
        -- 새 견적서 번호 생성 (Q-YYYYMM-NNNN 형식)
        v_quote_number := v_prefix || '-' || LPAD(v_next_number::TEXT, 4, '0');
        
        -- 중복 확인
        IF NOT EXISTS (SELECT 1 FROM quotes WHERE quote_number = v_quote_number) THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN v_quote_number;
END;
$$;

-- ========================================
-- 3. 견적서 총액 계산 함수
-- ========================================
CREATE OR REPLACE FUNCTION calculate_quote_totals(p_quote_id UUID)
RETURNS VOID AS $$
DECLARE
    v_subtotal NUMERIC(15,2);
    v_fee_applicable NUMERIC(15,2);
    v_agency_fee NUMERIC(15,2);
    v_discount NUMERIC(15,2);
    v_tax NUMERIC(15,2);
    v_total NUMERIC(15,2);
    v_quote RECORD;
BEGIN
    -- 견적서 정보 조회
    SELECT discount_amount, agency_fee_rate, vat_type 
    INTO v_quote
    FROM quotes 
    WHERE id = p_quote_id;
    
    IF v_quote IS NULL THEN
        RETURN;
    END IF;
    
    -- 소계 계산
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN qd.is_service THEN qd.quantity * qd.unit_price
                ELSE qd.quantity * qd.days * qd.unit_price
            END
        ), 0),
        COALESCE(SUM(
            CASE 
                WHEN qg.include_in_fee AND qi.include_in_fee THEN
                    CASE 
                        WHEN qd.is_service THEN qd.quantity * qd.unit_price
                        ELSE qd.quantity * qd.days * qd.unit_price
                    END
                ELSE 0
            END
        ), 0)
    INTO v_subtotal, v_fee_applicable
    FROM quote_groups qg
    JOIN quote_items qi ON qg.id = qi.quote_group_id
    JOIN quote_details qd ON qi.id = qd.quote_item_id
    WHERE qg.quote_id = p_quote_id;
    
    -- 대행수수료 계산
    v_agency_fee := v_fee_applicable * (v_quote.agency_fee_rate / 100);
    
    -- 할인 적용
    v_discount := v_quote.discount_amount;
    
    -- VAT 계산 (한국 기본 10%)
    IF v_quote.vat_type = 'exclusive' THEN
        v_tax := (v_subtotal + v_agency_fee - v_discount) * 0.10;
        v_total := v_subtotal + v_agency_fee + v_tax - v_discount;
    ELSE
        -- VAT 포함가
        v_total := v_subtotal + v_agency_fee - v_discount;
        v_tax := v_total * 0.10 / 1.10;
    END IF;
    
    -- 견적서 총액 업데이트
    UPDATE quotes 
    SET total_amount = v_total
    WHERE id = p_quote_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. 견적서 생성 트랜잭션 함수
-- ========================================
CREATE OR REPLACE FUNCTION create_quote_transaction(p_quote_data JSONB)
RETURNS TABLE(
    quote_id UUID,
    quote_number TEXT,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_quote_id UUID;
    v_quote_number TEXT;
    v_group_id UUID;
    v_item_id UUID;
    v_group JSONB;
    v_item JSONB;
    v_detail JSONB;
BEGIN
    -- 견적서 번호 생성
    v_quote_number := generate_quote_number();
    
    -- 견적서 생성
    INSERT INTO quotes (
        quote_number,
        project_title,
        customer_id,
        customer_name_snapshot,
        issue_date,
        notes,
        created_by
    ) VALUES (
        v_quote_number,
        p_quote_data->>'title',
        (p_quote_data->>'customer_id')::UUID,
        COALESCE(
            (SELECT name FROM customers WHERE id = (p_quote_data->>'customer_id')::UUID),
            'Unknown Customer'
        ),
        COALESCE((p_quote_data->>'issue_date')::DATE, CURRENT_DATE),
        p_quote_data->>'notes',
        auth.uid()
    ) RETURNING id INTO v_quote_id;
    
    -- 견적서 그룹 및 항목 생성
    FOR v_group IN SELECT * FROM JSONB_ARRAY_ELEMENTS(p_quote_data->'quote_groups')
    LOOP
        -- 그룹 생성
        INSERT INTO quote_groups (
            quote_id,
            name,
            sort_order,
            include_in_fee
        ) VALUES (
            v_quote_id,
            v_group->>'title',
            COALESCE((v_group->>'sort_order')::INTEGER, 0),
            COALESCE((v_group->>'include_in_fee')::BOOLEAN, true)
        ) RETURNING id INTO v_group_id;
        
        -- 품목 생성
        FOR v_item IN SELECT * FROM JSONB_ARRAY_ELEMENTS(v_group->'quote_items')
        LOOP
            INSERT INTO quote_items (
                quote_group_id,
                name,
                sort_order,
                include_in_fee
            ) VALUES (
                v_group_id,
                v_item->>'item_name',
                COALESCE((v_item->>'sort_order')::INTEGER, 0),
                COALESCE((v_item->>'include_in_fee')::BOOLEAN, true)
            ) RETURNING id INTO v_item_id;
            
            -- 세부 항목 생성
            FOR v_detail IN SELECT * FROM JSONB_ARRAY_ELEMENTS(v_item->'quote_item_details')
            LOOP
                INSERT INTO quote_details (
                    quote_item_id,
                    name,
                    description,
                    quantity,
                    unit_price,
                    unit,
                    is_service,
                    supplier_id,
                    supplier_name_snapshot
                ) VALUES (
                    v_item_id,
                    v_detail->>'detail_name',
                    v_detail->>'description',
                    COALESCE((v_detail->>'quantity')::NUMERIC, 1),
                    COALESCE((v_detail->>'unit_price')::NUMERIC, 0),
                    COALESCE(v_detail->>'unit', 'EA'),
                    COALESCE((v_detail->>'is_service')::BOOLEAN, false),
                    CASE WHEN v_detail->>'supplier_id' != '' THEN (v_detail->>'supplier_id')::UUID ELSE NULL END,
                    CASE WHEN v_detail->>'supplier_id' IS NOT NULL THEN
                        (SELECT name FROM suppliers WHERE id = (v_detail->>'supplier_id')::UUID)
                    ELSE NULL END
                );
            END LOOP;
        END LOOP;
    END LOOP;
    
    -- 총액 계산
    PERFORM calculate_quote_totals(v_quote_id);
    
    -- 결과 반환
    RETURN QUERY SELECT 
        v_quote_id,
        v_quote_number,
        true,
        '견적서가 성공적으로 생성되었습니다.';
        
EXCEPTION
    WHEN OTHERS THEN
        -- 오류 발생 시 롤백되고 오류 메시지 반환
        RETURN QUERY SELECT 
            NULL::UUID,
            NULL::TEXT,
            false,
            SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 5. 알림 생성 함수
-- ========================================
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT,
    p_link_url TEXT DEFAULT NULL,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_priority TEXT DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
    setting_enabled BOOLEAN := true;
BEGIN
    -- 사용자 알림 설정 확인
    CASE p_type
        WHEN 'quote_created' THEN
            SELECT quote_created INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
        WHEN 'quote_approved' THEN
            SELECT quote_approved INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
        WHEN 'quote_rejected' THEN
            SELECT quote_rejected INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
        WHEN 'quote_expiring' THEN
            SELECT quote_expiring INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
        WHEN 'project_created' THEN
            SELECT project_created INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
        WHEN 'project_status_changed' THEN
            SELECT project_status_changed INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
        WHEN 'project_deadline_approaching' THEN
            SELECT project_deadline_approaching INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
        WHEN 'settlement_due' THEN
            SELECT settlement_due INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
        WHEN 'settlement_completed' THEN
            SELECT settlement_completed INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
        WHEN 'settlement_overdue' THEN
            SELECT settlement_overdue INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
        WHEN 'system_user_joined' THEN
            SELECT system_user_joined INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
        WHEN 'system_permission_changed' THEN
            SELECT system_permission_changed INTO setting_enabled FROM notification_settings WHERE user_id = p_user_id;
        ELSE
            setting_enabled := true; -- 기본값으로 활성화
    END CASE;
    
    -- 설정이 NULL이면 기본값으로 활성화
    IF setting_enabled IS NULL THEN
        setting_enabled := true;
    END IF;
    
    -- 알림이 활성화된 경우에만 생성
    IF setting_enabled THEN
        INSERT INTO notifications (
            user_id, title, message, type, link_url, entity_type, entity_id, priority
        ) VALUES (
            p_user_id, p_title, p_message, p_type, p_link_url, p_entity_type, p_entity_id, p_priority
        ) RETURNING id INTO notification_id;
    END IF;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 6. 기본 알림 설정 생성 함수
-- ========================================
CREATE OR REPLACE FUNCTION create_default_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_settings (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 7. 트리거 생성
-- ========================================

-- updated_at 컬럼 자동 업데이트 트리거
CREATE TRIGGER trigger_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_suppliers_updated_at 
    BEFORE UPDATE ON suppliers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_master_items_updated_at 
    BEFORE UPDATE ON master_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_quote_templates_updated_at 
    BEFORE UPDATE ON quote_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_quotes_updated_at 
    BEFORE UPDATE ON quotes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_notification_settings_updated_at 
    BEFORE UPDATE ON notification_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 견적서 세부 항목 변경 시 총액 재계산 트리거
CREATE OR REPLACE FUNCTION trigger_recalculate_quote_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_quote_id UUID;
BEGIN
    -- 견적서 ID 찾기
    IF TG_OP = 'DELETE' THEN
        SELECT qg.quote_id INTO v_quote_id
        FROM quote_groups qg
        JOIN quote_items qi ON qg.id = qi.quote_group_id
        WHERE qi.id = OLD.quote_item_id;
    ELSE
        SELECT qg.quote_id INTO v_quote_id
        FROM quote_groups qg
        JOIN quote_items qi ON qg.id = qi.quote_group_id
        WHERE qi.id = NEW.quote_item_id;
    END IF;
    
    -- 총액 재계산
    IF v_quote_id IS NOT NULL THEN
        PERFORM calculate_quote_totals(v_quote_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalculate_totals_insert
    AFTER INSERT ON quote_details
    FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_quote_totals();

CREATE TRIGGER trigger_recalculate_totals_update
    AFTER UPDATE ON quote_details
    FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_quote_totals();

CREATE TRIGGER trigger_recalculate_totals_delete
    AFTER DELETE ON quote_details
    FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_quote_totals();

-- 새 사용자에 대한 기본 알림 설정 생성 트리거
CREATE TRIGGER trigger_create_notification_settings
    AFTER INSERT ON profiles
    FOR EACH ROW EXECUTE FUNCTION create_default_notification_settings();

-- ========================================
-- 함수 코멘트
-- ========================================
COMMENT ON FUNCTION update_updated_at_column IS 'updated_at 컬럼 자동 업데이트';
COMMENT ON FUNCTION generate_quote_number IS '견적서 번호 자동 생성 (Q-YYYYMM-NNNN 형식)';
COMMENT ON FUNCTION calculate_quote_totals IS '견적서 총액 계산';
COMMENT ON FUNCTION create_quote_transaction IS '견적서 생성 트랜잭션';
COMMENT ON FUNCTION create_notification IS '알림 생성 (설정 고려)';
COMMENT ON FUNCTION create_default_notification_settings IS '기본 알림 설정 생성';