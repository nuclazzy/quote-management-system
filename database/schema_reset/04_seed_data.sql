-- ========================================
-- 견적서 관리 시스템 - 초기 데이터 및 설정
-- 04_seed_data.sql
-- ========================================

-- ========================================
-- 1. 최고 관리자 설정
-- ========================================

-- 기본 관리자 프로필 (수동으로 auth.users 테이블에 레코드가 생성된 후 실행)
-- 실제 사용 시에는 Lewis의 실제 user ID로 변경해야 함
DO $$
DECLARE
    super_admin_id UUID;
    perm_record RECORD;
BEGIN
    -- 최고 관리자 프로필 생성 또는 업데이트
    -- 실제 배포 시에는 실제 user ID를 사용해야 함
    INSERT INTO profiles (id, email, full_name, role, is_active) 
    VALUES (
        -- 실제 Supabase auth.users의 ID를 여기에 입력
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',  -- 실제 사용 시 변경 필요
        'lewis@motionsense.co.kr', 
        '박대표', 
        'super_admin',
        true
    )
    ON CONFLICT (id) DO UPDATE SET 
        role = 'super_admin',
        full_name = '박대표',
        email = 'lewis@motionsense.co.kr',
        is_active = true;

    -- 최고 관리자에게 모든 권한 부여
    SELECT id INTO super_admin_id 
    FROM profiles 
    WHERE role = 'super_admin' AND email = 'lewis@motionsense.co.kr'
    LIMIT 1;
    
    IF super_admin_id IS NOT NULL THEN
        -- 모든 권한을 최고 관리자에게 부여
        FOR perm_record IN SELECT id FROM permissions LOOP
            INSERT INTO user_permissions (user_id, permission_id, granted_by)
            VALUES (super_admin_id, perm_record.id, super_admin_id)
            ON CONFLICT (user_id, permission_id) DO UPDATE SET
                is_active = true,
                granted_by = super_admin_id,
                granted_at = NOW();
        END LOOP;
        
        RAISE NOTICE 'Super admin permissions granted successfully to %', super_admin_id;
    ELSE
        RAISE NOTICE 'Super admin not found - please update the UUID in this script';
    END IF;
END $$;

-- ========================================
-- 2. 기본 견적서 템플릿
-- ========================================
INSERT INTO quote_templates (name, template_data, created_by) VALUES 
('기본 워크샵 패키지', '{
    "groups": [
        {
            "name": "기획 및 운영",
            "sort_order": 1,
            "include_in_fee": true,
            "items": [
                {
                    "name": "행사 기획",
                    "sort_order": 1,
                    "include_in_fee": true,
                    "details": [
                        {
                            "name": "행사 기획안 작성",
                            "description": "행사 전체 기획 및 시나리오 작성",
                            "quantity": 1,
                            "days": 1,
                            "unit": "식",
                            "unit_price": 500000,
                            "is_service": true
                        }
                    ]
                }
            ]
        },
        {
            "name": "진행 및 운영",
            "sort_order": 2,
            "include_in_fee": true,
            "items": [
                {
                    "name": "행사 진행",
                    "sort_order": 1,
                    "include_in_fee": true,
                    "details": [
                        {
                            "name": "사회자",
                            "description": "행사 진행 사회자",
                            "quantity": 1,
                            "days": 1,
                            "unit": "일",
                            "unit_price": 300000,
                            "is_service": true
                        }
                    ]
                }
            ]
        }
    ]
}'::jsonb, (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),

('영상 제작 패키지', '{
    "groups": [
        {
            "name": "영상 제작",
            "sort_order": 1,
            "include_in_fee": true,
            "items": [
                {
                    "name": "촬영",
                    "sort_order": 1,
                    "include_in_fee": true,
                    "details": [
                        {
                            "name": "기본 촬영",
                            "description": "1일 기본 촬영 서비스",
                            "quantity": 1,
                            "days": 1,
                            "unit": "일",
                            "unit_price": 1000000,
                            "is_service": true
                        }
                    ]
                },
                {
                    "name": "편집",
                    "sort_order": 2,
                    "include_in_fee": true,
                    "details": [
                        {
                            "name": "영상 편집",
                            "description": "기본 영상 편집 작업",
                            "quantity": 1,
                            "days": 3,
                            "unit": "편",
                            "unit_price": 800000,
                            "is_service": true
                        }
                    ]
                }
            ]
        },
        {
            "name": "장비 대여",
            "sort_order": 2,
            "include_in_fee": false,
            "items": [
                {
                    "name": "음향 장비",
                    "sort_order": 1,
                    "include_in_fee": false,
                    "details": [
                        {
                            "name": "음향 시스템",
                            "description": "기본 음향 시스템 대여",
                            "quantity": 1,
                            "days": 1,
                            "unit": "일",
                            "unit_price": 200000,
                            "is_service": false
                        }
                    ]
                }
            ]
        }
    ]
}'::jsonb, (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1))

ON CONFLICT DO NOTHING;

-- ========================================
-- 3. 기본 마스터 품목
-- ========================================
INSERT INTO master_items (name, description, default_unit_price, default_unit, created_by) VALUES 
('행사 기획안 작성', '행사 전체 기획 및 시나리오 작성', 500000, '식', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('기본 촬영', '1일 기본 촬영 서비스', 1000000, '일', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('영상 편집', '기본 영상 편집 작업', 800000, '편', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('사회자', '행사 진행 사회자', 300000, '일', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('음향 시스템', '기본 음향 시스템 대여', 200000, '일', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('조명 시스템', '기본 조명 시스템 대여', 150000, '일', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('무대 설치', '기본 무대 설치 및 철거', 400000, '식', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('행사 진행 보조', '행사 진행 보조 인력', 150000, '명', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('영상 송출', '실시간 영상 송출 서비스', 300000, '일', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('동시통역 장비', '동시통역 장비 대여', 250000, '일', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1))

ON CONFLICT DO NOTHING;

-- ========================================
-- 4. 샘플 고객사
-- ========================================
INSERT INTO customers (name, contact_person, email, phone, business_number, address, memo, created_by) VALUES 
('삼성전자', '김매니저', 'manager@samsung.com', '02-1234-5678', '123-45-67890', '서울시 강남구 삼성로 1234', '대기업 고객사', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('LG화학', '박부장', 'park@lgchem.com', '02-9876-5432', '987-65-43210', '서울시 여의도 LG타워', 'R&D 중심 기업', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('네이버', '최팀장', 'choi@naver.com', '031-1111-2222', '111-22-33444', '경기도 성남시 분당구', 'IT 플랫폼 기업', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('현대자동차', '이과장', 'lee@hyundai.com', '02-3333-4444', '333-44-55666', '서울시 서초구 현대빌딩', '자동차 제조업', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('카카오', '정대리', 'jung@kakao.com', '02-5555-6666', '555-66-77888', '경기도 성남시 카카오타워', '모바일 플랫폼', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1))

ON CONFLICT DO NOTHING;

-- ========================================
-- 5. 샘플 공급업체
-- ========================================
INSERT INTO suppliers (name, contact_person, email, phone, memo, created_by) VALUES 
('프로사운드', '김사장', 'kim@prosound.co.kr', '02-1111-2222', '음향 장비 전문 업체', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('라이팅테크', '박대표', 'park@lighting.co.kr', '02-3333-4444', '조명 장비 및 설치 전문', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('영상제작소', '최감독', 'choi@video.co.kr', '02-5555-6666', '영상 촬영 및 편집 전문', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('스테이지크래프트', '이실장', 'lee@stage.co.kr', '02-7777-8888', '무대 설치 및 인테리어', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)),
('이벤트파트너', '정팀장', 'jung@event.co.kr', '02-9999-0000', '행사 기획 및 진행 파트너', (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1))

ON CONFLICT DO NOTHING;

-- ========================================
-- 6. 샘플 견적서 (데모용)
-- ========================================
DO $$
DECLARE
    v_quote_id UUID;
    v_customer_id UUID;
    v_group_id UUID;
    v_item_id UUID;
BEGIN
    -- 고객 ID 가져오기
    SELECT id INTO v_customer_id FROM customers WHERE name = '삼성전자' LIMIT 1;
    
    IF v_customer_id IS NOT NULL THEN
        -- 견적서 생성
        INSERT INTO quotes (
            quote_number,
            project_title,
            customer_id,
            customer_name_snapshot,
            issue_date,
            status,
            vat_type,
            discount_amount,
            agency_fee_rate,
            notes,
            created_by
        ) VALUES (
            'Q-' || TO_CHAR(NOW(), 'YYYYMM') || '-0001',
            '삼성전자 신제품 발표회',
            v_customer_id,
            '삼성전자',
            CURRENT_DATE,
            'draft',
            'exclusive',
            0,
            15.0,
            '신제품 발표회 관련 종합 서비스 견적서입니다.',
            (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)
        ) RETURNING id INTO v_quote_id;
        
        -- 견적서 그룹 1: 기획 및 운영
        INSERT INTO quote_groups (quote_id, name, sort_order, include_in_fee)
        VALUES (v_quote_id, '기획 및 운영', 1, true)
        RETURNING id INTO v_group_id;
        
        -- 품목 1: 행사 기획
        INSERT INTO quote_items (quote_group_id, name, sort_order, include_in_fee)
        VALUES (v_group_id, '행사 기획', 1, true)
        RETURNING id INTO v_item_id;
        
        -- 세부 항목
        INSERT INTO quote_details (quote_item_id, name, description, quantity, days, unit, unit_price, is_service)
        VALUES (v_item_id, '행사 기획안 작성', '발표회 전체 기획 및 시나리오 작성', 1, 1, '식', 800000, true);
        
        -- 품목 2: 진행 요원
        INSERT INTO quote_items (quote_group_id, name, sort_order, include_in_fee)
        VALUES (v_group_id, '진행 요원', 2, true)
        RETURNING id INTO v_item_id;
        
        INSERT INTO quote_details (quote_item_id, name, description, quantity, days, unit, unit_price, is_service)
        VALUES (v_item_id, '행사 진행 사회자', '발표회 진행 전문 사회자', 1, 1, '명', 500000, true);
        
        INSERT INTO quote_details (quote_item_id, name, description, quantity, days, unit, unit_price, is_service)
        VALUES (v_item_id, '행사 보조 인력', '발표회 진행 보조 인력', 3, 1, '명', 150000, true);
        
        -- 견적서 그룹 2: 장비 및 설치
        INSERT INTO quote_groups (quote_id, name, sort_order, include_in_fee)
        VALUES (v_quote_id, '장비 및 설치', 2, false)
        RETURNING id INTO v_group_id;
        
        -- 품목 1: 음향 장비
        INSERT INTO quote_items (quote_group_id, name, sort_order, include_in_fee)
        VALUES (v_group_id, '음향 장비', 1, false)
        RETURNING id INTO v_item_id;
        
        INSERT INTO quote_details (
            quote_item_id, name, description, quantity, days, unit, unit_price, is_service,
            supplier_id, supplier_name_snapshot
        ) VALUES (
            v_item_id, '프로 음향 시스템', '발표회장 음향 시스템 설치 및 운영', 1, 1, '식', 400000, false,
            (SELECT id FROM suppliers WHERE name = '프로사운드' LIMIT 1), '프로사운드'
        );
        
        -- 품목 2: 조명 장비
        INSERT INTO quote_items (quote_group_id, name, sort_order, include_in_fee)
        VALUES (v_group_id, '조명 장비', 2, false)
        RETURNING id INTO v_item_id;
        
        INSERT INTO quote_details (
            quote_item_id, name, description, quantity, days, unit, unit_price, is_service,
            supplier_id, supplier_name_snapshot
        ) VALUES (
            v_item_id, '무대 조명 시스템', '발표회 무대 전용 조명 설치', 1, 1, '식', 600000, false,
            (SELECT id FROM suppliers WHERE name = '라이팅테크' LIMIT 1), '라이팅테크'
        );
        
        -- 총액 계산
        PERFORM calculate_quote_totals(v_quote_id);
        
        RAISE NOTICE 'Sample quote created successfully: %', v_quote_id;
    END IF;
END $$;

-- ========================================
-- 7. 기존 사용자들에 대한 알림 설정 생성
-- ========================================
INSERT INTO notification_settings (user_id)
SELECT id FROM profiles
WHERE id NOT IN (SELECT user_id FROM notification_settings)
ON CONFLICT (user_id) DO NOTHING;

-- ========================================
-- 성공 메시지
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '견적서 관리 시스템 초기 데이터 설정 완료';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '1. 권한 시스템: % 개 권한 생성됨', (SELECT COUNT(*) FROM permissions);
    RAISE NOTICE '2. 견적서 템플릿: % 개 템플릿 생성됨', (SELECT COUNT(*) FROM quote_templates);
    RAISE NOTICE '3. 마스터 품목: % 개 품목 생성됨', (SELECT COUNT(*) FROM master_items);
    RAISE NOTICE '4. 샘플 고객사: % 개 고객사 생성됨', (SELECT COUNT(*) FROM customers);
    RAISE NOTICE '5. 샘플 공급업체: % 개 공급업체 생성됨', (SELECT COUNT(*) FROM suppliers);
    RAISE NOTICE '6. 샘플 견적서: % 개 견적서 생성됨', (SELECT COUNT(*) FROM quotes);
    RAISE NOTICE '===========================================';
    RAISE NOTICE '최고 관리자 설정을 위해 실제 UUID를 입력해 주세요.';
    RAISE NOTICE '현재 설정된 최고 관리자: %', 
        (SELECT email FROM profiles WHERE role = 'super_admin' LIMIT 1);
    RAISE NOTICE '===========================================';
END $$;