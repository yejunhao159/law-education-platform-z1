import { NextRequest, NextResponse } from 'next/server'

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

interface LegalAnalysisRequest {
  event: {
    date: string
    title: string
    description: string
    party?: string
  }
  caseContext?: string
}

interface LegalAnalysisResponse {
  summary: string // 简短摘要（30字以内）
  legalPoints: string[] // 法学要点
  legalBasis: string[] // 相关法条
  analysis: {
    legalRelation?: string
    burdenOfProof?: string
    limitation?: string
    keyPoint?: string
    riskAssessment?: string
  }
}

// 基于规则的法律分析（作为后备方案）
function generateRuleBasedAnalysis(event: any): LegalAnalysisResponse {
  const desc = event.description?.toLowerCase() || ''
  const title = event.title?.toLowerCase() || ''
  
  // 智能提取摘要
  const summary = event.title.length > 30 
    ? event.title.substring(0, 27) + '...'
    : event.title
  
  // 根据关键词提取法学要点
  const legalPoints: string[] = []
  if (desc.includes('合同') || desc.includes('协议')) {
    legalPoints.push('合同效力认定')
    legalPoints.push('双方权利义务关系')
  }
  if (desc.includes('违约') || desc.includes('未履行')) {
    legalPoints.push('违约责任承担')
    legalPoints.push('损害赔偿计算')
  }
  if (desc.includes('证据') || desc.includes('证明')) {
    legalPoints.push('举证责任分配')
    legalPoints.push('证据效力认定')
  }
  if (desc.includes('诉讼') || desc.includes('起诉')) {
    legalPoints.push('诉讼时效问题')
    legalPoints.push('管辖权确定')
  }
  
  // 提取相关法条
  const legalBasis: string[] = []
  if (desc.includes('借款') || desc.includes('借贷')) {
    legalBasis.push('《民法典》第667条（借款合同）')
    legalBasis.push('《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》')
  }
  if (desc.includes('合同')) {
    legalBasis.push('《民法典》合同编相关条款')
  }
  if (desc.includes('违约')) {
    legalBasis.push('《民法典》第577条（违约责任）')
  }
  
  // 分析要素
  const analysis: any = {}
  if (desc.includes('合同') || desc.includes('借款')) {
    analysis.legalRelation = '合同法律关系'
  }
  if (desc.includes('原告') && desc.includes('被告')) {
    analysis.burdenOfProof = '谁主张谁举证'
  }
  if (title.includes('起诉') || title.includes('诉讼')) {
    analysis.keyPoint = '诉讼程序启动'
  }
  
  return {
    summary,
    legalPoints: legalPoints.length > 0 ? legalPoints : ['需进一步分析'],
    legalBasis: legalBasis.length > 0 ? legalBasis : ['相关法律法规'],
    analysis
  }
}

export async function POST(req: NextRequest) {
  try {
    const { event, caseContext } = await req.json() as LegalAnalysisRequest

    const prompt = `你是一位专业的法学教授，请分析以下案件事件的法律意义。

案件背景：${caseContext || '民事诉讼案件'}

事件信息：
- 日期：${event.date}
- 事件：${event.title}
- 详情：${event.description}
- 当事方：${event.party || '未知'}

请提供以下分析：

1. 事件摘要（不超过30字，概括核心内容）
2. 法学要点（3-5个关键法律问题）
3. 相关法条（具体到条款）
4. 深度分析：
   - 法律关系认定
   - 举证责任分配
   - 时效问题
   - 关键法律点
   - 风险评估

请用专业但易懂的语言回答，返回JSON格式。`

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
            content: '你是一位经验丰富的法学教授，擅长用简洁清晰的语言分析法律问题。请严格按照JSON格式返回分析结果。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
        // 移除 response_format，因为DeepSeek可能不支持这个参数
      })
    })

    if (!response.ok) {
      // 如果API调用失败，返回基础分析
      return NextResponse.json({
        summary: event.title.substring(0, 30),
        legalPoints: [
          '该事件涉及民事法律关系',
          '需要关注证据保全',
          '注意诉讼时效问题'
        ],
        legalBasis: [
          '《民法典》相关条款',
          '《民事诉讼法》相关规定'
        ],
        analysis: {
          legalRelation: '待分析',
          burdenOfProof: '根据谁主张谁举证原则确定',
          keyPoint: event.title
        }
      })
    }

    const data = await response.json()
    
    // 安全解析AI返回的内容
    let aiAnalysis: LegalAnalysisResponse
    try {
      const content = data.choices[0].message.content
      
      // 尝试提取JSON（如果内容包含其他文字）
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        aiAnalysis = JSON.parse(jsonMatch[0])
      } else {
        // 如果没有找到JSON，尝试直接解析
        aiAnalysis = JSON.parse(content)
      }
      
      // 确保返回的数据结构完整
      return NextResponse.json({
        summary: aiAnalysis.summary || event.title.substring(0, 30),
        legalPoints: aiAnalysis.legalPoints || [],
        legalBasis: aiAnalysis.legalBasis || [],
        analysis: aiAnalysis.analysis || {}
      })
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.log('Raw AI response:', data.choices[0]?.message?.content)
      
      // 返回基于规则的分析
      return NextResponse.json(generateRuleBasedAnalysis(event))
    }

  } catch (error) {
    console.error('Legal analysis error:', error)
    
    // 返回默认分析结果
    return NextResponse.json({
      summary: '事件概要',
      legalPoints: ['法律关系分析', '证据要求', '程序问题'],
      legalBasis: ['相关法律条文'],
      analysis: {
        legalRelation: '需进一步分析',
        burdenOfProof: '待确定',
        keyPoint: '关键法律问题'
      }
    })
  }
}