import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export const createClient = () => {
  // Use environment variables first, then fallback to hardcoded values
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xbkzzpewdfmykcosfkly.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhia3p6cGV3ZGZteWtjb3Nma2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NTU4OTUsImV4cCI6MjA2OTEzMTg5NX0.mJXlJNWPQY6zyE-r7Pc-Ym2nuQmSjxuubNy9bov14j4';

  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Key exists:', !!supabaseKey);

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase configuration error: Missing URL or Anon Key');
    throw new Error('Supabase configuration error: Please check environment variables');
  }

  try {
    // Simple client creation with basic configuration
    return createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    throw new Error('Supabase client creation failed');
  }
};

// export const supabase = createClient(); // Removed to prevent build-time execution

// 레거시 호환성을 위한 alias
export const createBrowserClient = createClient;
