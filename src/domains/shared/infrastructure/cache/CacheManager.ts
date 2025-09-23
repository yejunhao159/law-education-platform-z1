/**
 * 缓存管理器
 * 迁移自 lib/services/cache/manager.ts
 * 统一管理多层缓存架构
 */

import { MemoryCacheService } from './MemoryCacheService'
import { AnalysisCacheManager } from './AnalysisCacheManager'
import { CacheService } from './CacheService'
import { ICacheService, CacheConfig, CacheEvents } from './interfaces'

/**
 * 多层缓存管理器
 * 实现L1(内存) + L2(localStorage)的缓存架构
 */
export class CacheManager {
  private static instance: CacheManager
  private l1Cache: MemoryCacheService // L1: 内存缓存
  private l2Cache: AnalysisCacheManager // L2: 持久化缓存
  private basicCache: CacheService // 基础缓存服务

  private constructor(config: CacheConfig = {}) {
    // 初始化L1缓存（内存缓存，快速访问）
    this.l1Cache = new MemoryCacheService({
      maxEntries: config.maxEntries || 100,
      defaultTTL: config.defaultTTL || 3600000, // 1小时
      enableStats: true,
      cleanupInterval: 300000 // 5分钟清理一次
    })

    // 初始化L2缓存（持久化缓存，长期存储）
    this.l2Cache = new AnalysisCacheManager('shared-cache', {
      maxAge: 24 * 60 * 60 * 1000, // 24小时
      maxSize: config.maxEntries || 1000,
      compressionEnabled: true,
      autoCleanupEnabled: true,
      cleanupInterval: 60 * 60 * 1000 // 1小时清理一次
    })

    // 初始化基础缓存服务
    this.basicCache = new CacheService({
      defaultTTL: config.defaultTTL || 3600000,
      maxSize: config.maxEntries || 50,
      cleanupInterval: 600000 // 10分钟清理一次
    })

    console.log('🏗️ 多层缓存管理器已初始化')
  }

  /**
   * 获取单例实例
   */
  static getInstance(config?: CacheConfig): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(config)
    }
    return CacheManager.instance
  }

  /**
   * 获取缓存项（先L1后L2）
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // 先查L1缓存
      const l1Result = await this.l1Cache.get(key)
      if (l1Result) {
        console.log(`🎯 L1缓存命中: ${key}`)
        return l1Result.value as T
      }

      // L1未命中，查L2缓存
      const l2Result = await this.l2Cache.get<T>(key)
      if (l2Result) {
        console.log(`📂 L2缓存命中: ${key}，回填L1`)
        // 回填到L1缓存
        await this.l1Cache.set(key, l2Result, { ttl: 1800000 }) // 30分钟
        return l2Result
      }

      console.log(`❌ 缓存完全未命中: ${key}`)
      return null
    } catch (error) {
      console.error(`缓存获取错误: ${key}`, error)
      return null
    }
  }

  /**
   * 设置缓存项（同时设置L1和L2）
   */
  async set<T>(key: string, value: T, options?: { ttl?: number; l1Only?: boolean }): Promise<void> {
    try {
      const ttl = options?.ttl || 3600000

      // 设置L1缓存
      await this.l1Cache.set(key, value, { ttl })

      // 如果不是仅L1，也设置L2缓存
      if (!options?.l1Only) {
        await this.l2Cache.set(key, value, ttl)
      }

      console.log(`💾 缓存设置完成: ${key} (L1: ✓, L2: ${options?.l1Only ? '✗' : '✓'})`)
    } catch (error) {
      console.error(`缓存设置错误: ${key}`, error)
      throw error
    }
  }

  /**
   * 删除缓存项
   */
  async delete(key: string): Promise<void> {
    try {
      // 从L1删除
      const l1Deleted = await this.l1Cache.invalidate(key)

      // 从L2删除
      this.l2Cache.delete(key)

      console.log(`🗑️ 缓存删除: ${key} (L1: ${l1Deleted > 0 ? '✓' : '✗'}, L2: ✓)`)
    } catch (error) {
      console.error(`缓存删除错误: ${key}`, error)
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    await Promise.all([
      this.l1Cache.clear(),
      this.l2Cache.clear()
    ])
    this.basicCache.clear()
    console.log('🧹 所有缓存已清空')
  }

  /**
   * 获取L1缓存服务（用于高频访问）
   */
  getL1Cache(): MemoryCacheService {
    return this.l1Cache
  }

  /**
   * 获取L2缓存服务（用于持久化存储）
   */
  getL2Cache(): AnalysisCacheManager {
    return this.l2Cache
  }

  /**
   * 获取基础缓存服务（用于简单场景）
   */
  getBasicCache(): CacheService {
    return this.basicCache
  }

  /**
   * 预热缓存
   */
  async warmup<T>(keys: string[], loader: (key: string) => Promise<T>): Promise<void> {
    console.log(`🔥 开始预热缓存，共 ${keys.length} 个条目`)

    const promises = keys.map(async (key) => {
      try {
        const data = await loader(key)
        if (data) {
          await this.set(key, data)
        }
      } catch (error) {
        console.error(`预热缓存失败: ${key}`, error)
      }
    })

    await Promise.all(promises)
    console.log('✅ 缓存预热完成')
  }

  /**
   * 获取综合统计信息
   */
  async getStats() {
    const [l1Stats, l2Stats] = await Promise.all([
      this.l1Cache.stats(),
      Promise.resolve(this.l2Cache.getStatistics())
    ])

    const basicStats = this.basicCache.getStatistics()

    return {
      l1: l1Stats,
      l2: l2Stats,
      basic: basicStats,
      summary: {
        totalRequests: l1Stats.totalHits + l1Stats.totalMisses + l2Stats.totalRequests,
        totalHits: l1Stats.totalHits + l2Stats.cacheHits,
        overallHitRate: ((l1Stats.totalHits + l2Stats.cacheHits) / (l1Stats.totalHits + l1Stats.totalMisses + l2Stats.totalRequests)) || 0,
        memoryUsage: (l1Stats.memoryUsage || 0) + l2Stats.cacheSize,
        totalEntries: l1Stats.totalEntries + l2Stats.itemCount + basicStats.size
      }
    }
  }

  /**
   * 获取性能报告
   */
  async getPerformanceReport(): string {
    const stats = await this.getStats()

    return `
🏗️ 多层缓存性能报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 综合统计
  总请求数: ${stats.summary.totalRequests}
  总命中数: ${stats.summary.totalHits}
  综合命中率: ${(stats.summary.overallHitRate * 100).toFixed(1)}%
  内存使用: ${this.formatBytes(stats.summary.memoryUsage)}
  总条目数: ${stats.summary.totalEntries}

🧠 L1缓存 (内存)
  条目数: ${stats.l1.totalEntries}
  命中率: ${(stats.l1.hitRate * 100).toFixed(1)}%
  平均访问时间: ${stats.l1.avgAccessTime?.toFixed(1) || 0}ms

📂 L2缓存 (持久化)
  条目数: ${stats.l2.itemCount}
  命中率: ${(stats.l2.hitRate * 100).toFixed(1)}%
  缓存大小: ${this.formatBytes(stats.l2.cacheSize)}

⚙️ 基础缓存
  条目数: ${stats.basic.size}
  命中率: ${(stats.basic.hitRate * 100).toFixed(1)}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim()
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    this.l1Cache.destroy()
    this.l2Cache.destroy()
    this.basicCache.stopCleanupTimer()
    console.log('💥 多层缓存管理器已销毁')
  }

  /**
   * 格式化字节大小
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }
}

// 导出单例实例
export const cacheManager = CacheManager.getInstance()

// 导出便捷方法
export const cache = {
  get: <T>(key: string) => cacheManager.get<T>(key),
  set: <T>(key: string, value: T, options?: { ttl?: number; l1Only?: boolean }) =>
    cacheManager.set(key, value, options),
  delete: (key: string) => cacheManager.delete(key),
  clear: () => cacheManager.clear(),
  stats: () => cacheManager.getStats(),
  warmup: <T>(keys: string[], loader: (key: string) => Promise<T>) =>
    cacheManager.warmup(keys, loader)
}