# 알림 시스템 문서

견적서 관리 시스템에 구현된 종합적인 알림 시스템에 대한 문서입니다.

## 시스템 개요

이 알림 시스템은 사용자에게 중요한 비즈니스 이벤트에 대한 실시간 알림을 제공합니다.

### 주요 기능

1. **실시간 알림**: 네비게이션 바의 종 아이콘을 통한 즉시 알림 확인
2. **카테고리별 알림**: 견적서, 프로젝트, 정산, 시스템 알림으로 분류
3. **개인화된 설정**: 사용자별 알림 타입 활성화/비활성화
4. **자동 알림 생성**: 비즈니스 로직에 따른 자동 알림 발송
5. **스케줄링**: 정기적인 알림 체크 (만료, 연체 등)

## 알림 타입

### 견적서 관련
- `quote_created`: 새 견적서 생성
- `quote_approved`: 견적서 승인
- `quote_rejected`: 견적서 거절
- `quote_expiring`: 견적서 만료 임박

### 프로젝트 관련
- `project_created`: 새 프로젝트 생성
- `project_status_changed`: 프로젝트 상태 변경
- `project_deadline_approaching`: 프로젝트 마감일 임박

### 정산 관련
- `settlement_due`: 정산일 임박
- `settlement_completed`: 정산 완료
- `settlement_overdue`: 정산 연체

### 시스템 관련
- `system_user_joined`: 새 사용자 가입
- `system_permission_changed`: 사용자 권한 변경
- `general`: 일반 알림

## 우선순위 레벨

- `low`: 낮음 (회색)
- `normal`: 보통 (파란색)
- `high`: 높음 (주황색)
- `urgent`: 긴급 (빨간색)

## 데이터베이스 스키마

### notifications 테이블
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  link_url TEXT,
  is_read BOOLEAN DEFAULT false,
  entity_type TEXT,
  entity_id UUID,
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### notification_settings 테이블
```sql
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quote_created BOOLEAN DEFAULT true,
  quote_approved BOOLEAN DEFAULT true,
  -- ... 다른 알림 타입 설정들
  email_notifications BOOLEAN DEFAULT true,
  browser_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API 엔드포인트

### 알림 관리
- `GET /api/notifications` - 알림 목록 조회
- `POST /api/notifications` - 새 알림 생성
- `PATCH /api/notifications` - 여러 알림 읽음 처리
- `GET /api/notifications/[id]` - 특정 알림 조회
- `PATCH /api/notifications/[id]` - 특정 알림 업데이트
- `DELETE /api/notifications/[id]` - 특정 알림 삭제
- `POST /api/notifications/mark-all-read` - 모든 알림 읽음 처리

### 알림 설정
- `GET /api/notifications/settings` - 알림 설정 조회
- `PATCH /api/notifications/settings` - 알림 설정 업데이트

### 스케줄링
- `POST /api/notifications/schedule` - 정기 알림 체크 실행

## 사용법

### 1. 알림 확인
네비게이션 바의 종 아이콘을 클릭하여 최근 알림을 확인할 수 있습니다.

### 2. 알림 페이지
`/notifications` 페이지에서 모든 알림을 관리할 수 있습니다.
- 필터링: 알림 타입별, 읽지 않은 알림만
- 정렬: 최신순
- 액션: 읽음 표시, 삭제, 링크 이동

### 3. 알림 설정
`/notifications/settings` 페이지에서 개인 알림 설정을 관리할 수 있습니다.
- 각 알림 타입별 활성화/비활성화
- 이메일 알림 설정
- 브라우저 알림 설정 (베타)

## 자동 알림 트리거

### 견적서 이벤트
- 새 견적서 생성 시 → 관리자들에게 알림
- 견적서 상태 변경 시 → 작성자와 관리자들에게 알림
- 견적서 만료 3일 전 → 작성자와 관리자들에게 알림

### 프로젝트 이벤트
- 견적서 → 프로젝트 전환 시 → 관리자들에게 알림
- 프로젝트 상태 변경 시 → 생성자와 관리자들에게 알림
- 프로젝트 마감일 3일 전 → 관련자들에게 알림

### 정산 이벤트
- 정산일 3일 전 → 관련자들에게 알림
- 정산 완료 시 → 생성자와 관리자들에게 알림
- 정산 연체 시 → 관련자들에게 긴급 알림

### 시스템 이벤트
- 새 사용자 가입 시 → 관리자들에게 알림
- 사용자 권한 변경 시 → 해당 사용자와 관리자들에게 알림

## 스케줄링

Vercel Cron을 사용하여 매일 오전 9시에 다음 작업을 수행합니다:

1. 만료 임박 견적서 체크
2. 마감일 임박 프로젝트 체크
3. 정산일 임박 거래 체크
4. 연체된 정산 체크

## 개발자 가이드

### 새로운 알림 타입 추가

1. `src/types/notification.ts`에 새 타입 추가
2. `NotificationTypeLabels`와 `NotificationTypeColors`에 라벨과 색상 추가
3. 데이터베이스 마이그레이션에서 타입 제약 조건 업데이트
4. `notification_settings` 테이블에 새 설정 필드 추가
5. `NotificationService`에 새 알림 생성 메서드 추가

### 알림 생성 예시

```typescript
import { NotificationService } from '@/lib/services/notification-service'

// 단일 사용자에게 알림 생성
await NotificationService.createNotification({
  user_id: 'user-uuid',
  title: '새 알림',
  message: '알림 내용입니다.',
  type: 'general',
  link_url: '/some-page',
  priority: 'normal'
})

// 여러 사용자에게 벌크 알림 생성
const adminUsers = await NotificationService.getAdminUsers()
await NotificationService.createBulkNotifications(adminUsers, {
  title: '시스템 공지',
  message: '중요한 업데이트가 있습니다.',
  type: 'general',
  priority: 'high'
})
```

## 환경 변수

```env
# Cron job 보안을 위한 시크릿 토큰
CRON_SECRET=your-secret-token

# Supabase 서비스 롤 키 (서버 사이드 알림 생성용)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 주의사항

1. **권한 관리**: 사용자는 자신의 알림만 조회/수정/삭제할 수 있습니다.
2. **성능**: 알림 생성은 백그라운드에서 수행되어 메인 로직에 영향을 주지 않습니다.
3. **설정 우선순위**: 사용자가 특정 알림 타입을 비활성화하면 해당 알림은 생성되지 않습니다.
4. **스케줄링**: Vercel Cron은 Pro 플랜 이상에서 사용 가능합니다.

## 향후 개선사항

1. **실시간 업데이트**: WebSocket 또는 Server-Sent Events 구현
2. **이메일 알림**: 실제 이메일 발송 기능 구현
3. **브라우저 알림**: Push API를 사용한 네이티브 브라우저 알림
4. **알림 템플릿**: 동적 알림 템플릿 시스템
5. **대시보드**: 알림 통계 및 분석 대시보드