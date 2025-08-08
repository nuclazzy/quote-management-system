import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// 싱글톤 인스턴스를 위한 변수
let supabaseInstance: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export const createClient = () => {
  // 이미 인스턴스가 있으면 재사용
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // 환경 변수
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xbkzzpewdfmykcosfkly.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhia3p6cGV3ZGZteWtjb3Nma2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NTU4OTUsImV4cCI6MjA2OTEzMTg5NX0.mJXlJNWPQY6zyE-r7Pc-Ym2nuQmSjxuubNy9bov14j4';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration error: Please check environment variables');
  }

  // Supabase 클라이언트 생성
  const client = createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'sb-motionsense-auth-token',
    },
  });

  // 싱글톤 인스턴스 저장
  supabaseInstance = client;
  
  return client;
};

// 레거시 호환성을 위한 alias
export const createBrowserClient = createClient;