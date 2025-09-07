import type { ClaimAnalysisResult, TimelineEvent } from '@/types/timeline-claim-analysis'

interface CacheEntry {
  result: ClaimAnalysisResult
  timestamp: number
  key: string
}

class ClaimAnalysisCache {
  private cache: Map<string, CacheEntry>
  private maxAge: number // 缓存过期时间（毫秒）
  private maxSize: number // 最大缓存条目数

  constructor(maxAge = 30 * 60 * 1000, maxSize = 50) { // 默认30分钟过期，最多50条
    this.cache = new Map()
    this.maxAge = maxAge
    this.maxSize = maxSize
  }

  /**
   * 生成缓存键
   */
  private generateKey(events: TimelineEvent[], caseType?: string): string {
    const eventIds = events.map(e => e.id).sort().join('-')
    const typeKey = caseType || 'default'
    return `${typeKey}:${eventIds}:${events.length}`
  }

  /**
   * 获取缓存的分析结果
   */
  get(events: TimelineEvent[], caseType?: string): ClaimAnalysisResult | null {
    const key = this.generateKey(events, caseType)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // 检查是否过期
    const now = Date.now()
    if (now - entry.timestamp > this.maxAge) {
      this.cache.delete(key)
      return null
    }

    // 更新访问时间（LRU）
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.result
  }

  /**
   * 存储分析结果
   */
  set(events: TimelineEvent[], result: ClaimAnalysisResult, caseType?: string): void {
    const key = this.generateKey(events, caseType)

    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      key
    })
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 清除过期缓存
   */
  clearExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number
    maxSize: number
    hitRate: number
    oldestEntry: number | null
  } {
    let oldestTimestamp: number | null = null
    
    for (const entry of this.cache.values()) {
      if (!oldestTimestamp || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.hitCount / Math.max(this.requestCount, 1),
      oldestEntry: oldestTimestamp ? Date.now() - oldestTimestamp : null
    }
  }

  // 统计用
  private hitCount = 0
  private requestCount = 0

  /**
   * 带统计的获取方法
   */
  getWithStats(events: TimelineEvent[], caseType?: string): ClaimAnalysisResult | null {
    this.requestCount++
    const result = this.get(events, caseType)
    if (result) {
      this.hitCount++
    }
    return result
  }
}

// 创建单例实例
export const claimAnalysisCache = new ClaimAnalysisCache()

// 导出缓存hook
export function useClaimAnalysisCache() {
  return {
    get: (events: TimelineEvent[], caseType?: string) => 
      claimAnalysisCache.getWithStats(events, caseType),
    set: (events: TimelineEvent[], result: ClaimAnalysisResult, caseType?: string) =>
      claimAnalysisCache.set(events, result, caseType),
    clear: () => claimAnalysisCache.clear(),
    clearExpired: () => claimAnalysisCache.clearExpired(),
    stats: () => claimAnalysisCache.getStats()
  }
}

// 定期清理过期缓存（仅在客户端运行）
if (typeof window !== 'undefined') {
  setInterval(() => {
    claimAnalysisCache.clearExpired()
  }, 5 * 60 * 1000) // 每5分钟清理一次
}