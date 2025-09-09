/**
 * 内存缓存服务实现
 * @module services/cache/memory-cache.service
 * @description 基于LRU算法的内存缓存服务
 */

import {
  ICacheService,
  CacheEntry,
  CacheOptions,
  CacheStats,
  CacheConfig,
  CacheEvents
} from './cache.interface'
import { AgentResponse } from '@/lib/types/socratic'
import { createLogger } from '@/lib/utils/socratic-logger'

const logger = createLogger('memory-cache')

/**
 * LRU节点
 */
interface LRUNode {
  key: string
  entry: CacheEntry
  prev: LRUNode | null
  next: LRUNode | null
}

/**
 * 内存缓存服务
 * 实现LRU（最近最少使用）淘汰策略
 */
export class MemoryCacheService implements ICacheService {
  private cache: Map<string, LRUNode>
  private head: LRUNode | null = null
  private tail: LRUNode | null = null
  private maxEntries: number
  private defaultTTL: number
  private cleanupTimer?: NodeJS.Timeout
  private similarityCache: Map<string, { result: CacheEntry[]; timestamp: number }>
  
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
    if (config.cleanupInterval) {
      this.startCleanupTimer(config.cleanupInterval)
    }
    
    logger.info('MemoryCacheService initialized', {
      extra: { maxEntries: this.maxEntries, defaultTTL: this.defaultTTL }
    })
  }
  
  async get(key: string): Promise<CacheEntry | null> {
    const start = Date.now()
    const node = this.cache.get(key)
    
    if (!node) {
      this.metrics.misses++
      this.events.onMiss?.(key)
      logger.debug(`Cache miss: ${key}`)
      return null
    }
    
    // 检查过期
    if (node.entry.expiresAt && node.entry.expiresAt < Date.now()) {
      this.removeNode(node)
      this.cache.delete(key)
      this.events.onEvict?.(key, 'expired')
      this.metrics.misses++
      logger.debug(`Cache expired: ${key}`)
      return null
    }
    
    // 更新访问信息
    node.entry.lastAccessed = Date.now()
    node.entry.accessCount++
    
    // 移到头部（最近使用）
    this.moveToHead(node)
    
    this.metrics.hits++
    this.metrics.accessTimes.push(Date.now() - start)
    this.events.onHit?.(key, node.entry)
    
    logger.debug(`Cache hit: ${key}`)
    return node.entry
  }
  
  async set(key: string, value: AgentResponse, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttl ?? this.defaultTTL
    const entry: CacheEntry = {
      key,
      value,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      expiresAt: ttl > 0 ? Date.now() + ttl : undefined,
      tags: options?.tags,
      metadata: options?.metadata
    }
    
    // 如果已存在，更新并移到头部
    if (this.cache.has(key)) {
      const node = this.cache.get(key)!
      node.entry = entry
      this.moveToHead(node)
    } else {
      // 创建新节点
      const node: LRUNode = {
        key,
        entry,
        prev: null,
        next: null
      }
      
      // 添加到头部
      this.addToHead(node)
      this.cache.set(key, node)
      
      // 检查容量
      if (this.cache.size > this.maxEntries) {
        this.evictLRU()
      }
    }
    
    // 清理相似度缓存
    this.similarityCache.clear()
    
    this.metrics.sets++
    this.events.onSet?.(key, entry)
    logger.debug(`Cache set: ${key}`)
  }
  
  async findSimilar(query: string, threshold: number = 0.85): Promise<CacheEntry[]> {
    // 检查相似度缓存
    const cacheKey = `${query}:${threshold}`
    const cached = this.similarityCache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < 60000) { // 1分钟缓存
      logger.debug(`Similarity cache hit: ${cacheKey}`)
      return cached.result
    }
    
    const timer = logger.startTimer('findSimilar')
    const results: CacheEntry[] = []
    
    for (const node of this.cache.values()) {
      const similarity = this.calculateSimilarity(query, node.entry.key, node.entry.value.content)
      
      if (similarity >= threshold) {
        results.push({
          ...node.entry,
          similarity
        })
      }
    }
    
    // 按相似度排序
    results.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
    
    // 缓存结果
    this.similarityCache.set(cacheKey, {
      result: results,
      timestamp: Date.now()
    })
    
    timer.end(`Found ${results.length} similar entries`)
    return results
  }
  
  async invalidate(pattern: string): Promise<number> {
    const regex = new RegExp(pattern)
    let count = 0
    
    for (const [key, node] of this.cache) {
      if (regex.test(key)) {
        this.removeNode(node)
        this.cache.delete(key)
        this.events.onEvict?.(key, 'manual')
        count++
      }
    }
    
    logger.info(`Invalidated ${count} entries with pattern: ${pattern}`)
    return count
  }
  
  async clear(): Promise<void> {
    this.cache.clear()
    this.head = null
    this.tail = null
    this.similarityCache.clear()
    this.events.onClear?.()
    logger.info('Cache cleared')
  }
  
  async size(): Promise<number> {
    return this.cache.size
  }
  
  async stats(): Promise<CacheStats> {
    const totalAccess = this.metrics.hits + this.metrics.misses
    const hitRate = totalAccess > 0 ? this.metrics.hits / totalAccess : 0
    
    // 计算最热门的键
    const accessCounts = new Map<string, number>()
    for (const node of this.cache.values()) {
      accessCounts.set(node.key, node.entry.accessCount)
    }
    
    const hottestKeys = Array.from(accessCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => ({ key, count }))
    
    // 最近访问的键
    const recentKeys = Array.from(this.cache.values())
      .sort((a, b) => b.entry.lastAccessed - a.entry.lastAccessed)
      .slice(0, 10)
      .map(node => node.key)
    
    // 平均访问时间
    const avgAccessTime = this.metrics.accessTimes.length > 0
      ? this.metrics.accessTimes.reduce((a, b) => a + b, 0) / this.metrics.accessTimes.length
      : undefined
    
    return {
      totalEntries: this.cache.size,
      totalHits: this.metrics.hits,
      totalMisses: this.metrics.misses,
      hitRate,
      avgAccessTime,
      memoryUsage: this.estimateMemoryUsage(),
      hottestKeys,
      recentKeys
    }
  }
  
  async mget(keys: string[]): Promise<Map<string, CacheEntry>> {
    const result = new Map<string, CacheEntry>()
    
    for (const key of keys) {
      const entry = await this.get(key)
      if (entry) {
        result.set(key, entry)
      }
    }
    
    return result
  }
  
  async mset(entries: Array<{ key: string; value: AgentResponse }>, options?: CacheOptions): Promise<void> {
    for (const { key, value } of entries) {
      await this.set(key, value, options)
    }
  }
  
  async has(key: string): Promise<boolean> {
    const node = this.cache.get(key)
    if (!node) return false
    
    // 检查过期
    if (node.entry.expiresAt && node.entry.expiresAt < Date.now()) {
      this.removeNode(node)
      this.cache.delete(key)
      return false
    }
    
    return true
  }
  
  async keys(pattern?: string): Promise<string[]> {
    const keys: string[] = []
    const regex = pattern ? new RegExp(pattern) : null
    
    for (const [key, node] of this.cache) {
      // 跳过过期项
      if (node.entry.expiresAt && node.entry.expiresAt < Date.now()) {
        continue
      }
      
      if (!regex || regex.test(key)) {
        keys.push(key)
      }
    }
    
    return keys
  }
  
  async touch(key: string): Promise<boolean> {
    const node = this.cache.get(key)
    if (!node) return false
    
    node.entry.lastAccessed = Date.now()
    this.moveToHead(node)
    return true
  }
  
  async export(): Promise<string> {
    const entries: CacheEntry[] = []
    
    for (const node of this.cache.values()) {
      // 跳过过期项
      if (node.entry.expiresAt && node.entry.expiresAt < Date.now()) {
        continue
      }
      entries.push(node.entry)
    }
    
    return JSON.stringify({
      version: '1.0.0',
      exportedAt: Date.now(),
      entries
    }, null, 2)
  }
  
  async import(data: string): Promise<void> {
    try {
      const parsed = JSON.parse(data)
      
      if (!Array.isArray(parsed.entries)) {
        throw new Error('Invalid import data format')
      }
      
      // 清空现有缓存
      await this.clear()
      
      // 导入条目
      for (const entry of parsed.entries) {
        // 跳过过期项
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          continue
        }
        
        const node: LRUNode = {
          key: entry.key,
          entry,
          prev: null,
          next: null
        }
        
        this.addToHead(node)
        this.cache.set(entry.key, node)
        
        // 限制数量
        if (this.cache.size > this.maxEntries) {
          this.evictLRU()
        }
      }
      
      logger.info(`Imported ${this.cache.size} cache entries`)
    } catch (error) {
      logger.error('Failed to import cache data', { extra: { error } })
      throw error
    }
  }
  
  /**
   * 销毁缓存服务
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.cache.clear()
    this.similarityCache.clear()
    logger.info('MemoryCacheService destroyed')
  }
  
  // === 私有方法 ===
  
  /**
   * 添加节点到头部
   */
  private addToHead(node: LRUNode): void {
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
  private removeNode(node: LRUNode): void {
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
  private moveToHead(node: LRUNode): void {
    if (node === this.head) return
    
    this.removeNode(node)
    this.addToHead(node)
  }
  
  /**
   * 淘汰最久未使用的项
   */
  private evictLRU(): void {
    if (!this.tail) return
    
    const key = this.tail.key
    this.removeNode(this.tail)
    this.cache.delete(key)
    
    this.metrics.evictions++
    this.events.onEvict?.(key, 'lru')
    logger.debug(`Evicted LRU item: ${key}`)
  }
  
  /**
   * 计算相似度
   */
  private calculateSimilarity(str1: string, str2: string, str3?: string): number {
    // 简化的字符级别Jaccard相似度
    const text1 = str1.toLowerCase()
    const text2 = str2.toLowerCase()
    const text3 = str3?.toLowerCase() ?? ''
    
    const chars1 = new Set(Array.from(text1))
    const chars2 = new Set(Array.from(text2))
    const chars3 = new Set(Array.from(text3))
    
    // 计算与键的相似度
    const keySimilarity = this.jaccardSimilarity(chars1, chars2)
    
    // 如果有内容，也计算与内容的相似度
    const contentSimilarity = text3 ? this.jaccardSimilarity(chars1, chars3) : 0
    
    // 返回最大值
    return Math.max(keySimilarity, contentSimilarity)
  }
  
  /**
   * Jaccard相似度计算
   */
  private jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }
  
  /**
   * 估算内存使用量
   */
  private estimateMemoryUsage(): number {
    let bytes = 0
    
    for (const node of this.cache.values()) {
      // 估算字符串大小
      bytes += node.key.length * 2 // UTF-16
      bytes += JSON.stringify(node.entry.value).length * 2
      bytes += 100 // 其他属性的估算
    }
    
    return bytes
  }
  
  /**
   * 启动清理定时器
   */
  private startCleanupTimer(interval: number): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, interval)
  }
  
  /**
   * 清理过期项
   */
  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, node] of this.cache) {
      if (node.entry.expiresAt && node.entry.expiresAt < now) {
        this.removeNode(node)
        this.cache.delete(key)
        this.events.onEvict?.(key, 'expired')
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      logger.debug(`Cleaned ${cleaned} expired entries`)
    }
  }
}