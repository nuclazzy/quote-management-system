import { NextRequest, NextResponse } from 'next/server'

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Security headers
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
}

// CSP header
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' *.googleapis.com;
  style-src 'self' 'unsafe-inline' fonts.googleapis.com;
  img-src 'self' blob: data: *.supabase.co;
  font-src 'self' fonts.gstatic.com;
  connect-src 'self' *.supabase.co;
  frame-ancestors 'none';
`.replace(/\s{2,}/g, ' ').trim()

function applyRateLimit(request: NextRequest): boolean {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'anonymous'
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxRequests = 1000 // requests per window

  // Clean up old entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }

  const current = rateLimitStore.get(ip) || { count: 0, resetTime: now + windowMs }
  
  if (now > current.resetTime) {
    // Reset window
    current.count = 1
    current.resetTime = now + windowMs
  } else {
    current.count++
  }

  rateLimitStore.set(ip, current)
  
  return current.count <= maxRequests
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith('/auth/')
}

function isPublicRoute(pathname: string): boolean {
  const publicRoutes = ['/auth/login', '/auth/callback']
  return publicRoutes.includes(pathname)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Apply rate limiting to API routes
  if (isApiRoute(pathname)) {
    if (!applyRateLimit(request)) {
      return new NextResponse('Too Many Requests', { 
        status: 429,
        headers: {
          'Retry-After': '900' // 15 minutes
        }
      })
    }
  }

  // Note: Auth session handling moved to individual pages/API routes
  // Edge Runtime doesn't support Supabase client operations
  // Authentication is handled in individual route handlers and pages

  // Create response with security headers
  const response = NextResponse.next()

  // Apply security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Apply CSP header (except for development)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Content-Security-Policy', cspHeader)
  }

  // Add performance headers
  response.headers.set('X-Response-Time', Date.now().toString())
  
  // CORS headers for API routes
  if (isApiRoute(pathname)) {
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_SITE_URL || '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Max-Age', '86400')
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}