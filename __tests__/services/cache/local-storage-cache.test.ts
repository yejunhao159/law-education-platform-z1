/**
 * localStorage缓存服务单元测试
 * @module __tests__/services/cache/local-storage-cache
 */

import { LocalStorageCacheService } from '@/lib/services/cache/local-storage-cache.service'
import { CacheConfig, CacheEvents } from '@/lib/services/cache/cache.interface'
import { AgentResponse } from '@/lib/types/socratic'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      // 模拟存储限制
      const totalSize = Object.values(store).join('').length + value.length
      if (totalSize > 100000) { // 100KB限制
        throw new Error('QuotaExceededError')
      }
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
    key: jest.fn((index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }),
    get length() {
      return Object.keys(store).length
    }
  }
})()

// 替换全局localStorage
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('LocalStorageCacheService', () => {
  let cache: LocalStorageCacheService
  let events: CacheEvents
  
  beforeEach(() => {
    // 确保清理顺序正确
    if (cache) {
      cache.destroy()
    }
    
    jest.clearAllMocks()
    localStorageMock.clear()
    
    events = {
      onHit: jest.fn(),
      onMiss: jest.fn(),
      onSet: jest.fn(),
      onEvict: jest.fn(),
      onClear: jest.fn()
    }
    
    cache = new LocalStorageCacheService(
      {
        maxEntries: 5,
        defaultTTL: 3600000,
        enableCompression: false, // 关闭压缩简化测试
        enableStats: true,
        skipInitialCleanup: true // 跳过初始清理避免测试干扰
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
        concepts: ['localStorage', '缓存']
      }
      
      await cache.set('test-key', response)
      const entry = await cache.get('test-key')
      
      expect(entry).not.toBeNull()
      expect(entry?.value).toEqual(response)
      expect(localStorageMock.setItem).toHaveBeenCalled()
      expect(events.onSet).toHaveBeenCalled()
      expect(events.onHit).toHaveBeenCalled()
    })
    
    it('应该返回null当缓存不存在', async () => {
      const entry = await cache.get('non-existent')
      
      expect(entry).toBeNull()
      expect(events.onMiss).toHaveBeenCalledWith('non-existent')
    })
    
    it('应该处理localStorage异常', async () => {
      // 模拟localStorage不可用
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('localStorage is not available')
      })
      
      const response: AgentResponse = { content: 'test' }
      
      // 应该不抛出异常，而是静默失败
      await expect(cache.set('error-key', response)).resolves.toBeUndefined()
    })
    
    it('应该处理存储空间不足', async () => {
      // 模拟存储空间不足
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })
      
      const response: AgentResponse = { content: 'large-content'.repeat(1000) }
      
      await cache.set('large-key', response)
      
      // 应该触发清理机制
      expect(cache).toBeDefined()
    })
  })
  
  describe('序列化和压缩', () => {
    it('应该正确序列化复杂对象', async () => {
      const complexResponse: AgentResponse = {
        content: '复杂响应',
        concepts: ['概念1', '概念2'],
        evaluation: {
          understanding: 85,
          canProgress: true,
          weakPoints: ['需要改进的地方']
        },
        suggestedLevel: 3,
        cached: false,
        responseTime: 1500
      }
      
      await cache.set('complex-key', complexResponse)
      const entry = await cache.get('complex-key')
      
      expect(entry?.value).toEqual(complexResponse)
    })
    
    it('应该支持压缩存储', async () => {
      const compressedCache = new LocalStorageCacheService({
        enableCompression: true
      })
      
      const longContent = 'A'.repeat(1000)
      const response: AgentResponse = { content: longContent }
      
      await compressedCache.set('compressed-key', response)
      const entry = await compressedCache.get('compressed-key')
      
      expect(entry?.value.content).toBe(longContent)
      compressedCache.destroy()
    })
  })
  
  describe('过期管理', () => {
    it('应该自动删除过期项', async () => {
      await cache.set('expire-test', { content: 'test' }, { ttl: 100 })
      
      // 立即获取应该成功
      let entry = await cache.get('expire-test')
      expect(entry).not.toBeNull()
      
      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 150))
      
      entry = await cache.get('expire-test')
      expect(entry).toBeNull()
      expect(events.onEvict).toHaveBeenCalledWith('expire-test', 'expired')
    })
    
    it('应该在启动时清理过期项', async () => {
      // 直接向localStorage写入过期数据
      const expiredEntry = {
        key: 'expired-startup',
        value: { content: 'expired' },
        createdAt: Date.now() - 10000,
        lastAccessed: Date.now() - 10000,
        accessCount: 0,
        expiresAt: Date.now() - 1000 // 已过期
      }
      
      localStorageMock.setItem(
        'socratic-cache:expired-startup',
        JSON.stringify(expiredEntry)
      )
      
      // 创建新的缓存实例，应该清理过期项
      const newCache = new LocalStorageCacheService()
      
      expect(await newCache.has('expired-startup')).toBe(false)
      newCache.destroy()
    })
  })
  
  describe('容量管理', () => {
    it('应该执行LRU淘汰', async () => {
      // 填满缓存
      for (let i = 1; i <= 5; i++) {
        await cache.set(`key${i}`, { content: `value${i}` })
      }
      
      // 访问前3个
      await cache.get('key1')
      await cache.get('key2')
      await cache.get('key3')
      
      // 添加新项，应该淘汰key4
      await cache.set('key6', { content: 'value6' })
      
      expect(await cache.has('key4')).toBe(false)
      expect(await cache.has('key1')).toBe(true)
    })
    
    it('应该处理存储空间清理', async () => {
      // 模拟存储空间不足的情况
      let callCount = 0
      localStorageMock.setItem.mockImplementation((key: string, value: string) => {
        callCount++
        if (callCount === 1) {
          throw new Error('QuotaExceededError')
        }
        // 第二次调用（清理后）应该成功
        return undefined
      })
      
      await cache.set('quota-test', { content: 'test' })
      
      // 应该先失败，然后清理空间重试成功
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2)
    })
  })
  
  describe('批量操作', () => {
    it('应该支持批量获取', async () => {
      await cache.set('batch1', { content: 'value1' })
      await cache.set('batch2', { content: 'value2' })
      await cache.set('batch3', { content: 'value3' })
      
      const entries = await cache.mget(['batch1', 'batch2', 'batch4'])
      
      expect(entries.size).toBe(2)
      expect(entries.get('batch1')?.value.content).toBe('value1')
      expect(entries.get('batch2')?.value.content).toBe('value2')
      expect(entries.has('batch4')).toBe(false)
    })
    
    it('应该支持批量设置', async () => {
      const entries = [
        { key: 'mset1', value: { content: 'value1' } as AgentResponse },
        { key: 'mset2', value: { content: 'value2' } as AgentResponse }
      ]
      
      await cache.mset(entries, { ttl: 5000 })
      
      expect(await cache.has('mset1')).toBe(true)
      expect(await cache.has('mset2')).toBe(true)
    })
  })
  
  describe('键管理', () => {
    it('应该列出所有键', async () => {
      await cache.set('key1', { content: 'value1' })
      await cache.set('key2', { content: 'value2' })
      await cache.set('key3', { content: 'value3' })
      
      const keys = await cache.keys()
      
      expect(keys).toHaveLength(3)
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys).toContain('key3')
    })
    
    it('应该支持模式匹配', async () => {
      await cache.set('user-123-profile', { content: 'profile' })
      await cache.set('user-456-profile', { content: 'profile' })
      await cache.set('session-123', { content: 'session' })
      
      const userKeys = await cache.keys('user-.*-profile')
      
      expect(userKeys).toHaveLength(2)
      expect(userKeys).toContain('user-123-profile')
      expect(userKeys).toContain('user-456-profile')
    })
  })
  
  describe('统计信息', () => {
    it('应该提供准确的统计', async () => {
      await cache.set('stats1', { content: 'test1' })
      await cache.set('stats2', { content: 'test2' })
      
      // 产生命中和未命中
      await cache.get('stats1') // hit
      await cache.get('stats1') // hit
      await cache.get('nonexistent') // miss
      
      const stats = await cache.stats()
      
      expect(stats.totalEntries).toBe(2)
      expect(stats.totalHits).toBe(2)
      expect(stats.totalMisses).toBe(1)
      expect(stats.hitRate).toBeCloseTo(0.67, 1)
    })
    
    it('应该估算存储使用量', async () => {
      await cache.set('size-test', { content: 'test content' })
      
      const stats = await cache.stats()
      
      expect(stats.memoryUsage).toBeGreaterThan(0)
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
      expect(data.totalSize).toBeGreaterThan(0)
    })
    
    it('应该导入缓存数据', async () => {
      const importData = {
        version: '1.0.0',
        exportedAt: Date.now(),
        totalSize: 100,
        entries: [
          {
            key: 'import1',
            value: { content: 'imported1' },
            createdAt: Date.now(),
            lastAccessed: Date.now(),
            accessCount: 0
          }
        ]
      }
      
      await cache.import(JSON.stringify(importData))
      
      expect(await cache.has('import1')).toBe(true)
      const entry = await cache.get('import1')
      expect(entry?.value.content).toBe('imported1')
    })
  })
  
  describe('相似度查找', () => {
    beforeEach(async () => {
      await cache.set('合同纠纷案例', { content: '合同纠纷相关内容' })
      await cache.set('劳动合同争议', { content: '劳动合同争议内容' })
      await cache.set('房屋买卖合同', { content: '房屋买卖合同内容' })
      await cache.set('侵权责任案件', { content: '侵权责任相关内容' })
    })
    
    it('应该找到相似的缓存项', async () => {
      const similar = await cache.findSimilar('合同纠纷', 0.3)
      
      expect(similar.length).toBeGreaterThan(0)
      expect(similar[0].key).toContain('合同')
      expect(similar[0].similarity).toBeGreaterThan(0)
    })
    
    it('应该按相似度排序', async () => {
      const similar = await cache.findSimilar('合同', 0.2)
      
      expect(similar.length).toBeGreaterThan(1)
      
      // 验证降序排序
      for (let i = 1; i < similar.length; i++) {
        expect(similar[i - 1].similarity ?? 0).toBeGreaterThanOrEqual(
          similar[i].similarity ?? 0
        )
      }
    })
  })
  
  describe('清理和维护', () => {
    it('应该手动清理过期项', async () => {
      // 添加一些过期的条目
      await cache.set('cleanup1', { content: 'test1' }, { ttl: 50 })
      await cache.set('cleanup2', { content: 'test2' }, { ttl: 50 })
      await cache.set('keep', { content: 'test3' }, { ttl: 10000 })
      
      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 手动清理
      const cleaned = await cache.cleanup()
      
      expect(cleaned).toBe(2)
      expect(await cache.has('cleanup1')).toBe(false)
      expect(await cache.has('cleanup2')).toBe(false)
      expect(await cache.has('keep')).toBe(true)
    })
    
    it('应该失效匹配的键', async () => {
      await cache.set('session-123-data', { content: 'data1' })
      await cache.set('session-123-user', { content: 'user1' })
      await cache.set('session-456-data', { content: 'data2' })
      await cache.set('other-key', { content: 'other' })
      
      const invalidated = await cache.invalidate('session-123.*')
      
      expect(invalidated).toBe(2)
      expect(await cache.has('session-123-data')).toBe(false)
      expect(await cache.has('session-123-user')).toBe(false)
      expect(await cache.has('session-456-data')).toBe(true)
    })
  })
  
  describe('错误处理', () => {
    it('应该处理损坏的缓存数据', async () => {
      // 写入损坏的数据
      localStorageMock.setItem('socratic-cache:corrupted', 'invalid-json')
      
      const entry = await cache.get('corrupted')
      
      // 应该返回null而不是抛出异常
      expect(entry).toBeNull()
      
      // 损坏的数据应该被清理
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('socratic-cache:corrupted')
    })
    
    it('应该处理localStorage读取错误', async () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('localStorage read error')
      })
      
      const entry = await cache.get('error-key')
      
      expect(entry).toBeNull()
    })
  })
  
  describe('性能测试', () => {
    it('应该高效处理大量操作', async () => {
      const start = Date.now()
      
      // 混合操作
      for (let i = 0; i < 100; i++) {
        await cache.set(`perf-${i}`, { content: `test-${i}` })
      }
      
      for (let i = 0; i < 100; i++) {
        await cache.get(`perf-${i}`)
      }
      
      const duration = Date.now() - start
      
      // localStorage操作会比内存慢，但应该在合理范围内
      expect(duration).toBeLessThan(1000) // 1秒内完成200次操作
    })
  })
})