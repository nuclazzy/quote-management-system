-- profiles 테이블 RLS 정책 수정 스크립트
-- 문제: profiles 테이블 조회 시 403 Forbidden 오류
-- 해결: 인증된 사용자가 자신의 프로필을 조회할 수 있도록 RLS 정책 수정

-- 1. 기존 RLS 정책 제거 (있는 경우)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- 2. RLS 활성화 확인
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. 새로운 RLS 정책 생성
-- 사용자는 자신의 프로필만 조회 가능
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 사용자는 자신의 프로필만 삽입 가능
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 사용자는 자신의 프로필만 업데이트 가능
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 4. 관리자 정책 (선택사항)
-- super_admin은 모든 프로필 조회 가능
CREATE POLICY "Super admin can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- 5. 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 6. 테스트 쿼리 (현재 사용자 프로필 조회)
-- SELECT * FROM profiles WHERE id = auth.uid();