-- ========================================
-- 견적 관리 시스템 비즈니스 로직 함수들
-- 02_functions.sql
-- ========================================

-- ========================================
-- 1. 견적서 총액 계산 함수
-- ========================================
CREATE OR REPLACE FUNCTION calculate_quote_total(quote_id_param UUID)
RETURNS TABLE(
    subtotal NUMERIC,
    fee_amount NUMERIC,
    discount_amount NUMERIC,
    net_amount NUMERIC,
    vat_amount NUMERIC,
    total_amount NUMERIC
) 
LANGUAGE plpgsql
AS $$
DECLARE
    quote_record quotes%ROWTYPE;
    calculated_subtotal NUMERIC := 0;
    calculated_fee_applicable NUMERIC := 0;
    calculated_fee_amount NUMERIC := 0;
    calculated_net_amount NUMERIC := 0;
    calculated_vat_amount NUMERIC := 0;
    calculated_total_amount NUMERIC := 0;
BEGIN
    -- 견적서 정보 조회
    SELECT * INTO quote_record FROM quotes WHERE id = quote_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION '견적서를 찾을 수 없습니다: %', quote_id_param;
    END IF;
    
    -- 소계 계산 (모든 세부 항목의 합)
    SELECT COALESCE(SUM(
        CASE 
            WHEN qd.is_service THEN qd.quantity * qd.unit_price
            ELSE qd.quantity * COALESCE(qd.days, 1) * qd.unit_price
        END
    ), 0)
    INTO calculated_subtotal
    FROM quote_details qd
    JOIN quote_items qi ON qd.quote_item_id = qi.id
    JOIN quote_groups qg ON qi.quote_group_id = qg.id
    WHERE qg.quote_id = quote_id_param;
    
    -- 수수료 적용 대상 금액 계산
    SELECT COALESCE(SUM(
        CASE 
            WHEN qg.include_in_fee AND qi.include_in_fee THEN
                CASE 
                    WHEN qd.is_service THEN qd.quantity * qd.unit_price
                    ELSE qd.quantity * COALESCE(qd.days, 1) * qd.unit_price
                END
            ELSE 0
        END
    ), 0)
    INTO calculated_fee_applicable
    FROM quote_details qd
    JOIN quote_items qi ON qd.quote_item_id = qi.id
    JOIN quote_groups qg ON qi.quote_group_id = qg.id
    WHERE qg.quote_id = quote_id_param;
    
    -- 수수료 계산
    calculated_fee_amount := calculated_fee_applicable * (quote_record.agency_fee_rate / 100);
    
    -- 할인 전 순액 계산 (소계 + 수수료)
    calculated_net_amount := calculated_subtotal + calculated_fee_amount;
    
    -- 할인 적용 후 VAT 전 금액
    calculated_net_amount := calculated_net_amount - quote_record.discount_amount;
    
    -- 부가세 계산
    IF quote_record.vat_type = 'exclusive' THEN
        calculated_vat_amount := calculated_net_amount * 0.1;
        calculated_total_amount := calculated_net_amount + calculated_vat_amount;
    ELSE
        calculated_total_amount := calculated_net_amount;
        calculated_vat_amount := calculated_total_amount / 11 * 1;  -- 포함세에서 VAT 역산
    END IF;
    
    -- 결과 반환
    RETURN QUERY SELECT 
        calculated_subtotal,
        calculated_fee_amount,
        quote_record.discount_amount,
        calculated_net_amount,
        calculated_vat_amount,
        calculated_total_amount;
END;
$$;

-- ========================================
-- 2. 견적서 → 프로젝트 전환 함수
-- ========================================
CREATE OR REPLACE FUNCTION convert_quote_to_project(
    quote_id_param UUID,
    payment_schedule JSONB -- [{"type": "contract", "rate": 30, "due_days": 0}, {"type": "balance", "rate": 70, "due_days": 30}]
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    quote_record quotes%ROWTYPE;
    project_id UUID;
    payment_item JSONB;
    due_date DATE;
    amount NUMERIC;
    total_calc RECORD;
BEGIN
    -- 견적서 정보 조회
    SELECT * INTO quote_record FROM quotes WHERE id = quote_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION '견적서를 찾을 수 없습니다: %', quote_id_param;
    END IF;
    
    IF quote_record.status != 'accepted' THEN
        RAISE EXCEPTION '승인된 견적서만 프로젝트로 전환할 수 있습니다. 현재 상태: %', quote_record.status;
    END IF;
    
    -- 총액 계산
    SELECT * INTO total_calc FROM calculate_quote_total(quote_id_param);
    
    -- 프로젝트 생성
    INSERT INTO projects (
        quote_id,
        name,
        total_revenue,
        total_cost,
        status,
        start_date,
        created_by
    ) VALUES (
        quote_id_param,
        quote_record.project_title,
        total_calc.total_amount,
        0, -- 초기 원가는 0, 실제 매입 발생 시 업데이트
        'active',
        CURRENT_DATE,
        quote_record.created_by
    ) RETURNING id INTO project_id;
    
    -- 수금 일정 생성 (매출)
    FOR payment_item IN SELECT * FROM jsonb_array_elements(payment_schedule)
    LOOP
        due_date := CURRENT_DATE + INTERVAL '1 day' * (payment_item->>'due_days')::INTEGER;
        amount := total_calc.total_amount * (payment_item->>'rate')::NUMERIC / 100;
        
        INSERT INTO transactions (
            project_id,
            type,
            partner_name,
            item_name,
            amount,
            due_date,
            status,
            created_by
        ) VALUES (
            project_id,
            'income',
            quote_record.customer_name_snapshot,
            payment_item->>'type' || ' (' || payment_item->>'rate' || '%)',
            amount,
            due_date,
            'pending',
            quote_record.created_by
        );
    END LOOP;
    
    -- 예상 매입 생성 (견적서의 원가 정보 기반)
    INSERT INTO transactions (
        project_id,
        type,
        partner_name,
        item_name,
        amount,
        due_date,
        status,
        created_by
    )
    SELECT 
        project_id,
        'expense',
        COALESCE(qd.supplier_name_snapshot, '미정'),
        qd.name,
        qd.cost_price * qd.quantity,
        CURRENT_DATE + INTERVAL '7 days', -- 기본 7일 후
        'pending',
        quote_record.created_by
    FROM quote_details qd
    JOIN quote_items qi ON qd.quote_item_id = qi.id
    JOIN quote_groups qg ON qi.quote_group_id = qg.id
    WHERE qg.quote_id = quote_id_param 
      AND qd.cost_price > 0;
    
    RETURN project_id;
END;
$$;

-- ========================================
-- 3. 견적서 버전 관리 함수 (수정 시 새 버전 생성)
-- ========================================
CREATE OR REPLACE FUNCTION create_quote_revision(original_quote_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    original_quote quotes%ROWTYPE;
    new_quote_id UUID;
    group_mapping JSONB := '{}';
    item_mapping JSONB := '{}';
    group_record RECORD;
    item_record RECORD;
    detail_record RECORD;
    new_group_id UUID;
    new_item_id UUID;
BEGIN
    -- 원본 견적서 조회
    SELECT * INTO original_quote FROM quotes WHERE id = original_quote_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION '견적서를 찾을 수 없습니다: %', original_quote_id;
    END IF;
    
    -- 원본 견적서 상태를 revised로 변경
    UPDATE quotes SET status = 'revised' WHERE id = original_quote_id;
    
    -- 새 견적서 생성
    INSERT INTO quotes (
        quote_number,
        project_title,
        customer_id,
        customer_name_snapshot,
        issue_date,
        status,
        total_amount,
        vat_type,
        discount_amount,
        agency_fee_rate,
        version,
        parent_quote_id,
        notes,
        created_by
    ) VALUES (
        original_quote.quote_number || '-v' || (original_quote.version + 1),
        original_quote.project_title,
        original_quote.customer_id,
        original_quote.customer_name_snapshot,
        CURRENT_DATE,
        'draft',
        original_quote.total_amount,
        original_quote.vat_type,
        original_quote.discount_amount,
        original_quote.agency_fee_rate,
        original_quote.version + 1,
        original_quote_id,
        original_quote.notes,
        original_quote.created_by
    ) RETURNING id INTO new_quote_id;
    
    -- 그룹 복사
    FOR group_record IN 
        SELECT * FROM quote_groups WHERE quote_id = original_quote_id ORDER BY sort_order
    LOOP
        INSERT INTO quote_groups (
            quote_id,
            name,
            sort_order,
            include_in_fee
        ) VALUES (
            new_quote_id,
            group_record.name,
            group_record.sort_order,
            group_record.include_in_fee
        ) RETURNING id INTO new_group_id;
        
        -- 그룹 매핑 저장
        group_mapping := group_mapping || jsonb_build_object(group_record.id::text, new_group_id);
        
        -- 품목 복사
        FOR item_record IN 
            SELECT * FROM quote_items WHERE quote_group_id = group_record.id ORDER BY sort_order
        LOOP
            INSERT INTO quote_items (
                quote_group_id,
                name,
                sort_order,
                include_in_fee
            ) VALUES (
                new_group_id,
                item_record.name,
                item_record.sort_order,
                item_record.include_in_fee
            ) RETURNING id INTO new_item_id;
            
            -- 품목 매핑 저장
            item_mapping := item_mapping || jsonb_build_object(item_record.id::text, new_item_id);
            
            -- 세부내용 복사
            FOR detail_record IN 
                SELECT * FROM quote_details WHERE quote_item_id = item_record.id
            LOOP
                INSERT INTO quote_details (
                    quote_item_id,
                    name,
                    description,
                    quantity,
                    days,
                    unit,
                    unit_price,
                    is_service,
                    cost_price,
                    supplier_id,
                    supplier_name_snapshot
                ) VALUES (
                    new_item_id,
                    detail_record.name,
                    detail_record.description,
                    detail_record.quantity,
                    detail_record.days,
                    detail_record.unit,
                    detail_record.unit_price,
                    detail_record.is_service,
                    detail_record.cost_price,
                    detail_record.supplier_id,
                    detail_record.supplier_name_snapshot
                );
            END LOOP;
        END LOOP;
    END LOOP;
    
    RETURN new_quote_id;
END;
$$;

-- ========================================
-- 4. 프로젝트 비용 업데이트 함수
-- ========================================
CREATE OR REPLACE FUNCTION update_project_costs(project_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    total_transactions_cost NUMERIC := 0;
    total_expenses_cost NUMERIC := 0;
    total_cost NUMERIC := 0;
BEGIN
    -- 공식 매입 비용 합계
    SELECT COALESCE(SUM(amount), 0) 
    INTO total_transactions_cost
    FROM transactions 
    WHERE project_id = project_id_param 
      AND type = 'expense' 
      AND status IN ('completed', 'processing');
    
    -- 기타 경비 합계
    SELECT COALESCE(SUM(amount), 0)
    INTO total_expenses_cost
    FROM project_expenses
    WHERE project_id = project_id_param;
    
    total_cost := total_transactions_cost + total_expenses_cost;
    
    -- 프로젝트 총 비용 업데이트
    UPDATE projects 
    SET total_cost = total_cost,
        updated_at = NOW()
    WHERE id = project_id_param;
END;
$$;

-- ========================================
-- 5. 견적서 번호 자동 생성 함수
-- ========================================
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    current_year TEXT;
    sequence_num INTEGER;
    quote_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- 올해의 견적서 개수 조회
    SELECT COUNT(*) + 1
    INTO sequence_num
    FROM quotes
    WHERE quote_number LIKE 'QUOTE-' || current_year || '-%';
    
    quote_number := 'QUOTE-' || current_year || '-' || LPAD(sequence_num::TEXT, 3, '0');
    
    -- 중복 체크 (동시성 문제 방지)
    WHILE EXISTS (SELECT 1 FROM quotes WHERE quote_number = quote_number) LOOP
        sequence_num := sequence_num + 1;
        quote_number := 'QUOTE-' || current_year || '-' || LPAD(sequence_num::TEXT, 3, '0');
    END LOOP;
    
    RETURN quote_number;
END;
$$;

-- ========================================
-- 6. 알림 생성 함수
-- ========================================
CREATE OR REPLACE FUNCTION create_notification(
    user_id_param UUID,
    message_param TEXT,
    link_url_param TEXT DEFAULT NULL,
    notification_type_param TEXT DEFAULT 'general'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    notification_id UUID;
    existing_notification UUID;
BEGIN
    -- 24시간 내 동일한 알림이 있는지 확인
    SELECT id INTO existing_notification
    FROM notifications 
    WHERE user_id = user_id_param
      AND message = message_param
      AND COALESCE(link_url, '') = COALESCE(link_url_param, '')
      AND notification_type = notification_type_param
      AND created_at > NOW() - INTERVAL '24 hours'
    LIMIT 1;
    
    -- 중복 알림이 있으면 해당 ID 반환
    IF existing_notification IS NOT NULL THEN
        RETURN existing_notification;
    END IF;
    
    -- 중복이 없으면 새 알림 생성
    INSERT INTO notifications (
        user_id,
        message,
        link_url,
        notification_type
    ) VALUES (
        user_id_param,
        message_param,
        link_url_param,
        notification_type_param
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;

-- ========================================
-- 7. 관리자 전체에게 알림 발송 함수
-- ========================================
CREATE OR REPLACE FUNCTION notify_all_admins(
    message_param TEXT,
    link_url_param TEXT DEFAULT NULL,
    notification_type_param TEXT DEFAULT 'general'
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    admin_record RECORD;
    notification_count INTEGER := 0;
BEGIN
    FOR admin_record IN 
        SELECT id FROM profiles WHERE role = 'admin' AND is_active = true
    LOOP
        PERFORM create_notification(
            admin_record.id,
            message_param,
            link_url_param,
            notification_type_param
        );
        notification_count := notification_count + 1;
    END LOOP;
    
    RETURN notification_count;
END;
$$;

-- ========================================
-- 8. 마감일 임박 알림 체크 함수 (스케줄러용)
-- ========================================
CREATE OR REPLACE FUNCTION check_payment_due_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    transaction_record RECORD;
    notification_count INTEGER := 0;
    message TEXT;
    link_url TEXT;
BEGIN
    -- 3일 이내 마감 예정인 미완료 거래 조회
    FOR transaction_record IN
        SELECT t.*, p.name as project_name, pr.id as admin_id
        FROM transactions t
        JOIN projects p ON t.project_id = p.id
        CROSS JOIN (SELECT id FROM profiles WHERE role = 'admin' AND is_active = true) pr
        WHERE t.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
          AND t.status IN ('pending', 'processing')
          AND NOT EXISTS (
              SELECT 1 FROM notifications n 
              WHERE n.user_id = pr.id 
                AND n.link_url = '/projects/' || t.project_id::text
                AND n.notification_type = 'payment_due'
                AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
          )
    LOOP
        IF transaction_record.type = 'income' THEN
            message := transaction_record.project_name || ' - ' || transaction_record.item_name || ' 수금 마감이 ' || 
                      (transaction_record.due_date - CURRENT_DATE) || '일 남았습니다.';
        ELSE
            message := transaction_record.project_name || ' - ' || transaction_record.partner_name || ' 지급 마감이 ' || 
                      (transaction_record.due_date - CURRENT_DATE) || '일 남았습니다.';
        END IF;
        
        link_url := '/projects/' || transaction_record.project_id::text;
        
        PERFORM create_notification(
            transaction_record.admin_id,
            message,
            link_url,
            'payment_due'
        );
        
        notification_count := notification_count + 1;
    END LOOP;
    
    RETURN notification_count;
END;
$$;

-- ========================================
-- 9. 마감일 경과 알림 체크 함수 (스케줄러용)
-- ========================================
CREATE OR REPLACE FUNCTION check_overdue_payment_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    transaction_record RECORD;
    notification_count INTEGER := 0;
    message TEXT;
    link_url TEXT;
BEGIN
    -- 마감일이 지난 미완료 거래 조회
    FOR transaction_record IN
        SELECT t.*, p.name as project_name, pr.id as admin_id
        FROM transactions t
        JOIN projects p ON t.project_id = p.id
        CROSS JOIN (SELECT id FROM profiles WHERE role = 'admin' AND is_active = true) pr
        WHERE t.due_date < CURRENT_DATE
          AND t.status IN ('pending', 'processing')
          AND NOT EXISTS (
              SELECT 1 FROM notifications n 
              WHERE n.user_id = pr.id 
                AND n.link_url = '/projects/' || t.project_id::text
                AND n.notification_type = 'payment_overdue'
                AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
          )
    LOOP
        IF transaction_record.type = 'income' THEN
            message := transaction_record.project_name || ' - ' || transaction_record.item_name || ' 수금이 ' || 
                      (CURRENT_DATE - transaction_record.due_date) || '일 지연되었습니다.';
        ELSE
            message := transaction_record.project_name || ' - ' || transaction_record.partner_name || ' 지급이 ' || 
                      (CURRENT_DATE - transaction_record.due_date) || '일 지연되었습니다.';
        END IF;
        
        link_url := '/projects/' || transaction_record.project_id::text;
        
        PERFORM create_notification(
            transaction_record.admin_id,
            message,
            link_url,
            'payment_overdue'
        );
        
        notification_count := notification_count + 1;
    END LOOP;
    
    RETURN notification_count;
END;
$$;

-- ========================================
-- 10. 매출 인식 함수 (거래 완료 시점)
-- ========================================
CREATE OR REPLACE FUNCTION recognize_revenue_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    project_record RECORD;
    total_revenue NUMERIC := 0;
BEGIN
    -- 거래가 completed 상태로 변경되고 income 타입인 경우에만 실행
    IF NEW.type = 'income' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
        -- 해당 프로젝트의 완료된 수입 거래들의 총합 계산
        SELECT COALESCE(SUM(amount), 0) 
        INTO total_revenue
        FROM transactions 
        WHERE project_id = NEW.project_id 
          AND type = 'income' 
          AND status = 'completed';
        
        -- 프로젝트의 실제 매출 업데이트 (거래 완료 시점 기준)
        UPDATE projects 
        SET total_revenue = total_revenue,
            updated_at = NOW()
        WHERE id = NEW.project_id;
        
        -- 매출 인식 알림 생성
        PERFORM notify_all_admins(
            (SELECT name FROM projects WHERE id = NEW.project_id) || ' - ' || 
            NEW.item_name || ' 매출이 인식되었습니다. (금액: ' || 
            to_char(NEW.amount, 'FM999,999,999') || '원)',
            '/projects/' || NEW.project_id::text,
            'revenue_recognized'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- ========================================
-- 11. 스냅샷 데이터 생성 함수
-- ========================================
CREATE OR REPLACE FUNCTION create_snapshot_data()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- quote_details 삽입 시 master_items와 suppliers 정보 스냅샷
    IF TG_TABLE_NAME = 'quote_details' THEN
        -- supplier_name_snapshot 설정
        IF NEW.supplier_id IS NOT NULL THEN
            SELECT name INTO NEW.supplier_name_snapshot 
            FROM suppliers 
            WHERE id = NEW.supplier_id;
        END IF;
    END IF;
    
    -- quotes 삽입 시 customer_name_snapshot 설정
    IF TG_TABLE_NAME = 'quotes' THEN
        IF NEW.customer_id IS NOT NULL THEN
            SELECT name INTO NEW.customer_name_snapshot 
            FROM customers 
            WHERE id = NEW.customer_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;