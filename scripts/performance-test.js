const fs = require('fs');
const path = require('path');

/**
 * 성능 테스트 스크립트
 * Core Web Vitals와 렌더링 성능을 측정하는 브라우저 테스트
 */

const testUrls = [
  {
    name: 'Dashboard',
    url: 'http://localhost:3000/dashboard',
    description: '대시보드 페이지'
  },
  {
    name: 'Quotes List',
    url: 'http://localhost:3000/quotes',
    description: '견적서 목록 페이지'
  },
  {
    name: 'Quote New (Original)',
    url: 'http://localhost:3000/quotes/new',
    description: '견적서 작성 페이지 (기존)'
  },
  {
    name: 'Quote New (Optimized)',
    url: 'http://localhost:3000/quotes/new-optimized',
    description: '견적서 작성 페이지 (최적화됨)'
  },
  {
    name: 'Login',
    url: 'http://localhost:3000/auth/login',
    description: '로그인 페이지'
  }
];

const performanceTest = `
// Performance Test Script for Browser Console
(function() {
  console.log('🚀 Starting Performance Test...');
  
  const results = {};
  
  // 1. Core Web Vitals 측정
  function measureWebVitals() {
    return new Promise((resolve) => {
      const webVitals = {
        LCP: 0,
        FID: 0,
        CLS: 0,
        FCP: 0,
        TTFB: 0
      };
      
      // Performance Observer 설정
      if ('PerformanceObserver' in window) {
        try {
          // LCP 측정
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            webVitals.LCP = lastEntry.startTime;
            console.log(\`📊 LCP: \${webVitals.LCP.toFixed(2)}ms\`);
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          
          // FCP 측정
          const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              if (entry.name === 'first-contentful-paint') {
                webVitals.FCP = entry.startTime;
                console.log(\`🎨 FCP: \${webVitals.FCP.toFixed(2)}ms\`);
              }
            });
          });
          fcpObserver.observe({ entryTypes: ['paint'] });
          
          // FID 측정
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              webVitals.FID = entry.processingStart - entry.startTime;
              console.log(\`⚡ FID: \${webVitals.FID.toFixed(2)}ms\`);
            });
          });
          fidObserver.observe({ entryTypes: ['first-input'] });
          
          // CLS 측정
          const clsObserver = new PerformanceObserver((list) => {
            let cls = 0;
            const entries = list.getEntries();
            entries.forEach((entry) => {
              if (!entry.hadRecentInput) {
                cls += entry.value;
              }
            });
            webVitals.CLS = cls;
            console.log(\`📐 CLS: \${webVitals.CLS.toFixed(4)}\`);
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
          
          // Navigation Timing으로 TTFB 측정
          if (performance.getEntriesByType) {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
              webVitals.TTFB = navigation.responseStart - navigation.requestStart;
              console.log(\`🌐 TTFB: \${webVitals.TTFB.toFixed(2)}ms\`);
            }
          }
          
          setTimeout(() => {
            resolve(webVitals);
          }, 3000); // 3초 후 결과 수집
          
        } catch (error) {
          console.warn('Performance measurement error:', error);
          resolve(webVitals);
        }
      } else {
        console.warn('PerformanceObserver not supported');
        resolve(webVitals);
      }
    });
  }
  
  // 2. 메모리 사용량 측정
  function measureMemoryUsage() {
    if ('memory' in performance) {
      const memory = performance.memory;
      return {
        usedJSHeapSize: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
        totalJSHeapSize: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
        jsHeapSizeLimit: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB'
      };
    }
    return null;
  }
  
  // 3. 번들 크기 분석
  function analyzeBundleSize() {
    const resources = performance.getEntriesByType('resource');
    const jsResources = resources.filter(r => r.name.includes('.js'));
    const cssResources = resources.filter(r => r.name.includes('.css'));
    
    const totalJSSize = jsResources.reduce((total, resource) => {
      return total + (resource.encodedBodySize || 0);
    }, 0);
    
    const totalCSSSize = cssResources.reduce((total, resource) => {
      return total + (resource.encodedBodySize || 0);
    }, 0);
    
    return {
      totalJS: (totalJSSize / 1024).toFixed(2) + ' KB',
      totalCSS: (totalCSSSize / 1024).toFixed(2) + ' KB',
      jsFiles: jsResources.length,
      cssFiles: cssResources.length,
      largestJS: jsResources.reduce((largest, current) => {
        return (current.encodedBodySize || 0) > (largest.encodedBodySize || 0) ? current : largest;
      }, jsResources[0])
    };
  }
  
  // 4. 렌더링 성능 측정
  function measureRenderingPerformance() {
    const startTime = performance.now();
    
    // DOM 노드 수 측정
    const totalNodes = document.querySelectorAll('*').length;
    const reactComponents = document.querySelectorAll('[data-reactroot] *').length;
    
    // 스타일 재계산 유발 요소 확인
    const expensiveSelectors = [
      ':nth-child',
      ':nth-of-type',
      ':not(',
      '~',
      '+',
      '[class*=',
      '[id*='
    ];
    
    let expensiveRules = 0;
    try {
      for (let sheet of document.styleSheets) {
        for (let rule of sheet.cssRules || sheet.rules || []) {
          if (rule.selectorText) {
            expensiveSelectors.forEach(selector => {
              if (rule.selectorText.includes(selector)) {
                expensiveRules++;
              }
            });
          }
        }
      }
    } catch (e) {
      console.warn('Cannot access stylesheets:', e);
    }
    
    const endTime = performance.now();
    
    return {
      analysisTime: (endTime - startTime).toFixed(2) + 'ms',
      totalDOMNodes: totalNodes,
      reactComponents: reactComponents,
      expensiveStyleRules: expensiveRules,
      domComplexity: totalNodes > 1500 ? 'High' : totalNodes > 800 ? 'Medium' : 'Low'
    };
  }
  
  // 5. 네트워크 성능 측정
  function measureNetworkPerformance() {
    const resources = performance.getEntriesByType('resource');
    
    const totalRequests = resources.length;
    const failedRequests = resources.filter(r => r.responseStatus >= 400).length;
    const cachedRequests = resources.filter(r => r.transferSize === 0).length;
    
    const avgLoadTime = resources.reduce((total, resource) => {
      return total + (resource.responseEnd - resource.requestStart);
    }, 0) / resources.length;
    
    const slowestRequest = resources.reduce((slowest, current) => {
      const currentTime = current.responseEnd - current.requestStart;
      const slowestTime = slowest.responseEnd - slowest.requestStart;
      return currentTime > slowestTime ? current : slowest;
    }, resources[0]);
    
    return {
      totalRequests,
      failedRequests,
      cachedRequests,
      cacheHitRate: ((cachedRequests / totalRequests) * 100).toFixed(1) + '%',
      avgLoadTime: avgLoadTime.toFixed(2) + 'ms',
      slowestRequest: slowestRequest ? {
        url: slowestRequest.name.split('/').pop(),
        time: (slowestRequest.responseEnd - slowestRequest.requestStart).toFixed(2) + 'ms'
      } : null
    };
  }
  
  // 대용량 데이터 스트레스 테스트
  async function stressTest() {
    console.log('🔥 Starting stress test...');
    
    const startMemory = measureMemoryUsage();
    const startTime = performance.now();
    
    // 대용량 데이터 시뮬레이션
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: \`Item \${i}\`,
      details: Array.from({ length: 10 }, (_, j) => ({
        id: j,
        name: \`Detail \${j}\`,
        value: Math.random() * 1000
      }))
    }));
    
    // 메모리 사용량 체크
    let maxMemory = 0;
    const memoryInterval = setInterval(() => {
      const currentMemory = measureMemoryUsage();
      if (currentMemory) {
        maxMemory = Math.max(maxMemory, parseFloat(currentMemory.usedJSHeapSize));
      }
    }, 100);
    
    // 렌더링 시뮬레이션
    await new Promise(resolve => {
      setTimeout(() => {
        clearInterval(memoryInterval);
        resolve();
      }, 2000);
    });
    
    const endTime = performance.now();
    const endMemory = measureMemoryUsage();
    
    return {
      startMemory,
      endMemory,
      maxMemory: maxMemory.toFixed(2) + ' MB',
      processingTime: (endTime - startTime).toFixed(2) + 'ms',
      datasetSize: largeDataset.length + ' items'
    };
  }
  
  // 메인 실행 함수
  async function runTests() {
    console.log('🎯 Core Web Vitals 측정 중...');
    results.webVitals = await measureWebVitals();
    
    console.log('💾 메모리 사용량 측정 중...');
    results.memory = measureMemoryUsage();
    
    console.log('📦 번들 크기 분석 중...');
    results.bundle = analyzeBundleSize();
    
    console.log('🎨 렌더링 성능 측정 중...');
    results.rendering = measureRenderingPerformance();
    
    console.log('🌐 네트워크 성능 측정 중...');
    results.network = measureNetworkPerformance();
    
    console.log('🔥 스트레스 테스트 실행 중...');
    results.stress = await stressTest();
    
    // 최종 결과 출력
    console.log('\\n📊 === PERFORMANCE TEST RESULTS ===');
    console.log('🎯 Core Web Vitals:', results.webVitals);
    console.log('💾 Memory Usage:', results.memory);
    console.log('📦 Bundle Analysis:', results.bundle);
    console.log('🎨 Rendering Performance:', results.rendering);
    console.log('🌐 Network Performance:', results.network);
    console.log('🔥 Stress Test:', results.stress);
    
    // 성능 등급 계산
    const grade = calculatePerformanceGrade(results);
    console.log(\`\\n🏆 Overall Performance Grade: \${grade}\`);
    
    // 개선 권장사항
    const recommendations = generateRecommendations(results);
    console.log('\\n💡 Performance Recommendations:');
    recommendations.forEach(rec => console.log(\`- \${rec}\`));
    
    return results;
  }
  
  // 성능 등급 계산
  function calculatePerformanceGrade(results) {
    let score = 100;
    
    // Core Web Vitals 점수
    if (results.webVitals.LCP > 2500) score -= 20;
    else if (results.webVitals.LCP > 1800) score -= 10;
    
    if (results.webVitals.FID > 100) score -= 15;
    else if (results.webVitals.FID > 50) score -= 7;
    
    if (results.webVitals.CLS > 0.1) score -= 15;
    else if (results.webVitals.CLS > 0.05) score -= 7;
    
    if (results.webVitals.FCP > 1800) score -= 10;
    else if (results.webVitals.FCP > 1200) score -= 5;
    
    // 메모리 사용량 점수
    if (results.memory) {
      const memoryMB = parseFloat(results.memory.usedJSHeapSize);
      if (memoryMB > 100) score -= 15;
      else if (memoryMB > 50) score -= 7;
    }
    
    // DOM 복잡도 점수
    if (results.rendering.domComplexity === 'High') score -= 10;
    else if (results.rendering.domComplexity === 'Medium') score -= 5;
    
    if (score >= 90) return 'A+ (Excellent)';
    if (score >= 80) return 'A (Good)';
    if (score >= 70) return 'B (Average)';
    if (score >= 60) return 'C (Below Average)';
    return 'D (Poor)';
  }
  
  // 개선 권장사항 생성
  function generateRecommendations(results) {
    const recommendations = [];
    
    if (results.webVitals.LCP > 2500) {
      recommendations.push('LCP 개선: 이미지 최적화, 서버 응답 시간 단축, 중요 리소스 우선 로딩');
    }
    
    if (results.webVitals.FID > 100) {
      recommendations.push('FID 개선: JavaScript 실행 시간 단축, 코드 스플리팅, 메인 스레드 차단 최소화');
    }
    
    if (results.webVitals.CLS > 0.1) {
      recommendations.push('CLS 개선: 이미지/광고 크기 명시, 동적 콘텐츠 삽입 최소화');
    }
    
    if (results.memory && parseFloat(results.memory.usedJSHeapSize) > 50) {
      recommendations.push('메모리 최적화: 메모리 누수 확인, 불필요한 객체 정리, React memo 활용');
    }
    
    if (results.rendering.domComplexity === 'High') {
      recommendations.push('DOM 최적화: 가상화 구현, 불필요한 DOM 노드 제거, 컴포넌트 분할');
    }
    
    if (results.bundle && parseFloat(results.bundle.totalJS) > 500) {
      recommendations.push('번들 최적화: 코드 스플리팅, tree shaking, 불필요한 라이브러리 제거');
    }
    
    if (results.network.failedRequests > 0) {
      recommendations.push('네트워크 최적화: 실패한 요청 수정, 리소스 로딩 최적화');
    }
    
    if (parseFloat(results.network.cacheHitRate) < 50) {
      recommendations.push('캐싱 최적화: HTTP 캐시 헤더 설정, Service Worker 활용');
    }
    
    return recommendations;
  }
  
  // 테스트 실행
  runTests().catch(console.error);
})();
`;

// 파일로 저장
const outputPath = path.join(__dirname, '../public/performance-test.js');
fs.writeFileSync(outputPath, performanceTest);

console.log('✅ Performance test script generated at: ' + outputPath);
console.log('');
console.log('📖 사용 방법:');
console.log('1. npm run dev로 개발 서버 실행');
console.log('2. 브라우저에서 테스트하고 싶은 페이지 접속');
console.log('3. 개발자 도구 콘솔에서 다음 스크립트 로드:');
console.log('   fetch("/performance-test.js").then(r=>r.text()).then(eval)');
console.log('4. 또는 직접 스크립트 내용을 콘솔에 붙여넣기');
console.log('');
console.log('🎯 테스트 대상 페이지:');
testUrls.forEach(url => {
  console.log(`- ${url.name}: ${url.url}`);
});