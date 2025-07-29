import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'

export const createClient = () => {
  return createClientComponentClient<Database>()
}

export const supabase = createClient()

// 레거시 호환성을 위한 alias
export const createBrowserClient = createClient