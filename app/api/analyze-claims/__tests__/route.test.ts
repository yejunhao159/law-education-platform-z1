import { NextRequest } from 'next/server'
import { POST } from '../route'
import { analyzeClaimsWithAI } from '@/lib/ai-legal-agent'
import type { TimelineEvent, ClaimAnalysisRequest } from '@/types/timeline-claim-analysis'

// Mock the AI analysis function
jest.mock('@/lib/ai-legal-agent', () => ({
  analyzeClaimsWithAI: jest.fn()
}))

describe('POST /api/analyze-claims', () => {
  const mockEvents: TimelineEvent[] = [
    {
      id: '1',
      date: '2024-01-01',
      title: '合同签订',
      description: '双方签订买卖合同',
      type: 'fact',
      importance: 'critical'
    },
    {
      id: '2',
      date: '2024-02-01',
      title: '违约发生',
      description: '买方未按期支付货款',
      type: 'fact',
      importance: 'critical'
    }
  ]

  const validRequest: ClaimAnalysisRequest = {
    events: mockEvents,
    caseType: '买卖合同纠纷',
    focusAreas: ['claims', 'defenses'],
    depth: 'comprehensive'
  }

  const mockAIResponse = JSON.stringify({
    id: 'analysis-123',
    timestamp: '2024-01-01T00:00:00Z',
    claims: {
      primary: [{
        id: 'claim-1',
        basis: '《民法典》第577条',
        basisText: '当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任',
        type: 'primary',
        elements: [
          {
            name: '合同关系存在',
            description: '双方存在有效的买卖合同',
            satisfied: true,
            evidence: ['合同书']
          },
          {
            name: '违约行为',
            description: '买方未按期支付货款',
            satisfied: true,
            evidence: ['付款记录']
          }
        ],
        conclusion: 'established'
      }],
      alternative: [],
      defense: []
    },
    timeline: {
      keyPoints: [
        {
          date: '2024-01-01',
          event: '合同签订',
          significance: '法律关系成立',
          impact: 'claim-creation'
        }
      ],
      limitations: [],
      sequence: ['合同签订', '违约发生']
    },
    legalRelations: [],
    burdenOfProof: [
      {
        fact: '合同履行',
        party: '原告',
        evidence: ['合同书', '履行凭证'],
        evaluation: 'sufficient'
      }
    ],
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
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(analyzeClaimsWithAI as jest.Mock).mockResolvedValue(mockAIResponse)
  })

  describe('成功场景', () => {
    it('应该成功分析请求权并返回结果', async () => {
      const request = new NextRequest('http://localhost/api/analyze-claims', {
        method: 'POST',
        body: JSON.stringify(validRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('claims')
      expect(data.claims.primary).toHaveLength(1)
      expect(data.claims.primary[0].basis).toBe('《民法典》第577条')
    })

    it('应该正确处理不同的分析深度', async () => {
      const requestWithBasicDepth = {
        ...validRequest,
        depth: 'basic' as const
      }
      
      const request = new NextRequest('http://localhost/api/analyze-claims', {
        method: 'POST',
        body: JSON.stringify(requestWithBasicDepth)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(analyzeClaimsWithAI).toHaveBeenCalledWith(
        expect.stringContaining('分析深度：basic')
      )
    })

    it('应该包含所有必要的元数据', async () => {
      const request = new NextRequest('http://localhost/api/analyze-claims', {
        method: 'POST',
        body: JSON.stringify(validRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.metadata).toHaveProperty('model', 'deepseek')
      expect(data.metadata).toHaveProperty('processingTime')
      expect(data.metadata.processingTime).toBeGreaterThan(0)
    })
  })

  describe('错误处理', () => {
    it('应该拒绝空事件数组', async () => {
      const invalidRequest = {
        ...validRequest,
        events: []
      }
      
      const request = new NextRequest('http://localhost/api/analyze-claims', {
        method: 'POST',
        body: JSON.stringify(invalidRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error', '缺少事件数据')
    })

    it('应该处理AI分析失败', async () => {
      ;(analyzeClaimsWithAI as jest.Mock).mockRejectedValue(new Error('AI服务不可用'))
      
      const request = new NextRequest('http://localhost/api/analyze-claims', {
        method: 'POST',
        body: JSON.stringify(validRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error', '分析失败，请稍后重试')
    })

    it('应该处理AI返回非JSON格式', async () => {
      ;(analyzeClaimsWithAI as jest.Mock).mockResolvedValue('这不是JSON格式的响应')
      
      const request = new NextRequest('http://localhost/api/analyze-claims', {
        method: 'POST',
        body: JSON.stringify(validRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('strategy')
      // 应该返回默认结构
      expect(data.strategy.recommendations).toContain('建议进一步分析案件细节')
    })

    it('应该处理部分JSON解析成功', async () => {
      const partialJSON = `
        分析结果如下：
        {
          "claims": {
            "primary": [],
            "alternative": [],
            "defense": []
          }
        }
        以上是分析结果
      `
      ;(analyzeClaimsWithAI as jest.Mock).mockResolvedValue(partialJSON)
      
      const request = new NextRequest('http://localhost/api/analyze-claims', {
        method: 'POST',
        body: JSON.stringify(validRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('claims')
      expect(data.claims).toHaveProperty('primary')
    })
  })

  describe('请求验证', () => {
    it('应该验证必需字段', async () => {
      const request = new NextRequest('http://localhost/api/analyze-claims', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error')
    })

    it('应该使用默认值处理可选字段', async () => {
      const minimalRequest = {
        events: mockEvents
      }
      
      const request = new NextRequest('http://localhost/api/analyze-claims', {
        method: 'POST',
        body: JSON.stringify(minimalRequest)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(analyzeClaimsWithAI).toHaveBeenCalledWith(
        expect.stringContaining('分析深度：comprehensive')
      )
    })
  })

  describe('性能考虑', () => {
    it('应该记录处理时间', async () => {
      const request = new NextRequest('http://localhost/api/analyze-claims', {
        method: 'POST',
        body: JSON.stringify(validRequest)
      })

      const startTime = Date.now()
      const response = await POST(request)
      const endTime = Date.now()
      const data = await response.json()

      expect(data.metadata.processingTime).toBeLessThanOrEqual(endTime - startTime + 100)
    })

    it('应该处理超长事件列表', async () => {
      const manyEvents = Array.from({ length: 100 }, (_, i) => ({
        id: `event-${i}`,
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        title: `事件 ${i}`,
        description: `描述 ${i}`,
        type: 'fact' as const,
        importance: 'reference' as const
      }))

      const request = new NextRequest('http://localhost/api/analyze-claims', {
        method: 'POST',
        body: JSON.stringify({
          ...validRequest,
          events: manyEvents
        })
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
    })
  })
})