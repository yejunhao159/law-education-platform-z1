/**
 * 内存缓存服务实现
 * 迁移自 lib/services/cache/memory-cache.service.ts
 * 基于LRU算法的内存缓存服务
 */

import {
  ICacheService,
  CacheEntry,
  CacheOptions,
  CacheStats,
  CacheConfig,
  CacheEvents
} from './interfaces'

/**
 * LRU节点
 */
interface LRUNode<T = any> {
  key: string
  entry: CacheEntry<T>
  prev: LRUNode<T> | null
  next: LRUNode<T> | null
}

/**
 * 内存缓存服务
 * 实现LRU（最近最少使用）淘汰策略
 */
export class MemoryCacheService<T = any> implements ICacheService<T> {
  private cache: Map<string, LRUNode<T>>
  private head: LRUNode<T> | null = null
  private tail: LRUNode<T> | null = null
  private maxEntries: number
  private defaultTTL: number
  private cleanupTimer?: NodeJS.Timeout
  private similarityCache: Map<string, { result: CacheEntry<T>[]; timestamp: number }>

  // 统计数据
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
    accessTimes: [] as number[]
  }

  constructor(
    private config: CacheConfig = {},
    private events: CacheEvents = {}
  ) {
    this.cache = new Map()
    this.similarityCache = new Map()
    this.maxEntries = config.maxEntries ?? 100
    this.defaultTTL = config.defaultTTL ?? 3600000 // 1小时

    // 启动清理定时器
    if (!config.skipInitialCleanup) {
      this.startCleanup()
    }

    console.log(`🧠 内存缓存服务已启动，最大条目数: ${this.maxEntries}`)
  }

  /**
   * 获取缓存项
   */
  async get(key: string): Promise<CacheEntry<T> | null> {
    const startTime = Date.now()

    try {
      const node = this.cache.get(key)

      if (!node) {
        this.metrics.misses++
        this.events.onMiss?.(key)
        this.recordAccessTime(Date.now() - startTime)
        return null
      }

      // 检查是否过期
      if (this.isExpired(node.entry)) {
        this.removeNode(node)
        this.cache.delete(key)
        this.metrics.misses++
        this.events.onMiss?.(key)
        this.recordAccessTime(Date.now() - startTime)
        return null
      }

      // 移动到头部（最近使用）
      this.moveToHead(node)

      // 更新访问信息
      node.entry.lastAccessed = Date.now()
      node.entry.accessCount++

      this.metrics.hits++
      this.events.onHit?.(key, node.entry)
      this.recordAccessTime(Date.now() - startTime)

      return { ...node.entry }
    } catch (error) {
      console.error(`内存缓存获取失败: ${key}`, error)
      this.recordAccessTime(Date.now() - startTime)
      return null
    }
  }

  /**
   * 设置缓存项
   */
  async set(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const now = Date.now()
      const ttl = options.ttl ?? this.defaultTTL
      const expiresAt = now + ttl

      const entry: CacheEntry<T> = {
        key,
        value,
        createdAt: now,
        lastAccessed: now,
        accessCount: 0,
        expiresAt,
        tags: options.tags,
        metadata: options.metadata
      }

      // 如果键已存在，更新现有节点
      if (this.cache.has(key)) {
        const node = this.cache.get(key)!
        node.entry = entry
        this.moveToHead(node)
      } else {
        // 创建新节点
        const newNode: LRUNode<T> = {
          key,
          entry,
          prev: null,
          next: null
        }

        // 检查容量限制
        while (this.cache.size >= this.maxEntries) {
          this.evictLRU()
        }

        this.cache.set(key, newNode)
        this.addToHead(newNode)
      }

      this.metrics.sets++
      this.events.onSet?.(key, entry)

      console.log(`💾 内存缓存设置: ${key} (TTL: ${ttl}ms)`)
    } catch (error) {
      console.error(`内存缓存设置失败: ${key}`, error)
      throw error
    }
  }

  /**
   * 查找相似的缓存项
   */
  async findSimilar(query: string, threshold: number = 0.8): Promise<CacheEntry<T>[]> {
    const cacheKey = `similarity:${query}:${threshold}`

    // 检查相似度缓存
    const cached = this.similarityCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < 60000) { // 1分钟有效期
      return cached.result
    }

    const results: CacheEntry<T>[] = []

    for (const node of this.cache.values()) {
      if (this.isExpired(node.entry)) continue

      // 简单的相似度计算（可以替换为更复杂的算法）
      const similarity = this.calculateSimilarity(query, node.key)
      if (similarity >= threshold) {
        const entry = { ...node.entry, similarity }
        results.push(entry)
      }
    }

    // 按相似度降序排序
    results.sort((a, b) => (b.similarity || 0) - (a.similarity || 0))

    // 缓存结果
    this.similarityCache.set(cacheKey, {
      result: results,
      timestamp: Date.now()
    })

    return results
  }

  /**
   * 失效匹配模式的缓存
   */
  async invalidate(pattern: string): Promise<number> {
    const regex = new RegExp(pattern)
    let count = 0

    for (const [key, node] of this.cache.entries()) {
      if (regex.test(key)) {
        this.removeNode(node)
        this.cache.delete(key)
        count++
        this.events.onEvict?.(key, 'manual')
      }
    }

    console.log(`🗑️ 内存缓存失效: ${count} 个条目匹配模式 "${pattern}"`)
    return count
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    this.cache.clear()
    this.similarityCache.clear()
    this.head = null
    this.tail = null
    this.events.onClear?.()
    console.log('🧹 内存缓存已清空')
  }

  /**
   * 获取缓存大小
   */
  async size(): Promise<number> {
    return this.cache.size
  }

  /**
   * 获取缓存统计信息
   */
  async stats(): Promise<CacheStats> {
    const total = this.metrics.hits + this.metrics.misses
    const hitRate = total > 0 ? this.metrics.hits / total : 0
    const avgAccessTime = this.metrics.accessTimes.length > 0
      ? this.metrics.accessTimes.reduce((a, b) => a + b) / this.metrics.accessTimes.length
      : 0

    // 计算热门键
    const keyAccessCounts = new Map<string, number>()
    for (const node of this.cache.values()) {
      keyAccessCounts.set(node.key, node.entry.accessCount)
    }

    const hottestKeys = Array.from(keyAccessCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key, count]) => ({ key, count }))

    return {
      totalEntries: this.cache.size,
      totalHits: this.metrics.hits,
      totalMisses: this.metrics.misses,
      hitRate,
      avgAccessTime,
      memoryUsage: this.estimateMemoryUsage(),
      hottestKeys,
      recentKeys: this.getRecentKeys()
    }
  }

  /**
   * 检查键是否存在
   */
  async has(key: string): Promise<boolean> {
    const node = this.cache.get(key)
    if (!node) return false

    if (this.isExpired(node.entry)) {
      this.removeNode(node)
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * 获取所有键
   */
  async keys(pattern?: string): Promise<string[]> {
    const keys = Array.from(this.cache.keys())

    if (pattern) {
      const regex = new RegExp(pattern)
      return keys.filter(key => regex.test(key))
    }

    return keys
  }

  /**
   * 更新访问时间
   */
  async touch(key: string): Promise<boolean> {
    const node = this.cache.get(key)
    if (!node || this.isExpired(node.entry)) {
      return false
    }

    node.entry.lastAccessed = Date.now()
    this.moveToHead(node)
    return true
  }

  /**
   * 销毁缓存服务
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.clear()
    console.log('💥 内存缓存服务已销毁')
  }

  // ========== 私有方法 ==========

  /**
   * 检查条目是否过期
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return entry.expiresAt ? Date.now() > entry.expiresAt : false
  }

  /**
   * 添加节点到头部
   */
  private addToHead(node: LRUNode<T>): void {
    node.prev = null
    node.next = this.head

    if (this.head) {
      this.head.prev = node
    }
    this.head = node

    if (!this.tail) {
      this.tail = node
    }
  }

  /**
   * 移除节点
   */
  private removeNode(node: LRUNode<T>): void {
    if (node.prev) {
      node.prev.next = node.next
    } else {
      this.head = node.next
    }

    if (node.next) {
      node.next.prev = node.prev
    } else {
      this.tail = node.prev
    }
  }

  /**
   * 移动节点到头部
   */
  private moveToHead(node: LRUNode<T>): void {
    this.removeNode(node)
    this.addToHead(node)
  }

  /**
   * 淘汰LRU节点
   */
  private evictLRU(): void {
    if (this.tail) {
      const key = this.tail.key
      this.removeNode(this.tail)
      this.cache.delete(key)
      this.metrics.evictions++
      this.events.onEvict?.(key, 'lru')
      console.log(`♻️ LRU淘汰: ${key}`)
    }
  }

  /**
   * 计算相似度
   */
  private calculateSimilarity(query: string, target: string): number {
    // Jaccard相似度的简单实现
    const queryTokens = new Set(query.toLowerCase().split(/\s+/))
    const targetTokens = new Set(target.toLowerCase().split(/\s+/))

    const intersection = new Set([...queryTokens].filter(x => targetTokens.has(x)))
    const union = new Set([...queryTokens, ...targetTokens])

    return union.size > 0 ? intersection.size / union.size : 0
  }

  /**
   * 记录访问时间
   */
  private recordAccessTime(time: number): void {
    this.metrics.accessTimes.push(time)
    // 只保留最近1000次访问的时间
    if (this.metrics.accessTimes.length > 1000) {
      this.metrics.accessTimes = this.metrics.accessTimes.slice(-1000)
    }
  }

  /**
   * 估算内存使用量
   */
  private estimateMemoryUsage(): number {
    let size = 0
    for (const node of this.cache.values()) {
      // 简单估算：key + value JSON化的大小
      const keySize = node.key.length * 2 // UTF-16
      const valueSize = JSON.stringify(node.entry.value).length * 2
      size += keySize + valueSize + 100 // 加上元数据开销
    }
    return size
  }

  /**
   * 获取最近访问的键
   */
  private getRecentKeys(): string[] {
    const entries = Array.from(this.cache.values())
      .sort((a, b) => b.entry.lastAccessed - a.entry.lastAccessed)
      .slice(0, 10)
      .map(node => node.key)

    return entries
  }

  /**
   * 启动清理定时器
   */
  private startCleanup(): void {
    const interval = this.config.cleanupInterval ?? 300000 // 5分钟
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired()
    }, interval)
  }

  /**
   * 清理过期条目
   */
  private cleanupExpired(): void {
    let cleaned = 0
    const now = Date.now()

    for (const [key, node] of this.cache.entries()) {
      if (this.isExpired(node.entry)) {
        this.removeNode(node)
        this.cache.delete(key)
        cleaned++
        this.events.onEvict?.(key, 'expired')
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 内存缓存清理: 删除了 ${cleaned} 个过期条目`)
    }
  }
}