# 알림 시스템 자동화 설정 가이드

알림 시스템의 자동화를 위한 백그라운드 작업 설정 가이드입니다.

## 🚀 구현된 기능

### 1. 알림 서비스 (`NotificationService`)
- 견적서 생성/승인/거절/만료 알림
- 프로젝트 생성/상태변경/마감임박 알림
- 매출 정산 예정/완료/연체 알림
- 시스템 사용자 가입/권한변경 알림

### 2. 자동 트리거
- **견적서 생성**: `/api/quotes` POST 시 자동 알림
- **견적서 상태 변경**: `/api/quotes/[id]` PATCH 시 자동 알림
- **백그라운드 체크**: 매일 오전 9시 정기 실행

### 3. 백그라운드 알림 체크
- 견적서 만료 임박 (3일 전)
- 프로젝트 마감일 임박 (3일 전)  
- 매출 정산 예정 (3일 전)
- 매출 정산 연체

### 4. 사용자 알림 설정
- `/notifications/settings` 페이지에서 개별 설정 관리
- 이메일/브라우저 알림 방식 선택 가능

## ⚙️ 배포 설정

### 1. 환경변수 설정

Vercel 대시보드에서 다음 환경변수를 추가하세요:

```bash
CRON_SECRET=your-secure-random-string-here
```

**생성 방법:**
```bash
# 터미널에서 무작위 문자열 생성
openssl rand -base64 32
```

### 2. Vercel Cron 설정

`vercel.json`에 이미 설정되어 있습니다:
- **경로**: `/api/notifications/background-check`  
- **스케줄**: `0 9 * * *` (매일 오전 9시)
- **인증**: CRON_SECRET 헤더 필요

### 3. 배포 후 확인

배포 완료 후 다음을 확인하세요:

1. **Vercel Functions 탭**: Cron 작업이 등록되었는지 확인
2. **로그 확인**: 오전 9시 이후 실행 로그 확인
3. **수동 테스트**:
   ```bash
   curl -X POST https://your-app.vercel.app/api/notifications/background-check \
        -H "Authorization: Bearer your-cron-secret"
   ```

## 🔧 API 엔드포인트

### 백그라운드 체크
```
POST /api/notifications/background-check
Authorization: Bearer CRON_SECRET

응답:
{
  "success": true,
  "timestamp": "2023-12-07T09:00:00.000Z",
  "results": {
    "quoteExpiring": "success",
    "projectDeadlines": "success", 
    "settlementDue": "success",
    "settlementOverdue": "success"
  }
}
```

### 알림 설정 관리
```
GET /api/notifications/settings    # 설정 조회
POST /api/notifications/settings   # 설정 저장
```

### 알림 CRUD
```
GET /api/notifications             # 알림 목록
POST /api/notifications            # 알림 생성 (관리자)
PATCH /api/notifications          # 읽음 표시
DELETE /api/notifications/[id]     # 알림 삭제
```

## 📋 사용법

### 1. 관리자의 수동 알림 생성

```typescript
import { NotificationService } from '@/lib/services/notification-service';

// 견적서 생성 알림
await NotificationService.notifyQuoteCreated('quote-id', 'user-id');

// 일반 공지사항
await NotificationService.createGeneralNotification(
  '시스템 점검 안내',
  '12월 10일 오후 2시~4시 시스템 점검이 있습니다.',
  ['user-id-1', 'user-id-2'],
  '/announcements/maintenance',
  'high'
);
```

### 2. 사용자의 알림 설정

사용자는 `/notifications/settings`에서:
- 카테고리별 알림 on/off
- 이메일/브라우저 알림 방식 선택
- 개별 알림 유형 세부 설정

### 3. 알림 확인 및 관리

사용자는 `/notifications`에서:
- 받은 알림 목록 확인
- 읽음/안읽음 표시 관리
- 알림 삭제
- 링크를 통한 관련 페이지 이동

## 🚨 트러블슈팅

### Cron 작업이 실행되지 않는 경우

1. **환경변수 확인**:
   - `CRON_SECRET` 설정 여부
   - 올바른 문자열 형식

2. **Vercel 설정 확인**:
   - Pro 플랜에서만 Cron 사용 가능
   - `vercel.json` 형식 확인

3. **함수 타임아웃**:
   - Vercel Serverless 함수는 10초 제한
   - 대량 알림 처리시 배치 처리 필요

### 알림이 생성되지 않는 경우

1. **데이터베이스 확인**:
   ```sql
   -- 알림 설정 테이블 확인
   SELECT * FROM notification_settings WHERE user_id = 'user-id';
   
   -- 알림 생성 함수 확인
   SELECT create_notification('user-id', 'Test', 'Test message', 'general');
   ```

2. **서비스 함수 확인**:
   - NotificationService 클래스 import
   - Supabase 연결 상태
   - RPC 함수 정의 상태

### 성능 최적화

1. **배치 처리**:
   ```typescript
   // 대량 사용자 알림시
   const userChunks = chunk(userIds, 50); // 50명씩 처리
   for (const chunk of userChunks) {
     await NotificationService.createBulkNotifications(chunk, params);
   }
   ```

2. **중복 방지**:
   - 동일 엔티티에 대한 알림 중복 체크
   - 알림 설정에 따른 필터링

## 📈 모니터링

### Vercel 대시보드
- Functions 탭에서 Cron 실행 상태 확인
- 로그에서 성공/실패 여부 확인

### 애플리케이션 내
- 관리자는 시스템 알림으로 배경 작업 결과 확인
- 실패시 자동으로 오류 로그 생성

---

## 🎯 다음 개선 사항

1. **이메일 알림 실제 발송**
   - SendGrid, AWS SES 연동
   - 이메일 템플릿 시스템

2. **브라우저 푸시 알림**
   - Service Worker 구현
   - Push API 연동

3. **알림 통계**
   - 발송/확인률 통계
   - 사용자별 알림 선호도 분석

4. **실시간 알림**
   - WebSocket 또는 Server-Sent Events
   - 즉시 알림 표시