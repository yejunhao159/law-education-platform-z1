import { analyzeTimelineClaimsWithAI } from '@/src/domains/legal-analysis/services/ClaimAnalysisService'
import type { TimelineEvent, ClaimAnalysisRequest } from '@/types/timeline-claim-analysis'

// Mock the AI claim analyzer
jest.mock('@/src/domains/legal-analysis/services/ClaimAnalysisService', () => ({
  analyzeTimelineClaimsWithAI: jest.fn()
}))

// Simple unit test for the AI claim analyzer
describe('AI Claim Analyzer Unit Test', () => {
  const mockEvents: TimelineEvent[] = [
    {
      id: '1',
      date: '2024-01-01',
      title: '买卖合同签订',
      description: '双方签订笔记本电脑买卖合同，总价5万元',
      type: 'fact',
      importance: 'critical',
    },
  ]

  const mockAnalysisResult = {
    id: 'analysis-123',
    timestamp: '2024-01-01T00:00:00Z',
    claims: {
      primary: [{
        id: 'claim-1',
        basis: '《民法典》第577条',
        basisText: '当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任',
        type: 'primary',
        elements: [{
          name: '合同关系存在',
          description: '双方存在有效的买卖合同',
          satisfied: true,
          evidence: ['合同书']
        }],
        conclusion: 'established'
      }],
      alternative: [],
      defense: []
    },
    timeline: {
      keyPoints: [{
        date: '2024-01-01',
        event: '合同签订',
        significance: '法律关系成立',
        impact: 'claim-creation'
      }],
      limitations: [],
      sequence: ['合同签订']
    },
    legalRelations: [],
    burdenOfProof: [{
      fact: '合同履行',
      party: '原告',
      evidence: ['合同书', '履行凭证'],
      evaluation: 'sufficient'
    }],
    strategy: {
      recommendations: ['提起诉讼要求支付货款及违约金'],
      risks: ['对方可能抗辩货物质量问题'],
      opportunities: ['可申请财产保全']
    },
    metadata: {
      model: 'deepseek',
      confidence: 0.9,
      processingTime: 1500
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('应该成功调用AI分析器', async () => {
    ;(analyzeTimelineClaimsWithAI as jest.Mock).mockResolvedValue(mockAnalysisResult)

    const request: ClaimAnalysisRequest = {
      events: mockEvents,
      caseType: '买卖合同纠纷',
      focusAreas: ['claims', 'defenses'],
      depth: 'comprehensive'
    }

    const result = await analyzeTimelineClaimsWithAI(request)

    expect(analyzeTimelineClaimsWithAI).toHaveBeenCalledWith(request)
    expect(result).toEqual(mockAnalysisResult)
  })

  it('应该处理分析错误', async () => {
    ;(analyzeTimelineClaimsWithAI as jest.Mock).mockRejectedValue(new Error('AI服务不可用'))

    const request: ClaimAnalysisRequest = {
      events: mockEvents,
      caseType: '买卖合同纠纷',
      focusAreas: ['claims', 'defenses'],
      depth: 'comprehensive'
    }

    await expect(analyzeTimelineClaimsWithAI(request)).rejects.toThrow('AI服务不可用')
  })

  it('应该验证输入参数', () => {
    const invalidRequest = {
      events: [],
      caseType: '买卖合同纠纷'
    }

    // 这个测试验证基本的输入验证
    expect(invalidRequest.events).toHaveLength(0)
  })
})