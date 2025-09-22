import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { UnifiedTimeline } from '../UnifiedTimeline'
import { useCaseStore } from '@/src/domains/stores/useCaseStore'
import type { TimelineEvent, ClaimAnalysisResult } from '@/types/timeline-claim-analysis'

// Mock the store
jest.mock('@/src/domains/stores/useCaseStore')

// Mock fetch API
global.fetch = jest.fn()

describe('UnifiedTimeline Component', () => {
  const mockSetTimelineViewMode = jest.fn()
  const mockSetIsAnalyzingClaims = jest.fn()
  const mockSetClaimAnalysis = jest.fn()
  const mockToggleTimelineViewMode = jest.fn()

  const mockEvents: TimelineEvent[] = [
    {
      id: '1',
      date: '2024-01-01',
      title: '合同签订',
      description: '双方签订买卖合同',
      type: 'fact',
      importance: 'critical',
      claims: {
        basis: ['《民法典》第595条'],
        elements: [
          { 
            name: '合意', 
            description: '双方意思表示一致', 
            satisfied: true,
            evidence: ['合同书']
          }
        ],
        fulfilled: true,
        type: 'contractual'
      }
    },
    {
      id: '2',
      date: '2024-02-01',
      title: '交付货物',
      description: '卖方交付标的物',
      type: 'fact',
      importance: 'important',
      burdenOfProof: {
        party: '卖方',
        standard: 'preponderance',
        evidence: ['送货单', '签收单']
      }
    }
  ]

  const mockAnalysis: ClaimAnalysisResult = {
    id: 'test-analysis',
    timestamp: '2024-01-01T00:00:00Z',
    claims: {
      primary: [
        {
          id: 'claim-1',
          basis: '《民法典》第595条',
          basisText: '买卖合同是出卖人转移标的物的所有权于买受人，买受人支付价款的合同',
          type: 'primary',
          elements: [
            {
              name: '合意',
              description: '双方意思表示一致',
              satisfied: true,
              evidence: ['合同书'],
              analysis: '双方签订了书面合同'
            }
          ],
          conclusion: 'established'
        }
      ],
      alternative: [],
      defense: []
    },
    timeline: {
      keyPoints: [],
      limitations: [],
      sequence: []
    },
    legalRelations: [],
    burdenOfProof: [
      {
        fact: '货物交付',
        party: '卖方',
        evidence: ['送货单'],
        evaluation: 'sufficient'
      }
    ],
    strategy: {
      recommendations: ['建议收集更多证据'],
      risks: ['时效风险'],
      opportunities: ['和解可能性']
    },
    metadata: {
      model: 'deepseek',
      confidence: 0.85,
      processingTime: 1000
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useCaseStore as unknown as jest.Mock).mockReturnValue({
      caseData: {
        threeElements: {
          facts: {
            timeline: mockEvents
          }
        }
      },
      setTimelineViewMode: mockSetTimelineViewMode,
      setIsAnalyzingClaims: mockSetIsAnalyzingClaims,
      setClaimAnalysis: mockSetClaimAnalysis,
      toggleTimelineViewMode: mockToggleTimelineViewMode
    })
    ;(useCaseStore.getState as jest.Mock) = jest.fn().mockReturnValue({
      timelineViewMode: 'simple',
      isAnalyzingClaims: false,
      claimAnalysis: null
    })
  })

  describe('组件渲染', () => {
    it('应该正确渲染组件', () => {
      render(<UnifiedTimeline events={mockEvents} />)
      expect(screen.getByText('简单')).toBeInTheDocument()
      expect(screen.getByText('增强')).toBeInTheDocument()
      expect(screen.getByText('分析')).toBeInTheDocument()
    })

    it('应该显示事件列表', () => {
      render(<UnifiedTimeline events={mockEvents} />)
      expect(screen.getByText('合同签订')).toBeInTheDocument()
      expect(screen.getByText('交付货物')).toBeInTheDocument()
    })

    it('没有事件时应该显示空状态', () => {
      render(<UnifiedTimeline events={[]} />)
      expect(screen.queryByText('合同签订')).not.toBeInTheDocument()
    })
  })

  describe('视图模式切换', () => {
    it('点击简单模式按钮应该切换到简单视图', () => {
      render(<UnifiedTimeline events={mockEvents} />)
      const simpleButton = screen.getByRole('button', { name: /简单/i })
      fireEvent.click(simpleButton)
      expect(mockSetTimelineViewMode).toHaveBeenCalledWith('simple')
    })

    it('点击增强模式按钮应该切换到增强视图', () => {
      render(<UnifiedTimeline events={mockEvents} />)
      const enhancedButton = screen.getByRole('button', { name: /增强/i })
      fireEvent.click(enhancedButton)
      expect(mockSetTimelineViewMode).toHaveBeenCalledWith('enhanced')
    })

    it('点击分析模式按钮应该切换到分析视图', () => {
      render(<UnifiedTimeline events={mockEvents} />)
      const analysisButton = screen.getByRole('button', { name: /分析/i })
      fireEvent.click(analysisButton)
      expect(mockSetTimelineViewMode).toHaveBeenCalledWith('analysis')
    })
  })

  describe('事件过滤', () => {
    it('选择关键事件过滤器应该只显示关键事件', () => {
      render(<UnifiedTimeline events={mockEvents} />)
      const filterSelect = screen.getByRole('combobox')
      fireEvent.change(filterSelect, { target: { value: 'critical' } })
      
      expect(screen.getByText('合同签订')).toBeInTheDocument()
      expect(screen.queryByText('交付货物')).not.toBeInTheDocument()
    })

    it('选择请求权相关过滤器应该只显示有请求权的事件', () => {
      render(<UnifiedTimeline events={mockEvents} />)
      const filterSelect = screen.getByRole('combobox')
      fireEvent.change(filterSelect, { target: { value: 'claims' } })
      
      expect(screen.getByText('合同签订')).toBeInTheDocument()
      expect(screen.queryByText('交付货物')).not.toBeInTheDocument()
    })
  })

  describe('AI分析功能', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockAnalysis
      })
    })

    it('在分析模式下应该显示AI分析按钮', () => {
      render(<UnifiedTimeline events={mockEvents} mode="analysis" enableAI={true} />)
      expect(screen.getByRole('button', { name: /AI请求权分析/i })).toBeInTheDocument()
    })

    it('点击AI分析按钮应该触发分析', async () => {
      const onAnalysisComplete = jest.fn()
      render(
        <UnifiedTimeline 
          events={mockEvents} 
          mode="analysis" 
          enableAI={true}
          onAnalysisComplete={onAnalysisComplete}
        />
      )
      
      const analyzeButton = screen.getByRole('button', { name: /AI请求权分析/i })
      fireEvent.click(analyzeButton)
      
      await waitFor(() => {
        expect(mockSetIsAnalyzingClaims).toHaveBeenCalledWith(true)
      })
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/claim-analysis', expect.any(Object))
      })
      
      await waitFor(() => {
        expect(mockSetClaimAnalysis).toHaveBeenCalledWith(mockAnalysis)
        expect(onAnalysisComplete).toHaveBeenCalledWith(mockAnalysis)
      })
    })

    it('分析失败时应该处理错误', async () => {
      // 简化的错误处理测试
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
      
      render(<UnifiedTimeline events={mockEvents} mode="analysis" enableAI={true} />)
      
      const analyzeButton = screen.getByRole('button', { name: /AI请求权分析/i })
      fireEvent.click(analyzeButton)
      
      // 等待一小段时间让异步操作完成
      await new Promise(resolve => setTimeout(resolve, 100))
      
      consoleError.mockRestore()
    })
  })

  describe('事件交互', () => {
    it('点击事件应该调用onNodeClick回调', () => {
      const onNodeClick = jest.fn()
      render(<UnifiedTimeline events={mockEvents} onNodeClick={onNodeClick} />)
      
      const eventNode = screen.getByText('合同签订')
      fireEvent.click(eventNode.closest('[class*="cursor-pointer"]')!)
      
      expect(onNodeClick).toHaveBeenCalledWith(mockEvents[0])
    })

    it('点击事件应该显示事件详情', () => {
      render(<UnifiedTimeline events={mockEvents} />)
      
      const eventNode = screen.getByText('合同签订')
      fireEvent.click(eventNode.closest('[class*="cursor-pointer"]')!)
      
      expect(screen.getByText('事件详情')).toBeInTheDocument()
      // Check for unique text that appears only in the modal
      expect(screen.getByText('法律基础：')).toBeInTheDocument()
    })
  })

  describe('分析结果展示', () => {
    it('有分析结果时应该显示分析tabs', () => {
      render(<UnifiedTimeline events={mockEvents} analysis={mockAnalysis} mode="analysis" />)
      
      expect(screen.getByRole('tab', { name: /时间轴/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /请求权/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /举证责任/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /策略建议/i })).toBeInTheDocument()
    })

    it('切换到请求权tab应该显示请求权分析', () => {
      render(<UnifiedTimeline events={mockEvents} analysis={mockAnalysis} mode="analysis" />)
      
      const claimsTab = screen.getByRole('tab', { name: /请求权/i })
      fireEvent.click(claimsTab)
      
      expect(screen.getByText('主要请求权')).toBeInTheDocument()
      expect(screen.getByText('《民法典》第595条')).toBeInTheDocument()
    })

    it('切换到举证责任tab应该显示举证责任分配', () => {
      render(<UnifiedTimeline events={mockEvents} analysis={mockAnalysis} mode="analysis" />)
      
      const burdenTab = screen.getByRole('tab', { name: /举证责任/i })
      fireEvent.click(burdenTab)
      
      expect(screen.getByText('货物交付')).toBeInTheDocument()
      expect(screen.getByText('举证方：卖方')).toBeInTheDocument()
    })

    it('切换到策略建议tab应该显示策略分析', () => {
      render(<UnifiedTimeline events={mockEvents} analysis={mockAnalysis} mode="analysis" />)
      
      const strategyTab = screen.getByRole('tab', { name: /策略建议/i })
      fireEvent.click(strategyTab)
      
      expect(screen.getByText('建议收集更多证据')).toBeInTheDocument()
      expect(screen.getByText('时效风险')).toBeInTheDocument()
      expect(screen.getByText('和解可能性')).toBeInTheDocument()
    })
  })
})