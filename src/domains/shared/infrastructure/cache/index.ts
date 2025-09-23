/**
 * 缓存基础设施统一导出
 * 提供多层缓存架构的完整解决方案
 */

// 核心缓存服务
export { CacheService } from './CacheService'
export { AnalysisCacheManager, BaseCacheKeyGenerator } from './AnalysisCacheManager'
export { MemoryCacheService } from './MemoryCacheService'
export { CacheManager, cacheManager, cache } from './CacheManager'

// 接口和类型
export type {
  CacheEntry,
  CacheOptions,
  CacheStats,
  ICacheService,
  CacheConfig,
  CacheEvents,
  CacheServiceFactory
} from './interfaces'

export { BaseCacheKeyGenerator as CacheKeyGenerator } from './interfaces'

// 重新导出便捷访问
export type {
  CacheStatistics,
  CacheConfig as AnalysisCacheConfig
} from './AnalysisCacheManager'

/**
 * 创建缓存服务工厂函数
 */
export function createCacheService<T = any>(type: 'memory' | 'analysis' | 'basic' = 'memory', config?: CacheConfig) {
  switch (type) {
    case 'memory':
      return new MemoryCacheService<T>(config)
    case 'analysis':
      return new AnalysisCacheManager<T>(config?.backend || 'shared-cache', config)
    case 'basic':
      return new CacheService(config)
    default:
      throw new Error(`Unsupported cache service type: ${type}`)
  }
}

/**
 * 获取全局缓存管理器实例
 */
export function getCacheManager(config?: CacheConfig): CacheManager {
  return CacheManager.getInstance(config)
}

/**
 * 缓存装饰器工厂（用于方法缓存）
 */
export function cached<T = any>(
  keyGenerator: (...args: any[]) => string,
  options?: { ttl?: number; cacheType?: 'l1' | 'l2' | 'both' }
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]): Promise<T> {
      const cacheKey = keyGenerator(...args)
      const manager = getCacheManager()

      // 尝试从缓存获取
      const cached = await manager.get<T>(cacheKey)
      if (cached !== null) {
        return cached
      }

      // 缓存未命中，执行原方法
      const result = await originalMethod.apply(this, args)

      // 缓存结果
      if (result !== null && result !== undefined) {
        const setOptions = {
          ttl: options?.ttl,
          l1Only: options?.cacheType === 'l1'
        }
        await manager.set(cacheKey, result, setOptions)
      }

      return result
    }

    return descriptor
  }
}

/**
 * 预设的缓存策略
 */
export const CacheStrategies = {
  /**
   * 短期内存缓存（15分钟）
   */
  shortTerm: { ttl: 15 * 60 * 1000, l1Only: true },

  /**
   * 中期缓存（1小时）
   */
  mediumTerm: { ttl: 60 * 60 * 1000 },

  /**
   * 长期缓存（24小时）
   */
  longTerm: { ttl: 24 * 60 * 60 * 1000 },

  /**
   * 会话缓存（仅L1，直到会话结束）
   */
  session: { ttl: 8 * 60 * 60 * 1000, l1Only: true } // 8小时
} as const