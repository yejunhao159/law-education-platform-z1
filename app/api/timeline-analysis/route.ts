import { NextRequest, NextResponse } from 'next/server'
import { DocumentPreprocessor } from '@/lib/legal-intelligence/preprocessor'
import { RuleExtractor } from '@/lib/legal-intelligence/rule-extractor'
import { AIPromptOptimizer } from '@/lib/legal-intelligence/prompt-optimizer'
import { SmartMerger } from '@/lib/legal-intelligence/smart-merger'
import { ProvisionMapper } from '@/lib/legal-intelligence/provision-mapper'

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

/**
 * 时间轴AI分析API - 整合法律智能系统
 */
export async function POST(req: NextRequest) {
  try {
    const { events, analysisType = 'comprehensive' } = await req.json()
    
    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: '请提供时间轴事件数据' },
        { status: 400 }
      )
    }

    // 1. 将时间轴事件转换为文本
    const eventTexts = events.map(e => 
      `${e.date}：${e.title}。${e.description || ''}`
    ).join('\n')
    
    console.log('🚀 开始时间轴智能分析...')
    
    // 2. 使用法律智能系统分析
    const processedDoc = DocumentPreprocessor.processDocument(eventTexts)
    const ruleData = RuleExtractor.extract(processedDoc)
    
    // 3. 获取AI深度分析
    let aiAnalysis = null
    if (DEEPSEEK_API_KEY) {
      try {
        const prompt = `分析以下法律案件时间轴，提供专业见解：

时间轴事件：
${eventTexts}

请分析：
1. 关键转折点和其法律意义
2. 当事人行为模式和动机
3. 证据链的完整性和逻辑性
4. 可能的法律风险和机会
5. 案件发展趋势预测

请用JSON格式返回分析结果。`

        const response = await fetch(DEEPSEEK_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: '你是一位资深的法律分析专家，擅长从时间轴中发现关键信息和隐藏模式。'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 2000
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          const content = data.choices[0].message.content
          
          // 尝试解析JSON
          try {
            aiAnalysis = JSON.parse(content)
          } catch {
            // 如果不是JSON，提取文本内容
            aiAnalysis = { analysis: content }
          }
        }
      } catch (error) {
        console.error('AI分析失败:', error)
      }
    }
    
    // 4. 法律条款映射
    const caseType = ProvisionMapper.detectCaseType(ruleData)
    const provisions = ProvisionMapper.mapCaseTypeToProvisions(caseType)
    
    // 5. 生成时间轴洞察
    const insights = generateTimelineInsights(events, ruleData, aiAnalysis)
    
    // 6. 返回综合分析结果
    return NextResponse.json({
      success: true,
      analysis: {
        // 基础信息
        summary: {
          totalEvents: events.length,
          timeSpan: calculateTimeSpan(events),
          caseType,
          keyParties: ruleData.parties.map(p => p.name),
          disputedAmount: ruleData.amounts.find(a => a.type === 'principal')?.value
        },
        
        // 规则分析
        ruleBasedAnalysis: {
          dates: ruleData.dates,
          parties: ruleData.parties,
          amounts: ruleData.amounts,
          legalClauses: ruleData.legalClauses,
          facts: ruleData.facts
        },
        
        // AI深度分析
        aiInsights: aiAnalysis || {
          message: 'AI分析暂时不可用，请配置DeepSeek API密钥'
        },
        
        // 法律建议
        legalRecommendations: {
          applicableProvisions: provisions.slice(0, 5),
          suggestedActions: generateActionSuggestions(ruleData, caseType),
          riskAssessment: assessRisks(events, ruleData)
        },
        
        // 时间轴洞察
        timelineInsights: insights
      }
    })
    
  } catch (error) {
    console.error('时间轴分析错误:', error)
    return NextResponse.json(
      { 
        error: '分析过程中发生错误',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

/**
 * 生成时间轴洞察
 */
function generateTimelineInsights(events: any[], ruleData: any, aiAnalysis: any) {
  const insights = []
  
  // 1. 识别关键时间节点
  const criticalDates = ruleData.dates.filter((d: any) => d.importance === 'critical')
  if (criticalDates.length > 0) {
    insights.push({
      type: 'critical_dates',
      title: '关键时间节点',
      content: `发现${criticalDates.length}个关键日期，包括${criticalDates[0].type}等`,
      importance: 'high'
    })
  }
  
  // 2. 分析事件频率
  const eventFrequency = analyzeEventFrequency(events)
  if (eventFrequency.peak) {
    insights.push({
      type: 'frequency_pattern',
      title: '事件频率模式',
      content: `${eventFrequency.peak}期间事件最密集，可能是案件的关键阶段`,
      importance: 'medium'
    })
  }
  
  // 3. 识别诉讼阶段
  const phases = identifyLitigationPhases(events)
  insights.push({
    type: 'litigation_phases',
    title: '诉讼阶段分析',
    content: `案件经历了${phases.length}个主要阶段：${phases.join('、')}`,
    importance: 'high'
  })
  
  // 4. AI洞察整合
  if (aiAnalysis && aiAnalysis.analysis) {
    insights.push({
      type: 'ai_insight',
      title: 'AI深度洞察',
      content: typeof aiAnalysis.analysis === 'string' ? 
        aiAnalysis.analysis.substring(0, 200) : 
        JSON.stringify(aiAnalysis.analysis).substring(0, 200),
      importance: 'high'
    })
  }
  
  return insights
}

/**
 * 计算时间跨度
 */
function calculateTimeSpan(events: any[]) {
  if (events.length < 2) return '单一事件'
  
  const dates = events.map(e => new Date(e.date).getTime())
  const minDate = new Date(Math.min(...dates))
  const maxDate = new Date(Math.max(...dates))
  
  const days = Math.floor((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
  
  if (days < 30) return `${days}天`
  if (days < 365) return `${Math.floor(days / 30)}个月`
  return `${Math.floor(days / 365)}年`
}

/**
 * 分析事件频率
 */
function analyzeEventFrequency(events: any[]) {
  const monthCounts: Record<string, number> = {}
  
  events.forEach(event => {
    const date = new Date(event.date)
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`
    monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1
  })
  
  const peak = Object.entries(monthCounts)
    .sort(([,a], [,b]) => b - a)[0]
  
  return {
    peak: peak ? peak[0] : null,
    distribution: monthCounts
  }
}

/**
 * 识别诉讼阶段
 */
function identifyLitigationPhases(events: any[]) {
  const phases = []
  const keywords = {
    '起诉阶段': ['起诉', '立案', '诉状'],
    '举证阶段': ['举证', '证据', '质证'],
    '审理阶段': ['开庭', '审理', '庭审'],
    '判决阶段': ['判决', '裁决', '宣判'],
    '执行阶段': ['执行', '强制', '履行']
  }
  
  for (const [phase, words] of Object.entries(keywords)) {
    const hasPhase = events.some(e => 
      words.some(w => e.title.includes(w) || (e.description && e.description.includes(w)))
    )
    if (hasPhase) phases.push(phase)
  }
  
  return phases.length > 0 ? phases : ['信息不足']
}

/**
 * 生成行动建议
 */
function generateActionSuggestions(ruleData: any, caseType: string) {
  const suggestions = []
  
  // 基于案件类型的建议
  if (caseType === '民间借贷纠纷') {
    suggestions.push('准备完整的转账记录和借条')
    suggestions.push('计算准确的利息金额')
  } else if (caseType === '合同纠纷') {
    suggestions.push('收集合同履行的相关证据')
    suggestions.push('准备违约损失的计算依据')
  }
  
  // 基于当事人的建议
  if (ruleData.parties.some((p: any) => p.type === 'plaintiff')) {
    suggestions.push('完善诉讼请求，确保合理合法')
  }
  
  return suggestions
}

/**
 * 评估风险
 */
function assessRisks(events: any[], ruleData: any) {
  const risks = []
  
  // 诉讼时效风险
  const oldestEvent = events[0]
  if (oldestEvent) {
    const daysSince = Math.floor(
      (Date.now() - new Date(oldestEvent.date).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSince > 730) { // 2年
      risks.push({
        type: 'limitation',
        level: 'high',
        description: '注意诉讼时效，部分请求可能超过时效'
      })
    }
  }
  
  // 证据风险
  if (ruleData.facts.filter((f: any) => f.type === 'disputed').length > 
      ruleData.facts.filter((f: any) => f.type === 'proven').length) {
    risks.push({
      type: 'evidence',
      level: 'medium',
      description: '争议事实较多，需要加强证据收集'
    })
  }
  
  return risks
}