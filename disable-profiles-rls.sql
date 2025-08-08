-- profiles 테이블 RLS 비활성화 스크립트
-- 간단한 해결책: RLS를 완전히 비활성화

-- 1. 기존 RLS 정책 모두 제거
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON profiles;

-- 2. RLS 비활성화
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 3. 확인 쿼리
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- rowsecurity가 false이면 RLS가 비활성화된 것임