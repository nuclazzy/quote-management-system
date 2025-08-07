import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export const createClient = () => {
  // Use hardcoded values as fallback if environment variables are missing
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xbkzzpewdfmykcosflky.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhia3p6cGV3ZGZteWtjb3Nma2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NTU4OTUsImV4cCI6MjA2OTEzMTg5NX0.0R60-NOw-s3L7IRQAzQFvCsIxjgzLJ4PjCqJYMILZUA';

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase configuration error: Missing URL or Anon Key');
    // Return a dummy client that won't crash the app
    throw new Error('Supabase configuration error: Please check environment variables');
  }

  // Simple client creation without custom storage to avoid issues
  return createSupabaseClient<Database>(supabaseUrl, supabaseKey);
};

// export const supabase = createClient(); // Removed to prevent build-time execution

// 레거시 호환성을 위한 alias
export const createBrowserClient = createClient;
