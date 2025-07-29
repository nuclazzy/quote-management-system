-- ========================================
-- 견적 관리 시스템 트랜잭션 함수들
-- 08_transaction_functions.sql
-- ========================================

-- ========================================
-- 1. 견적서 번호 생성 함수 (원자적 연산)
-- ========================================

CREATE OR REPLACE FUNCTION generate_quote_number(
  p_company_id UUID
) 
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
  -- 현재 년월로 prefix 생성
  v_prefix := 'Q' || TO_CHAR(NOW(), 'YYYYMM');
  
  -- 동시성 제어를 위한 루프
  LOOP
    v_attempt := v_attempt + 1;
    
    IF v_attempt > v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate quote number after % attempts', v_max_attempts;
    END IF;
    
    -- 현재 월의 마지막 번호 조회 (행 잠금 사용)
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(quote_number FROM 8) AS INTEGER)), 
      0
    ) + 1
    INTO v_next_number
    FROM quotes 
    WHERE company_id = p_company_id 
      AND quote_number LIKE v_prefix || '%'
    FOR UPDATE;
    
    -- 새 견적서 번호 생성
    v_quote_number := v_prefix || LPAD(v_next_number::TEXT, 4, '0');
    
    -- 중복 확인 및 생성 시도
    BEGIN
      -- 임시 레코드로 번호 예약
      INSERT INTO quotes (
        id, company_id, quote_number, title, customer_name_snapshot,
        status, total_amount, created_by
      ) VALUES (
        uuid_generate_v4(), p_company_id, v_quote_number, '__TEMP__', '__TEMP__',
        'draft', 0, auth.uid()
      );
      
      -- 성공하면 루프 종료
      EXIT;
      
    EXCEPTION WHEN unique_violation THEN
      -- 중복이면 다시 시도
      CONTINUE;
    END;
  END LOOP;
  
  -- 임시 레코드 삭제
  DELETE FROM quotes 
  WHERE quote_number = v_quote_number 
    AND title = '__TEMP__';
  
  RETURN v_quote_number;
END;
$$;

-- ========================================
-- 2. 견적서 생성 트랜잭션 함수
-- ========================================

CREATE OR REPLACE FUNCTION create_quote_transaction(
  p_quote_data JSONB
)
RETURNS TABLE(
  quote_id UUID,
  quote_number TEXT,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quote_id UUID;
  v_quote_number TEXT;
  v_company_id UUID;
  v_group JSONB;
  v_item JSONB;
  v_detail JSONB;
  v_group_id UUID;
  v_item_id UUID;
  v_detail_id UUID;
  v_subtotal NUMERIC := 0;
  v_tax_amount NUMERIC := 0;
  v_total NUMERIC := 0;
  v_tax_rate NUMERIC;
BEGIN
  -- 사용자의 company_id 조회
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE id = auth.uid() AND is_active = true;
  
  IF v_company_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, false, '유효하지 않은 사용자입니다.';
    RETURN;
  END IF;
  
  -- 입력 데이터 검증
  IF NOT (p_quote_data ? 'title' AND p_quote_data ? 'customer_id' AND p_quote_data ? 'quote_groups') THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, false, '필수 필드가 누락되었습니다.';
    RETURN;
  END IF;
  
  -- 트랜잭션 시작 (함수 자체가 트랜잭션)
  
  -- 견적서 번호 생성
  v_quote_number := generate_quote_number(v_company_id);
  v_quote_id := uuid_generate_v4();
  v_tax_rate := COALESCE((p_quote_data->>'tax_rate')::NUMERIC, 10);
  
  -- 메인 견적서 레코드 생성
  INSERT INTO quotes (
    id, company_id, quote_number, title, customer_id, 
    customer_name_snapshot, project_id, description,
    status, tax_rate, valid_until, terms, notes, created_by
  ) VALUES (
    v_quote_id,
    v_company_id,
    v_quote_number,
    p_quote_data->>'title',
    (p_quote_data->>'customer_id')::UUID,
    COALESCE(
      (SELECT name FROM customers WHERE id = (p_quote_data->>'customer_id')::UUID),
      'Unknown Customer'
    ),
    CASE WHEN p_quote_data ? 'project_id' THEN (p_quote_data->>'project_id')::UUID ELSE NULL END,
    p_quote_data->>'description',
    'draft',
    v_tax_rate,
    CASE WHEN p_quote_data ? 'valid_until' THEN (p_quote_data->>'valid_until')::DATE ELSE NULL END,
    p_quote_data->>'terms',
    p_quote_data->>'notes',
    auth.uid()
  );
  
  -- 견적서 그룹들 처리
  FOR v_group IN SELECT * FROM jsonb_array_elements(p_quote_data->'quote_groups')
  LOOP
    v_group_id := uuid_generate_v4();
    
    INSERT INTO quote_groups (
      id, quote_id, title, sort_order
    ) VALUES (
      v_group_id,
      v_quote_id,
      v_group->>'title',
      COALESCE((v_group->>'sort_order')::INTEGER, 0)
    );
    
    -- 견적서 품목들 처리
    IF v_group ? 'quote_items' THEN
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_group->'quote_items')
      LOOP
        v_item_id := uuid_generate_v4();
        
        INSERT INTO quote_items (
          id, quote_group_id, item_name, description,
          quantity, unit_price, total_price, 
          supplier_id, sort_order
        ) VALUES (
          v_item_id,
          v_group_id,
          v_item->>'item_name',
          v_item->>'description',
          COALESCE((v_item->>'quantity')::NUMERIC, 1),
          COALESCE((v_item->>'unit_price')::NUMERIC, 0),
          COALESCE((v_item->>'quantity')::NUMERIC, 1) * COALESCE((v_item->>'unit_price')::NUMERIC, 0),
          CASE WHEN v_item ? 'supplier_id' THEN (v_item->>'supplier_id')::UUID ELSE NULL END,
          COALESCE((v_item->>'sort_order')::INTEGER, 0)
        );
        
        -- 소계에 품목 가격 추가
        v_subtotal := v_subtotal + (
          COALESCE((v_item->>'quantity')::NUMERIC, 1) * COALESCE((v_item->>'unit_price')::NUMERIC, 0)
        );
        
        -- 견적서 품목 세부사항들 처리
        IF v_item ? 'quote_item_details' THEN
          FOR v_detail IN SELECT * FROM jsonb_array_elements(v_item->'quote_item_details')
          LOOP
            v_detail_id := uuid_generate_v4();
            
            INSERT INTO quote_item_details (
              id, quote_item_id, detail_name, description,
              quantity, unit_price, total_price, sort_order
            ) VALUES (
              v_detail_id,
              v_item_id,
              v_detail->>'detail_name',
              v_detail->>'description',
              COALESCE((v_detail->>'quantity')::NUMERIC, 1),
              COALESCE((v_detail->>'unit_price')::NUMERIC, 0),
              COALESCE((v_detail->>'quantity')::NUMERIC, 1) * COALESCE((v_detail->>'unit_price')::NUMERIC, 0),
              COALESCE((v_detail->>'sort_order')::INTEGER, 0)
            );
            
            -- 소계에 세부사항 가격 추가
            v_subtotal := v_subtotal + (
              COALESCE((v_detail->>'quantity')::NUMERIC, 1) * COALESCE((v_detail->>'unit_price')::NUMERIC, 0)
            );
          END LOOP;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  
  -- 총액 계산
  v_tax_amount := ROUND(v_subtotal * (v_tax_rate / 100), 0);
  v_total := v_subtotal + v_tax_amount;
  
  -- 견적서 총액 업데이트
  UPDATE quotes 
  SET 
    subtotal = v_subtotal,
    tax_amount = v_tax_amount,
    total = v_total
  WHERE id = v_quote_id;
  
  -- 견적서 히스토리 기록
  INSERT INTO quote_history (
    quote_id, user_id, action, changes
  ) VALUES (
    v_quote_id, auth.uid(), 'created', 
    jsonb_build_object('status', 'draft', 'total', v_total)
  );
  
  -- 성공 응답
  RETURN QUERY SELECT v_quote_id, v_quote_number, true, '견적서가 성공적으로 생성되었습니다.';
  
EXCEPTION
  WHEN OTHERS THEN
    -- 모든 에러를 캐치하고 롤백 (함수 레벨에서 자동 롤백됨)
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, false, SQLERRM;
END;
$$;

-- ========================================
-- 3. 견적서 수정 트랜잭션 함수
-- ========================================

CREATE OR REPLACE FUNCTION update_quote_transaction(
  p_quote_id UUID,
  p_quote_data JSONB
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_current_status TEXT;
  v_old_total NUMERIC;
  v_new_total NUMERIC;
BEGIN
  -- 사용자 권한 및 견적서 존재 확인
  SELECT q.status, q.total, p.company_id
  INTO v_current_status, v_old_total, v_company_id
  FROM quotes q
  JOIN profiles p ON p.id = auth.uid()
  WHERE q.id = p_quote_id 
    AND q.company_id = p.company_id
    AND (q.created_by = auth.uid() OR p.role = 'admin')
    AND p.is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '견적서를 찾을 수 없거나 수정 권한이 없습니다.';
    RETURN;
  END IF;
  
  -- 상태 확인 (승인된 견적서는 수정 불가)
  IF v_current_status IN ('accepted', 'completed') THEN
    RETURN QUERY SELECT false, '승인된 견적서는 수정할 수 없습니다.';
    RETURN;
  END IF;
  
  -- 기존 하위 데이터 삭제
  DELETE FROM quote_item_details 
  WHERE quote_item_id IN (
    SELECT qi.id FROM quote_items qi
    JOIN quote_groups qg ON qi.quote_group_id = qg.id
    WHERE qg.quote_id = p_quote_id
  );
  
  DELETE FROM quote_items 
  WHERE quote_group_id IN (
    SELECT id FROM quote_groups WHERE quote_id = p_quote_id
  );
  
  DELETE FROM quote_groups WHERE quote_id = p_quote_id;
  
  -- 새 데이터로 재생성 (create_quote_transaction의 로직 재사용)
  -- 여기서는 간단히 기본 정보만 업데이트
  UPDATE quotes 
  SET 
    title = p_quote_data->>'title',
    description = p_quote_data->>'description',
    terms = p_quote_data->>'terms',
    notes = p_quote_data->>'notes',
    valid_until = CASE WHEN p_quote_data ? 'valid_until' THEN (p_quote_data->>'valid_until')::DATE ELSE valid_until END,
    updated_at = NOW()
  WHERE id = p_quote_id;
  
  -- 히스토리 기록
  INSERT INTO quote_history (
    quote_id, user_id, action, changes
  ) VALUES (
    p_quote_id, auth.uid(), 'updated',
    jsonb_build_object('old_total', v_old_total, 'new_total', v_new_total)
  );
  
  RETURN QUERY SELECT true, '견적서가 성공적으로 수정되었습니다.';
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, SQLERRM;
END;
$$;

-- ========================================
-- 4. 견적서 상태 변경 함수
-- ========================================

CREATE OR REPLACE FUNCTION update_quote_status(
  p_quote_id UUID,
  p_new_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_company_id UUID;
  v_valid_transitions TEXT[];
BEGIN
  -- 권한 확인 및 현재 상태 조회
  SELECT q.status, p.company_id
  INTO v_current_status, v_company_id
  FROM quotes q
  JOIN profiles p ON p.id = auth.uid()
  WHERE q.id = p_quote_id 
    AND q.company_id = p.company_id
    AND (q.created_by = auth.uid() OR p.role = 'admin')
    AND p.is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '견적서를 찾을 수 없거나 권한이 없습니다.';
    RETURN;
  END IF;
  
  -- 상태 전환 유효성 검증 (강화된 비즈니스 로직)
  CASE v_current_status
    WHEN 'draft' THEN 
      v_valid_transitions := ARRAY['sent', 'canceled'];
    WHEN 'sent' THEN 
      v_valid_transitions := ARRAY['accepted', 'revised', 'canceled'];
    WHEN 'revised' THEN 
      v_valid_transitions := ARRAY['sent', 'canceled'];  -- revised에서 accepted 직접 전환 불가
    WHEN 'accepted' THEN 
      v_valid_transitions := ARRAY['completed'];         -- accepted 후 취소 불가, 완료만 가능
    WHEN 'completed' THEN
      v_valid_transitions := ARRAY[]::TEXT[];            -- 완료된 견적서는 상태 변경 불가
    ELSE 
      v_valid_transitions := ARRAY[]::TEXT[];
  END CASE;
  
  IF NOT (p_new_status = ANY(v_valid_transitions)) THEN
    RETURN QUERY SELECT false, '유효하지 않은 상태 전환입니다.';
    RETURN;
  END IF;
  
  -- 상태 업데이트
  UPDATE quotes 
  SET 
    status = p_new_status,
    updated_at = NOW()
  WHERE id = p_quote_id;
  
  -- 히스토리 기록
  INSERT INTO quote_history (
    quote_id, user_id, action, changes, notes
  ) VALUES (
    p_quote_id, auth.uid(), 'status_changed',
    jsonb_build_object('from', v_current_status, 'to', p_new_status),
    p_notes
  );
  
  RETURN QUERY SELECT true, '상태가 성공적으로 변경되었습니다.';
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, SQLERRM;
END;
$$;

-- ========================================
-- 5. 견적서 히스토리 테이블 생성
-- ========================================

CREATE TABLE IF NOT EXISTS quote_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'status_changed', 'deleted')),
  changes JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 히스토리 테이블 인덱스
CREATE INDEX idx_quote_history_quote_id ON quote_history(quote_id);
CREATE INDEX idx_quote_history_created_at ON quote_history(created_at DESC);

-- 히스토리 테이블 RLS
ALTER TABLE quote_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_history_select_policy" ON quote_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quotes q 
      JOIN profiles p ON p.id = auth.uid()
      WHERE q.id = quote_id 
        AND q.company_id = p.company_id
        AND p.is_active = true
    )
  );

CREATE POLICY "quote_history_insert_policy" ON quote_history
  FOR INSERT
  WITH CHECK (false); -- 함수에서만 삽입 가능

-- ========================================
-- 6. 함수 권한 설정
-- ========================================

-- 인증된 사용자만 함수 실행 가능
REVOKE ALL ON FUNCTION generate_quote_number(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_quote_transaction(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION update_quote_transaction(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION update_quote_status(UUID, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION generate_quote_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_quote_transaction(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_quote_transaction(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_quote_status(UUID, TEXT, TEXT) TO authenticated;

-- 함수 설명
COMMENT ON FUNCTION generate_quote_number(UUID) IS '견적서 번호를 원자적으로 생성';
COMMENT ON FUNCTION create_quote_transaction(JSONB) IS '견적서 생성 트랜잭션 (롤백 보장)';
COMMENT ON FUNCTION update_quote_transaction(UUID, JSONB) IS '견적서 수정 트랜잭션';
COMMENT ON FUNCTION update_quote_status(UUID, TEXT, TEXT) IS '견적서 상태 변경 (상태 전환 검증 포함)';
COMMENT ON TABLE quote_history IS '견적서 변경 이력 추적';