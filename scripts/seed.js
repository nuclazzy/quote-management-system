/**
 * 초기 데이터 생성 스크립트
 * 
 * 이 스크립트는 개발 환경에서 사용할 기본 마스터 아이템 데이터를 생성합니다.
 * Supabase 클라이언트를 사용하여 데이터를 삽입합니다.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase 클라이언트 설정
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 마스터 아이템 샘플 데이터
const masterItems = [
  // 영상 제작 관련
  {
    category: '영상제작',
    item_name: '촬영감독',
    unit: '인/일',
    standard_price: 500000,
    description: '전문 촬영감독 1일 작업비',
    is_active: true
  },
  {
    category: '영상제작',
    item_name: '카메라맨',
    unit: '인/일',
    standard_price: 300000,
    description: '전문 카메라맨 1일 작업비',
    is_active: true
  },
  {
    category: '영상제작',
    item_name: '조명기사',
    unit: '인/일',
    standard_price: 250000,
    description: '조명 전문가 1일 작업비',
    is_active: true
  },
  {
    category: '영상제작',
    item_name: '음향기사',
    unit: '인/일',
    standard_price: 200000,
    description: '음향 전문가 1일 작업비',
    is_active: true
  },
  
  // 장비 대여
  {
    category: '장비대여',
    item_name: '4K 카메라',
    unit: '대/일',
    standard_price: 150000,
    description: '전문 4K 카메라 1일 대여비',
    is_active: true
  },
  {
    category: '장비대여',
    item_name: '조명 키트',
    unit: 'SET/일',
    standard_price: 100000,
    description: '스튜디오 조명 세트 1일 대여비',
    is_active: true
  },
  {
    category: '장비대여',
    item_name: '드론',
    unit: '대/일',
    standard_price: 200000,
    description: '항공촬영용 드론 1일 대여비',
    is_active: true
  },
  {
    category: '장비대여',
    item_name: '짐벌',
    unit: '대/일',
    standard_price: 50000,
    description: '카메라 안정화 장비 1일 대여비',
    is_active: true
  },
  
  // 후반 작업
  {
    category: '후반작업',
    item_name: '편집',
    unit: '분',
    standard_price: 50000,
    description: '영상 편집 작업 (완성 영상 1분 기준)',
    is_active: true
  },
  {
    category: '후반작업',
    item_name: '컬러 그레이딩',
    unit: '분',
    standard_price: 30000,
    description: '색보정 작업 (완성 영상 1분 기준)',
    is_active: true
  },
  {
    category: '후반작업',
    item_name: '사운드 믹싱',
    unit: '분',
    standard_price: 20000,
    description: '음향 믹싱 작업 (완성 영상 1분 기준)',
    is_active: true
  },
  {
    category: '후반작업',
    item_name: '모션 그래픽',
    unit: '개',
    standard_price: 100000,
    description: '모션 그래픽 요소 제작 (1개 기준)',
    is_active: true
  },
  
  // 기획 및 제작 관리
  {
    category: '기획',
    item_name: '기획',
    unit: '식',
    standard_price: 1000000,
    description: '프로젝트 기획 및 콘셉트 개발',
    is_active: true
  },
  {
    category: '기획',
    item_name: '시나리오 작성',
    unit: '식',
    standard_price: 500000,
    description: '시나리오 및 스토리보드 작성',
    is_active: true
  },
  {
    category: '기획',
    item_name: '프로듀싱',
    unit: '식',
    standard_price: 800000,
    description: '전체 프로젝트 관리 및 진행',
    is_active: true
  },
  
  // 부대비용
  {
    category: '부대비용',
    item_name: '교통비',
    unit: '식',
    standard_price: 100000,
    description: '촬영 장소 이동 교통비',
    is_active: true
  },
  {
    category: '부대비용',
    item_name: '숙박비',
    unit: '박',
    standard_price: 150000,
    description: '지방 촬영 시 숙박비 (1박 기준)',
    is_active: true
  },
  {
    category: '부대비용',
    item_name: '식비',
    unit: '인/일',
    standard_price: 30000,
    description: '촬영 스태프 식비 (1인 1일 기준)',
    is_active: true
  },
  {
    category: '부대비용',
    item_name: '장소 대여비',
    unit: '시간',
    standard_price: 200000,
    description: '스튜디오 또는 촬영 장소 대여비 (1시간 기준)',
    is_active: true
  }
];

// 샘플 고객사 데이터
const customers = [
  {
    company_name: '(주)삼성전자',
    contact_person: '김철수',
    email: 'cs.kim@samsung.com',
    phone: '02-1234-5678',
    address: '서울시 강남구 테헤란로 123',
    is_active: true
  },
  {
    company_name: '(주)LG전자',
    contact_person: '이영희',
    email: 'yh.lee@lge.com',
    phone: '02-2345-6789',
    address: '서울시 강서구 마곡중앙로 456',
    is_active: true
  },
  {
    company_name: '네이버(주)',
    contact_person: '박민수',
    email: 'ms.park@naver.com',
    phone: '031-1234-5678',
    address: '경기도 성남시 분당구 불정로 789',
    is_active: true
  },
  {
    company_name: '카카오(주)',
    contact_person: '정수진',
    email: 'sj.jung@kakao.com',
    phone: '064-1234-5678',
    address: '제주시 첨단로 321',
    is_active: true
  }
];

async function seedData() {
  try {
    console.log('🌱 초기 데이터 생성을 시작합니다...');

    // 마스터 아이템 데이터 삽입
    console.log('📋 마스터 아이템 데이터를 삽입합니다...');
    const { data: masterItemsData, error: masterItemsError } = await supabase
      .from('master_items')
      .insert(masterItems)
      .select();

    if (masterItemsError) {
      console.error('❌ 마스터 아이템 삽입 실패:', masterItemsError);
      throw masterItemsError;
    }

    console.log(`✅ 마스터 아이템 ${masterItemsData.length}개 삽입 완료`);

    // 고객사 데이터 삽입
    console.log('🏢 고객사 데이터를 삽입합니다...');
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .insert(customers)
      .select();

    if (customersError) {
      console.error('❌ 고객사 삽입 실패:', customersError);
      throw customersError;
    }

    console.log(`✅ 고객사 ${customersData.length}개 삽입 완료`);

    console.log('🎉 모든 초기 데이터 생성이 완료되었습니다!');
    console.log('');
    console.log('다음 단계:');
    console.log('1. npm run dev 명령어로 개발 서버를 시작하세요');
    console.log('2. http://localhost:3000 에서 애플리케이션을 확인하세요');
    console.log('3. Google OAuth 로그인을 통해 시스템에 접속하세요');

  } catch (error) {
    console.error('💥 초기 데이터 생성 중 오류 발생:', error);
    process.exit(1);
  }
}

// 환경 변수 검증
function validateEnvironment() {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ 다음 환경 변수가 설정되지 않았습니다:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('');
    console.error('.env.local 파일을 확인하고 필요한 환경 변수를 설정해주세요.');
    process.exit(1);
  }
}

// 메인 실행
async function main() {
  console.log('🚀 견적서 관리 시스템 초기 데이터 생성 스크립트');
  console.log('================================================');
  
  validateEnvironment();
  await seedData();
}

main();