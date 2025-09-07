import { NextRequest, NextResponse } from 'next/server'
import { analyzeClaimsWithAI } from '@/lib/ai-legal-agent'
import type { ClaimAnalysisRequest, ClaimAnalysisResult } from '@/types/timeline-claim-analysis'

export async function POST(request: NextRequest) {
  try {
    const body: ClaimAnalysisRequest = await request.json()
    
    const { events, caseType, focusAreas, depth = 'comprehensive' } = body
    
    if (!events || events.length === 0) {
      return NextResponse.json(
        { error: '缺少事件数据' },
        { status: 400 }
      )
    }
    
    // 构建分析提示词
    const prompt = `
你是一位精通德国法学请求权分析法（Anspruchsmethode）的法律专家。
请对以下案件时间轴进行深度请求权分析，重点关注：
1. 请求权基础识别（法条依据）
2. 构成要件分析（每个要件是否满足）
3. 抗辩事由评估
4. 举证责任分配
5. 时效问题
6. 策略建议

案件类型：${caseType || '民事纠纷'}
分析深度：${depth}
重点领域：${focusAreas?.join('、') || '全面分析'}

时间轴事件：
${JSON.stringify(events, null, 2)}

请以JSON格式返回分析结果，严格遵循ClaimAnalysisResult类型定义：
{
  "id": "分析ID",
  "timestamp": "时间戳",
  "claims": {
    "primary": [请求权结构数组],
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
    
    // 调用AI分析
    const startTime = Date.now()
    const aiResponse = await analyzeClaimsWithAI(prompt)
    const processingTime = Date.now() - startTime
    
    // 解析AI响应
    let analysisResult: ClaimAnalysisResult
    try {
      // 尝试从AI响应中提取JSON
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0])
      } else {
        // 如果没有找到JSON，构造默认结果
        analysisResult = createDefaultAnalysisResult(events, aiResponse, processingTime)
      }
    } catch (parseError) {
      // 解析失败，返回基础分析结果
      analysisResult = createDefaultAnalysisResult(events, aiResponse, processingTime)
    }
    
    // 确保结果包含必要字段
    analysisResult.id = analysisResult.id || `analysis-${Date.now()}`
    analysisResult.timestamp = analysisResult.timestamp || new Date().toISOString()
    analysisResult.metadata = {
      ...analysisResult.metadata,
      model: 'deepseek',
      processingTime
    }
    
    return NextResponse.json(analysisResult)
    
  } catch (error) {
    console.error('请求权分析错误:', error)
    return NextResponse.json(
      { error: '分析失败，请稍后重试' },
      { status: 500 }
    )
  }
}

// 创建默认分析结果
function createDefaultAnalysisResult(
  events: any[],
  aiText: any,
  processingTime: number
): ClaimAnalysisResult {
  // 从事件中提取基础信息
  const keyPoints = events
    .filter(e => e.importance === 'critical')
    .map(e => ({
      date: e.date,
      event: e.title,
      significance: e.description,
      impact: 'evidence' as const
    }))
  
  // 尝试从AI文本中提取一些信息
  const recommendations = extractBulletPoints(aiText, '建议')
  const risks = extractBulletPoints(aiText, '风险')
  
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
      sequence: events.map(e => e.title)
    },
    legalRelations: [],
    burdenOfProof: [],
    strategy: {
      recommendations: recommendations.length > 0 ? recommendations : ['建议进一步分析案件细节'],
      risks: risks.length > 0 ? risks : ['需要评估证据充分性'],
      opportunities: ['可探索和解可能性']
    },
    metadata: {
      model: 'deepseek',
      confidence: 0.7,
      processingTime
    }
  }
}

// 从文本中提取要点
function extractBulletPoints(text: string, keyword: string): string[] {
  // 确保text是字符串
  const textStr = typeof text === 'string' ? text : String(text || '')
  const lines = textStr.split('\n')
  const points: string[] = []
  let inSection = false
  
  for (const line of lines) {
    if (line.includes(keyword)) {
      inSection = true
      continue
    }
    if (inSection && line.trim().startsWith('-')) {
      points.push(line.trim().substring(1).trim())
    }
    if (inSection && line.trim() === '') {
      break
    }
  }
  
  return points
}