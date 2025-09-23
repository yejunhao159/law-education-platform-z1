/**
 * 智能分析缓存管理器
 * 迁移自 lib/utils/analysis-cache.ts
 * 支持双层架构(内存+localStorage)、压缩、智能预取等
 */

/**
 * 缓存配置
 */
export interface CacheConfig {
  maxAge: number // 最大缓存时间（毫秒）
  maxSize: number // 最大缓存条目数
  compressionEnabled: boolean // 是否启用压缩
  autoCleanupEnabled: boolean // 是否自动清理过期缓存
  cleanupInterval: number // 清理间隔（毫秒）
}

/**
 * 缓存统计信息
 */
export interface CacheStatistics {
  hitRate: number // 缓存命中率
  totalRequests: number // 总请求数
  cacheHits: number // 缓存命中次数
  cacheMisses: number // 缓存未命中次数
  cacheSize: number // 当前缓存大小（字节）
  itemCount: number // 缓存条目数
  lastCleanup: string // 最后清理时间
  averageResponseTime: number // 平均响应时间（毫秒）
  operationCounts: {
    get: number
    set: number
    delete: number
    cleanup: number
  }
  performanceMetrics: {
    fastQueries: number // < 100ms
    mediumQueries: number // 100-500ms
    slowQueries: number // > 500ms
    totalResponseTime: number
    queryCount: number
  }
  errorCounts: {
    storageError: number
    compressionError: number
    parseError: number
    networkError: number
  }
  memoryMetrics: {
    peakMemoryUsage: number // 峰值内存使用（字节）
    averageItemSize: number // 平均条目大小（字节）
    evictionCount: number // 驱逐次数
    storageFailures: number // 存储失败次数
  }
}

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  key: string
  data: T
  timestamp: number
  expiry: number
  accessCount: number
  lastAccessed: number
  size: number // 数据大小（字节）
}

/**
 * 抽象缓存键生成器基类
 */
export abstract class BaseCacheKeyGenerator {
  /**
   * 解析缓存键
   */
  static parseKey(key: string): {
    type: string
    [key: string]: any
  } {
    const parts = key.split(':')
    return { type: parts[0] || 'unknown' }
  }
}

/**
 * 智能缓存管理器基类
 * 提供通用的缓存管理功能，可被各域扩展使用
 */
export class AnalysisCacheManager<T = any> {
  protected memoryCache: Map<string, CacheEntry<T>>
  protected config: CacheConfig
  protected statistics: CacheStatistics
  protected cleanupTimer?: NodeJS.Timeout
  protected readonly storageKey: string
  protected readonly statsKey: string
  private saveTimer: NodeJS.Timeout | null = null

  constructor(storagePrefix: string, config?: Partial<CacheConfig>) {
    this.storageKey = `${storagePrefix}-cache`
    this.statsKey = `${storagePrefix}-cache-stats`

    // 默认配置
    this.config = {
      maxAge: 24 * 60 * 60 * 1000, // 24小时
      maxSize: 1000, // 最多1000条
      compressionEnabled: true,
      autoCleanupEnabled: true,
      cleanupInterval: 60 * 60 * 1000, // 每小时清理一次
      ...config
    }

    // 初始化内存缓存
    this.memoryCache = new Map()

    // 初始化统计信息
    this.statistics = {
      hitRate: 0,
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheSize: 0,
      itemCount: 0,
      lastCleanup: new Date().toISOString(),
      averageResponseTime: 0,
      operationCounts: {
        get: 0,
        set: 0,
        delete: 0,
        cleanup: 0
      },
      performanceMetrics: {
        fastQueries: 0,
        mediumQueries: 0,
        slowQueries: 0,
        totalResponseTime: 0,
        queryCount: 0
      },
      errorCounts: {
        storageError: 0,
        compressionError: 0,
        parseError: 0,
        networkError: 0
      },
      memoryMetrics: {
        peakMemoryUsage: 0,
        averageItemSize: 0,
        evictionCount: 0,
        storageFailures: 0
      }
    }

    // 从localStorage恢复缓存
    this.loadFromStorage()

    // 启动自动清理
    if (this.config.autoCleanupEnabled) {
      this.startAutoCleanup()
    }
  }

  /**
   * 获取缓存项
   */
  async get(key: string): Promise<T | null> {
    const startTime = Date.now()
    this.statistics.totalRequests++
    this.statistics.operationCounts.get++

    // 先检查内存缓存
    let entry = this.memoryCache.get(key)

    // 如果内存中没有，尝试从localStorage加载
    if (!entry && typeof window !== 'undefined') {
      entry = this.loadEntryFromStorage(key)
      if (entry) {
        this.memoryCache.set(key, entry)
      }
    }

    // 检查是否存在且未过期
    if (entry && entry.expiry > Date.now()) {
      // 更新访问信息
      entry.accessCount++
      entry.lastAccessed = Date.now()

      // 更新统计
      this.statistics.cacheHits++
      this.updateHitRate()
      this.updateResponseTime(Date.now() - startTime)
      this.recordPerformanceMetric(Date.now() - startTime)

      console.log(`🎯 缓存命中: ${key} (访问次数: ${entry.accessCount})`)
      return entry.data as T
    }

    // 缓存未命中或已过期
    if (entry) {
      console.log(`⏰ 缓存过期: ${key}`)
      this.delete(key)
    } else {
      console.log(`❌ 缓存未命中: ${key}`)
    }

    this.statistics.cacheMisses++
    this.updateHitRate()
    this.updateResponseTime(Date.now() - startTime)
    this.recordPerformanceMetric(Date.now() - startTime)

    return null
  }

  /**
   * 设置缓存项
   */
  async set(key: string, data: T, maxAge?: number): Promise<void> {
    const startTime = Date.now()
    this.statistics.operationCounts.set++
    const expiry = startTime + (maxAge || this.config.maxAge)

    // 计算数据大小
    const size = this.calculateSize(data)

    // 创建缓存条目
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: startTime,
      expiry,
      accessCount: 0,
      lastAccessed: startTime,
      size
    }

    // 检查缓存大小限制
    if (this.memoryCache.size >= this.config.maxSize) {
      await this.evictLRU()
    }

    // 存储到内存
    this.memoryCache.set(key, entry)

    // 异步存储到localStorage
    this.saveEntryToStorage(key, entry)

    // 更新统计
    this.updateCacheSize()
    this.recordPerformanceMetric(Date.now() - startTime)
    this.updateMemoryMetrics(size)

    console.log(`💾 缓存保存: ${key} (大小: ${this.formatBytes(size)}, 过期: ${new Date(expiry).toLocaleString()})`)
  }

  /**
   * 删除缓存项
   */
  delete(key: string): void {
    const deleted = this.memoryCache.delete(key)

    if (deleted) {
      this.deleteFromStorage(key)
      this.updateCacheSize()
      console.log(`🗑️ 缓存删除: ${key}`)
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.memoryCache.clear()

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.storageKey)
        if (stored) {
          localStorage.removeItem(this.storageKey)
        }
      } catch (error) {
        console.error('清空localStorage缓存失败:', error)
      }
    }

    this.updateCacheSize()
    console.log('🧹 缓存已清空')
  }

  /**
   * 清理过期缓存
   */
  async cleanup(): Promise<number> {
    console.log('🧹 开始清理过期缓存...')
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiry <= now) {
        this.delete(key)
        cleaned++
      }
    }

    this.statistics.lastCleanup = new Date().toISOString()

    // 同步到localStorage
    this.saveToStorage()

    console.log(`✅ 清理完成，删除了 ${cleaned} 个过期条目`)
    return cleaned
  }

  /**
   * 获取缓存统计信息
   */
  getStatistics(): CacheStatistics {
    return { ...this.statistics }
  }

  /**
   * 获取缓存命中率报告
   */
  getHitRateReport(): string {
    const stats = this.getStatistics()
    return `
📊 缓存性能报告
━━━━━━━━━━━━━━━━━━━━━
命中率: ${(stats.hitRate * 100).toFixed(2)}%
总请求: ${stats.totalRequests}
命中次数: ${stats.cacheHits}
未命中次数: ${stats.cacheMisses}
缓存大小: ${this.formatBytes(stats.cacheSize)}
条目数: ${stats.itemCount}
平均响应时间: ${stats.averageResponseTime.toFixed(2)}ms
最后清理: ${new Date(stats.lastCleanup).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━
    `.trim()
  }

  /**
   * 预热缓存（批量加载）
   */
  async warmup(keys: string[], loader: (key: string) => Promise<T>): Promise<void> {
    console.log(`🔥 开始预热缓存，共 ${keys.length} 个条目`)

    const promises = keys.map(async (key) => {
      const cached = await this.get(key)
      if (!cached) {
        try {
          const data = await loader(key)
          if (data) {
            await this.set(key, data)
          }
        } catch (error) {
          console.error(`预热缓存失败: ${key}`, error)
        }
      }
    })

    await Promise.all(promises)
    console.log('✅ 缓存预热完成')
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): string {
    const stats = this.statistics
    const avgResponseTime = stats.performanceMetrics.queryCount > 0
      ? stats.performanceMetrics.totalResponseTime / stats.performanceMetrics.queryCount
      : 0

    return `
📊 缓存性能报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 缓存效率
  命中率: ${(stats.hitRate * 100).toFixed(1)}% (${stats.cacheHits}/${stats.totalRequests})
  平均响应时间: ${avgResponseTime.toFixed(1)}ms

⚡ 性能分布
  快速查询 (<100ms): ${stats.performanceMetrics.fastQueries}
  中等查询 (100-500ms): ${stats.performanceMetrics.mediumQueries}
  慢速查询 (>500ms): ${stats.performanceMetrics.slowQueries}

💾 内存使用
  当前大小: ${this.formatBytes(stats.cacheSize)}
  峰值使用: ${this.formatBytes(stats.memoryMetrics.peakMemoryUsage)}
  平均条目大小: ${this.formatBytes(stats.memoryMetrics.averageItemSize)}
  驱逐次数: ${stats.memoryMetrics.evictionCount}

🔧 操作统计
  获取: ${stats.operationCounts.get}
  设置: ${stats.operationCounts.set}
  删除: ${stats.operationCounts.delete}
  清理: ${stats.operationCounts.cleanup}

❌ 错误统计
  存储错误: ${stats.errorCounts.storageError}
  压缩错误: ${stats.errorCounts.compressionError}
  解析错误: ${stats.errorCounts.parseError}
  网络错误: ${stats.errorCounts.networkError}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim()
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    this.stopAutoCleanup()
    this.saveToStorage()
    this.memoryCache.clear()
    console.log('💥 缓存管理器已销毁')
  }

  /**
   * 记录错误
   */
  recordError(errorType: keyof CacheStatistics['errorCounts']): void {
    this.statistics.errorCounts[errorType]++
  }

  // ========== 私有方法 ==========

  /**
   * LRU淘汰策略
   */
  protected async evictLRU(): Promise<void> {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      console.log(`♻️ LRU淘汰: ${oldestKey}`)
      this.delete(oldestKey)
      this.statistics.memoryMetrics.evictionCount++
    }
  }

  /**
   * 计算数据大小
   */
  protected calculateSize(data: any): number {
    try {
      const str = JSON.stringify(data)
      return new Blob([str]).size
    } catch {
      return 0
    }
  }

  /**
   * 格式化字节大小
   */
  protected formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  /**
   * 更新命中率
   */
  protected updateHitRate(): void {
    if (this.statistics.totalRequests > 0) {
      this.statistics.hitRate = this.statistics.cacheHits / this.statistics.totalRequests
    }
  }

  /**
   * 更新响应时间
   */
  protected updateResponseTime(time: number): void {
    const current = this.statistics.averageResponseTime
    const total = this.statistics.totalRequests
    this.statistics.averageResponseTime = (current * (total - 1) + time) / total
  }

  /**
   * 更新缓存大小统计
   */
  protected updateCacheSize(): void {
    let totalSize = 0
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size
    }
    this.statistics.cacheSize = totalSize
    this.statistics.itemCount = this.memoryCache.size
  }

  /**
   * 从localStorage加载缓存
   */
  protected loadFromStorage(): void {
    if (typeof window === 'undefined') return

    try {
      // 加载缓存数据
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        const now = Date.now()

        // 只加载未过期的条目
        Object.entries(data).forEach(([key, entry]: [string, any]) => {
          if (entry.expiry > now) {
            this.memoryCache.set(key, entry)
          }
        })

        console.log(`📂 从localStorage恢复了 ${this.memoryCache.size} 个缓存条目`)
      }

      // 加载统计信息
      const stats = localStorage.getItem(this.statsKey)
      if (stats) {
        this.statistics = { ...this.statistics, ...JSON.parse(stats) }
      }
    } catch (error) {
      console.error('加载缓存失败:', error)
      this.recordError('storageError')
    }

    this.updateCacheSize()
  }

  /**
   * 保存缓存到localStorage
   */
  protected saveToStorage(): void {
    if (typeof window === 'undefined') return

    try {
      // 转换Map为对象
      const data: Record<string, CacheEntry<T>> = {}
      for (const [key, entry] of this.memoryCache.entries()) {
        data[key] = entry
      }

      // 保存缓存数据
      if (this.config.compressionEnabled) {
        // 简单的压缩：只保存必要字段
        const compressed = Object.entries(data).reduce((acc, [key, entry]) => {
          acc[key] = {
            data: entry.data,
            expiry: entry.expiry,
            accessCount: entry.accessCount,
            timestamp: entry.timestamp,
            lastAccessed: entry.lastAccessed,
            size: entry.size
          }
          return acc
        }, {} as any)
        localStorage.setItem(this.storageKey, JSON.stringify(compressed))
      } else {
        localStorage.setItem(this.storageKey, JSON.stringify(data))
      }

      // 保存统计信息
      localStorage.setItem(this.statsKey, JSON.stringify(this.statistics))
    } catch (error) {
      console.error('保存缓存失败:', error)
      this.recordError('storageError')

      // 如果是配额超出错误，清理一些旧数据
      if (error instanceof DOMException && error.code === 22) {
        console.log('localStorage配额已满，清理旧数据...')
        this.cleanup()
      }
    }
  }

  /**
   * 从localStorage加载单个条目
   */
  protected loadEntryFromStorage(key: string): CacheEntry<T> | null {
    if (typeof window === 'undefined') return null

    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        return data[key] || null
      }
    } catch (error) {
      console.error(`加载缓存条目失败: ${key}`, error)
      this.recordError('parseError')
    }

    return null
  }

  /**
   * 保存单个条目到localStorage
   */
  protected saveEntryToStorage(key: string, entry: CacheEntry<T>): void {
    if (typeof window === 'undefined') return

    // 批量保存，避免频繁写入
    if (!this.saveTimer) {
      this.saveTimer = setTimeout(() => {
        this.saveToStorage()
        this.saveTimer = null
      }, 1000)
    }
  }

  /**
   * 从localStorage删除条目
   */
  protected deleteFromStorage(key: string): void {
    this.saveToStorage() // 触发完整保存
  }

  /**
   * 启动自动清理
   */
  protected startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)

    console.log(`⏰ 自动清理已启动，间隔: ${this.config.cleanupInterval / 1000 / 60} 分钟`)
  }

  /**
   * 停止自动清理
   */
  protected stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
      console.log('⏰ 自动清理已停止')
    }
  }

  /**
   * 记录性能指标
   */
  protected recordPerformanceMetric(responseTime: number): void {
    this.statistics.performanceMetrics.queryCount++
    this.statistics.performanceMetrics.totalResponseTime += responseTime

    if (responseTime < 100) {
      this.statistics.performanceMetrics.fastQueries++
    } else if (responseTime < 500) {
      this.statistics.performanceMetrics.mediumQueries++
    } else {
      this.statistics.performanceMetrics.slowQueries++
    }
  }

  /**
   * 更新内存指标
   */
  protected updateMemoryMetrics(itemSize: number): void {
    // 更新峰值内存使用
    if (this.statistics.cacheSize > this.statistics.memoryMetrics.peakMemoryUsage) {
      this.statistics.memoryMetrics.peakMemoryUsage = this.statistics.cacheSize
    }

    // 更新平均条目大小
    const totalItems = this.statistics.itemCount
    if (totalItems > 0) {
      this.statistics.memoryMetrics.averageItemSize = this.statistics.cacheSize / totalItems
    }
  }
}