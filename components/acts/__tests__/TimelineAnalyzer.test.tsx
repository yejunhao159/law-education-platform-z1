import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TimelineAnalyzer } from '@/src/domains/legal-analysis/services/TimelineAnalyzer'
import { AnalysisCacheManager } from '@/src/domains/shared/infrastructure/cache/AnalysisCacheManager'
import type { TimelineEvent, TimelineAnalysis, ImportanceScore } from '@/types/timeline-claim-analysis'
import type { LegalCase } from '@/types/legal-case'

// Mock fetch API
global.fetch = jest.fn()

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock navigator.onLine
Object.defineProperty(window.navigator, 'onLine', {
  writable: true,
  value: true,
})

describe('TimelineAnalyzer Service', () => {
  let analyzer: TimelineAnalyzer
  let cacheManager: AnalysisCacheManager
  
  const mockEvent: TimelineEvent = {
    id: 'test-event-1',
    date: '2024-01-01',
    title: '合同签订',
    description: '双方签订买卖合同',
    type: 'fact',
    importance: 'critical',
  }
  
  const mockCaseContext: Partial<LegalCase> = {
    id: 'test-case',
    title: '买卖合同纠纷',
    description: '关于买卖合同履行的纠纷案件',
  }
  
  const mockImportanceResponse: ImportanceScore = {
    score: 85,
    level: 'critical' as const,
    factors: {
      procedural: 70,
      substantive: 90,
      evidential: 85,
      strategic: 80,
    },
    reasoning: '该事件为合同关系的起点，具有关键法律意义',
  }
  
  const mockAnalysisResponse: TimelineAnalysis = {
    eventId: 'test-event-1',
    perspective: 'neutral',
    importance: mockImportanceResponse,
    legalAnalysis: {
      factRecognition: '双方签订了书面买卖合同',
      legalBasis: ['《民法典》第595条'],
      evidenceRequirements: ['书面合同原件'],
      risks: ['合同效力风险'],
      strategies: ['确认合同有效性'],
    },
    teachingPoints: ['合同成立与生效的区别'],
    timestamp: new Date().toISOString(),
  }
  
  beforeEach(() => {
    jest.clearAllMocks()
    analyzer = TimelineAnalyzer.getInstance()
    cacheManager = AnalysisCacheManager.getInstance()
    cacheManager.clear()
    window.navigator.onLine = true
  })
  
  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const instance1 = TimelineAnalyzer.getInstance()
      const instance2 = TimelineAnalyzer.getInstance()
      expect(instance1).toBe(instance2)
    })
  })
  
  describe('重要性评估', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockImportanceResponse,
      })
    })
    
    it('应该成功评估事件重要性', async () => {
      const result = await analyzer.evaluateImportance(mockEvent, mockCaseContext)
      
      expect(result).toEqual(mockImportanceResponse)
      expect(fetch).toHaveBeenCalledWith(
        '/api/analyze-timeline',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('evaluateImportance'),
        })
      )
    })
    
    it('应该从缓存返回已评估的重要性', async () => {
      // 第一次调用
      await analyzer.evaluateImportance(mockEvent, mockCaseContext)
      
      // 清除fetch mock调用记录
      jest.clearAllMocks()
      
      // 第二次调用应该从缓存返回
      const result = await analyzer.evaluateImportance(mockEvent, mockCaseContext)
      
      expect(result).toEqual(mockImportanceResponse)
      expect(fetch).not.toHaveBeenCalled()
    })
    
    it('应该处理不同视角的重要性评估', async () => {
      const perspectives = ['neutral', 'plaintiff', 'defendant', 'judge'] as const
      
      for (const perspective of perspectives) {
        const result = await analyzer.evaluateImportance(
          mockEvent,
          mockCaseContext,
          perspective
        )
        
        expect(result).toEqual(mockImportanceResponse)
        expect(fetch).toHaveBeenCalledWith(
          '/api/analyze-timeline',
          expect.objectContaining({
            body: expect.stringContaining(perspective),
          })
        )
      }
    })
  })
  
  describe('时间轴事件分析', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockAnalysisResponse,
      })
    })
    
    it('应该成功分析时间轴事件', async () => {
      const result = await analyzer.analyzeTimelineEvent(
        mockEvent,
        mockCaseContext
      )
      
      expect(result).toEqual(mockAnalysisResponse)
      expect(fetch).toHaveBeenCalledWith(
        '/api/analyze-timeline',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('analyzeEvent'),
        })
      )
    })
    
    it('应该支持教学模式分析', async () => {
      const result = await analyzer.analyzeTimelineEvent(
        mockEvent,
        mockCaseContext,
        'neutral',
        true // teachingMode
      )
      
      expect(result.teachingPoints).toBeDefined()
      expect(result.teachingPoints?.length).toBeGreaterThan(0)
    })
  })
  
  describe('错误处理和重试机制', () => {
    it('应该在API失败时重试最多3次', async () => {
      let callCount = 0
      ;(global.fetch as jest.Mock).mockImplementation(() => {
        callCount++
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockImportanceResponse,
        })
      })
      
      const result = await analyzer.evaluateImportance(mockEvent, mockCaseContext)
      
      expect(result).toEqual(mockImportanceResponse)
      expect(fetch).toHaveBeenCalledTimes(3)
    })
    
    it('应该在超过重试次数后抛出错误', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
      
      await expect(
        analyzer.evaluateImportance(mockEvent, mockCaseContext)
      ).rejects.toThrow('Failed after 3 retries')
      
      expect(fetch).toHaveBeenCalledTimes(3)
    })
    
    it('应该处理API返回的错误状态', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })
      
      await expect(
        analyzer.evaluateImportance(mockEvent, mockCaseContext)
      ).rejects.toThrow('API request failed')
    })
  })
  
  describe('离线模式和降级方案', () => {
    beforeEach(() => {
      window.navigator.onLine = false
    })
    
    it('离线时应该返回基础模板分析', async () => {
      const result = await analyzer.evaluateImportance(mockEvent, mockCaseContext)
      
      expect(result).toBeDefined()
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.level).toBeDefined()
      expect(result.reasoning).toContain('离线模式')
      expect(fetch).not.toHaveBeenCalled()
    })
    
    it('离线时应该从缓存返回已有数据', async () => {
      // 先在线状态下获取数据
      window.navigator.onLine = true
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockImportanceResponse,
      })
      
      await analyzer.evaluateImportance(mockEvent, mockCaseContext)
      
      // 切换到离线状态
      window.navigator.onLine = false
      jest.clearAllMocks()
      
      // 应该从缓存返回
      const result = await analyzer.evaluateImportance(mockEvent, mockCaseContext)
      
      expect(result).toEqual(mockImportanceResponse)
      expect(fetch).not.toHaveBeenCalled()
    })
  })
  
  describe('缓存管理', () => {
    it('应该正确缓存分析结果', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockAnalysisResponse,
      })
      
      // 第一次调用
      const result1 = await analyzer.analyzeTimelineEvent(
        mockEvent,
        mockCaseContext
      )
      
      // 验证缓存
      const cached = cacheManager.get(
        `${mockEvent.id}_neutral_${mockCaseContext.id}`
      )
      
      expect(cached).toEqual(result1)
    })
    
    it('应该在缓存过期后重新获取', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockAnalysisResponse,
      })
      
      // 设置过期的缓存
      const expiredData = {
        ...mockAnalysisResponse,
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25小时前
      }
      
      cacheManager.set(
        `${mockEvent.id}_neutral_${mockCaseContext.id}`,
        expiredData
      )
      
      // 应该重新获取
      await analyzer.analyzeTimelineEvent(mockEvent, mockCaseContext)
      
      expect(fetch).toHaveBeenCalled()
    })
    
    it('应该统计缓存命中率', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockAnalysisResponse,
      })
      
      // 第一次调用（缓存未命中）
      await analyzer.analyzeTimelineEvent(mockEvent, mockCaseContext)
      
      // 第二次调用（缓存命中）
      await analyzer.analyzeTimelineEvent(mockEvent, mockCaseContext)
      
      const stats = cacheManager.getStats()
      
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)
      expect(stats.hitRate).toBe(0.5)
    })
  })
  
  describe('批量分析', () => {
    it('应该支持批量分析多个事件', async () => {
      const events = [
        { ...mockEvent, id: 'event-1' },
        { ...mockEvent, id: 'event-2' },
        { ...mockEvent, id: 'event-3' },
      ]
      
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockAnalysisResponse,
      })
      
      const results = await analyzer.batchAnalyze(events, mockCaseContext)
      
      expect(results).toHaveLength(3)
      expect(fetch).toHaveBeenCalledTimes(3)
    })
    
    it('批量分析应该利用缓存', async () => {
      const events = [
        { ...mockEvent, id: 'event-1' },
        { ...mockEvent, id: 'event-1' }, // 重复的事件
        { ...mockEvent, id: 'event-2' },
      ]
      
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockAnalysisResponse,
      })
      
      const results = await analyzer.batchAnalyze(events, mockCaseContext)
      
      expect(results).toHaveLength(3)
      expect(fetch).toHaveBeenCalledTimes(2) // 只调用2次，因为有一个重复
    })
  })
  
  describe('性能监控', () => {
    it('应该记录API响应时间', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockImportanceResponse,
      })
      
      const startTime = Date.now()
      await analyzer.evaluateImportance(mockEvent, mockCaseContext)
      const endTime = Date.now()
      
      const metrics = analyzer.getPerformanceMetrics()
      
      expect(metrics.lastResponseTime).toBeDefined()
      expect(metrics.lastResponseTime).toBeGreaterThanOrEqual(0)
      expect(metrics.lastResponseTime).toBeLessThanOrEqual(endTime - startTime)
    })
    
    it('应该跟踪平均响应时间', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockImportanceResponse,
      })
      
      // 执行多次请求
      await analyzer.evaluateImportance(mockEvent, mockCaseContext)
      await analyzer.evaluateImportance(
        { ...mockEvent, id: 'event-2' },
        mockCaseContext
      )
      await analyzer.evaluateImportance(
        { ...mockEvent, id: 'event-3' },
        mockCaseContext
      )
      
      const metrics = analyzer.getPerformanceMetrics()
      
      expect(metrics.averageResponseTime).toBeDefined()
      expect(metrics.totalRequests).toBe(3)
    })
  })
  
  describe('内存管理', () => {
    it('应该限制缓存大小', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockAnalysisResponse,
      })
      
      // 创建大量事件以测试缓存限制
      const events = Array.from({ length: 150 }, (_, i) => ({
        ...mockEvent,
        id: `event-${i}`,
      }))
      
      for (const event of events) {
        await analyzer.analyzeTimelineEvent(event, mockCaseContext)
      }
      
      const stats = cacheManager.getStats()
      
      // 缓存应该有大小限制（假设限制为100）
      expect(stats.size).toBeLessThanOrEqual(100)
    })
    
    it('应该使用LRU策略清理缓存', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockAnalysisResponse,
      })
      
      // 填满缓存
      const events = Array.from({ length: 100 }, (_, i) => ({
        ...mockEvent,
        id: `event-${i}`,
      }))
      
      for (const event of events) {
        await analyzer.analyzeTimelineEvent(event, mockCaseContext)
      }
      
      // 访问第一个事件（使其变为最近使用）
      await analyzer.analyzeTimelineEvent(events[0], mockCaseContext)
      
      // 添加新事件，应该淘汰最少使用的
      await analyzer.analyzeTimelineEvent(
        { ...mockEvent, id: 'new-event' },
        mockCaseContext
      )
      
      // 第一个事件应该还在缓存中
      const cached = cacheManager.get(
        `event-0_neutral_${mockCaseContext.id}`
      )
      expect(cached).toBeDefined()
    })
  })
})