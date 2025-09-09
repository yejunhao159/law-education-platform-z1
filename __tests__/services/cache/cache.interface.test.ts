/**
 * 缓存服务接口测试
 * @module __tests__/services/cache/cache.interface
 */

import { ICacheService, CacheEntry, CacheOptions } from '@/lib/services/cache/cache.interface'
import { AgentResponse } from '@/lib/types/socratic'

// 测试用实现类
class TestCacheService implements ICacheService {
  private cache = new Map<string, CacheEntry>()
  
  async get(key: string): Promise<CacheEntry | null> {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    // 检查过期
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key)
      return null
    }
    
    // 更新访问时间和计数
    entry.lastAccessed = Date.now()
    entry.accessCount++
    
    return entry
  }
  
  async set(key: string, value: AgentResponse, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttl ?? 3600000 // 默认1小时
    const tags = options?.tags ?? []
    
    const entry: CacheEntry = {
      key,
      value,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      expiresAt: ttl > 0 ? Date.now() + ttl : undefined,
      tags,
      similarity: 1.0
    }
    
    this.cache.set(key, entry)
  }
  
  async findSimilar(query: string, threshold?: number): Promise<CacheEntry[]> {
    const minSimilarity = threshold ?? 0.85
    const results: CacheEntry[] = []
    
    for (const entry of this.cache.values()) {
      // 计算与键的相似度
      const keySimilarity = this.calculateSimilarity(query, entry.key)
      // 也可以计算与内容的相似度
      const contentSimilarity = this.calculateSimilarity(query, entry.value.content)
      // 取最大值
      const similarity = Math.max(keySimilarity, contentSimilarity)
      
      if (similarity >= minSimilarity) {
        results.push({ ...entry, similarity })
      }
    }
    
    // 按相似度排序
    return results.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
  }
  
  async invalidate(pattern: string): Promise<number> {
    let count = 0
    const regex = new RegExp(pattern)
    
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key)
        count++
      }
    }
    
    return count
  }
  
  async clear(): Promise<void> {
    this.cache.clear()
  }
  
  async size(): Promise<number> {
    return this.cache.size
  }
  
  async stats(): Promise<{
    totalEntries: number
    totalHits: number
    totalMisses: number
    hitRate: number
    avgAccessTime?: number
  }> {
    let totalHits = 0
    let totalAccess = 0
    
    for (const entry of this.cache.values()) {
      totalHits += entry.accessCount
      totalAccess += entry.accessCount > 0 ? 1 : 0
    }
    
    return {
      totalEntries: this.cache.size,
      totalHits,
      totalMisses: 0, // 需要外部跟踪
      hitRate: totalAccess > 0 ? totalHits / totalAccess : 0,
      avgAccessTime: undefined
    }
  }
  
  private calculateSimilarity(str1: string, str2: string): number {
    // 简化的字符级别相似度（支持中文）
    const chars1 = Array.from(str1.toLowerCase())
    const chars2 = Array.from(str2.toLowerCase())
    
    const set1 = new Set(chars1)
    const set2 = new Set(chars2)
    
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }
}

describe('ICacheService Interface', () => {
  let cache: ICacheService
  
  beforeEach(() => {
    cache = new TestCacheService()
  })
  
  describe('基本操作', () => {
    it('应该存储和获取缓存项', async () => {
      const response: AgentResponse = {
        content: '测试响应',
        suggestedLevel: 2,
        concepts: ['法律', '合同'],
        evaluation: {
          understanding: 80,
          canProgress: true
        }
      }
      
      await cache.set('test-key', response)
      const entry = await cache.get('test-key')
      
      expect(entry).not.toBeNull()
      expect(entry?.value).toEqual(response)
      expect(entry?.key).toBe('test-key')
      expect(entry?.accessCount).toBe(1)
    })
    
    it('应该返回null当缓存不存在', async () => {
      const entry = await cache.get('non-existent')
      expect(entry).toBeNull()
    })
    
    it('应该处理过期时间', async () => {
      const response: AgentResponse = { content: '过期测试' }
      
      await cache.set('expire-test', response, { ttl: 100 })
      
      // 立即获取应该成功
      let entry = await cache.get('expire-test')
      expect(entry).not.toBeNull()
      
      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 150))
      
      entry = await cache.get('expire-test')
      expect(entry).toBeNull()
    })
    
    it('应该支持标签', async () => {
      const response: AgentResponse = { content: '标签测试' }
      const tags = ['level-1', 'contract', 'important']
      
      await cache.set('tagged-entry', response, { tags })
      const entry = await cache.get('tagged-entry')
      
      expect(entry?.tags).toEqual(tags)
    })
  })
  
  describe('相似度查找', () => {
    beforeEach(async () => {
      // 添加测试数据
      await cache.set('合同违约责任', { content: '关于合同违约的问题' })
      await cache.set('合同履行义务', { content: '关于合同履行的问题' })
      await cache.set('侵权责任承担', { content: '关于侵权责任的问题' })
      await cache.set('property rights', { content: 'About property rights' })
    })
    
    it('应该找到相似的缓存项', async () => {
      const similar = await cache.findSimilar('合同违约', 0.3) // 降低阈值以适应简单的相似度算法
      
      expect(similar.length).toBeGreaterThan(0)
      expect(similar[0].key).toContain('合同')
      expect(similar[0].similarity).toBeGreaterThan(0)
    })
    
    it('应该按相似度排序', async () => {
      const similar = await cache.findSimilar('合同违约责任', 0.2)
      
      expect(similar.length).toBeGreaterThan(0)
      
      // 验证降序排序
      for (let i = 1; i < similar.length; i++) {
        expect(similar[i - 1].similarity ?? 0).toBeGreaterThanOrEqual(
          similar[i].similarity ?? 0
        )
      }
    })
    
    it('应该支持自定义阈值', async () => {
      const highThreshold = await cache.findSimilar('合同', 0.9)
      const lowThreshold = await cache.findSimilar('合同', 0.1)
      
      expect(highThreshold.length).toBeLessThanOrEqual(lowThreshold.length)
    })
  })
  
  describe('失效操作', () => {
    beforeEach(async () => {
      await cache.set('session-123-msg-1', { content: '消息1' })
      await cache.set('session-123-msg-2', { content: '消息2' })
      await cache.set('session-456-msg-1', { content: '消息3' })
      await cache.set('other-key', { content: '其他' })
    })
    
    it('应该按模式失效缓存', async () => {
      const count = await cache.invalidate('session-123.*')
      
      expect(count).toBe(2)
      expect(await cache.get('session-123-msg-1')).toBeNull()
      expect(await cache.get('session-123-msg-2')).toBeNull()
      expect(await cache.get('session-456-msg-1')).not.toBeNull()
    })
    
    it('应该清空所有缓存', async () => {
      await cache.clear()
      
      expect(await cache.size()).toBe(0)
      expect(await cache.get('session-123-msg-1')).toBeNull()
    })
  })
  
  describe('统计信息', () => {
    it('应该提供缓存统计', async () => {
      await cache.set('key1', { content: 'test1' })
      await cache.set('key2', { content: 'test2' })
      
      // 访问缓存
      await cache.get('key1')
      await cache.get('key1')
      await cache.get('key2')
      
      const stats = await cache.stats()
      
      expect(stats.totalEntries).toBe(2)
      expect(stats.totalHits).toBeGreaterThan(0)
    })
    
    it('应该返回缓存大小', async () => {
      expect(await cache.size()).toBe(0)
      
      await cache.set('key1', { content: 'test1' })
      expect(await cache.size()).toBe(1)
      
      await cache.set('key2', { content: 'test2' })
      expect(await cache.size()).toBe(2)
    })
  })
  
  describe('边界条件', () => {
    it('应该处理空值', async () => {
      await cache.set('empty', { content: '' })
      const entry = await cache.get('empty')
      
      expect(entry).not.toBeNull()
      expect(entry?.value.content).toBe('')
    })
    
    it('应该处理特殊字符键', async () => {
      const specialKey = 'key-with-特殊字符!@#$%'
      await cache.set(specialKey, { content: 'test' })
      
      const entry = await cache.get(specialKey)
      expect(entry).not.toBeNull()
    })
    
    it('应该处理并发访问', async () => {
      const promises = []
      
      // 并发写入
      for (let i = 0; i < 10; i++) {
        promises.push(cache.set(`concurrent-${i}`, { content: `test-${i}` }))
      }
      
      await Promise.all(promises)
      expect(await cache.size()).toBe(10)
      
      // 并发读取
      const readPromises = []
      for (let i = 0; i < 10; i++) {
        readPromises.push(cache.get(`concurrent-${i}`))
      }
      
      const results = await Promise.all(readPromises)
      expect(results.filter(r => r !== null)).toHaveLength(10)
    })
  })
})