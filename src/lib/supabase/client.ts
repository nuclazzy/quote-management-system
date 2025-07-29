import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      storage: {
        getItem: (key: string) => {
          if (typeof window === 'undefined') return null
          
          // Try localStorage first
          const localStorageValue = localStorage.getItem(key)
          if (localStorageValue) {
            // Also set as cookie for server-side access
            document.cookie = `${key}=${localStorageValue}; path=/; max-age=86400; SameSite=Lax`
            return localStorageValue
          }
          
          // Fall back to cookies
          const cookies = document.cookie.split(';')
          const cookie = cookies.find(c => c.trim().startsWith(`${key}=`))
          return cookie ? cookie.split('=')[1] : null
        },
        setItem: (key: string, value: string) => {
          if (typeof window === 'undefined') return
          
          // Set in localStorage
          localStorage.setItem(key, value)
          
          // Also set as cookie for server-side access
          document.cookie = `${key}=${value}; path=/; max-age=86400; SameSite=Lax`
        },
        removeItem: (key: string) => {
          if (typeof window === 'undefined') return
          
          // Remove from localStorage
          localStorage.removeItem(key)
          
          // Remove cookie
          document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        }
      }
    }
  })
}

export const supabase = createClient()

// 레거시 호환성을 위한 alias
export const createBrowserClient = createClient