const nextJest = require('next/jest')

// Next.js 설정 제공
const createJestConfig = nextJest({
  // next.config.js와 .env 파일이 있는 Next.js 앱의 경로 제공
  dir: './',
})

// Jest에 전달할 사용자 정의 설정
const customJestConfig = {
  // 테스트 환경 설정
  testEnvironment: 'jest-environment-jsdom',
  
  // 각 테스트 전에 실행할 설정 파일
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // 모듈 이름 매핑 (경로 별칭)
  moduleNameMapper: {
    // 정적 파일 모킹
    '^.+\\.(svg|png|jpg|jpeg|gif|webp|avif|ico|bmp)$': '<rootDir>/__mocks__/fileMock.js',
    '^.+\\.(css|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    
    // 경로 별칭
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
  },
  
  // 테스트 파일 패턴
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  
  // 테스트에서 제외할 경로
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/out/',
  ],
  
  // 변환에서 제외할 경로
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))',
  ],
  
  // 커버리지 수집 대상
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/_*.{js,jsx,ts,tsx}',
    '!src/**/index.{js,jsx,ts,tsx}',
    '!src/app/api/**',
    '!src/app/**/layout.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/error.tsx',
    '!src/app/**/not-found.tsx',
  ],
  
  // 커버리지 임계값
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  
  // 감시 모드에서 제외할 경로
  watchPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
  ],
  
  // 루트 디렉토리
  rootDir: './',
  
  // 모듈 파일 확장자
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // 테스트 타임아웃
  testTimeout: 10000,
  
  // 자세한 출력
  verbose: true,
}

// createJestConfig는 비동기 Next.js 설정을 로드할 수 있도록 이 방식으로 내보냄
module.exports = createJestConfig(customJestConfig)