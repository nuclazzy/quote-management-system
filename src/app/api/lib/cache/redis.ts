// Redis 캐시 유틸리티 (프로덕션에서는 실제 Redis 클라이언트 사용)

interface CacheOptions {
  ttl?: number // Time to live in seconds
  prefix?: string
}

// 메모리 기반 캐시 (개발용, 프로덕션에서는 Redis 사용)
const memoryCache = new Map<string, { value: any; expires: number }>()

/**
 * 캐시 클래스
 */
export class Cache {
  private prefix: string

  constructor(prefix = 'app') {
    this.prefix = prefix
  }

  /**
   * 캐시에서 값 가져오기
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = `${this.prefix}:${key}`
    
    if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
      // 프로덕션에서는 실제 Redis 클라이언트 사용
      // const redis = getRedisClient()
      // const value = await redis.get(fullKey)
      // return value ? JSON.parse(value) : null
    }

    // 개발 환경에서는 메모리 캐시 사용
    const cached = memoryCache.get(fullKey)
    if (!cached) return null

    if (Date.now() > cached.expires) {
      memoryCache.delete(fullKey)
      return null
    }

    return cached.value
  }

  /**
   * 캐시에 값 저장
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const { ttl = 3600 } = options // 기본 1시간
    const fullKey = `${this.prefix}:${key}`
    const expires = Date.now() + (ttl * 1000)

    if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
      // 프로덕션에서는 실제 Redis 클라이언트 사용
      // const redis = getRedisClient()
      // await redis.setex(fullKey, ttl, JSON.stringify(value))
    } else {
      // 개발 환경에서는 메모리 캐시 사용
      memoryCache.set(fullKey, { value, expires })
    }
  }

  /**
   * 캐시에서 값 삭제
   */
  async delete(key: string): Promise<void> {
    const fullKey = `${this.prefix}:${key}`

    if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
      // 프로덕션에서는 실제 Redis 클라이언트 사용
      // const redis = getRedisClient()
      // await redis.del(fullKey)
    } else {
      memoryCache.delete(fullKey)
    }
  }

  /**
   * 패턴에 맞는 키들 삭제
   */
  async deletePattern(pattern: string): Promise<void> {
    const fullPattern = `${this.prefix}:${pattern}`

    if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
      // 프로덕션에서는 실제 Redis 클라이언트 사용
      // const redis = getRedisClient()
      // const keys = await redis.keys(fullPattern)
      // if (keys.length > 0) {
      //   await redis.del(...keys)
      // }
    } else {
      // 메모리 캐시에서 패턴 매칭 삭제
      for (const key of memoryCache.keys()) {
        if (key.startsWith(this.prefix) && key.includes(pattern.replace('*', ''))) {
          memoryCache.delete(key)
        }
      }
    }
  }

  /**
   * 캐시된 함수 실행
   */
  async remember<T>(
    key: string,
    callback: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await callback()
    await this.set(key, value, options)
    return value
  }
}

/**
 * 기본 캐시 인스턴스들
 */
export const cache = new Cache('quotes')
export const userCache = new Cache('users')
export const customerCache = new Cache('customers')
export const supplierCache = new Cache('suppliers')

/**
 * 캐시 키 생성 헬퍼
 */
export const CacheKeys = {
  // 견적서 관련
  quote: (id: string) => `quote:${id}`,
  quoteList: (userId: string, filters: string) => `quote_list:${userId}:${filters}`,
  quoteCalculation: (id: string) => `quote_calc:${id}`,
  
  // 사용자 관련
  user: (id: string) => `user:${id}`,
  userProfile: (id: string) => `user_profile:${id}`,
  
  // 고객사 관련
  customer: (id: string) => `customer:${id}`,
  customerList: (filters: string) => `customer_list:${filters}`,
  
  // 공급업체 관련
  supplier: (id: string) => `supplier:${id}`,
  supplierList: (filters: string) => `supplier_list:${filters}`,
  
  // 마스터 데이터
  masterItems: () => 'master_items',
  
  // 통계 및 대시보드
  dashboard: (userId: string, period: string) => `dashboard:${userId}:${period}`,
  stats: (type: string, period: string) => `stats:${type}:${period}`,
}

/**
 * 캐시 TTL 상수
 */
export const CacheTTL = {
  SHORT: 5 * 60,        // 5분
  MEDIUM: 30 * 60,      // 30분
  LONG: 60 * 60,        // 1시간
  VERY_LONG: 24 * 60 * 60, // 24시간
  MASTER_DATA: 7 * 24 * 60 * 60, // 7일 (마스터 데이터용)
}

/**
 * 캐시 무효화 헬퍼
 */
export class CacheInvalidator {
  /**
   * 견적서 관련 캐시 무효화
   */
  static async invalidateQuote(quoteId: string, userId?: string): Promise<void> {
    await cache.delete(CacheKeys.quote(quoteId))
    await cache.delete(CacheKeys.quoteCalculation(quoteId))
    
    if (userId) {
      await cache.deletePattern(`quote_list:${userId}:*`)
    } else {
      await cache.deletePattern('quote_list:*')
    }
  }

  /**
   * 사용자 관련 캐시 무효화
   */
  static async invalidateUser(userId: string): Promise<void> {
    await userCache.delete(CacheKeys.user(userId))
    await userCache.delete(CacheKeys.userProfile(userId))
    await cache.deletePattern(`dashboard:${userId}:*`)
  }

  /**
   * 고객사 관련 캐시 무효화
   */
  static async invalidateCustomer(customerId?: string): Promise<void> {
    if (customerId) {
      await customerCache.delete(CacheKeys.customer(customerId))
    }
    await customerCache.deletePattern('customer_list:*')
  }

  /**
   * 공급업체 관련 캐시 무효화
   */
  static async invalidateSupplier(supplierId?: string): Promise<void> {
    if (supplierId) {
      await supplierCache.delete(CacheKeys.supplier(supplierId))
    }
    await supplierCache.deletePattern('supplier_list:*')
  }

  /**
   * 마스터 데이터 캐시 무효화
   */
  static async invalidateMasterData(): Promise<void> {
    await cache.delete(CacheKeys.masterItems())
  }
}

/**
 * 캐시 통계
 */
export class CacheStats {
  static getMemoryCacheStats() {
    if (process.env.NODE_ENV !== 'production') {
      return {
        size: memoryCache.size,
        keys: Array.from(memoryCache.keys()),
        memory: JSON.stringify(Array.from(memoryCache.entries())).length
      }
    }
    return null
  }
}

// 메모리 캐시 정리 (5분마다)
if (process.env.NODE_ENV !== 'production') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of memoryCache.entries()) {
      if (now > value.expires) {
        memoryCache.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}