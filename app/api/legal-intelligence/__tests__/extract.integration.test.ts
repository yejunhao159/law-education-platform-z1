/**
 * Legal Intelligence API Integration Tests
 * 集成测试 - 完整的提取流程测试
 */

import { NextRequest } from 'next/server'
import { POST } from '../extract/route'

// Mock fetch for DeepSeek API
global.fetch = jest.fn()

describe('Legal Intelligence Extract API - Integration Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock successful AI response
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              dates: [
                {
                  date: '2024-03-15',
                  type: 'filing',
                  description: 'AI识别的起诉日期',
                  importance: 'critical',
                  confidence: 0.9
                }
              ],
              parties: [
                {
                  name: '张三',
                  type: 'plaintiff',
                  role: 'AI识别的原告',
                  confidence: 0.95
                }
              ],
              amounts: [
                {
                  value: 1000000,
                  currency: 'CNY',
                  type: 'principal',
                  description: 'AI识别的借款本金',
                  confidence: 0.9
                }
              ],
              legalClauses: [],
              facts: []
            })
          }
        }]
      })
    })
  })
  
  describe('完整提取流程', () => {
    it('应该成功执行规则+AI混合提取', async () => {
      const testText = `
        北京市朝阳区人民法院
        民事判决书
        (2024)京0105民初12345号
        
        原告：张三
        被告：李四贸易有限公司
        
        原告于2024年3月15日向本院提起诉讼，请求判令被告归还借款本金100万元。
        根据《民法典》第667条，判决如下：
        被告应归还原告借款本金100万元。
      `
      
      const request = new NextRequest('http://localhost:3000/api/legal-intelligence/extract', {
        method: 'POST',
        body: JSON.stringify({
          text: testText,
          options: {
            enableAI: true,
            enhanceWithProvisions: true
          }
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.dates.length).toBeGreaterThan(0)
      expect(data.data.parties.length).toBeGreaterThan(0)
      expect(data.data.amounts.length).toBeGreaterThan(0)
      expect(data.data.source).toBe('merged')
      expect(data.metadata.extractionMethod).toBe('hybrid')
    })
    
    it('应该在AI失败时降级到纯规则提取', async () => {
      // Mock AI failure
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))
      
      const request = new NextRequest('http://localhost:3000/api/legal-intelligence/extract', {
        method: 'POST',
        body: JSON.stringify({
          text: '原告张三诉被告李四，借款100万元。',
          options: { enableAI: true }
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.data.source).toBe('rule')
      expect(data.metadata.extractionMethod).toBe('rule-based')
    })
    
    it('应该正确处理仅规则提取模式', async () => {
      const request = new NextRequest('http://localhost:3000/api/legal-intelligence/extract', {
        method: 'POST',
        body: JSON.stringify({
          text: '原告张三于2024年3月15日起诉被告李四，要求返还借款100万元。',
          options: { enableAI: false }
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.data.source).toBe('rule')
      expect(global.fetch).not.toHaveBeenCalled()
    })
    
    it('应该增强法律条款信息', async () => {
      const request = new NextRequest('http://localhost:3000/api/legal-intelligence/extract', {
        method: 'POST',
        body: JSON.stringify({
          text: '根据《民法典》第667条，借款合同纠纷。',
          options: {
            enableAI: false,
            enhanceWithProvisions: true
          }
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.data.provisions).toBeDefined()
      expect(data.data.legalReferences).toBeDefined()
      expect(data.data.caseType).toBeDefined()
    })
    
    it('应该生成分析建议', async () => {
      const request = new NextRequest('http://localhost:3000/api/legal-intelligence/extract', {
        method: 'POST',
        body: JSON.stringify({
          text: `
            原告张三、王五诉被告李四、赵六。
            2024年3月15日起诉，要求返还借款500万元。
            存在争议事实：被告称已还款。
          `,
          options: { enableAI: false }
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.suggestions).toBeDefined()
      expect(Array.isArray(data.suggestions)).toBe(true)
      expect(data.suggestions.length).toBeGreaterThan(0)
    })
  })
  
  describe('错误处理', () => {
    it('应该处理空文本错误', async () => {
      const request = new NextRequest('http://localhost:3000/api/legal-intelligence/extract', {
        method: 'POST',
        body: JSON.stringify({ text: '' })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })
    
    it('应该处理无效的JSON响应', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Invalid JSON Response'
            }
          }]
        })
      })
      
      const request = new NextRequest('http://localhost:3000/api/legal-intelligence/extract', {
        method: 'POST',
        body: JSON.stringify({
          text: '测试文本',
          options: { enableAI: true }
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      // 应该降级到规则提取
      expect(data.success).toBe(true)
      expect(data.data.source).toBe('rule')
    })
  })
  
  describe('案件类型检测', () => {
    it('应该正确识别民间借贷纠纷', async () => {
      const request = new NextRequest('http://localhost:3000/api/legal-intelligence/extract', {
        method: 'POST',
        body: JSON.stringify({
          text: '原告要求被告返还借款本金100万元及利息。',
          options: { enhanceWithProvisions: true, enableAI: false }
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.data.caseType).toBe('民间借贷纠纷')
    })
    
    it('应该正确识别劳动争议', async () => {
      const request = new NextRequest('http://localhost:3000/api/legal-intelligence/extract', {
        method: 'POST',
        body: JSON.stringify({
          text: '原告要求被告支付拖欠工资及经济补偿金。',
          options: { enhanceWithProvisions: true, enableAI: false }
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.data.caseType).toBe('劳动争议')
    })
    
    it('应该正确识别合同纠纷', async () => {
      const request = new NextRequest('http://localhost:3000/api/legal-intelligence/extract', {
        method: 'POST',
        body: JSON.stringify({
          text: '双方签订买卖合同，被告违约未履行。',
          options: { enhanceWithProvisions: true, enableAI: false }
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.data.caseType).toBe('合同纠纷')
    })
  })
  
  describe('智能合并测试', () => {
    it('应该正确合并规则和AI结果', async () => {
      const testText = '原告张三于2024年3月15日起诉，要求返还100万元。'
      
      // Mock AI返回略有不同的结果
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                dates: [
                  {
                    date: '2024-03-15',
                    type: 'filing',
                    description: 'AI：提起诉讼',
                    importance: 'critical',
                    confidence: 0.95
                  }
                ],
                parties: [
                  {
                    name: '张三',
                    type: 'plaintiff',
                    role: 'AI：原告方',
                    confidence: 0.98
                  }
                ],
                amounts: [
                  {
                    value: 1000000,
                    currency: 'CNY',
                    type: 'compensation',  // AI识别为赔偿金
                    description: 'AI：赔偿金额',
                    confidence: 0.85
                  }
                ],
                legalClauses: [],
                facts: []
              })
            }
          }]
        })
      })
      
      const request = new NextRequest('http://localhost:3000/api/legal-intelligence/extract', {
        method: 'POST',
        body: JSON.stringify({
          text: testText,
          options: { enableAI: true }
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      // 验证合并结果
      expect(data.data.source).toBe('merged')
      expect(data.data.dates.length).toBeGreaterThan(0)
      expect(data.data.parties.length).toBeGreaterThan(0)
      expect(data.data.amounts.length).toBeGreaterThan(0)
      
      // 验证置信度被正确计算
      expect(data.data.confidence).toBeGreaterThan(0.8)
    })
    
    it('应该记录和解决冲突', async () => {
      // Mock AI返回冲突数据
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                dates: [],
                parties: [
                  {
                    name: '张三',
                    type: 'defendant', // 冲突：AI认为是被告
                    role: 'AI：被告',
                    confidence: 0.6
                  }
                ],
                amounts: [],
                legalClauses: [],
                facts: []
              })
            }
          }]
        })
      })
      
      const request = new NextRequest('http://localhost:3000/api/legal-intelligence/extract', {
        method: 'POST',
        body: JSON.stringify({
          text: '原告张三起诉。',
          options: { enableAI: true }
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      // 由于规则提取置信度更高，应该保留原告身份
      const zhangsan = data.data.parties.find((p: any) => p.name === '张三')
      expect(zhangsan?.type).toBe('plaintiff')
    })
  })
  
  describe('性能测试', () => {
    it('应该在合理时间内处理大文档', async () => {
      const largeText = '原告张三诉被告李四。'.repeat(1000)
      
      const startTime = Date.now()
      
      const request = new NextRequest('http://localhost:3000/api/legal-intelligence/extract', {
        method: 'POST',
        body: JSON.stringify({
          text: largeText,
          options: { enableAI: false } // 禁用AI以测试纯规则性能
        })
      })
      
      const response = await POST(request)
      const endTime = Date.now()
      
      expect(response.status).toBe(200)
      expect(endTime - startTime).toBeLessThan(2000) // 2秒内完成
    })
    
    it('应该处理并发请求', async () => {
      const requests = Array(5).fill(null).map(() => 
        new NextRequest('http://localhost:3000/api/legal-intelligence/extract', {
          method: 'POST',
          body: JSON.stringify({
            text: '测试文本',
            options: { enableAI: false }
          })
        })
      )
      
      const responses = await Promise.all(requests.map(req => POST(req)))
      const results = await Promise.all(responses.map(res => res.json()))
      
      results.forEach(result => {
        expect(result.success).toBe(true)
      })
    })
  })
  
  describe('元数据测试', () => {
    it('应该包含正确的元数据', async () => {
      const request = new NextRequest('http://localhost:3000/api/legal-intelligence/extract', {
        method: 'POST',
        body: JSON.stringify({
          text: '民事判决书内容',
          options: { enableAI: false }
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.metadata).toBeDefined()
      expect(data.metadata.documentType).toBeDefined()
      expect(data.metadata.confidence).toBeDefined()
      expect(data.metadata.extractionMethod).toBeDefined()
      expect(data.metadata.processingTime).toBeDefined()
    })
  })
})