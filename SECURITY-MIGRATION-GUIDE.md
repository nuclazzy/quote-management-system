# 보안 강화 마이그레이션 가이드

## 개요

이 문서는 Critical 보안 취약점 수정사항에 대한 마이그레이션 가이드입니다. 다음 주요 보안 개선사항이 적용되었습니다:

## 주요 수정사항

### 1. 서버 측 도메인 검증 강화 ✅

**이전 문제**: 클라이언트에서만 도메인 검증이 이루어져 우회 가능  
**해결방법**: 모든 API 엔드포인트에서 서버 측 도메인 재검증

#### 변경된 파일
- `src/lib/auth/secure-middleware.ts` (새로 생성)
- `src/lib/auth/auth-service.ts` (보안 로깅 적용)

#### 주요 기능
```typescript
// 서버 측 도메인 검증
function validateEmailDomain(email: string): boolean {
  const domain = email.split('@')[1];
  return ALLOWED_DOMAINS.includes(domain);
}

// withAuth 미들웨어에 통합
if (!options.skipDomainValidation && !validateEmailDomain(session.user.email || '')) {
  await supabase.auth.signOut(); // 즉시 세션 무효화
  return createApiError('접근이 제한된 도메인입니다.', 403);
}
```

### 2. 통합된 권한 검증 미들웨어 ✅

**이전 문제**: 여러 개의 서로 다른 권한 검증 로직이 혼재  
**해결방법**: 표준화된 권한 검증 미들웨어 구현

#### 역할 계층 구조
```typescript
const ROLE_HIERARCHY = {
  super_admin: ['super_admin', 'admin', 'member'],
  admin: ['admin', 'member'],
  member: ['member'],
  user: ['user'], // 하위 호환성
};
```

#### 사용법
```typescript
import { withAuth, requireRole, requireSuperAdmin } from '@/lib/auth/secure-middleware';

// 기본 인증만
export async function GET(request: NextRequest) {
  return withAuth(request, async ({ user, supabase }) => {
    // 핸들러 로직
  });
}

// 관리자 권한 필요
export async function POST(request: NextRequest) {
  return withAuth(request, async ({ user, supabase }) => {
    // 관리자만 접근 가능한 로직
  }, requireRole('admin'));
}

// 슈퍼 관리자만
export async function DELETE(request: NextRequest) {
  return withAuth(request, async ({ user, supabase }) => {
    // 슈퍼 관리자만 접근 가능한 로직
  }, { requireSpecificRole: 'super_admin' });
}
```

### 3. 완전한 로그아웃 프로세스 ✅

**이전 문제**: 로그아웃 시 클라이언트 측 상태 정리가 불완전  
**해결방법**: 글로벌 세션 무효화 및 완전한 클라이언트 정리

#### 개선된 로그아웃 프로세스
1. Supabase 세션 무효화
2. localStorage 완전 정리
3. sessionStorage 완전 정리
4. 관련 쿠키 삭제
5. 브라우저 리디렉션으로 메모리 정리

```typescript
static async signOut() {
  // 1. Supabase 세션 무효화
  await supabase.auth.signOut();
  
  // 2. 클라이언트 측 완전한 상태 정리
  // localStorage, sessionStorage, 쿠키 정리
  
  // 3. 보안 로깅
  secureLog.authEvent('logout', { userAgent: window.navigator.userAgent });
  
  // 4. 강제 리디렉션
  window.location.href = '/auth/login?logout=true';
}
```

### 4. 프로덕션 로깅 보안 강화 ✅

**이전 문제**: 개발 로그가 프로덕션에서도 민감 정보 노출  
**해결방법**: 환경별 로깅 레벨 분리 및 민감 정보 마스킹

#### 새로운 보안 로깅 시스템
- `src/lib/utils/secure-logger.ts` (새로 생성)

#### 주요 기능
- 환경별 로깅 레벨 자동 조정
- 민감 정보 자동 마스킹
- 보안 이벤트 전용 로깅
- 프로덕션에서 구조화된 JSON 로그

```typescript
import { secureLog } from '@/lib/utils/secure-logger';

// 자동으로 환경에 따라 로깅 수준 조정
secureLog.debug('개발용 디버그 로그'); // 프로덕션에서는 출력되지 않음
secureLog.error('에러 발생', error); // 모든 환경에서 기록
secureLog.security('보안 이벤트', details); // 항상 기록, 민감 정보 마스킹
```

## 마이그레이션 체크리스트

### 즉시 필요한 작업

- [ ] **환경 변수 확인**: `NEXT_PUBLIC_SITE_URL` 설정 확인
- [ ] **기존 API 업데이트**: 기존 `withAuth` 사용하는 API들을 새로운 미들웨어로 마이그레이션
- [ ] **로그 모니터링**: 프로덕션 배포 후 보안 로그 확인
- [ ] **테스트 실행**: `node scripts/security-test.js`로 보안 테스트 수행

### API 마이그레이션 방법

#### Before (기존 코드)
```typescript
import { withAuth } from '../lib/base';

export async function GET(request: NextRequest) {
  return withAuth(request, async ({ user, supabase }) => {
    // 로직
  }, { requireAdmin: true });
}
```

#### After (새로운 보안 미들웨어)
```typescript
import { withAuth, requireRole } from '@/lib/auth/secure-middleware';
import { secureLog } from '@/lib/utils/secure-logger';

export async function GET(request: NextRequest) {
  return withAuth(request, async ({ user, supabase }) => {
    secureLog.apiRequest('GET', '/api/endpoint', user.id);
    // 로직
  }, requireRole('admin'));
}
```

### 보안 테스트 방법

#### 1. 자동 테스트 실행
```bash
# 개발 서버 실행 후
node scripts/security-test.js
```

#### 2. 수동 테스트 항목

**도메인 검증 테스트**:
1. 다른 도메인(@gmail.com 등) 계정으로 OAuth 로그인 시도
2. 서버 로그에서 도메인 위반 경고 확인
3. 로그인이 차단되는지 확인

**권한 검증 테스트**:
1. 일반 사용자로 관리자 API 접근 시도
2. 403 Forbidden 응답 확인
3. 보안 로그에 권한 위반 기록 확인

**로그아웃 테스트**:
1. 로그아웃 실행
2. 개발자 도구에서 localStorage, sessionStorage 비어있는지 확인
3. 쿠키에서 Supabase 관련 쿠키 삭제되었는지 확인
4. 뒤로가기로 인증 페이지 접근 불가능한지 확인

**로깅 보안 테스트**:
1. 프로덕션 빌드 생성
2. 로그에서 이메일이 마스킹(`te***@motionsense.co.kr`)되는지 확인
3. 패스워드, 토큰 등이 `***MASKED***`로 표시되는지 확인

## 중요 주의사항

### 1. 기존 API 호환성
- 기존 API는 점진적으로 마이그레이션 권장
- 새로운 미들웨어는 기존 응답 형식과 호환됨
- 에러 처리 방식이 throw/catch로 변경됨

### 2. 로깅 변경사항
- 기존 `console.log`를 `secureLog.*`로 교체 권장
- 프로덕션에서 디버그 로그가 출력되지 않음
- 민감 정보는 자동으로 마스킹됨

### 3. 권한 체계 변경
- `user` 역할을 `member`로 점진적 변경 권장
- `super_admin` 역할이 새로 추가됨
- 역할 계층 구조가 명확해짐

### 4. 세션 관리
- 로그아웃이 더 강력해져서 완전한 세션 정리됨
- 브라우저 캐시도 정리되므로 사용자 경험 고려
- 자동 저장 기능에 영향 있을 수 있음

## 배포 전 확인사항

1. **환경 변수 설정**
   ```bash
   NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
   ```

2. **데이터베이스 마이그레이션**
   - profiles 테이블에 `super_admin` 역할 추가 확인
   - lewis@motionsense.co.kr 계정이 super_admin인지 확인

3. **모니터링 설정**
   - 보안 로그 수집 시스템 준비
   - 알림 설정 (도메인 위반, 권한 위반 등)

4. **백업 계획**
   - 현재 데이터베이스 백업
   - 롤백 계획 준비

## 문제 해결

### 자주 발생하는 문제

**Q: API가 500 에러를 반환해요**  
A: 새로운 미들웨어는 throw를 사용하므로, try/catch 구문을 확인하세요.

**Q: 로그아웃 후에도 일부 데이터가 남아있어요**  
A: 브라우저의 하드 리프레시(Ctrl+F5)를 수행하거나, localStorage를 수동으로 확인하세요.

**Q: 프로덕션에서 로그가 너무 적어요**  
A: 의도된 동작입니다. 보안상 민감한 로그는 제한됩니다. 필요시 로그 레벨을 조정하세요.

**Q: 기존 사용자가 로그인할 수 없어요**  
A: 도메인 검증이 강화되었습니다. @motionsense.co.kr 도메인만 허용됩니다.

## 성능 영향

- **응답 시간**: 추가 검증으로 인해 ~10ms 증가 예상
- **메모리 사용량**: 로깅 시스템으로 인해 소폭 증가
- **네트워크**: 보안 로그 전송으로 인한 소폭 증가
- **전반적 영향**: 사용자가 체감할 수준은 아님

## 지원 및 문의

보안 관련 문제나 질문이 있으시면:
1. 서버 로그를 먼저 확인
2. `scripts/security-test.js` 실행 결과 확인
3. 이 가이드의 문제 해결 섹션 참조
4. 개발팀에 문의

---

**중요**: 이 마이그레이션은 보안상 매우 중요하므로, 배포 전 충분한 테스트를 권장합니다.