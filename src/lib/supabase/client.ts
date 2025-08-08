import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Global debug logger for visual debugging
declare global {
  interface Window {
    debugLogger?: {
      addStep: (step: any) => void;
      steps: any[];
    };
  }
}

// 싱글톤 인스턴스를 위한 변수
let supabaseInstance: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export const createClient = () => {
  // 이미 인스턴스가 있으면 재사용
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const debugLog = (message: string, details?: any, status: 'success' | 'error' | 'warning' | 'loading' = 'loading') => {
    const logData = {
      id: `supabase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: 'Supabase Client',
      status,
      message,
      details,
      timestamp: new Date()
    };
    
    console.log(`[Supabase Debug] ${message}`, details);
    
    // Visual debug logger
    if (typeof window !== 'undefined' && window.debugLogger) {
      window.debugLogger.addStep(logData);
    }
  };

  debugLog('Supabase 클라이언트 초기화 시작');

  // Use environment variables first, then fallback to hardcoded values
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xbkzzpewdfmykcosfkly.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhia3p6cGV3ZGZteWtjb3Nma2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NTU4OTUsImV4cCI6MjA2OTEzMTg5NX0.mJXlJNWPQY6zyE-r7Pc-Ym2nuQmSjxuubNy9bov14j4';

  debugLog('환경 변수 확인 완료', { 
    url: supabaseUrl, 
    keyExists: !!supabaseKey,
    keyLength: supabaseKey?.length,
    envUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    envKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });

  if (!supabaseUrl || !supabaseKey) {
    debugLog('환경 변수 누락', { supabaseUrl, keyExists: !!supabaseKey }, 'error');
    throw new Error('Supabase configuration error: Please check environment variables');
  }

  try {
    debugLog('Supabase 클라이언트 생성 시도 중');
    
    // Simple client creation with basic configuration
    const client = createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'motionsense-auth',
        // Cloudflare 프록시 환경에서는 쿠키 대신 localStorage 사용
      },
    });

    debugLog('Supabase 클라이언트 생성 성공', { 
      clientExists: !!client,
      authExists: !!client?.auth,
      fromExists: !!client?.from
    }, 'success');

    // 싱글톤 인스턴스 저장
    supabaseInstance = client;
    
    return client;
  } catch (error) {
    debugLog('Supabase 클라이언트 생성 실패', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'error');
    throw new Error('Supabase client creation failed');
  }
};

// 브라우저 환경에서만 싱글톤 인스턴스 생성
if (typeof window !== 'undefined') {
  supabaseInstance = createClient();
}

// 레거시 호환성을 위한 alias
export const createBrowserClient = createClient;