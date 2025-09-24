/**
 * 德国法学请求权分析API
 * @description 基于德国法学Anspruchsmethode（请求权分析法）对法律案件进行深度分析
 * @author DeepPractice Legal Intelligence System
 * @version 1.0.0
 *
 * 核心功能：
 * - 请求权基础识别与法条依据分析
 * - 构成要件逐项审查
 * - 抗辩事由评估
 * - 举证责任分配
 * - 诉讼时效分析
 * - 策略建议生成
 */

import { NextRequest, NextResponse } from 'next/server'
import { analyzeClaimsWithAI } from '@/lib/ai-legal-agent'
import type { ClaimAnalysisRequest, ClaimAnalysisResult } from '../../../types/timeline-claim-analysis'

/**
 * POST /api/analyze-claims
 * @description 执行德国法学请求权分析
 * @param request - HTTP请求对象，包含案件时间轴和分析参数
 * @returns 结构化的请求权分析结果
 *
 * 请求体结构：
 * - events: 案件时间轴事件数组（必需）
 * - caseType: 案件类型（可选，默认'民事纠纷'）
 * - focusAreas: 重点分析领域数组（可选）
 * - depth: 分析深度 'quick' | 'comprehensive'（可选，默认'comprehensive'）
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: 解析并验证请求体
    const body: ClaimAnalysisRequest = await request.json()

    // Step 2: 提取请求参数，设置默认值
    const { events, caseType, focusAreas, depth = 'comprehensive' } = body

    // Step 3: 输入验证 - 检查事件数据完整性
    if (!events || events.length === 0) {
      return NextResponse.json(
        { error: '缺少事件数据' },
        { status: 400 }
      )
    }

    // 额外验证：检查事件数据结构
    const hasValidEvents = events.every(event =>
      event && typeof event === 'object' && event.date && event.title
    )

    if (!hasValidEvents) {
      return NextResponse.json(
        { error: '事件数据格式不正确，每个事件必须包含date和title字段' },
        { status: 400 }
      )
    }
    
    // Step 4: 构建德国法学请求权分析专业提示词
    // 使用Anspruchsmethode的标准分析框架
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
案件类型：${caseType || '民事纠纷'}
分析深度：${depth}
重点领域：${focusAreas?.join('、') || '全面分析'}

【时间轴事件】
${JSON.stringify(events, null, 2)}

【输出要求】
请以JSON格式返回分析结果，严格遵循ClaimAnalysisResult类型定义：
{
  "id": "分析ID",
  "timestamp": "时间戳",
  "claims": {
    "primary": [主要请求权结构数组],
    "alternative": [备选请求权数组],
    "defense": [抗辩事由数组]
  },
  "timeline": {
    "keyPoints": [关键时间点],
    "limitations": [时效期间],
    "sequence": [事件时序分析]
  },
  "legalRelations": [法律关系数组],
  "burdenOfProof": [举证责任分配],
  "strategy": {
    "recommendations": [策略建议],
    "risks": [风险提示],
    "opportunities": [机会点]
  },
  "metadata": {
    "model": "deepseek",
    "confidence": 0.85,
    "processingTime": 2000
  }
}
`

    // Step 5: 调用AI分析服务
    const startTime = Date.now()

    // 添加错误重试机制
    let aiResponse: any
    let retryCount = 0
    const maxRetries = 2

    while (retryCount <= maxRetries) {
      try {
        aiResponse = await analyzeClaimsWithAI(prompt)
        break // 成功则跳出循环
      } catch (aiError) {
        retryCount++
        console.warn(`AI分析第${retryCount}次尝试失败:`, aiError)

        if (retryCount > maxRetries) {
          throw new Error('AI分析服务多次调用失败')
        }

        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
      }
    }

    const processingTime = Date.now() - startTime
    
    // Step 6: 解析AI响应并构建结构化结果
    let analysisResult: ClaimAnalysisResult

    try {
      // 尝试从AI响应中提取JSON（支持多种JSON格式）
      let jsonContent = ''

      // 方法1: 寻找完整的JSON对象
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonContent = jsonMatch[0]
      }

      // 方法2: 如果方法1失败，尝试寻找markdown代码块中的JSON
      if (!jsonContent) {
        const codeBlockMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
        if (codeBlockMatch) {
          jsonContent = codeBlockMatch[1]
        }
      }

      // 尝试解析JSON
      if (jsonContent) {
        // 清理可能的格式问题
        const cleanedJson = jsonContent
          .replace(/[\u201c\u201d]/g, '"') // 替换中文引号
          .replace(/[\u2018\u2019]/g, "'") // 替换中文单引号
          .replace(/,\s*}/g, '}') // 移除多余的逗号
          .replace(/,\s*]/g, ']')

        analysisResult = JSON.parse(cleanedJson)
        console.log('✅ 成功解析AI返回的JSON结果')
      } else {
        // 如果没有找到JSON，构造默认结果
        console.warn('⚠️  AI响应中未找到有效JSON，使用默认结果')
        analysisResult = createDefaultAnalysisResult(events, aiResponse, processingTime)
      }
    } catch (parseError) {
      // JSON解析失败，返回基础分析结果
      console.error('❌ JSON解析失败:', parseError)
      console.log('原始AI响应:', aiResponse?.substring?.(0, 500))
      analysisResult = createDefaultAnalysisResult(events, aiResponse, processingTime)
    }

    // Step 7: 数据完整性检查和字段补全
    analysisResult = validateAndCompleteResult(analysisResult, processingTime)

    // Step 8: 返回最终分析结果
    return NextResponse.json(analysisResult)

  } catch (error) {
    // 统一错误处理和日志记录
    console.error('❌ 请求权分析API错误:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      {
        error: '分析失败，请稍后重试',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
      },
      { status: 500 }
    )
  }
}

// ========== 辅助函数区域 ==========

/**
 * 验证和完善分析结果
 * @description 确保分析结果包含所有必需字段，并进行数据完整性检查
 * @param result - 原始分析结果
 * @param processingTime - 处理时间（毫秒）
 * @returns 完整的分析结果对象
 */
function validateAndCompleteResult(
  result: ClaimAnalysisResult,
  processingTime: number
): ClaimAnalysisResult {
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
    processingTime
  }

  return result
}

/**
 * 创建默认分析结果
 * @description 当AI分析失败时，基于事件数据生成基础分析结果
 * @param events - 时间轴事件数组
 * @param aiText - AI原始响应文本（用于尝试提取部分信息）
 * @param processingTime - 处理时间（毫秒）
 * @returns 默认的分析结果对象
 */
function createDefaultAnalysisResult(
  events: any[],
  aiText: any,
  processingTime: number
): ClaimAnalysisResult {
  // 从事件中提取关键时间点
  const keyPoints = events
    .filter(e => e.importance === 'critical' || e.importance === 'high')
    .slice(0, 5) // 限制最多5个关键点
    .map(e => ({
      date: e.date,
      event: e.title,
      significance: e.description || '需要进一步分析',
      impact: 'evidence' as const
    }))

  // 如果没有标记重要性的事件，取前3个事件作为关键点
  if (keyPoints.length === 0) {
    keyPoints.push(
      ...events.slice(0, 3).map(e => ({
        date: e.date,
        event: e.title,
        significance: e.description || '案件发展中的重要节点',
        impact: 'evidence' as const
      }))
    )
  }

  // 尝试从AI文本中提取策略信息
  const recommendations = extractBulletPoints(aiText, '建议') || extractBulletPoints(aiText, '策略')
  const risks = extractBulletPoints(aiText, '风险') || extractBulletPoints(aiText, '注意')
  const opportunities = extractBulletPoints(aiText, '机会') || extractBulletPoints(aiText, '优势')

  // 分析时间跨度，用于时效建议
  const dates = events.map(e => new Date(e.date)).filter(d => !isNaN(d.getTime())).sort()
  const timeSpan = dates.length > 1 ?
    Math.ceil((dates[dates.length - 1]!.getTime() - dates[0]!.getTime()) / (1000 * 60 * 60 * 24)) : 0

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
      limitations: timeSpan > 0 ? [
        {
          claim: '一般民事请求权',
          startDate: dates[0]?.toISOString() || '',
          endDate: new Date(new Date(dates[0] || new Date()).getTime() + 36 * 30 * 24 * 60 * 60 * 1000).toISOString(),
          period: 36, // 36个月（3年）
          status: 'running' as const,
          events: []
        }
      ] : [],
      sequence: events.map((e, index) => `${index + 1}. ${e.title} (${e.date})`)
    },
    legalRelations: [],
    burdenOfProof: [],
    strategy: {
      recommendations: recommendations.length > 0 ? recommendations : [
        '建议进一步分析案件细节',
        '收集和整理相关证据材料',
        '明确各方当事人的权利义务关系'
      ],
      risks: risks.length > 0 ? risks : [
        '需要评估证据充分性',
        '注意诉讼时效问题',
        '关注可能的抗辩事由'
      ],
      opportunities: opportunities.length > 0 ? opportunities : [
        '可探索和解可能性',
        '评估调解程序的适用性'
      ]
    },
    metadata: {
      model: 'deepseek',
      confidence: 0.7, // 默认结果的置信度较低
      processingTime
      // fallback信息可以通过confidence低于0.8来判断
    }
  }
}

/**
 * 从AI响应文本中提取特定关键词相关的要点列表
 * @description 解析AI返回的自然语言文本，提取指定关键词后的列表项
 * @param text - AI响应的原始文本
 * @param keyword - 要搜索的关键词（如：'建议'、'风险'、'机会'）
 * @returns 提取到的要点数组
 *
 * 支持的格式：
 * - 以'-'开头的列表项
 * - 以'•'开头的列表项
 * - 以数字开头的列表项（如：'1.'、'2.'等）
 * - 关键词后的空行表示列表结束
 */
function extractBulletPoints(text: string, keyword: string): string[] {
  // 确保text是字符串，避免类型错误
  const textStr = typeof text === 'string' ? text : String(text || '')
  const lines = textStr.split('\n')
  const points: string[] = []
  let inSection = false

  for (const line of lines) {
    const trimmedLine = line.trim()

    // 检查是否找到了目标关键词的部分
    if (trimmedLine.includes(keyword)) {
      inSection = true
      continue
    }

    // 如果在目标部分，提取列表项
    if (inSection) {
      // 支持多种列表格式
      if (trimmedLine.startsWith('-') ||
          trimmedLine.startsWith('•') ||
          trimmedLine.startsWith('*') ||
          /^\d+\./.test(trimmedLine)) {

        // 清理列表标记并添加到结果中
        let cleanedPoint = trimmedLine
          .replace(/^[-•*]/, '') // 移除破折号、圆点、星号
          .replace(/^\d+\./, '') // 移除数字序号
          .trim()

        if (cleanedPoint) {
          points.push(cleanedPoint)
        }
      } else if (trimmedLine === '') {
        // 遇到空行，结束当前部分的提取
        break
      }
    }
  }

  return points
}