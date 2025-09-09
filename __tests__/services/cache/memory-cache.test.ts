/**
 * 内存缓存服务单元测试
 * @module __tests__/services/cache/memory-cache
 */

import { MemoryCacheService } from '@/lib/services/cache/memory-cache.service'
import { CacheConfig, CacheEvents } from '@/lib/services/cache/cache.interface'
import { AgentResponse } from '@/lib/types/socratic'

describe('MemoryCacheService', () => {
  let cache: MemoryCacheService
  let events: CacheEvents
  
  beforeEach(() => {
    events = {
      onHit: jest.fn(),
      onMiss: jest.fn(),
      onSet: jest.fn(),
      onEvict: jest.fn(),
      onClear: jest.fn()
    }
    
    cache = new MemoryCacheService(
      {
        maxEntries: 5,
        defaultTTL: 3600000,
        enableStats: true,
        cleanupInterval: 1000
      },
      events
    )
  })
  
  afterEach(() => {
    cache.destroy()
  })
  
  describe('基本操作', () => {
    it('应该存储和获取缓存项', async () => {
      const response: AgentResponse = {
        content: '测试响应',
        concepts: ['测试']
      }
      
      await cache.set('test-key', response)
      const entry = await cache.get('test-key')
      
      expect(entry).not.toBeNull()
      expect(entry?.value).toEqual(response)
      expect(events.onSet).toHaveBeenCalledWith('test-key', expect.any(Object))
      expect(events.onHit).toHaveBeenCalledWith('test-key', expect.any(Object))
    })
    
    it('应该触发miss事件', async () => {
      const entry = await cache.get('non-existent')
      
      expect(entry).toBeNull()
      expect(events.onMiss).toHaveBeenCalledWith('non-existent')
    })
    
    it('应该检查键是否存在', async () => {
      await cache.set('existing', { content: 'test' })
      
      expect(await cache.has('existing')).toBe(true)
      expect(await cache.has('non-existing')).toBe(false)
    })
    
    it('应该获取所有键', async () => {
      await cache.set('key1', { content: 'test1' })
      await cache.set('key2', { content: 'test2' })
      await cache.set('key3', { content: 'test3' })
      
      const keys = await cache.keys()
      expect(keys).toHaveLength(3)
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys).toContain('key3')
    })
    
    it('应该支持带模式的键获取', async () => {
      await cache.set('session-1-msg', { content: 'msg1' })
      await cache.set('session-2-msg', { content: 'msg2' })
      await cache.set('other-key', { content: 'other' })
      
      const sessionKeys = await cache.keys('session-.*')
      expect(sessionKeys).toHaveLength(2)
      expect(sessionKeys).toContain('session-1-msg')
      expect(sessionKeys).toContain('session-2-msg')
    })
  })
  
  describe('LRU淘汰策略', () => {
    it('应该淘汰最久未使用的项', async () => {
      // 填满缓存（最大5个）
      for (let i = 1; i <= 5; i++) {
        await cache.set(`key${i}`, { content: `value${i}` })
      }
      
      // 访问前3个，使其变成最近使用
      await cache.get('key1')
      await cache.get('key2')
      await cache.get('key3')
      
      // 添加第6个，应该淘汰key4（最久未使用）
      await cache.set('key6', { content: 'value6' })
      
      expect(await cache.has('key4')).toBe(false)
      expect(await cache.has('key5')).toBe(true)
      expect(await cache.has('key6')).toBe(true)
      expect(events.onEvict).toHaveBeenCalledWith('key4', 'lru')
    })
    
    it('应该更新访问时间', async () => {
      await cache.set('key1', { content: 'value1' })
      await cache.set('key2', { content: 'value2' })
      
      // 访问key1，使其变成最近使用
      await cache.touch('key1')
      
      // 填满缓存
      for (let i = 3; i <= 5; i++) {
        await cache.set(`key${i}`, { content: `value${i}` })
      }
      
      // 添加新项，应该淘汰key2而不是key1
      await cache.set('key6', { content: 'value6' })
      
      expect(await cache.has('key1')).toBe(true)
      expect(await cache.has('key2')).toBe(false)
    })
  })
  
  describe('过期管理', () => {
    it('应该自动清理过期项', async () => {
      await cache.set('expire-soon', { content: 'test' }, { ttl: 100 })
      
      expect(await cache.has('expire-soon')).toBe(true)
      
      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 150))
      
      const entry = await cache.get('expire-soon')
      expect(entry).toBeNull()
      expect(events.onEvict).toHaveBeenCalledWith('expire-soon', 'expired')
    })
    
    it('应该在清理间隔中删除过期项', async () => {
      const shortCache = new MemoryCacheService({
        maxEntries: 10,
        cleanupInterval: 100 // 100ms清理间隔
      })
      
      await shortCache.set('expire1', { content: 'test1' }, { ttl: 50 })
      await shortCache.set('expire2', { content: 'test2' }, { ttl: 50 })
      await shortCache.set('keep', { content: 'test3' }, { ttl: 5000 })
      
      // 等待自动清理
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(await shortCache.has('expire1')).toBe(false)
      expect(await shortCache.has('expire2')).toBe(false)
      expect(await shortCache.has('keep')).toBe(true)
      
      shortCache.destroy()
    })
  })
  
  describe('批量操作', () => {
    it('应该批量获取缓存项', async () => {
      await cache.set('key1', { content: 'value1' })
      await cache.set('key2', { content: 'value2' })
      await cache.set('key3', { content: 'value3' })
      
      const entries = await cache.mget(['key1', 'key2', 'key4'])
      
      expect(entries.size).toBe(2)
      expect(entries.get('key1')?.value.content).toBe('value1')
      expect(entries.get('key2')?.value.content).toBe('value2')
      expect(entries.has('key4')).toBe(false)
    })
    
    it('应该批量设置缓存项', async () => {
      const entries = [
        { key: 'batch1', value: { content: 'value1' } as AgentResponse },
        { key: 'batch2', value: { content: 'value2' } as AgentResponse },
        { key: 'batch3', value: { content: 'value3' } as AgentResponse }
      ]
      
      await cache.mset(entries, { ttl: 1000 })
      
      expect(await cache.size()).toBe(3)
      expect(await cache.has('batch1')).toBe(true)
      expect(await cache.has('batch2')).toBe(true)
      expect(await cache.has('batch3')).toBe(true)
    })
  })
  
  describe('相似度查找', () => {
    beforeEach(async () => {
      await cache.set('合同违约责任', { content: '关于合同违约的问题' })
      await cache.set('合同履行义务', { content: '关于合同履行的问题' })
      await cache.set('侵权责任承担', { content: '关于侵权责任的问题' })
    })
    
    it('应该找到相似的缓存项', async () => {
      const similar = await cache.findSimilar('合同违约', 0.3)
      
      expect(similar.length).toBeGreaterThan(0)
      expect(similar[0].key).toContain('合同')
    })
    
    it('应该缓存相似度查询结果', async () => {
      // 第一次查询
      const start1 = Date.now()
      await cache.findSimilar('合同违约', 0.3)
      const time1 = Date.now() - start1
      
      // 第二次查询（应该更快）
      const start2 = Date.now()
      await cache.findSimilar('合同违约', 0.3)
      const time2 = Date.now() - start2
      
      // 缓存的查询应该更快（允许一定误差）
      expect(time2).toBeLessThanOrEqual(time1 + 5)
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
      expect(await cache.has('session-123-msg-1')).toBe(false)
      expect(await cache.has('session-123-msg-2')).toBe(false)
      expect(await cache.has('session-456-msg-1')).toBe(true)
    })
    
    it('应该清空所有缓存', async () => {
      await cache.clear()
      
      expect(await cache.size()).toBe(0)
      expect(events.onClear).toHaveBeenCalled()
    })
  })
  
  describe('统计信息', () => {
    it('应该提供准确的统计信息', async () => {
      // 设置缓存
      await cache.set('key1', { content: 'test1' })
      await cache.set('key2', { content: 'test2' })
      
      // 模拟命中和未命中
      await cache.get('key1') // hit
      await cache.get('key1') // hit
      await cache.get('key2') // hit
      await cache.get('missing1') // miss
      await cache.get('missing2') // miss
      
      const stats = await cache.stats()
      
      expect(stats.totalEntries).toBe(2)
      expect(stats.totalHits).toBe(3)
      expect(stats.totalMisses).toBe(2)
      expect(stats.hitRate).toBeCloseTo(0.6, 1) // 3/5 = 0.6
    })
    
    it('应该追踪最热门的键', async () => {
      await cache.set('popular', { content: 'popular' })
      await cache.set('normal', { content: 'normal' })
      await cache.set('rare', { content: 'rare' })
      
      // 访问次数不同
      for (let i = 0; i < 5; i++) await cache.get('popular')
      for (let i = 0; i < 3; i++) await cache.get('normal')
      await cache.get('rare')
      
      const stats = await cache.stats()
      
      expect(stats.hottestKeys).toBeDefined()
      expect(stats.hottestKeys![0].key).toBe('popular')
      expect(stats.hottestKeys![0].count).toBe(5)
    })
  })
  
  describe('导入导出', () => {
    it('应该导出缓存数据', async () => {
      await cache.set('export1', { content: 'value1' })
      await cache.set('export2', { content: 'value2' })
      
      const exported = await cache.export()
      const data = JSON.parse(exported)
      
      expect(data.entries).toHaveLength(2)
      expect(data.version).toBeDefined()
      expect(data.exportedAt).toBeDefined()
    })
    
    it('应该导入缓存数据', async () => {
      const importData = {
        version: '1.0.0',
        exportedAt: Date.now(),
        entries: [
          {
            key: 'import1',
            value: { content: 'imported1' },
            createdAt: Date.now(),
            lastAccessed: Date.now(),
            accessCount: 0
          },
          {
            key: 'import2',
            value: { content: 'imported2' },
            createdAt: Date.now(),
            lastAccessed: Date.now(),
            accessCount: 0
          }
        ]
      }
      
      await cache.import(JSON.stringify(importData))
      
      expect(await cache.size()).toBe(2)
      expect(await cache.has('import1')).toBe(true)
      expect(await cache.has('import2')).toBe(true)
    })
  })
  
  describe('性能测试', () => {
    it('应该在100ms内完成1000次操作', async () => {
      const start = Date.now()
      
      // 混合操作
      for (let i = 0; i < 333; i++) {
        await cache.set(`perf-${i}`, { content: `value-${i}` })
      }
      
      for (let i = 0; i < 333; i++) {
        await cache.get(`perf-${i}`)
      }
      
      for (let i = 0; i < 334; i++) {
        await cache.has(`perf-${i}`)
      }
      
      const duration = Date.now() - start
      expect(duration).toBeLessThan(100)
    })
    
    it('应该高效处理并发操作', async () => {
      const promises = []
      
      // 并发写入
      for (let i = 0; i < 100; i++) {
        promises.push(cache.set(`concurrent-${i}`, { content: `test-${i}` }))
      }
      
      await Promise.all(promises)
      
      // 并发读取
      const readPromises = []
      for (let i = 0; i < 100; i++) {
        readPromises.push(cache.get(`concurrent-${i}`))
      }
      
      const results = await Promise.all(readPromises)
      const validResults = results.filter(r => r !== null)
      
      // 由于LRU限制，可能不是所有项都存在
      expect(validResults.length).toBeGreaterThan(0)
      expect(validResults.length).toBeLessThanOrEqual(cache['maxEntries'])
    })
  })
})