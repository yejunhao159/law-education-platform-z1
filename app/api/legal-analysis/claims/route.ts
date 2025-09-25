/**
 * 统一请求权分析API
 * @description 整合德国法学请求权分析法（Anspruchsmethode）和时间轴分析，提供综合性请求权分析
 * @author DeepPractice Legal Intelligence System
 * @version 2.0.0
 *
 * 核心功能：
 * - 德国法学请求权分析法（Anspruchsmethode）
 * - 时间轴事件请求权映射分析
 * - 多层级请求权基础识别
 * - 构成要件逐项审查
 * - 抗辩事由发现与评估
 * - 举证责任智能分配
 * - 诉讼时效自动计算
 * - 综合策略建议生成
 */

import { NextRequest, NextResponse } from 'next/server'
import { analyzeClaimsWithAI } from '@/lib/ai-legal-agent'
import { analyzeTimelineClaimsWithAI } from '@/src/domains/legal-analysis/services/ClaimAnalysisService'
import type { ClaimAnalysisRequest, ClaimAnalysisResult } from '../../../../types/timeline-claim-analysis'

/**
 * POST /api/legal-analysis/claims
 * @description 执行综合性请求权分析，支持传统分析和时间轴分析两种模式
 * @param request - HTTP请求对象，包含案件数据和分析配置
 * @returns 结构化的请求权分析结果
 *
 * 请求体结构：
 * - events: TimelineEvent[] - 时间轴事件数组（必需）
 * - caseType?: string - 案件类型标识
 * - focusAreas?: string[] - 重点分析领域
 * - depth?: 'quick'|'basic'|'detailed'|'comprehensive' - 分析深度级别
 * - analysisMethod?: 'traditional'|'timeline'|'hybrid' - 分析方法（默认：hybrid）
 *
 * 响应结构：
 * - ClaimAnalysisResult - 包含请求权、时效、举证责任等完整分析
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Step 1: 解析并验证请求体
    const body: ClaimAnalysisRequest & { analysisMethod?: 'traditional' | 'timeline' | 'hybrid' } = await request.json()

    console.log('🎯 Received unified claim analysis request:', {
      eventCount: body.events?.length || 0,
      caseType: body.caseType,
      depth: body.depth,
      analysisMethod: body.analysisMethod || 'hybrid'
    })

    // Step 2: 输入数据验证
    if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json(
        { error: '缺少事件数据' },
        { status: 400 }
      )
    }

    // 验证事件数据结构
    const hasValidEvents = body.events.every(event =>
      event && typeof event === 'object' && event.date && event.title
    )

    if (!hasValidEvents) {
      return NextResponse.json(
        { error: '事件数据格式不正确，每个事件必须包含date和title字段' },
        { status: 400 }
      )
    }

    // Step 3: 设置分析参数和默认值
    const { events, caseType, focusAreas, depth: requestDepth = 'comprehensive', analysisMethod = 'hybrid' } = body

    // 映射深度参数以保持向后兼容性
    let depth: 'basic' | 'detailed' | 'comprehensive' = 'comprehensive'
    if ((requestDepth as string) === 'quick') {
      depth = 'basic'
    } else if (['basic', 'detailed', 'comprehensive'].includes(requestDepth)) {
      depth = requestDepth as 'basic' | 'detailed' | 'comprehensive'
    }

    const analysisRequest: ClaimAnalysisRequest = {
      events,
      caseType: caseType || '民事纠纷',
      focusAreas: focusAreas || ['claims', 'defenses', 'limitations', 'burden-of-proof'],
      depth
    }

    let analysisResult: ClaimAnalysisResult

    // Step 4: 根据分析方法选择处理策略
    switch (analysisMethod) {
      case 'traditional':
        // 使用传统德国法学分析法
        analysisResult = await performTraditionalAnalysis(analysisRequest)
        break

      case 'timeline':
        // 使用时间轴分析法
        analysisResult = await analyzeTimelineClaimsWithAI(analysisRequest)
        break

      case 'hybrid':
      default:
        // 使用混合分析法（推荐）- 结合两种方法的优势
        analysisResult = await performHybridAnalysis(analysisRequest)
        break
    }

    // Step 5: 完善分析结果
    const processingTime = Date.now() - startTime

    const result: ClaimAnalysisResult = {
      ...analysisResult,
      metadata: {
        ...analysisResult.metadata,
        processingTime,
        model: 'deepseek'
      }
    }

    console.log('✅ Unified claim analysis completed in', processingTime, 'ms')
    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Unified claim analysis error:', error)
    const processingTime = Date.now() - startTime

    // 分类错误处理
    if (error instanceof Error) {
      if (error.message.includes('API Key未配置') || error.message.includes('API错误')) {
        return NextResponse.json(
          {
            error: 'AI服务暂时不可用，请稍后重试',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          },
          { status: 503 }
        )
      }

      if (error.message.includes('分析请求失败') || error.message.includes('事件数据')) {
        return NextResponse.json(
          {
            error: '分析请求失败，请检查输入数据',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      {
        error: '分析失败，请稍后重试',
        processingTime,
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}

// ========== 分析方法实现 ==========

/**
 * 传统德国法学分析法
 * @description 使用传统的Anspruchsmethode进行详细分析
 */
async function performTraditionalAnalysis(request: ClaimAnalysisRequest): Promise<ClaimAnalysisResult> {
  const { events, caseType, focusAreas, depth } = request

  // 构建德国法学请求权分析专业提示词
  const prompt = `
你是一位精通德国法学请求权分析法（Anspruchsmethode）的法律专家。
请对以下案件时间轴进行深度请求权分析，重点关注：

【分析框架】
1. 请求权基础识别（Anspruchsgrundlage）
   - 合同请求权（Vertraglicher Anspruch）
   - 侵权请求权（Deliktischer Anspruch）
   - 无因管理、不当得利请求权

2. 构成要件分析（Tatbestandsmerkmale）
   - 客观构成要件审查
   - 主观构成要件审查
   - 违法性（Rechtswidrigkeit）
   - 有责性（Verschulden）

3. 抗辩事由评估（Einwendungen und Einreden）
   - 同时履行抗辩权
   - 时效抗辩
   - 其他阻却事由

4. 举证责任分配（Beweislast）
5. 诉讼时效分析（Verjährung）
6. 策略建议（Strategische Empfehlungen）

【案件信息】
案件类型：${caseType}
分析深度：${depth}
重点领域：${focusAreas?.join('、') || '全面分析'}

【时间轴事件】
${JSON.stringify(events, null, 2)}

请以JSON格式返回分析结果，严格遵循ClaimAnalysisResult类型定义。`

  // 执行AI分析并处理响应
  const aiResponse = await analyzeClaimsWithAI(prompt)

  // 解析AI响应
  let analysisResult: ClaimAnalysisResult

  try {
    const jsonContent = extractJSONFromResponse(aiResponse)
    analysisResult = JSON.parse(jsonContent)
  } catch (parseError) {
    console.warn('⚠️  Traditional analysis JSON parsing failed, using fallback')
    analysisResult = createDefaultAnalysisResult(events, Date.now())
  }

  return validateAndCompleteResult(analysisResult)
}

/**
 * 混合分析法
 * @description 结合传统分析和时间轴分析的优势，提供最全面的分析结果
 */
async function performHybridAnalysis(request: ClaimAnalysisRequest): Promise<ClaimAnalysisResult> {
  try {
    // 并行执行两种分析方法
    const [traditionalResult, timelineResult] = await Promise.allSettled([
      performTraditionalAnalysis(request),
      analyzeTimelineClaimsWithAI(request)
    ])

    // 提取成功的分析结果
    const traditional = traditionalResult.status === 'fulfilled' ? traditionalResult.value : null
    const timeline = timelineResult.status === 'fulfilled' ? timelineResult.value : null

    // 如果两种方法都失败，抛出错误
    if (!traditional && !timeline) {
      throw new Error('所有分析方法都失败了')
    }

    // 优先使用时间轴分析结果，用传统分析结果补充
    const baseResult = timeline || traditional!
    const supplementResult = timeline ? traditional : null

    // 合并分析结果
    const mergedResult: ClaimAnalysisResult = {
      ...baseResult,
      id: `hybrid-${Date.now()}`,
      claims: {
        primary: mergeClaims(baseResult.claims?.primary, supplementResult?.claims?.primary),
        alternative: mergeClaims(baseResult.claims?.alternative, supplementResult?.claims?.alternative),
        defense: mergeClaims(baseResult.claims?.defense, supplementResult?.claims?.defense)
      },
      strategy: {
        recommendations: mergeStringArrays(
          baseResult.strategy?.recommendations,
          supplementResult?.strategy?.recommendations
        ),
        risks: mergeStringArrays(
          baseResult.strategy?.risks,
          supplementResult?.strategy?.risks
        ),
        opportunities: mergeStringArrays(
          baseResult.strategy?.opportunities,
          supplementResult?.strategy?.opportunities
        )
      },
      metadata: {
        ...baseResult.metadata,
        confidence: Math.max(
          baseResult.metadata?.confidence || 0.8,
          supplementResult?.metadata?.confidence || 0.8
        ),
        // analysisMethod: 'hybrid' // 注释掉因为metadata接口可能不包含此字段
      }
    }

    return mergedResult

  } catch (error) {
    console.error('Hybrid analysis failed, falling back to traditional analysis:', error)
    return performTraditionalAnalysis(request)
  }
}

// ========== 辅助函数 ==========

function extractJSONFromResponse(response: string): string {
  // 尝试提取JSON内容
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (jsonMatch && jsonMatch[0]) {
    return jsonMatch[0]
      .replace(/[\u201c\u201d]/g, '"') // 替换中文引号
      .replace(/[\u2018\u2019]/g, "'") // 替换中文单引号
      .replace(/,\s*}/g, '}') // 移除多余的逗号
      .replace(/,\s*]/g, ']')
  }

  // 尝试从代码块提取
  const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1]
  }

  throw new Error('No valid JSON found in response')
}

function mergeClaims(primary?: any[], secondary?: any[]): any[] {
  if (!secondary) return primary || []
  if (!primary) return secondary

  // 简单的数组合并去重（基于title或description）
  const merged = [...primary]
  for (const claim of secondary) {
    if (!merged.some(existing =>
      existing.title === claim.title || existing.description === claim.description
    )) {
      merged.push(claim)
    }
  }
  return merged
}

function mergeStringArrays(primary?: string[], secondary?: string[]): string[] {
  if (!secondary) return primary || []
  if (!primary) return secondary

  const merged = [...primary]
  for (const item of secondary) {
    if (!merged.includes(item)) {
      merged.push(item)
    }
  }
  return merged
}

function validateAndCompleteResult(result: ClaimAnalysisResult): ClaimAnalysisResult {
  // 确保基础字段存在
  result.id = result.id || `analysis-${Date.now()}`
  result.timestamp = result.timestamp || new Date().toISOString()

  // 确保claims结构完整
  if (!result.claims || typeof result.claims !== 'object') {
    result.claims = { primary: [], alternative: [], defense: [] }
  } else {
    result.claims.primary = result.claims.primary || []
    result.claims.alternative = result.claims.alternative || []
    result.claims.defense = result.claims.defense || []
  }

  // 确保timeline结构完整
  if (!result.timeline || typeof result.timeline !== 'object') {
    result.timeline = { keyPoints: [], limitations: [], sequence: [] }
  } else {
    result.timeline.keyPoints = result.timeline.keyPoints || []
    result.timeline.limitations = result.timeline.limitations || []
    result.timeline.sequence = result.timeline.sequence || []
  }

  // 确保其他必需字段
  result.legalRelations = result.legalRelations || []
  result.burdenOfProof = result.burdenOfProof || []

  // 确保strategy结构完整
  if (!result.strategy || typeof result.strategy !== 'object') {
    result.strategy = { recommendations: [], risks: [], opportunities: [] }
  } else {
    result.strategy.recommendations = result.strategy.recommendations || []
    result.strategy.risks = result.strategy.risks || []
    result.strategy.opportunities = result.strategy.opportunities || []
  }

  // 确保metadata完整
  result.metadata = {
    ...result.metadata,
    model: 'deepseek',
    confidence: result.metadata?.confidence || 0.8,
    processingTime: result.metadata?.processingTime || 0
  }

  return result
}

function createDefaultAnalysisResult(
  events: any[],
  processingTime: number
): ClaimAnalysisResult {
  // 从事件中提取关键时间点
  const keyPoints = events
    .slice(0, 5)
    .map(e => ({
      date: e.date,
      event: e.title,
      significance: e.description || '需要进一步分析',
      impact: 'evidence' as const
    }))

  return {
    id: `analysis-${Date.now()}`,
    timestamp: new Date().toISOString(),
    claims: {
      primary: [],
      alternative: [],
      defense: []
    },
    timeline: {
      keyPoints,
      limitations: [],
      sequence: events.map((e, index) => `${index + 1}. ${e.title} (${e.date})`)
    },
    legalRelations: [],
    burdenOfProof: [],
    strategy: {
      recommendations: [
        '建议进一步分析案件细节',
        '收集和整理相关证据材料',
        '明确各方当事人的权利义务关系'
      ],
      risks: [
        '需要评估证据充分性',
        '注意诉讼时效问题',
        '关注可能的抗辩事由'
      ],
      opportunities: [
        '可探索和解可能性',
        '评估调解程序的适用性'
      ]
    },
    metadata: {
      model: 'deepseek',
      confidence: 0.7,
      processingTime
    }
  }
}