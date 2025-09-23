import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CaseTimeline } from '../CaseTimeline'
import { useCaseStore } from '@/src/domains/stores/useCaseStore'
import { TimelineAnalyzer } from '@/src/domains/legal-analysis/services/TimelineAnalyzer'
import type { TimelineEvent, TimelineAnalysis } from '@/types/timeline-claim-analysis'
import type { LegalCase } from '@/types/legal-case'

// Mock the store
jest.mock('@/src/domains/stores/useCaseStore')

// Mock the analyzer
jest.mock('@/src/domains/legal-analysis/services/TimelineAnalyzer')

// Mock fetch API
global.fetch = jest.fn()

describe('CaseTimeline 智能分析集成测试', () => {
  const mockSetAnalysisResult = jest.fn()
  const mockSetAnalysisLoading = jest.fn()
  const mockSetTimelinePerspective = jest.fn()
  const mockToggleTeachingMode = jest.fn()
  
  const mockEvents: TimelineEvent[] = [
    {
      id: 'event-1',
      date: '2024-01-01',
      title: '合同签订',
      description: '双方签订买卖合同',
      type: 'fact',
      importance: 'critical',
    },
    {
      id: 'event-2',
      date: '2024-02-01',
      title: '交付货物',
      description: '卖方交付标的物',
      type: 'fact',
      importance: 'important',
    },
    {
      id: 'event-3',
      date: '2024-03-01',
      title: '付款争议',
      description: '买方拒绝支付余款',
      type: 'dispute',
      importance: 'critical',
    },
  ]
  
  const mockCase: LegalCase = {
    id: 'test-case',
    title: '买卖合同纠纷案',
    description: '关于买卖合同履行的纠纷',
    type: 'civil',
    status: 'active',
    parties: {
      plaintiff: { name: '张三', type: 'individual' },
      defendant: { name: '李四', type: 'individual' },
    },
    threeElements: {
      facts: {
        timeline: mockEvents,
      },
    },
  } as LegalCase
  
  const mockAnalysis: TimelineAnalysis = {
    eventId: 'event-1',
    perspective: 'neutral',
    importance: {
      score: 85,
      level: 'critical',
      factors: {
        procedural: 70,
        substantive: 90,
        evidential: 85,
        strategic: 80,
      },
      reasoning: '该事件为合同关系的起点，具有关键法律意义',
    },
    legalAnalysis: {
      factRecognition: '双方签订了书面买卖合同，合同成立',
      legalBasis: ['《民法典》第595条', '《民法典》第502条'],
      evidenceRequirements: ['书面合同原件', '签字确认'],
      risks: ['合同效力可能存在瑕疵', '条款约定不明'],
      strategies: ['确认合同有效性', '明确违约责任'],
    },
    teachingPoints: [
      '合同成立与生效的区别',
      '买卖合同的基本要素',
      '举证责任的分配',
    ],
    timestamp: new Date().toISOString(),
  }
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock store state
    ;(useCaseStore as unknown as jest.Mock).mockReturnValue({
      caseData: mockCase,
      timelinePerspective: 'neutral',
      isTeachingMode: false,
      analysisResults: new Map(),
      analysisLoading: new Map(),
      setAnalysisResult: mockSetAnalysisResult,
      setAnalysisLoading: mockSetAnalysisLoading,
      setTimelinePerspective: mockSetTimelinePerspective,
      toggleTeachingMode: mockToggleTeachingMode,
    })
    
    // Mock analyzer instance
    const mockAnalyzerInstance = {
      analyzeTimelineEvent: jest.fn().mockResolvedValue(mockAnalysis),
      evaluateImportance: jest.fn().mockResolvedValue(mockAnalysis.importance),
      generatePerspectiveAnalysis: jest.fn().mockResolvedValue(mockAnalysis),
      batchAnalyze: jest.fn().mockResolvedValue([mockAnalysis]),
      getPerformanceMetrics: jest.fn().mockReturnValue({
        averageResponseTime: 500,
        totalRequests: 10,
        cacheHitRate: 0.7,
      }),
    }
    
    ;(TimelineAnalyzer.getInstance as jest.Mock).mockReturnValue(mockAnalyzerInstance)
  })
  
  describe('基础渲染和交互', () => {
    it('应该正确渲染时间轴组件', () => {
      render(<CaseTimeline />)
      
      // 检查时间轴标题
      expect(screen.getByText('案件时间轴')).toBeInTheDocument()
      
      // 检查事件节点
      mockEvents.forEach(event => {
        expect(screen.getByText(event.title)).toBeInTheDocument()
      })
      
      // 检查视角切换按钮
      expect(screen.getByRole('button', { name: /中立/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /原告/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /被告/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /法官/i })).toBeInTheDocument()
    })
    
    it('应该支持教学模式切换', () => {
      render(<CaseTimeline />)
      
      const teachingToggle = screen.getByRole('switch', { name: /教学模式/i })
      fireEvent.click(teachingToggle)
      
      expect(mockToggleTeachingMode).toHaveBeenCalled()
    })
  })
  
  describe('智能分析功能集成', () => {
    it('点击事件节点应该触发AI分析', async () => {
      const analyzer = TimelineAnalyzer.getInstance()
      render(<CaseTimeline />)
      
      // 点击第一个事件节点
      const eventNode = screen.getByText('合同签订')
      await act(async () => {
        fireEvent.click(eventNode.closest('.timeline-event')!)
      })
      
      // 验证加载状态
      expect(mockSetAnalysisLoading).toHaveBeenCalledWith('event-1', true)
      
      // 验证分析方法被调用
      await waitFor(() => {
        expect(analyzer.analyzeTimelineEvent).toHaveBeenCalledWith(
          mockEvents[0],
          mockCase,
          'neutral',
          false
        )
      })
      
      // 验证分析结果被保存
      await waitFor(() => {
        expect(mockSetAnalysisResult).toHaveBeenCalledWith('event-1', mockAnalysis)
        expect(mockSetAnalysisLoading).toHaveBeenCalledWith('event-1', false)
      })
    })
    
    it('应该显示分析加载状态', async () => {
      // 设置加载状态
      ;(useCaseStore as unknown as jest.Mock).mockReturnValue({
        caseData: mockCase,
        timelinePerspective: 'neutral',
        isTeachingMode: false,
        analysisResults: new Map(),
        analysisLoading: new Map([['event-1', true]]),
        setAnalysisResult: mockSetAnalysisResult,
        setAnalysisLoading: mockSetAnalysisLoading,
      })
      
      render(<CaseTimeline />)
      
      // 应该显示加载指示器
      expect(screen.getByTestId('analysis-loading-event-1')).toBeInTheDocument()
    })
    
    it('应该展示分析结果', async () => {
      // 设置已有分析结果
      ;(useCaseStore as unknown as jest.Mock).mockReturnValue({
        caseData: mockCase,
        timelinePerspective: 'neutral',
        isTeachingMode: false,
        analysisResults: new Map([['event-1', mockAnalysis]]),
        analysisLoading: new Map(),
        setAnalysisResult: mockSetAnalysisResult,
        setAnalysisLoading: mockSetAnalysisLoading,
      })
      
      render(<CaseTimeline />)
      
      // 点击展开分析详情
      const eventNode = screen.getByText('合同签订')
      await act(async () => {
        fireEvent.click(eventNode.closest('.timeline-event')!)
      })
      
      // 验证分析内容显示
      await waitFor(() => {
        expect(screen.getByText(/双方签订了书面买卖合同/)).toBeInTheDocument()
        expect(screen.getByText('《民法典》第595条')).toBeInTheDocument()
        expect(screen.getByText(/重要性评分: 85/)).toBeInTheDocument()
      })
    })
  })
  
  describe('多视角分析切换', () => {
    it('切换视角应该重新触发分析', async () => {
      const analyzer = TimelineAnalyzer.getInstance()
      
      // 先设置一个已分析的事件
      ;(useCaseStore as unknown as jest.Mock).mockReturnValue({
        caseData: mockCase,
        timelinePerspective: 'neutral',
        isTeachingMode: false,
        analysisResults: new Map([['event-1', mockAnalysis]]),
        analysisLoading: new Map(),
        setAnalysisResult: mockSetAnalysisResult,
        setAnalysisLoading: mockSetAnalysisLoading,
        setTimelinePerspective: mockSetTimelinePerspective,
      })
      
      render(<CaseTimeline />)
      
      // 切换到原告视角
      const plaintiffButton = screen.getByRole('button', { name: /原告/i })
      await act(async () => {
        fireEvent.click(plaintiffButton)
      })
      
      expect(mockSetTimelinePerspective).toHaveBeenCalledWith('plaintiff')
      
      // 应该使用新视角重新分析
      await waitFor(() => {
        expect(analyzer.generatePerspectiveAnalysis).toHaveBeenCalledWith(
          mockEvents[0],
          mockCase,
          'plaintiff'
        )
      })
    })
    
    it('不同视角应该显示不同的分析内容', async () => {
      const plaintiffAnalysis = {
        ...mockAnalysis,
        perspective: 'plaintiff',
        legalAnalysis: {
          ...mockAnalysis.legalAnalysis,
          strategies: ['强调对方违约', '主张损害赔偿'],
        },
      }
      
      const analyzer = TimelineAnalyzer.getInstance()
      ;(analyzer.generatePerspectiveAnalysis as jest.Mock).mockResolvedValue(plaintiffAnalysis)
      
      ;(useCaseStore as unknown as jest.Mock).mockReturnValue({
        caseData: mockCase,
        timelinePerspective: 'plaintiff',
        isTeachingMode: false,
        analysisResults: new Map([['event-1_plaintiff', plaintiffAnalysis]]),
        analysisLoading: new Map(),
      })
      
      render(<CaseTimeline />)
      
      // 展开分析
      const eventNode = screen.getByText('合同签订')
      await act(async () => {
        fireEvent.click(eventNode.closest('.timeline-event')!)
      })
      
      // 验证原告视角的策略建议
      await waitFor(() => {
        expect(screen.getByText(/强调对方违约/)).toBeInTheDocument()
        expect(screen.getByText(/主张损害赔偿/)).toBeInTheDocument()
      })
    })
  })
  
  describe('教学模式增强', () => {
    it('教学模式下应该显示额外的教学内容', async () => {
      ;(useCaseStore as unknown as jest.Mock).mockReturnValue({
        caseData: mockCase,
        timelinePerspective: 'neutral',
        isTeachingMode: true,
        analysisResults: new Map([['event-1', mockAnalysis]]),
        analysisLoading: new Map(),
      })
      
      render(<CaseTimeline />)
      
      // 展开分析
      const eventNode = screen.getByText('合同签订')
      await act(async () => {
        fireEvent.click(eventNode.closest('.timeline-event')!)
      })
      
      // 验证教学要点显示
      await waitFor(() => {
        expect(screen.getByText('教学要点')).toBeInTheDocument()
        expect(screen.getByText(/合同成立与生效的区别/)).toBeInTheDocument()
        expect(screen.getByText(/买卖合同的基本要素/)).toBeInTheDocument()
        expect(screen.getByText(/举证责任的分配/)).toBeInTheDocument()
      })
    })
    
    it('教学模式下应该支持逐步展示', async () => {
      ;(useCaseStore as unknown as jest.Mock).mockReturnValue({
        caseData: mockCase,
        timelinePerspective: 'neutral',
        isTeachingMode: true,
        analysisResults: new Map([['event-1', mockAnalysis]]),
        analysisLoading: new Map(),
      })
      
      render(<CaseTimeline />)
      
      // 应该有步骤导航
      expect(screen.getByRole('button', { name: /下一步/i })).toBeInTheDocument()
      
      // 点击下一步
      const nextButton = screen.getByRole('button', { name: /下一步/i })
      await act(async () => {
        fireEvent.click(nextButton)
      })
      
      // 验证进度更新
      expect(screen.getByText(/步骤 2/)).toBeInTheDocument()
    })
  })
  
  describe('批量分析功能', () => {
    it('应该支持批量分析所有事件', async () => {
      const analyzer = TimelineAnalyzer.getInstance()
      render(<CaseTimeline />)
      
      // 点击批量分析按钮
      const batchAnalyzeButton = screen.getByRole('button', { name: /批量分析/i })
      await act(async () => {
        fireEvent.click(batchAnalyzeButton)
      })
      
      // 验证批量分析被调用
      await waitFor(() => {
        expect(analyzer.batchAnalyze).toHaveBeenCalledWith(
          mockEvents,
          mockCase,
          'neutral'
        )
      })
      
      // 验证所有事件的加载状态
      mockEvents.forEach(event => {
        expect(mockSetAnalysisLoading).toHaveBeenCalledWith(event.id, true)
      })
    })
    
    it('批量分析应该显示进度', async () => {
      render(<CaseTimeline />)
      
      // 触发批量分析
      const batchAnalyzeButton = screen.getByRole('button', { name: /批量分析/i })
      await act(async () => {
        fireEvent.click(batchAnalyzeButton)
      })
      
      // 应该显示进度条
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(screen.getByText(/分析中: 0\/3/)).toBeInTheDocument()
    })
  })
  
  describe('错误处理和恢复', () => {
    it('API错误应该显示错误提示', async () => {
      const analyzer = TimelineAnalyzer.getInstance()
      ;(analyzer.analyzeTimelineEvent as jest.Mock).mockRejectedValue(
        new Error('API请求失败')
      )
      
      render(<CaseTimeline />)
      
      // 点击事件触发分析
      const eventNode = screen.getByText('合同签订')
      await act(async () => {
        fireEvent.click(eventNode.closest('.timeline-event')!)
      })
      
      // 验证错误提示显示
      await waitFor(() => {
        expect(screen.getByText(/分析失败/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /重试/i })).toBeInTheDocument()
      })
    })
    
    it('应该支持错误后重试', async () => {
      const analyzer = TimelineAnalyzer.getInstance()
      
      // 第一次失败
      ;(analyzer.analyzeTimelineEvent as jest.Mock)
        .mockRejectedValueOnce(new Error('API请求失败'))
        .mockResolvedValueOnce(mockAnalysis)
      
      render(<CaseTimeline />)
      
      // 触发分析
      const eventNode = screen.getByText('合同签订')
      await act(async () => {
        fireEvent.click(eventNode.closest('.timeline-event')!)
      })
      
      // 等待错误显示
      await waitFor(() => {
        expect(screen.getByText(/分析失败/)).toBeInTheDocument()
      })
      
      // 点击重试
      const retryButton = screen.getByRole('button', { name: /重试/i })
      await act(async () => {
        fireEvent.click(retryButton)
      })
      
      // 验证重试成功
      await waitFor(() => {
        expect(mockSetAnalysisResult).toHaveBeenCalledWith('event-1', mockAnalysis)
      })
    })
    
    it('离线模式应该使用缓存数据', async () => {
      // 模拟离线
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: false,
      })
      
      // 设置缓存数据
      ;(useCaseStore as unknown as jest.Mock).mockReturnValue({
        caseData: mockCase,
        timelinePerspective: 'neutral',
        isTeachingMode: false,
        analysisResults: new Map([['event-1', mockAnalysis]]),
        analysisLoading: new Map(),
      })
      
      render(<CaseTimeline />)
      
      // 展开分析（应该从缓存读取）
      const eventNode = screen.getByText('合同签订')
      await act(async () => {
        fireEvent.click(eventNode.closest('.timeline-event')!)
      })
      
      // 验证显示缓存的分析
      expect(screen.getByText(/双方签订了书面买卖合同/)).toBeInTheDocument()
      
      // 应该显示离线提示
      expect(screen.getByText(/离线模式/)).toBeInTheDocument()
    })
  })
  
  describe('性能优化', () => {
    it('应该避免重复分析相同事件', async () => {
      const analyzer = TimelineAnalyzer.getInstance()
      
      // 设置已有分析结果
      ;(useCaseStore as unknown as jest.Mock).mockReturnValue({
        caseData: mockCase,
        timelinePerspective: 'neutral',
        isTeachingMode: false,
        analysisResults: new Map([['event-1', mockAnalysis]]),
        analysisLoading: new Map(),
      })
      
      render(<CaseTimeline />)
      
      // 多次点击同一事件
      const eventNode = screen.getByText('合同签订')
      await act(async () => {
        fireEvent.click(eventNode.closest('.timeline-event')!)
      })
      await act(async () => {
        fireEvent.click(eventNode.closest('.timeline-event')!)
      })
      
      // 分析方法不应该被调用（因为已有缓存）
      expect(analyzer.analyzeTimelineEvent).not.toHaveBeenCalled()
    })
    
    it('应该显示性能指标', async () => {
      const analyzer = TimelineAnalyzer.getInstance()
      
      render(<CaseTimeline />)
      
      // 点击性能统计按钮
      const statsButton = screen.getByRole('button', { name: /性能统计/i })
      await act(async () => {
        fireEvent.click(statsButton)
      })
      
      // 验证性能指标显示
      const metrics = analyzer.getPerformanceMetrics()
      expect(screen.getByText(/平均响应时间: 500ms/)).toBeInTheDocument()
      expect(screen.getByText(/缓存命中率: 70%/)).toBeInTheDocument()
      expect(screen.getByText(/总请求数: 10/)).toBeInTheDocument()
    })
  })
  
  describe('可访问性', () => {
    it('应该支持键盘导航', async () => {
      render(<CaseTimeline />)
      
      // Tab到第一个事件
      const firstEvent = screen.getByText('合同签订').closest('.timeline-event')
      firstEvent?.focus()
      
      // 按Enter触发分析
      await act(async () => {
        fireEvent.keyDown(firstEvent!, { key: 'Enter', code: 'Enter' })
      })
      
      // 验证分析被触发
      expect(mockSetAnalysisLoading).toHaveBeenCalledWith('event-1', true)
    })
    
    it('应该有正确的ARIA标签', () => {
      render(<CaseTimeline />)
      
      // 验证ARIA属性
      expect(screen.getByRole('region', { name: /时间轴/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /展开分析/i })).toHaveAttribute(
        'aria-expanded',
        'false'
      )
    })
  })
})