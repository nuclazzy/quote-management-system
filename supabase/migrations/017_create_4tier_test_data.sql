-- 4단계 견적서 구조 테스트 데이터 생성
-- quotes → quote_groups → quote_items → quote_details

-- 샘플 견적서 데이터 생성
DO $$
DECLARE
    sample_quote_id UUID;
    sample_client_id UUID;
    group1_id UUID;
    group2_id UUID;
    item1_id UUID;
    item2_id UUID;
    item3_id UUID;
    detail_id UUID;
BEGIN
    -- 0. 테스트용 클라이언트 확인 또는 생성
    SELECT id INTO sample_client_id FROM clients WHERE name = 'MotionSense 테스트 고객사' LIMIT 1;
    
    IF sample_client_id IS NULL THEN
        INSERT INTO clients (
            name,
            business_registration_number,
            contact_person,
            phone,
            email
        ) VALUES (
            'MotionSense 테스트 고객사',
            '123-45-67890',
            '김담당',
            '02-1234-5678',
            'test@motionsense.co.kr'
        ) RETURNING id INTO sample_client_id;
    END IF;
    -- 1. 기본 견적서 생성
    INSERT INTO quotes (
        title,
        project_title,
        client_id,
        customer_name_snapshot,
        issue_date,
        agency_fee_rate,
        discount_amount,
        vat_type,
        status,
        total_amount
    ) VALUES (
        '4단계 구조 테스트 견적서',
        '4단계 구조 테스트 견적서',
        sample_client_id,
        'MotionSense 테스트 고객사',
        CURRENT_DATE,
        0.15, -- 15%
        50000, -- 5만원 할인
        'exclusive',
        'draft',
        0 -- 계산 후 업데이트될 예정
    ) RETURNING id INTO sample_quote_id;
    
    -- 2. 그룹 1: 개발 작업
    INSERT INTO quote_groups (
        quote_id,
        name,
        sort_order,
        include_in_fee
    ) VALUES (
        sample_quote_id,
        '웹 개발 작업',
        0,
        true
    ) RETURNING id INTO group1_id;
    
    -- 2-1. 품목 1: 프론트엔드 개발
    INSERT INTO quote_items_motionsense (
        quote_group_id,
        name,
        sort_order,
        include_in_fee
    ) VALUES (
        group1_id,
        '프론트엔드 개발',
        0,
        true
    ) RETURNING id INTO item1_id;
    
    -- 2-1-1. 세부내용들
    INSERT INTO quote_details (
        quote_item_id,
        name,
        description,
        quantity,
        days,
        unit,
        unit_price,
        is_service,
        cost_price
    ) VALUES 
    (
        item1_id,
        'React 컴포넌트 개발',
        '사용자 인터페이스 컴포넌트 개발 및 구현',
        10,
        1,
        '개',
        80000,
        true,
        50000
    ),
    (
        item1_id,
        'UI/UX 디자인 구현',
        '디자인 시스템 기반 화면 구현',
        5,
        2,
        '페이지',
        150000,
        true,
        100000
    ),
    (
        item1_id,
        '반응형 웹 최적화',
        '모바일 및 태블릿 대응',
        1,
        3,
        '식',
        300000,
        true,
        200000
    );
    
    -- 2-2. 품목 2: 백엔드 개발
    INSERT INTO quote_items_motionsense (
        quote_group_id,
        name,
        sort_order,
        include_in_fee
    ) VALUES (
        group1_id,
        '백엔드 개발',
        1,
        true
    ) RETURNING id INTO item2_id;
    
    -- 2-2-1. 세부내용들
    INSERT INTO quote_details (
        quote_item_id,
        name,
        description,
        quantity,
        days,
        unit,
        unit_price,
        is_service,
        cost_price
    ) VALUES 
    (
        item2_id,
        'API 서버 개발',
        'RESTful API 설계 및 구현',
        15,
        1,
        '개',
        120000,
        true,
        80000
    ),
    (
        item2_id,
        '데이터베이스 설계',
        'PostgreSQL 기반 DB 설계 및 최적화',
        1,
        5,
        '식',
        500000,
        true,
        300000
    );
    
    -- 3. 그룹 2: 하드웨어 및 기타
    INSERT INTO quote_groups (
        quote_id,
        name,
        sort_order,
        include_in_fee
    ) VALUES (
        sample_quote_id,
        '하드웨어 및 기타',
        1,
        false -- 수수료 제외
    ) RETURNING id INTO group2_id;
    
    -- 3-1. 품목 3: 서버 장비
    INSERT INTO quote_items_motionsense (
        quote_group_id,
        name,
        sort_order,
        include_in_fee
    ) VALUES (
        group2_id,
        '서버 장비 및 인프라',
        0,
        false
    ) RETURNING id INTO item3_id;
    
    -- 3-1-1. 세부내용들
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
        supplier_name_snapshot
    ) VALUES 
    (
        item3_id,
        'AWS EC2 인스턴스',
        't3.large 인스턴스 1년 사용료',
        12,
        1,
        '월',
        85000,
        false,
        70000,
        'Amazon Web Services'
    ),
    (
        item3_id,
        '도메인 및 SSL 인증서',
        '.com 도메인 및 SSL 인증서 연간 비용',
        1,
        1,
        '년',
        150000,
        false,
        120000,
        '도메인 등록업체'
    );
    
    RAISE NOTICE '4단계 구조 테스트 데이터가 생성되었습니다. 견적서 ID: %', sample_quote_id;
    
END $$;

-- 생성된 데이터 확인용 뷰
CREATE OR REPLACE VIEW quote_4tier_test_view AS
SELECT 
    q.id as quote_id,
    q.project_title,
    q.customer_name_snapshot,
    qg.id as group_id,
    qg.name as group_name,
    qg.include_in_fee as group_include_in_fee,
    qi.id as item_id,
    qi.name as item_name,
    qi.include_in_fee as item_include_in_fee,
    qd.id as detail_id,
    qd.name as detail_name,
    qd.quantity,
    qd.days,
    qd.unit,
    qd.unit_price,
    qd.cost_price,
    (qd.quantity * qd.days * qd.unit_price) as detail_total,
    (qd.quantity * qd.days * qd.cost_price) as detail_cost,
    qd.supplier_name_snapshot
FROM quotes q
LEFT JOIN quote_groups qg ON q.id = qg.quote_id
LEFT JOIN quote_items_motionsense qi ON qg.id = qi.quote_group_id
LEFT JOIN quote_details qd ON qi.id = qd.quote_item_id
WHERE q.project_title = '4단계 구조 테스트 견적서'
ORDER BY qg.sort_order, qi.sort_order;

-- 계산 함수 테스트
-- SELECT * FROM calculate_quote_total_4tier((SELECT id FROM quotes WHERE project_title = '4단계 구조 테스트 견적서'));