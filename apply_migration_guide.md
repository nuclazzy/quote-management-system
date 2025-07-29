# Supabase 마이그레이션 적용 가이드

## 404 에러 해결을 위한 데이터베이스 마이그레이션 적용

현재 `upsert_user_profile` 함수가 존재하지 않아 404 에러가 발생하고 있습니다.
다음 단계를 통해 마이그레이션을 적용해주세요:

### 1. Supabase 대시보드 접속
1. https://supabase.com 접속
2. 프로젝트 선택
3. 좌측 메뉴에서 "SQL Editor" 클릭

### 2. 마이그레이션 실행
1. "New query" 버튼 클릭
2. `database/migrations/12_super_admin_setup.sql` 파일의 전체 내용을 복사하여 붙여넣기
3. "Run" 버튼 클릭하여 실행

### 3. 실행 확인
마이그레이션이 성공적으로 실행되면 다음과 같은 메시지가 표시됩니다:
```
슈퍼 관리자 시스템 설정 완료!
✅ lewis@motionsense.co.kr → Super Admin 등록
✅ 자동 프로필 생성/업데이트 시스템
✅ 사용자 초대 및 관리 함수
✅ 역할 기반 권한 관리
✅ 도메인 제한 (@motionsense.co.kr)
```

### 4. 생성되는 주요 함수들
- `upsert_user_profile()` - 사용자 프로필 생성/업데이트
- `is_super_admin()` - 슈퍼 관리자 권한 확인
- `get_current_user_role()` - 현재 사용자 역할 조회
- `invite_user()` - 사용자 초대
- `change_user_role()` - 사용자 역할 변경
- `deactivate_user()` - 사용자 비활성화

### 5. 마이그레이션 적용 후
마이그레이션이 완료되면 OAuth 로그인이 정상적으로 작동하고, lewis@motionsense.co.kr 계정이 자동으로 슈퍼 관리자 권한을 가지게 됩니다.

### 문제 해결
만약 마이그레이션 실행 중 오류가 발생하면:
1. 오류 메시지를 확인
2. 기존에 동일한 함수나 정책이 있는지 확인
3. 필요시 기존 정책을 삭제 후 재실행

### 확인 방법
마이그레이션 완료 후 다음 쿼리로 함수 생성 여부를 확인할 수 있습니다:
```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('upsert_user_profile', 'is_super_admin', 'get_current_user_role');
```

이 마이그레이션을 적용하면 현재 발생하고 있는 404 에러가 해결됩니다.