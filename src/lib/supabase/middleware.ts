import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Missing Supabase environment variables in middleware')
    return response
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey)

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Check domain restriction for new signups
    if (session?.user?.email && !session.user.email.endsWith('@motionsense.co.kr')) {
      // Redirect to unauthorized page
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  } catch (error) {
    console.warn('Middleware session check failed:', error)
  }

  return response
}