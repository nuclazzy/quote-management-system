import { NextRequest, NextResponse } from 'next/server'

interface RateLimitOptions {
  windowMs: number // 시간 윈도우 (밀리초)
  maxRequests: number // 최대 요청 수
  skipSuccessfulRequests?: boolean // 성공한 요청은 카운트에서 제외
  keyGenerator?: (req: NextRequest) => string // 키 생성 함수
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// 메모리 기반 레이트 리미터 (프로덕션에서는 Redis 사용 권장)
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * 레이트 리미팅 미들웨어
 */
export function withRateLimit(
  options: RateLimitOptions,
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const key = options.keyGenerator ? options.keyGenerator(req) : getDefaultKey(req)
    const now = Date.now()
    
    // 기존 엔트리 조회 또는 새 엔트리 생성
    const entry = rateLimitStore.get(key) || { count: 0, resetTime: now + options.windowMs }
    
    // 시간 윈도우가 지났으면 리셋
    if (now > entry.resetTime) {
      entry.count = 0
      entry.resetTime = now + options.windowMs
    }
    
    // 요청 수 증가
    entry.count++
    rateLimitStore.set(key, entry)
    
    // 제한 초과 확인
    if (entry.count > options.maxRequests) {
      const resetTimeSeconds = Math.ceil((entry.resetTime - now) / 1000)
      
      return NextResponse.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: '요청 제한을 초과했습니다. 잠시 후 다시 시도해주세요.',
          details: {
            limit: options.maxRequests,
            windowMs: options.windowMs,
            retryAfter: resetTimeSeconds
          }
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': options.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.resetTime.toString(),
            'Retry-After': resetTimeSeconds.toString()
          }
        }
      )
    }
    
    // 정상 처리
    const response = await handler(req)
    
    // 성공한 요청은 카운트에서 제외하는 옵션
    if (options.skipSuccessfulRequests && response.status < 400) {
      entry.count--
      rateLimitStore.set(key, entry)
    }
    
    // 레이트 리미트 헤더 추가
    response.headers.set('X-RateLimit-Limit', options.maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', Math.max(0, options.maxRequests - entry.count).toString())
    response.headers.set('X-RateLimit-Reset', entry.resetTime.toString())
    
    return response
  }
}

/**
 * 기본 키 생성 함수 (IP 기반)
 */
function getDefaultKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown'
  return `rate_limit:${ip}`
}

/**
 * 사용자 기반 키 생성 함수
 */
export function createUserBasedKey(req: NextRequest): string {
  // 여기서는 Authorization 헤더에서 사용자 정보를 추출한다고 가정
  const authHeader = req.headers.get('authorization')
  if (authHeader) {
    // JWT 토큰에서 사용자 ID 추출하는 로직 필요
    // 간단히 토큰 자체를 해시화해서 사용
    const hash = Buffer.from(authHeader).toString('base64')
    return `rate_limit:user:${hash.slice(0, 16)}`
  }
  return getDefaultKey(req)
}

/**
 * API 키 기반 키 생성 함수
 */
export function createApiKeyBasedKey(req: NextRequest): string {
  const apiKey = req.headers.get('x-api-key')
  if (apiKey) {
    return `rate_limit:api_key:${apiKey.slice(0, 16)}`
  }
  return getDefaultKey(req)
}

/**
 * 주기적으로 만료된 엔트리 정리
 */
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // 1분마다 정리

/**
 * 사전 정의된 레이트 리미트 설정들
 */
export const RateLimitPresets = {
  // 일반 API 요청
  standard: {
    windowMs: 15 * 60 * 1000, // 15분
    maxRequests: 100
  },
  
  // 인증 관련 요청
  auth: {
    windowMs: 15 * 60 * 1000, // 15분
    maxRequests: 5
  },
  
  // 파일 업로드
  upload: {
    windowMs: 60 * 1000, // 1분
    maxRequests: 5
  },
  
  // 데이터 내보내기
  export: {
    windowMs: 60 * 60 * 1000, // 1시간
    maxRequests: 3
  },
  
  // PDF 생성
  pdf: {
    windowMs: 5 * 60 * 1000, // 5분
    maxRequests: 10
  }
}