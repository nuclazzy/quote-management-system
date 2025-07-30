import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

export const createClient = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const cookieStore = cookies();

  return createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      storage: {
        getItem: (key: string) => {
          const cookie = cookieStore.get(key);
          return cookie?.value || null;
        },
        setItem: (key: string, value: string) => {
          // Server-side storage is read-only
        },
        removeItem: (key: string) => {
          // Server-side storage is read-only
        },
      },
    },
  });
};

// Legacy export for backward compatibility
export const createServerClient = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const cookieStore = cookies();

  return createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      storage: {
        getItem: (key: string) => {
          const cookie = cookieStore.get(key);
          return cookie?.value || null;
        },
        setItem: (key: string, value: string) => {
          // Server-side storage is read-only
        },
        removeItem: (key: string) => {
          // Server-side storage is read-only
        },
      },
    },
  });
};
