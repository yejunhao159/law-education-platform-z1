/**
 * AI请求权分析器
 * 基于德国法学请求权分析法（Anspruchsmethode）
 * 使用专门的prompt模板进行请求权识别和构成要件检验
 */

import { DeepSeekLegalAgent } from './ai-legal-agent'
import type {
  TimelineEvent,
  ClaimAnalysisResult,
  ClaimAnalysisRequest,
  ClaimStructure,
  DefenseStructure,
  ClaimElement,
  TimelineKeyPoint,
  LimitationPeriod
} from '@/types/timeline-claim-analysis'

export class AIClaimAnalyzer extends DeepSeekLegalAgent {
  
  /**
   * 主入口：分析时间轴事件的请求权结构
   */
  async analyzeClaimStructure(request: ClaimAnalysisRequest): Promise<ClaimAnalysisResult> {
    const startTime = Date.now()
    
    try {
      console.log('🎯 开始AI请求权分析...')
      console.log('📊 分析参数:', {
        eventCount: request.events.length,
        focusAreas: request.focusAreas,
        depth: request.depth
      })

      // 并行执行分析任务
      const [claims, timeline, burdenOfProof, legalRelations] = await Promise.all([
        this.analyzeClaims(request.events, request.depth || 'detailed'),
        this.analyzeTimeline(request.events),
        this.analyzeBurdenOfProof(request.events),
        this.analyzeLegalRelations(request.events)
      ])

      // 生成策略建议
      const strategy = await this.generateStrategy(claims, timeline, burdenOfProof)

      const result: ClaimAnalysisResult = {
        id: `analysis-${Date.now()}`,
        timestamp: new Date().toISOString(),
        caseId: request.events[0]?.id || undefined,
        claims,
        timeline,
        legalRelations,
        burdenOfProof,
        strategy,
        metadata: {
          model: 'deepseek-chat-claim-analysis',
          confidence: this.calculateAnalysisConfidence(claims, timeline),
          processingTime: Date.now() - startTime,
          tokensUsed: 0 // 将由API返回填充
        }
      }

      console.log('✅ 请求权分析完成')
      return result

    } catch (error) {
      console.error('❌ 请求权分析失败:', error)
      throw new Error(`请求权分析失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 分析请求权结构
   */
  private async analyzeClaims(events: TimelineEvent[], depth: string): Promise<{
    primary: ClaimStructure[]
    alternative: ClaimStructure[]
    defense: DefenseStructure[]
  }> {
    const prompt = this.buildClaimAnalysisPrompt(events, depth)
    
    try {
      const response = await this.callDeepSeekAPI(prompt)
      return this.parseClaimsResponse(response)
    } catch (error) {
      console.error('请求权分析失败:', error)
      return this.getDefaultClaimsStructure()
    }
  }

  /**
   * 构建请求权分析的prompt模板
   */
  private buildClaimAnalysisPrompt(events: TimelineEvent[], depth: string): string {
    const eventsSummary = events.map((e, i) => 
      `${i + 1}. ${e.date} - ${e.title}: ${e.description}${e.claims ? ` [涉及${e.claims.type}请求权]` : ''}`
    ).join('\n')

    return `你是一位精通德国法学请求权分析法（Anspruchsmethode）的专业法律分析师。请基于以下时间轴事件进行系统的请求权分析。

## 分析方法论
采用德国法学的请求权分析法（Anspruchsmethode），按以下步骤：
1. 识别可能的请求权基础（Anspruchsgrundlage）
2. 检验请求权的构成要件（Tatbestandsmerkmale）
3. 考虑排除和消灭事由（Einwendungen und Einreden）
4. 分析抗辩事由（Einwände）
5. 确定请求权的成立与否

## 请求权类型体系
- 合同请求权（Vertragliche Ansprüche）
- 侵权请求权（Deliktsrechtliche Ansprüche）
- 不当得利请求权（Bereicherungsrechtliche Ansprüche）
- 物权请求权（Sachenrechtliche Ansprüche）
- 其他请求权

## 时间轴事件
${eventsSummary}

## 分析深度
${depth === 'comprehensive' ? '进行全面深度分析，包含详细的法条引用和构成要件检验' : 
  depth === 'detailed' ? '进行详细分析，重点关注主要请求权和抗辩事由' : 
  '进行基础分析，识别主要请求权结构'}

请以JSON格式返回分析结果：
{
  "primary": [
    {
      "id": "claim-1",
      "basis": "民法典第XXX条",
      "basisText": "法条全文",
      "type": "primary",
      "elements": [
        {
          "name": "构成要件名称",
          "description": "要件说明",
          "satisfied": true,
          "evidence": ["支撑证据"],
          "analysis": "分析说明"
        }
      ],
      "conclusion": "established|partial|failed",
      "reasoning": "推理过程",
      "priority": 1
    }
  ],
  "alternative": [
    {
      "id": "claim-alt-1",
      "basis": "备选请求权基础",
      "type": "alternative",
      "elements": [...],
      "conclusion": "established|partial|failed",
      "reasoning": "推理过程"
    }
  ],
  "defense": [
    {
      "id": "defense-1",
      "type": "denial|excuse|objection|counterclaim",
      "basis": "抗辩依据",
      "description": "抗辩理由",
      "evidence": ["支撑证据"],
      "impact": "blocks-claim|reduces-claim|no-impact"
    }
  ]
}`
  }

  /**
   * 分析时间关系
   */
  private async analyzeTimeline(events: TimelineEvent[]): Promise<{
    keyPoints: TimelineKeyPoint[]
    limitations: LimitationPeriod[]
    sequence: string[]
  }> {
    const prompt = this.buildTimelineAnalysisPrompt(events)
    
    try {
      const response = await this.callDeepSeekAPI(prompt)
      return this.parseTimelineResponse(response)
    } catch (error) {
      console.error('时间轴分析失败:', error)
      return this.getDefaultTimelineAnalysis(events)
    }
  }

  /**
   * 构建时间轴分析prompt
   */
  private buildTimelineAnalysisPrompt(events: TimelineEvent[]): string {
    const timelineEvents = events
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((e, i) => `${i + 1}. ${e.date} - ${e.title} [${e.type}]`)
      .join('\n')

    return `你是一位专业的法律时效分析专家。请分析以下时间轴事件的法律意义和时效影响。

## 时间轴事件（按时间顺序）
${timelineEvents}

## 分析要求
1. 识别关键法律时间点及其意义
2. 分析诉讼时效的起算、中止、中断
3. 构建事件间的因果关系链
4. 评估时效风险

请以JSON格式返回：
{
  "keyPoints": [
    {
      "date": "YYYY-MM-DD",
      "event": "事件描述",
      "significance": "法律意义",
      "impact": "claim-creation|claim-modification|claim-extinction|evidence|procedure"
    }
  ],
  "limitations": [
    {
      "claim": "涉及的请求权",
      "startDate": "起算日",
      "endDate": "届满日",
      "period": 36,
      "status": "running|expired|suspended|interrupted",
      "events": [
        {
          "date": "YYYY-MM-DD",
          "type": "suspension|interruption|restart",
          "reason": "中止/中断原因"
        }
      ]
    }
  ],
  "sequence": ["事件间逻辑关系说明"]
}`
  }

  /**
   * 分析举证责任
   */
  private async analyzeBurdenOfProof(events: TimelineEvent[]): Promise<Array<{
    fact: string
    party: string
    evidence: string[]
    gap?: string[]
    evaluation: 'sufficient' | 'insufficient' | 'disputed'
  }>> {
    const prompt = this.buildBurdenOfProofPrompt(events)
    
    try {
      const response = await this.callDeepSeekAPI(prompt)
      return this.parseBurdenOfProofResponse(response)
    } catch (error) {
      console.error('举证责任分析失败:', error)
      return []
    }
  }

  /**
   * 构建举证责任分析prompt
   */
  private buildBurdenOfProofPrompt(events: TimelineEvent[]): string {
    const evidenceEvents = events
      .filter(e => e.burdenOfProof || e.type === 'evidence')
      .map(e => `- ${e.title}: ${e.description}`)
      .join('\n')

    return `你是一位专业的诉讼法专家。请分析以下案件中的举证责任分配。

## 相关证据事件
${evidenceEvents}

## 分析要求
1. 按"谁主张，谁举证"原则分配举证责任
2. 识别举证责任倒置情形
3. 评估现有证据的充分性
4. 指出证据缺口

请以JSON格式返回：
[
  {
    "fact": "需要证明的争议事实",
    "party": "原告|被告|第三人",
    "evidence": ["现有证据1", "现有证据2"],
    "gap": ["缺失的证据"],
    "evaluation": "sufficient|insufficient|disputed"
  }
]`
  }

  /**
   * 分析法律关系
   */
  private async analyzeLegalRelations(events: TimelineEvent[]): Promise<Array<{
    type: string
    parties: any[]
    startDate?: string
    endDate?: string
    status: 'active' | 'terminated' | 'disputed'
  }>> {
    const legalRelationEvents = events.filter(e => e.legalRelation)
    
    return legalRelationEvents.map(event => ({
      type: event.legalRelation!.type,
      parties: event.legalRelation!.parties.map(name => ({ name, type: '当事人' })),
      startDate: event.date,
      status: event.legalRelation!.change === 'terminated' ? 'terminated' : 'active'
    }))
  }

  /**
   * 生成策略建议
   */
  private async generateStrategy(
    claims: any,
    timeline: any,
    burdenOfProof: any[]
  ): Promise<{
    recommendations: string[]
    risks: string[]
    opportunities: string[]
  }> {
    const prompt = `基于以下分析结果，请提供专业的诉讼策略建议：

## 请求权分析结果
主要请求权: ${claims.primary.length}项
备选请求权: ${claims.alternative.length}项
抗辩事由: ${claims.defense.length}项

## 举证责任
需要举证的争点: ${burdenOfProof.length}个
证据不足的争点: ${burdenOfProof.filter(b => b.evaluation === 'insufficient').length}个

请以JSON格式返回：
{
  "recommendations": ["具体的行动建议"],
  "risks": ["需要注意的风险点"],
  "opportunities": ["可以利用的机会点"]
}`

    try {
      const response = await this.callDeepSeekAPI(prompt)
      return response || { recommendations: [], risks: [], opportunities: [] }
    } catch (error) {
      return {
        recommendations: ['建议寻求专业法律意见'],
        risks: ['分析可能不完整，请谨慎使用'],
        opportunities: []
      }
    }
  }

  /**
   * 解析请求权分析响应
   */
  private parseClaimsResponse(response: any): {
    primary: ClaimStructure[]
    alternative: ClaimStructure[]
    defense: DefenseStructure[]
  } {
    if (!response || typeof response === 'string') {
      return this.getDefaultClaimsStructure()
    }

    return {
      primary: Array.isArray(response.primary) ? response.primary.map(this.parseClaimStructure) : [],
      alternative: Array.isArray(response.alternative) ? response.alternative.map(this.parseClaimStructure) : [],
      defense: Array.isArray(response.defense) ? response.defense.map(this.parseDefenseStructure) : []
    }
  }

  /**
   * 解析单个请求权结构
   */
  private parseClaimStructure = (claim: any): ClaimStructure => ({
    id: claim.id || `claim-${Date.now()}`,
    basis: claim.basis || '',
    basisText: claim.basisText,
    type: claim.type || 'primary',
    elements: Array.isArray(claim.elements) ? claim.elements.map((e: any) => ({
      name: e.name || '',
      description: e.description || '',
      satisfied: e.satisfied === true,
      evidence: Array.isArray(e.evidence) ? e.evidence : [],
      analysis: e.analysis
    })) : [],
    conclusion: claim.conclusion || 'failed',
    reasoning: claim.reasoning,
    priority: claim.priority || 1
  })

  /**
   * 解析抗辩结构
   */
  private parseDefenseStructure = (defense: any): DefenseStructure => ({
    id: defense.id || `defense-${Date.now()}`,
    type: defense.type || 'denial',
    basis: defense.basis || '',
    description: defense.description || '',
    evidence: Array.isArray(defense.evidence) ? defense.evidence : [],
    impact: defense.impact || 'no-impact'
  })

  /**
   * 解析时间轴分析响应
   */
  private parseTimelineResponse(response: any): {
    keyPoints: TimelineKeyPoint[]
    limitations: LimitationPeriod[]
    sequence: string[]
  } {
    if (!response || typeof response === 'string') {
      return {
        keyPoints: [],
        limitations: [],
        sequence: []
      }
    }

    return {
      keyPoints: Array.isArray(response.keyPoints) ? response.keyPoints.map((kp: any) => ({
        date: kp.date || '',
        event: kp.event || '',
        significance: kp.significance || '',
        impact: kp.impact || 'evidence'
      })) : [],
      limitations: Array.isArray(response.limitations) ? response.limitations.map((lp: any) => ({
        claim: lp.claim || '',
        startDate: lp.startDate || '',
        endDate: lp.endDate || '',
        period: lp.period || 36,
        status: lp.status || 'running',
        events: Array.isArray(lp.events) ? lp.events : []
      })) : [],
      sequence: Array.isArray(response.sequence) ? response.sequence : []
    }
  }

  /**
   * 解析举证责任响应
   */
  private parseBurdenOfProofResponse(response: any): Array<{
    fact: string
    party: string
    evidence: string[]
    gap?: string[]
    evaluation: 'sufficient' | 'insufficient' | 'disputed'
  }> {
    if (!Array.isArray(response)) return []

    return response.map((burden: any) => ({
      fact: burden.fact || '',
      party: burden.party || '',
      evidence: Array.isArray(burden.evidence) ? burden.evidence : [],
      gap: Array.isArray(burden.gap) ? burden.gap : undefined,
      evaluation: burden.evaluation || 'insufficient'
    }))
  }

  /**
   * 计算分析置信度
   */
  private calculateAnalysisConfidence(claims: any, timeline: any): number {
    let confidence = 0
    
    // 基于分析结果的完整性计算置信度
    if (claims.primary.length > 0) confidence += 30
    if (claims.defense.length > 0) confidence += 20
    if (timeline.keyPoints.length > 0) confidence += 25
    if (timeline.limitations.length > 0) confidence += 25
    
    return Math.min(confidence, 100)
  }

  /**
   * 默认请求权结构
   */
  private getDefaultClaimsStructure(): {
    primary: ClaimStructure[]
    alternative: ClaimStructure[]
    defense: DefenseStructure[]
  } {
    return {
      primary: [],
      alternative: [],
      defense: []
    }
  }

  /**
   * 默认时间轴分析
   */
  private getDefaultTimelineAnalysis(events: TimelineEvent[]): {
    keyPoints: TimelineKeyPoint[]
    limitations: LimitationPeriod[]
    sequence: string[]
  } {
    // 基于事件生成基础的时间点分析
    const keyPoints: TimelineKeyPoint[] = events
      .filter(e => e.importance === 'critical')
      .map(e => ({
        date: e.date,
        event: e.title,
        significance: '需要进一步分析',
        impact: 'evidence' as const
      }))

    return {
      keyPoints,
      limitations: [],
      sequence: []
    }
  }
}

/**
 * 导出便捷函数
 */
export async function analyzeTimelineClaimsWithAI(
  request: ClaimAnalysisRequest
): Promise<ClaimAnalysisResult> {
  const analyzer = new AIClaimAnalyzer()
  return analyzer.analyzeClaimStructure(request)
}

/**
 * 创建请求权分析请求的辅助函数
 */
export function createClaimAnalysisRequest(
  events: TimelineEvent[],
  options?: {
    caseType?: string
    focusAreas?: Array<'claims' | 'defenses' | 'limitations' | 'burden-of-proof'>
    depth?: 'basic' | 'detailed' | 'comprehensive'
  }
): ClaimAnalysisRequest {
  return {
    events: events.filter(e => e.description && e.date), // 过滤无效事件
    caseType: options?.caseType,
    focusAreas: options?.focusAreas || ['claims', 'defenses', 'limitations', 'burden-of-proof'],
    depth: options?.depth || 'detailed'
  }
}