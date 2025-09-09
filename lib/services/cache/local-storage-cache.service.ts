/**
 * localStorage缓存服务实现
 * @module services/cache/local-storage-cache.service
 * @description 基于localStorage的L2级持久化缓存服务
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

const logger = createLogger('local-storage-cache')

/**
 * localStorage缓存服务
 * 提供持久化的L2级缓存，支持压缩和容量管理
 */
export class LocalStorageCacheService implements ICacheService {
  private readonly keyPrefix = 'socratic-cache:'
  private readonly metaKey = 'socratic-cache:meta'
  private maxEntries: number
  private defaultTTL: number
  private enableCompression: boolean
  private cleanupTimer?: NodeJS.Timeout
  private _isAvailable?: boolean
  
  // 统计数据
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
    errors: 0,
    accessTimes: [] as number[]
  }
  
  constructor(
    private config: CacheConfig = {},
    private events: CacheEvents = {}
  ) {
    this.maxEntries = config.maxEntries ?? 50 // localStorage限制更小
    this.defaultTTL = config.defaultTTL ?? 7200000 // 2小时
    this.enableCompression = config.enableCompression ?? true
    
    // 检查localStorage可用性
    if (!this.isAvailable) {
      logger.warn('localStorage not available, cache will be disabled')
      return
    }
    
    // 启动时清理过期项（仅在非测试环境）
    if (!config.skipInitialCleanup) {
      this.initializeCache()
    }
    
    // 启动清理定时器
    if (config.cleanupInterval) {
      this.startCleanupTimer(config.cleanupInterval)
    }
    
    logger.info('LocalStorageCacheService initialized', {
      extra: { 
        maxEntries: this.maxEntries, 
        compression: this.enableCompression,
        available: this.isAvailable
      }
    })
  }
  
  async get(key: string): Promise<CacheEntry | null> {
    if (!this.isAvailable) return null
    
    const start = Date.now()
    
    try {
      const storageKey = this.getStorageKey(key)
      const data = localStorage.getItem(storageKey)
      
      if (!data) {
        this.metrics.misses++
        this.events.onMiss?.(key)
        logger.debug(`Cache miss: ${key}`)
        return null
      }
      
      // 反序列化数据
      const entry = this.deserializeEntry(data)
      if (!entry) {
        // 数据损坏，清理
        localStorage.removeItem(storageKey)
        this.metrics.misses++
        this.events.onMiss?.(key)
        return null
      }
      
      // 检查过期
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        localStorage.removeItem(storageKey)
        this.updateMetadata({ action: 'remove', key })
        this.events.onEvict?.(key, 'expired')
        this.metrics.misses++
        logger.debug(`Cache expired: ${key}`)
        return null
      }
      
      // 更新访问信息
      entry.lastAccessed = Date.now()
      entry.accessCount++
      
      // 保存更新后的数据
      this.saveEntry(storageKey, entry)
      
      this.metrics.hits++
      this.metrics.accessTimes.push(Date.now() - start)
      this.events.onHit?.(key, entry)
      
      logger.debug(`Cache hit: ${key}`)
      return entry
      
    } catch (error) {
      this.metrics.errors++
      this.metrics.misses++
      logger.error(`Error getting cache entry: ${key}`, { extra: { error } })
      return null
    }
  }
  
  async set(key: string, value: AgentResponse, options?: CacheOptions): Promise<void> {
    if (!this.isAvailable) return
    
    try {
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
      
      const storageKey = this.getStorageKey(key)
      
      // 检查是否是更新现有key
      const isUpdate = await this.has(key)
      
      // 尝试保存，如果空间不足则清理并重试
      if (!this.saveEntry(storageKey, entry)) {
        await this.freeUpSpace()
        this.saveEntry(storageKey, entry) // 重试一次
      }
      
      // 只有新增时才更新元数据和检查容量
      if (!isUpdate) {
        this.updateMetadata({ action: 'add', key })
        // 检查容量限制
        await this.enforceCapacityLimit()
      }
      
      this.metrics.sets++
      this.events.onSet?.(key, entry)
      logger.debug(`Cache set: ${key}`)
      
    } catch (error) {
      this.metrics.errors++
      logger.error(`Error setting cache entry: ${key}`, { extra: { error } })
    }
  }
  
  async findSimilar(query: string, threshold: number = 0.85): Promise<CacheEntry[]> {
    if (!this.isAvailable) return []
    
    const timer = logger.startTimer('findSimilar')
    const results: CacheEntry[] = []
    
    try {
      const keys = await this.keys()
      
      for (const key of keys) {
        const entry = await this.get(key)
        if (!entry) continue
        
        const similarity = this.calculateSimilarity(query, key, entry.value.content)
        
        if (similarity >= threshold) {
          results.push({
            ...entry,
            similarity
          })
        }
      }
      
      // 按相似度排序
      results.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
      
      timer.end(`Found ${results.length} similar entries`)
      return results
      
    } catch (error) {
      logger.error('Error finding similar entries', { extra: { error } })
      return []
    }
  }
  
  async invalidate(pattern: string): Promise<number> {
    if (!this.isAvailable) return 0
    
    try {
      const regex = new RegExp(pattern)
      const keys = await this.keys()
      let count = 0
      
      for (const key of keys) {
        if (regex.test(key)) {
          const storageKey = this.getStorageKey(key)
          localStorage.removeItem(storageKey)
          this.updateMetadata({ action: 'remove', key })
          this.events.onEvict?.(key, 'manual')
          count++
        }
      }
      
      logger.info(`Invalidated ${count} entries with pattern: ${pattern}`)
      return count
      
    } catch (error) {
      logger.error('Error invalidating entries', { extra: { error } })
      return 0
    }
  }
  
  async clear(): Promise<void> {
    if (!this.isAvailable) return
    
    try {
      const keys = await this.keys()
      
      for (const key of keys) {
        const storageKey = this.getStorageKey(key)
        localStorage.removeItem(storageKey)
      }
      
      // 清理元数据
      localStorage.removeItem(this.metaKey)
      
      this.events.onClear?.()
      logger.info('Cache cleared')
      
    } catch (error) {
      logger.error('Error clearing cache', { extra: { error } })
    }
  }
  
  async size(): Promise<number> {
    if (!this.isAvailable) return 0
    
    try {
      return (await this.keys()).length
    } catch (error) {
      logger.error('Error getting cache size', { extra: { error } })
      return 0
    }
  }
  
  async stats(): Promise<CacheStats> {
    const totalAccess = this.metrics.hits + this.metrics.misses
    const hitRate = totalAccess > 0 ? this.metrics.hits / totalAccess : 0
    
    // 计算存储使用量
    const storageUsage = this.calculateStorageUsage()
    
    // 平均访问时间
    const avgAccessTime = this.metrics.accessTimes.length > 0
      ? this.metrics.accessTimes.reduce((a, b) => a + b, 0) / this.metrics.accessTimes.length
      : undefined
    
    return {
      totalEntries: await this.size(),
      totalHits: this.metrics.hits,
      totalMisses: this.metrics.misses,
      hitRate,
      avgAccessTime,
      memoryUsage: storageUsage,
      hottestKeys: await this.getHottestKeys(),
      recentKeys: await this.getRecentKeys()
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
    if (!this.isAvailable) return false
    
    try {
      const storageKey = this.getStorageKey(key)
      const data = localStorage.getItem(storageKey)
      
      if (!data) return false
      
      const entry = this.deserializeEntry(data)
      if (!entry) return false
      
      // 检查过期
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        localStorage.removeItem(storageKey)
        this.updateMetadata({ action: 'remove', key })
        return false
      }
      
      return true
      
    } catch (error) {
      return false
    }
  }
  
  async keys(pattern?: string): Promise<string[]> {
    if (!this.isAvailable) return []
    
    try {
      const keys: string[] = []
      const regex = pattern ? new RegExp(pattern) : null
      
      // 收集所有localStorage中的键
      const allStorageKeys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i)
        if (storageKey) {
          allStorageKeys.push(storageKey)
        }
      }
      
      // 筛选缓存相关的键
      for (const storageKey of allStorageKeys) {
        if (!storageKey.startsWith(this.keyPrefix)) continue
        if (storageKey === this.metaKey) continue
        
        const key = this.extractKey(storageKey)
        
        // 简单检查entry是否存在和有效
        const data = localStorage.getItem(storageKey)
        if (!data) continue
        
        const entry = this.deserializeEntry(data)
        if (!entry) continue
        
        // 检查过期但不删除（避免在遍历中修改）
        if (entry.expiresAt && entry.expiresAt < Date.now()) continue
        
        if (!regex || regex.test(key)) {
          keys.push(key)
        }
      }
      
      return keys
      
    } catch (error) {
      logger.error('Error getting keys', { extra: { error } })
      return []
    }
  }
  
  async touch(key: string): Promise<boolean> {
    const entry = await this.get(key)
    if (!entry) return false
    
    // get操作已经更新了访问时间
    return true
  }
  
  async export(): Promise<string> {
    try {
      const entries: CacheEntry[] = []
      const keys = await this.keys()
      let totalSize = 0
      
      for (const key of keys) {
        const entry = await this.get(key)
        if (entry) {
          entries.push(entry)
          totalSize += JSON.stringify(entry).length
        }
      }
      
      return JSON.stringify({
        version: '1.0.0',
        exportedAt: Date.now(),
        totalSize,
        entries
      }, null, 2)
      
    } catch (error) {
      logger.error('Error exporting cache', { extra: { error } })
      throw error
    }
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
        
        const storageKey = this.getStorageKey(entry.key)
        this.saveEntry(storageKey, entry)
        this.updateMetadata({ action: 'add', key: entry.key })
      }
      
      logger.info(`Imported ${parsed.entries.length} cache entries`)
      
    } catch (error) {
      logger.error('Failed to import cache data', { extra: { error } })
      throw error
    }
  }
  
  /**
   * 清理过期项
   */
  async cleanup(): Promise<number> {
    if (!this.isAvailable) return 0
    
    try {
      const keys = await this.keys()
      let cleaned = 0
      const now = Date.now()
      
      for (const key of keys) {
        const storageKey = this.getStorageKey(key)
        const data = localStorage.getItem(storageKey)
        
        if (!data) continue
        
        const entry = this.deserializeEntry(data)
        if (!entry) {
          localStorage.removeItem(storageKey)
          this.updateMetadata({ action: 'remove', key })
          cleaned++
          continue
        }
        
        if (entry.expiresAt && entry.expiresAt < now) {
          localStorage.removeItem(storageKey)
          this.updateMetadata({ action: 'remove', key })
          this.events.onEvict?.(key, 'expired')
          cleaned++
        }
      }
      
      if (cleaned > 0) {
        logger.info(`Cleaned up ${cleaned} expired entries`)
      }
      
      return cleaned
      
    } catch (error) {
      logger.error('Error during cleanup', { extra: { error } })
      return 0
    }
  }
  
  /**
   * 销毁服务
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    // 重置可用性缓存，便于测试
    this._isAvailable = undefined
    logger.info('LocalStorageCacheService destroyed')
  }
  
  // === 私有方法 ===
  
  /**
   * 检查localStorage可用性
   */
  private get isAvailable(): boolean {
    if (this._isAvailable !== undefined) {
      return this._isAvailable
    }
    
    try {
      const test = 'test-storage-check'
      localStorage.setItem(test, 'test')
      localStorage.removeItem(test)
      this._isAvailable = true
      return true
    } catch (error) {
      this._isAvailable = false
      return false
    }
  }
  
  /**
   * 获取存储键
   */
  private getStorageKey(key: string): string {
    return `${this.keyPrefix}${key}`
  }
  
  /**
   * 从存储键提取原始键
   */
  private extractKey(storageKey: string): string {
    return storageKey.replace(this.keyPrefix, '')
  }
  
  /**
   * 序列化条目
   */
  private serializeEntry(entry: CacheEntry): string {
    const data = JSON.stringify(entry)
    
    if (this.enableCompression && data.length > 1000) {
      // 简单的压缩：移除多余空格
      return data.replace(/\\s+/g, ' ')
    }
    
    return data
  }
  
  /**
   * 反序列化条目
   */
  private deserializeEntry(data: string): CacheEntry | null {
    try {
      return JSON.parse(data) as CacheEntry
    } catch (error) {
      logger.warn('Failed to deserialize cache entry', { extra: { error } })
      return null
    }
  }
  
  /**
   * 保存条目到localStorage
   */
  private saveEntry(storageKey: string, entry: CacheEntry): boolean {
    try {
      const serialized = this.serializeEntry(entry)
      localStorage.setItem(storageKey, serialized)
      return true
    } catch (error) {
      if (error instanceof Error && 
          (error.name === 'QuotaExceededError' || error.message.includes('QuotaExceededError'))) {
        logger.warn('localStorage quota exceeded')
        return false
      }
      logger.error('Error saving entry to localStorage', { extra: { error } })
      return false // 对于其他错误也返回false，避免抛出异常
    }
  }
  
  /**
   * 初始化缓存
   */
  private async initializeCache(): Promise<void> {
    try {
      // 清理过期项
      await this.cleanup()
      
      // 执行容量限制
      await this.enforceCapacityLimit()
      
      logger.info('Cache initialized')
    } catch (error) {
      logger.error('Failed to initialize cache', { extra: { error } })
    }
  }
  
  /**
   * 释放存储空间
   */
  private async freeUpSpace(): Promise<void> {
    try {
      // 1. 清理过期项
      await this.cleanup()
      
      // 2. 如果还不够，执行LRU淘汰
      const keys = await this.keys()
      if (keys.length >= this.maxEntries) {
        await this.evictLRU(keys.length - this.maxEntries + 1)
      }
      
      logger.info('Storage space freed up')
    } catch (error) {
      logger.error('Failed to free up space', { extra: { error } })
    }
  }
  
  /**
   * 执行容量限制
   */
  private async enforceCapacityLimit(): Promise<void> {
    try {
      const keys = await this.keys()
      
      if (keys.length > this.maxEntries) {
        const toEvict = keys.length - this.maxEntries
        await this.evictLRU(toEvict)
      }
    } catch (error) {
      logger.error('Failed to enforce capacity limit', { extra: { error } })
    }
  }
  
  /**
   * LRU淘汰
   */
  private async evictLRU(count: number): Promise<void> {
    try {
      const keys = await this.keys()
      const entries: Array<{ key: string; lastAccessed: number }> = []
      
      // 收集访问时间信息
      for (const key of keys) {
        const storageKey = this.getStorageKey(key)
        const data = localStorage.getItem(storageKey)
        
        if (data) {
          const entry = this.deserializeEntry(data)
          if (entry) {
            entries.push({
              key,
              lastAccessed: entry.lastAccessed
            })
          }
        }
      }
      
      // 按最后访问时间排序，删除最久未使用的
      entries.sort((a, b) => a.lastAccessed - b.lastAccessed)
      
      for (let i = 0; i < Math.min(count, entries.length); i++) {
        const key = entries[i].key
        const storageKey = this.getStorageKey(key)
        
        localStorage.removeItem(storageKey)
        this.updateMetadata({ action: 'remove', key })
        this.events.onEvict?.(key, 'lru')
        this.metrics.evictions++
        
        logger.debug(`Evicted LRU item: ${key}`)
      }
      
    } catch (error) {
      logger.error('Failed to evict LRU items', { extra: { error } })
    }
  }
  
  /**
   * 更新元数据
   */
  private updateMetadata(operation: { action: 'add' | 'remove'; key: string }): void {
    try {
      const meta = this.getMetadata()
      
      if (operation.action === 'add') {
        meta.keys.add(operation.key)
      } else {
        meta.keys.delete(operation.key)
      }
      
      meta.lastUpdated = Date.now()
      
      localStorage.setItem(this.metaKey, JSON.stringify({
        keys: Array.from(meta.keys),
        lastUpdated: meta.lastUpdated
      }))
      
    } catch (error) {
      // 元数据更新失败不影响主要功能
      logger.warn('Failed to update metadata', { extra: { error } })
    }
  }
  
  /**
   * 获取元数据
   */
  private getMetadata(): { keys: Set<string>; lastUpdated: number } {
    try {
      const data = localStorage.getItem(this.metaKey)
      
      if (data) {
        const parsed = JSON.parse(data)
        return {
          keys: new Set(parsed.keys || []),
          lastUpdated: parsed.lastUpdated || 0
        }
      }
    } catch (error) {
      // 忽略错误
    }
    
    return {
      keys: new Set(),
      lastUpdated: 0
    }
  }
  
  /**
   * 计算相似度
   */
  private calculateSimilarity(str1: string, str2: string, str3?: string): number {
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
   * 计算存储使用量
   */
  private calculateStorageUsage(): number {
    if (!this.isAvailable) return 0
    
    let totalSize = 0
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.keyPrefix)) {
        const value = localStorage.getItem(key)
        if (value) {
          totalSize += key.length + value.length
        }
      }
    }
    
    return totalSize * 2 // UTF-16编码，每个字符2字节
  }
  
  /**
   * 获取最热门的键
   */
  private async getHottestKeys(): Promise<Array<{ key: string; count: number }>> {
    try {
      const keys = await this.keys()
      const hotKeys: Array<{ key: string; count: number }> = []
      
      for (const key of keys) {
        const storageKey = this.getStorageKey(key)
        const data = localStorage.getItem(storageKey)
        
        if (data) {
          const entry = this.deserializeEntry(data)
          if (entry) {
            hotKeys.push({
              key,
              count: entry.accessCount
            })
          }
        }
      }
      
      return hotKeys
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        
    } catch (error) {
      return []
    }
  }
  
  /**
   * 获取最近访问的键
   */
  private async getRecentKeys(): Promise<string[]> {
    try {
      const keys = await this.keys()
      const recentKeys: Array<{ key: string; lastAccessed: number }> = []
      
      for (const key of keys) {
        const storageKey = this.getStorageKey(key)
        const data = localStorage.getItem(storageKey)
        
        if (data) {
          const entry = this.deserializeEntry(data)
          if (entry) {
            recentKeys.push({
              key,
              lastAccessed: entry.lastAccessed
            })
          }
        }
      }
      
      return recentKeys
        .sort((a, b) => b.lastAccessed - a.lastAccessed)
        .slice(0, 10)
        .map(item => item.key)
        
    } catch (error) {
      return []
    }
  }
  
  /**
   * 启动清理定时器
   */
  private startCleanupTimer(interval: number): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, interval)
  }
}