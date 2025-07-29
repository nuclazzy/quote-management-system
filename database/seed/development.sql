-- 개발용 시드 데이터
-- Supabase SQL Editor에서 실행하세요

-- 1. 기본 회사 정보 생성
INSERT INTO companies (id, name, address, phone, email, website, tax_number, default_terms, default_payment_terms)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'MotionSense',
  '서울특별시 강남구 테헤란로 123',
  '02-1234-5678',
  'contact@motionsense.co.kr',
  'https://motionsense.co.kr',
  '123-45-67890',
  '본 견적서는 30일간 유효하며, 견적 내용은 사전 협의 없이 변경될 수 있습니다.',
  30
) ON CONFLICT (id) DO NOTHING;

-- 2. 테스트 고객 데이터
INSERT INTO customers (id, company_id, name, email, phone, address, contact_person, payment_terms, status, created_by)
VALUES 
  (
    'c1234567-89ab-cdef-0123-456789abcdef',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    '(주)테스트컴퍼니',
    'test@testcompany.co.kr',
    '02-9876-5432',
    '서울특별시 서초구 서초대로 456',
    '김대리',
    30,
    'active',
    NULL
  ),
  (
    'c2345678-9abc-def0-1234-56789abcdef0',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    '스타트업A',
    'contact@startupa.com',
    '02-1111-2222',
    '서울특별시 마포구 홍대로 789',
    '박과장',
    15,
    'active',
    NULL
  ),
  (
    'c3456789-abcd-ef01-2345-6789abcdef01',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    '대기업B',
    'procurement@bigcorpb.co.kr',
    '02-3333-4444',
    '서울특별시 중구 을지로 100',
    '최부장',
    45,
    'active',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- 3. 테스트 공급업체 데이터
INSERT INTO suppliers (id, company_id, name, email, phone, address, contact_person, payment_terms, status, created_by)
VALUES 
  (
    's1234567-89ab-cdef-0123-456789abcdef',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    '영상장비렌탈',
    'rental@videoequip.co.kr',
    '02-5555-6666',
    '서울특별시 성동구 왕십리로 200',
    '이대리',
    30,
    'active',
    NULL
  ),
  (
    's2345678-9abc-def0-1234-56789abcdef0',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    '무대장치',
    'stage@stagetech.co.kr',
    '02-7777-8888',
    '서울특별시 구로구 디지털로 300',
    '황실장',
    15,
    'active',
    NULL
  ),
  (
    's3456789-abcd-ef01-2345-6789abcdef01',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    '조명음향',
    'sound@lightingsound.co.kr',
    '02-9999-0000',
    '서울특별시 영등포구 국제금융로 400',
    '정팀장',
    30,
    'active',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- 4. 테스트 프로젝트 데이터
INSERT INTO projects (id, company_id, customer_id, name, description, status, start_date, end_date, budget, created_by)
VALUES 
  (
    'p1234567-89ab-cdef-0123-456789abcdef',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'c1234567-89ab-cdef-0123-456789abcdef',
    '2024 신제품 런칭 이벤트',
    '신제품 출시를 위한 대규모 런칭 이벤트 기획 및 진행',
    'planning',
    '2024-03-01',
    '2024-03-15',
    50000000.00,
    NULL
  ),
  (
    'p2345678-9abc-def0-1234-56789abcdef0',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'c2345678-9abc-def0-1234-56789abcdef0',
    '스타트업 IR 피칭 영상',
    '투자 유치를 위한 IR 피칭 영상 제작',
    'active',
    '2024-02-01',
    '2024-02-20',
    15000000.00,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- 5. 샘플 견적서 데이터
INSERT INTO quotes (
  id, company_id, quote_number, customer_id, project_id, title, description, 
  status, subtotal, tax_rate, tax_amount, total, valid_until, terms, notes, created_by
)
VALUES 
  (
    'q1234567-89ab-cdef-0123-456789abcdef',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'Q202407270001',
    'c1234567-89ab-cdef-0123-456789abcdef',
    'p1234567-89ab-cdef-0123-456789abcdef',
    '신제품 런칭 이벤트 기획 및 진행',
    '고객사 신제품 출시에 따른 런칭 이벤트의 전체적인 기획, 연출, 진행을 담당합니다.',
    'draft',
    45000000,
    10.0,
    4500000,
    49500000,
    '2024-08-26',
    '본 견적서는 30일간 유효하며, 견적 내용은 사전 협의 없이 변경될 수 있습니다. 계약 후 선금 50% 지급 요청드립니다.',
    '런칭 이벤트 날짜는 고객사와 협의 후 확정 예정입니다.',
    NULL
  ),
  (
    'q2345678-9abc-def0-1234-56789abcdef0',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'Q202407270002',
    'c2345678-9abc-def0-1234-56789abcdef0',
    'p2345678-9abc-def0-1234-56789abcdef0',
    'IR 피칭 영상 제작',
    '투자 유치를 위한 전문적인 IR 피칭 영상 제작 서비스',
    'sent',
    13636364,
    10.0,
    1363636,
    15000000,
    '2024-08-15',
    '영상 제작 완료 후 3회까지 무료 수정 가능합니다.',
    '촬영 일정은 고객사 일정에 맞춰 조정 가능합니다.',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- 6. 견적서 그룹 데이터
INSERT INTO quote_groups (id, quote_id, title, sort_order)
VALUES 
  -- 첫 번째 견적서 그룹들
  ('qg11111-89ab-cdef-0123-456789abcdef', 'q1234567-89ab-cdef-0123-456789abcdef', '1. 이벤트 기획 및 연출', 1),
  ('qg22222-89ab-cdef-0123-456789abcdef', 'q1234567-89ab-cdef-0123-456789abcdef', '2. 무대 및 장치', 2),
  ('qg33333-89ab-cdef-0123-456789abcdef', 'q1234567-89ab-cdef-0123-456789abcdef', '3. 영상 및 음향', 3),
  ('qg44444-89ab-cdef-0123-456789abcdef', 'q1234567-89ab-cdef-0123-456789abcdef', '4. 부대비용', 4),
  -- 두 번째 견적서 그룹들
  ('qg55555-89ab-cdef-0123-456789abcdef', 'q2345678-9abc-def0-1234-56789abcdef0', '1. 영상 제작', 1),
  ('qg66666-89ab-cdef-0123-456789abcdef', 'q2345678-9abc-def0-1234-56789abcdef0', '2. 후반 작업', 2)
ON CONFLICT (id) DO NOTHING;

-- 7. 견적서 품목 데이터
INSERT INTO quote_items (
  id, quote_id, quote_group_id, item_name, description, quantity, unit_price, total_price, 
  supplier_id, sort_order
)
VALUES 
  -- 첫 번째 견적서 품목들
  ('qi11111-89ab-cdef-0123-456789abcdef', 'q1234567-89ab-cdef-0123-456789abcdef', 'qg11111-89ab-cdef-0123-456789abcdef', '이벤트 기획 및 연출', '런칭 이벤트 전체 기획 및 현장 연출', 1, 15000000, 15000000, NULL, 1),
  ('qi22222-89ab-cdef-0123-456789abcdef', 'q1234567-89ab-cdef-0123-456789abcdef', 'qg11111-89ab-cdef-0123-456789abcdef', '진행 스태프', '이벤트 진행을 위한 전문 스태프', 5, 300000, 1500000, NULL, 2),
  ('qi33333-89ab-cdef-0123-456789abcdef', 'q1234567-89ab-cdef-0123-456789abcdef', 'qg22222-89ab-cdef-0123-456789abcdef', '무대 설치', '메인 무대 및 백드롭 설치', 1, 8000000, 8000000, 's2345678-9abc-def0-1234-56789abcdef0', 1),
  ('qi44444-89ab-cdef-0123-456789abcdef', 'q1234567-89ab-cdef-0123-456789abcdef', 'qg33333-89ab-cdef-0123-456789abcdef', '영상 장비', 'LED 스크린 및 프로젝터', 1, 12000000, 12000000, 's1234567-89ab-cdef-0123-456789abcdef', 1),
  ('qi55555-89ab-cdef-0123-456789abcdef', 'q1234567-89ab-cdef-0123-456789abcdef', 'qg33333-89ab-cdef-0123-456789abcdef', '음향 장비', '메인 음향 시스템', 1, 5000000, 5000000, 's3456789-abcd-ef01-2345-6789abcdef01', 2),
  ('qi66666-89ab-cdef-0123-456789abcdef', 'q1234567-89ab-cdef-0123-456789abcdef', 'qg44444-89ab-cdef-0123-456789abcdef', '교통비 및 식비', '스태프 교통비 및 식비', 1, 3500000, 3500000, NULL, 1),
  -- 두 번째 견적서 품목들
  ('qi77777-89ab-cdef-0123-456789abcdef', 'q2345678-9abc-def0-1234-56789abcdef0', 'qg55555-89ab-cdef-0123-456789abcdef', '영상 촬영', 'IR 피칭 영상 촬영 (1일)', 1, 3000000, 3000000, NULL, 1),
  ('qi88888-89ab-cdef-0123-456789abcdef', 'q2345678-9abc-def0-1234-56789abcdef0', 'qg55555-89ab-cdef-0123-456789abcdef', '스튜디오 대여', '촬영 스튜디오 대여 (1일)', 1, 1500000, 1500000, NULL, 2),
  ('qi99999-89ab-cdef-0123-456789abcdef', 'q2345678-9abc-def0-1234-56789abcdef0', 'qg66666-89ab-cdef-0123-456789abcdef', '영상 편집', '전문 영상 편집 및 색보정', 1, 7000000, 7000000, NULL, 1),
  ('qiAAAAA-89ab-cdef-0123-456789abcdef', 'q2345678-9abc-def0-1234-56789abcdef0', 'qg66666-89ab-cdef-0123-456789abcdef', '그래픽 작업', '인포그래픽 및 자막 작업', 1, 2136364, 2136364, NULL, 2)
ON CONFLICT (id) DO NOTHING;

-- 8. 견적서 품목 세부사항 데이터
INSERT INTO quote_item_details (
  id, quote_item_id, detail_name, description, quantity, unit_price, total_price, sort_order
)
VALUES 
  -- 이벤트 기획 세부사항
  ('qid1111-89ab-cdef-0123-456789abcdef', 'qi11111-89ab-cdef-0123-456789abcdef', '사전 기획회의', '고객사와의 사전 기획 회의 (3회)', 3, 500000, 1500000, 1),
  ('qid2222-89ab-cdef-0123-456789abcdef', 'qi11111-89ab-cdef-0123-456789abcdef', '시나리오 작성', '이벤트 진행 시나리오 작성', 1, 1000000, 1000000, 2),
  ('qid3333-89ab-cdef-0123-456789abcdef', 'qi11111-89ab-cdef-0123-456789abcdef', '리허설 진행', '행사 전 리허설 진행', 1, 800000, 800000, 3),
  -- 무대 설치 세부사항
  ('qid4444-89ab-cdef-0123-456789abcdef', 'qi33333-89ab-cdef-0123-456789abcdef', '무대 구조물', '메인 무대 구조물 설치', 1, 4000000, 4000000, 1),
  ('qid5555-89ab-cdef-0123-456789abcdef', 'qi33333-89ab-cdef-0123-456789abcdef', '백드롭 제작', '행사용 백드롭 제작 및 설치', 1, 2000000, 2000000, 2),
  ('qid6666-89ab-cdef-0123-456789abcdef', 'qi33333-89ab-cdef-0123-456789abcdef', '무대 조명', '무대 조명 설치', 1, 1500000, 1500000, 3),
  -- 영상 편집 세부사항
  ('qid7777-89ab-cdef-0123-456789abcdef', 'qi99999-89ab-cdef-0123-456789abcdef', '초안 편집', '1차 편집본 제작', 1, 3000000, 3000000, 1),
  ('qid8888-89ab-cdef-0123-456789abcdef', 'qi99999-89ab-cdef-0123-456789abcdef', '색보정 작업', '전문 색보정 및 그레이딩', 1, 2000000, 2000000, 2),
  ('qid9999-89ab-cdef-0123-456789abcdef', 'qi99999-89ab-cdef-0123-456789abcdef', '최종 렌더링', '최종 영상 렌더링 및 출력', 1, 1500000, 1500000, 3)
ON CONFLICT (id) DO NOTHING;

-- 9. 견적서 히스토리
INSERT INTO quote_history (id, quote_id, user_id, action, changes)
VALUES 
  ('qh11111-89ab-cdef-0123-456789abcdef', 'q1234567-89ab-cdef-0123-456789abcdef', NULL, 'created', '{"status": "draft"}'::jsonb),
  ('qh22222-89ab-cdef-0123-456789abcdef', 'q2345678-9abc-def0-1234-56789abcdef0', NULL, 'created', '{"status": "draft"}'::jsonb),
  ('qh33333-89ab-cdef-0123-456789abcdef', 'q2345678-9abc-def0-1234-56789abcdef0', NULL, 'status_changed_to_sent', '{"old_status": "draft", "new_status": "sent"}'::jsonb)
ON CONFLICT (id) DO NOTHING;