import { NextRequest, NextResponse } from 'next/server'
import { cache, CacheKeys, CacheTTL } from '../cache/redis'

export interface CacheConfig {
  key: string | ((req: NextRequest) => string)
  ttl?: number
  vary?: string[] // 요청 헤더 기반 캐시 변형
  skipCache?: (req: NextRequest) => boolean
  generateKey?: (req: NextRequest) => string
}

/**
 * 응답 캐싱 미들웨어
 */
export function withCache(
  config: CacheConfig,
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // 캐시 스킵 조건 확인
    if (config.skipCache && config.skipCache(req)) {
      return await handler(req)
    }

    // 캐시 키 생성
    const cacheKey = typeof config.key === 'function' 
      ? config.key(req) 
      : config.generateKey 
        ? config.generateKey(req)
        : config.key

    // vary 헤더 기반 키 확장
    let finalKey = cacheKey
    if (config.vary && config.vary.length > 0) {
      const varyValues = config.vary.map(header => 
        req.headers.get(header) || 'default'
      ).join(':')
      finalKey = `${cacheKey}:${varyValues}`
    }

    try {
      // 캐시에서 조회
      const cachedResponse = await cache.get<{
        body: string
        headers: Record<string, string>
        status: number
      }>(finalKey)

      if (cachedResponse) {
        // 캐시된 응답 반환
        const response = new NextResponse(cachedResponse.body, {
          status: cachedResponse.status,
          headers: {
            ...cachedResponse.headers,
            'X-Cache': 'HIT',
            'X-Cache-Key': finalKey
          }
        })
        return response
      }

      // 캐시 미스 - 핸들러 실행
      const response = await handler(req)

      // 성공 응답만 캐시
      if (response.status >= 200 && response.status < 300) {
        const responseBody = await response.text()
        const responseHeaders: Record<string, string> = {}
        
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value
        })

        // 캐시에 저장
        await cache.set(finalKey, {
          body: responseBody,
          headers: responseHeaders,
          status: response.status
        }, { 
          ttl: config.ttl || CacheTTL.MEDIUM 
        })

        // 새로운 응답 객체 생성 (이미 읽은 body 때문에)
        const newResponse = new NextResponse(responseBody, {
          status: response.status,
          headers: {
            ...responseHeaders,
            'X-Cache': 'MISS',
            'X-Cache-Key': finalKey
          }
        })

        return newResponse
      }

      // 에러 응답은 캐시하지 않음
      response.headers.set('X-Cache', 'SKIP')
      return response
    } catch (error) {
      console.error('Cache middleware error:', error)
      // 캐시 오류 시에도 정상 응답
      const response = await handler(req)
      response.headers.set('X-Cache', 'ERROR')
      return response
    }
  }
}

/**
 * 쿼리 기반 캐시 키 생성기
 */
export function createQueryBasedKey(baseKey: string) {
  return (req: NextRequest): string => {
    const url = new URL(req.url)
    const queryParams = Array.from(url.searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&')
    
    return queryParams ? `${baseKey}:${Buffer.from(queryParams).toString('base64')}` : baseKey
  }
}

/**
 * 사용자 기반 캐시 키 생성기
 */
export function createUserBasedKey(baseKey: string) {
  return (req: NextRequest): string => {
    // 인증 헤더에서 사용자 정보 추출 (실제 구현에서는 JWT 디코딩 등)
    const authHeader = req.headers.get('authorization')
    const userId = authHeader ? extractUserIdFromAuth(authHeader) : 'anonymous'
    
    return `${baseKey}:user:${userId}`
  }
}

/**
 * 조건부 캐시 스킵 함수들
 */
export const CacheSkipConditions = {
  // POST, PUT, DELETE 요청은 스킵
  writeOperations: (req: NextRequest) => !['GET', 'HEAD'].includes(req.method),
  
  // 인증되지 않은 요청은 스킵
  unauthenticated: (req: NextRequest) => !req.headers.get('authorization'),
  
  // 관리자 요청은 스킵 (실시간 데이터 필요)
  adminRequests: (req: NextRequest) => {
    const authHeader = req.headers.get('authorization')
    return authHeader ? isAdminUser(authHeader) : false
  },
  
  // 개발 환경에서는 스킵
  development: () => process.env.NODE_ENV === 'development',
  
  // 캐시 무효화 헤더가 있으면 스킵
  cacheBypass: (req: NextRequest) => req.headers.get('cache-control') === 'no-cache'
}

/**
 * 사전 정의된 캐시 설정들
 */
export const CacheConfigs = {
  // 견적서 목록 (사용자별, 쿼리 파라미터 기반)
  quoteList: {
    key: createQueryBasedKey('quote_list'),
    ttl: CacheTTL.MEDIUM,
    vary: ['authorization'],
    skipCache: CacheSkipConditions.writeOperations
  },
  
  // 견적서 상세 (ID 기반)
  quoteDetail: {
    key: (req: NextRequest) => {
      const url = new URL(req.url)
      const pathSegments = url.pathname.split('/').filter(Boolean)
      const id = pathSegments[pathSegments.length - 1]
      return CacheKeys.quote(id)
    },
    ttl: CacheTTL.LONG,
    vary: ['authorization'],
    skipCache: CacheSkipConditions.writeOperations
  },
  
  // 고객사/공급업체 목록
  masterDataList: {
    key: createQueryBasedKey('master_data'),
    ttl: CacheTTL.VERY_LONG,
    skipCache: CacheSkipConditions.writeOperations
  },
  
  // 마스터 품목 (거의 변경되지 않는 데이터)
  masterItems: {
    key: CacheKeys.masterItems(),
    ttl: CacheTTL.MASTER_DATA,
    skipCache: CacheSkipConditions.writeOperations
  },
  
  // 대시보드 데이터
  dashboard: {
    key: createUserBasedKey('dashboard'),
    ttl: CacheTTL.SHORT, // 자주 업데이트되는 데이터
    vary: ['authorization'],
    skipCache: (req: NextRequest) => 
      CacheSkipConditions.writeOperations(req) || 
      CacheSkipConditions.adminRequests(req)
  }
}

/**
 * 인증 헤더에서 사용자 ID 추출 (실제 구현 필요)
 */
function extractUserIdFromAuth(authHeader: string): string {
  // JWT 토큰 디코딩 또는 세션 기반 사용자 ID 추출
  // 여기서는 간단히 헤더 해시 사용
  return Buffer.from(authHeader).toString('base64').slice(0, 16)
}

/**
 * 관리자 사용자 확인 (실제 구현 필요)
 */
function isAdminUser(authHeader: string): boolean {
  // JWT 토큰에서 역할 정보 추출하여 관리자 여부 확인
  // 여기서는 임시로 false 반환
  return false
}

/**
 * 조건부 캐시 미들웨어
 */
export function withConditionalCache(
  condition: (req: NextRequest) => boolean,
  cacheConfig: CacheConfig,
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    if (condition(req)) {
      return withCache(cacheConfig, handler)(req)
    } else {
      return handler(req)
    }
  }
}

/**
 * 캐시 워밍업 (자주 사용되는 데이터 미리 캐시)
 */
export class CacheWarmer {
  static async warmupMasterData(): Promise<void> {
    // 마스터 데이터들을 미리 캐시에 로드
    // 실제 구현에서는 백그라운드 작업으로 실행
    console.log('Warming up master data cache...')
  }

  static async warmupUserData(userId: string): Promise<void> {
    // 사용자별 자주 사용되는 데이터 캐시
    console.log(`Warming up cache for user: ${userId}`)
  }
}