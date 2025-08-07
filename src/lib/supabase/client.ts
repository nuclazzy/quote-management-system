import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Only use custom storage on the client side
  if (typeof window === 'undefined') {
    // Server-side: Use default storage
    return createSupabaseClient<Database>(supabaseUrl, supabaseKey);
  }

  // Client-side: Use custom storage with localStorage and cookies
  return createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      storage: {
        getItem: (key: string) => {
          try {
            // Try localStorage first
            const localStorageValue = localStorage.getItem(key);
            if (localStorageValue) {
              // Also set as cookie for server-side access
              document.cookie = `${key}=${localStorageValue}; path=/; max-age=86400; SameSite=Lax`;
              return localStorageValue;
            }

            // Fall back to cookies
            const cookies = document.cookie.split(';');
            const cookie = cookies.find((c) => c.trim().startsWith(`${key}=`));
            return cookie ? cookie.split('=')[1] : null;
          } catch (error) {
            console.error('Error accessing storage:', error);
            return null;
          }
        },
        setItem: (key: string, value: string) => {
          try {
            // Set in localStorage
            localStorage.setItem(key, value);

            // Also set as cookie for server-side access
            document.cookie = `${key}=${value}; path=/; max-age=86400; SameSite=Lax`;
          } catch (error) {
            console.error('Error setting storage:', error);
          }
        },
        removeItem: (key: string) => {
          try {
            // Remove from localStorage
            localStorage.removeItem(key);

            // Remove cookie
            document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          } catch (error) {
            console.error('Error removing from storage:', error);
          }
        },
      },
    },
  });
};

// export const supabase = createClient(); // Removed to prevent build-time execution

// 레거시 호환성을 위한 alias
export const createBrowserClient = createClient;
