import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createMiddlewareClient<Database>({ req: request, res: response })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check domain restriction for new signups
  if (session?.user?.email && !session.user.email.endsWith('@motionsense.co.kr')) {
    // Redirect to unauthorized page
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  return response
}