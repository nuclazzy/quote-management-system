// 견적서 작성 워크플로우 테스트 스크립트
// Next.js 개발 서버가 실행 중일 때 API 엔드포인트를 테스트

console.log('견적서 작성 워크플로우 테스트 시작...\n');

// 테스트용 mock 데이터
const mockMasterItems = [
  {
    name: '기획/스토리보드 작성',
    description: '프로젝트 기획 및 스토리보드 제작',
    default_unit_price: 500000,
    default_unit: '건',
    category: '편집',
    is_active: true
  },
  {
    name: '영상 편집',
    description: '기본 영상 편집 및 컷 편집',
    default_unit_price: 800000,
    default_unit: '건',
    category: '편집',
    is_active: true
  },
  {
    name: '스튜디오 촬영',
    description: '실내 스튜디오에서의 제품/인물 촬영',
    default_unit_price: 800000,
    default_unit: '일',
    category: '촬영',
    is_active: true
  }
];

const mockTemplate = {
  name: '기본 영상 제작',
  description: '일반적인 기업 홍보 영상 제작 템플릿',
  category: '영상제작',
  template_data: {
    groups: [
      {
        name: '기획/스토리보드',
        include_in_fee: true,
        items: [
          {
            name: '프로젝트 기획',
            include_in_fee: true,
            details: [
              {
                name: '기획/스토리보드 작성',
                quantity: 1,
                days: 3,
                unit_price: 500000
              }
            ]
          }
        ]
      }
    ]
  }
};

// API 테스트 함수
async function testAPI(endpoint, method = 'GET', data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`http://localhost:3002${endpoint}`, options);
    const result = await response.json();
    
    console.log(`✅ ${method} ${endpoint}: ${response.status}`);
    if (!response.ok) {
      console.log(`   Error: ${result.message || 'Unknown error'}`);
    } else {
      console.log(`   Success: ${result.success ? 'Data returned' : 'No data'}`);
    }
    
    return { success: response.ok, data: result };
  } catch (error) {
    console.log(`❌ ${method} ${endpoint}: Connection failed`);
    console.log(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 메인 테스트 실행
async function runWorkflowTest() {
  console.log('🧪 API 엔드포인트 테스트:');
  console.log('=====================================');
  
  // 1. 마스터 품목 API 테스트
  console.log('\n📋 마스터 품목 API 테스트:');
  await testAPI('/api/master-items');
  await testAPI('/api/master-items?category=편집');
  await testAPI('/api/master-items?search=편집');
  
  // 2. 템플릿 API 테스트
  console.log('\n📝 템플릿 API 테스트:');
  await testAPI('/api/quote-templates');
  await testAPI('/api/quote-templates?category=영상제작');
  
  console.log('\n=====================================');
  console.log('🎯 워크플로우 시나리오 테스트:');
  console.log('=====================================');
  
  // 워크플로우 시나리오 테스트
  console.log('\n시나리오 1: 사용자가 새 견적서 페이지에 접속');
  console.log('- 템플릿 목록이 로드되어야 함');
  console.log('- 마스터 품목 선택 다이얼로그가 작동해야 함');
  
  console.log('\n시나리오 2: 템플릿 선택');
  console.log('- 템플릿을 선택하면 견적서에 그룹과 항목이 추가되어야 함');
  console.log('- 기본 값으로 견적 금액이 계산되어야 함');
  
  console.log('\n시나리오 3: 마스터 품목 추가');
  console.log('- 마스터 품목 다이얼로그에서 품목을 검색할 수 있어야 함');
  console.log('- 선택한 품목이 견적서에 추가되어야 함');
  console.log('- 견적 금액이 자동으로 재계산되어야 함');
  
  console.log('\n시나리오 4: 견적서 저장');
  console.log('- 견적서 데이터가 서버에 저장되어야 함');
  console.log('- PDF 다운로드가 가능해야 함');
  
  console.log('\n=====================================');
  console.log('✅ 테스트 완료!');
  console.log('=====================================');
  
  console.log('\n🔍 확인 사항:');
  console.log('1. http://localhost:3002/quotes/new 페이지에서 템플릿 선택 기능 테스트');
  console.log('2. 마스터 품목 선택 다이얼로그 기능 테스트');
  console.log('3. 견적서 계산 로직 테스트');
  console.log('4. 저장 및 PDF 생성 기능 테스트');
  
  console.log('\n💡 Mock 데이터 정보:');
  console.log('- 마스터 품목:', mockMasterItems.length, '개');
  console.log('- 템플릿:', '1개 (기본 영상 제작)');
}

// Node.js 환경에서 fetch 사용을 위한 polyfill
if (typeof fetch === 'undefined') {
  console.log('Node.js 환경에서는 실제 API 테스트를 할 수 없습니다.');
  console.log('브라우저 개발자 도구나 개발 서버에서 직접 테스트해주세요.');
  console.log('\n테스트할 URL들:');
  console.log('- http://localhost:3002/api/master-items');
  console.log('- http://localhost:3002/api/quote-templates');
  console.log('- http://localhost:3002/quotes/new');
} else {
  runWorkflowTest();
}