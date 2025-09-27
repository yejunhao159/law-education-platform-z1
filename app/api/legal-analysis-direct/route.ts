/**
 * 直接调用DeepSeek API的法律分析接口
 * 绕过AICallProxy，测试直接API调用
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { event, caseContext } = await req.json()

    if (!event || !event.title || !event.description) {
      return NextResponse.json({
        error: '缺少必填字段'
      }, { status: 400 })
    }

    // 构建prompt
    const prompt = `你是一位专业的法学教授，请分析以下案件事件的法律意义。

案件背景：${caseContext || '民事诉讼案件'}

事件信息：
- 日期：${event?.date || '未知日期'}
- 事件：${event?.title || '未知事件'}
- 详情：${event?.description || '无详细描述'}
- 当事方：${event?.party || '未知'}

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

请用专业但易懂的语言回答，返回JSON格式。

要求返回的JSON格式：
{
  "summary": "30字以内摘要",
  "legalPoints": ["法学要点1", "法学要点2"],
  "legalBasis": ["相关法条1", "相关法条2"],
  "analysis": {
    "legalRelation": "法律关系认定",
    "burdenOfProof": "举证责任分配",
    "limitation": "时效问题",
    "keyPoint": "关键法律点",
    "riskAssessment": "风险评估"
  }
}`

    // 直接调用DeepSeek API
    const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions'
    const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-6b081a93258346379182141661293345'

    console.log('🔧 直接API调用配置:', {
      apiUrl: apiUrl,
      hasApiKey: !!apiKey,
      keyPrefix: apiKey.substring(0, 8) + '...'
    })

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
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
      })
    })

    console.log('📡 API响应状态:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API调用失败:', errorText)

      // 返回基础分析结果
      return NextResponse.json({
        success: true,
        summary: event.title.substring(0, 30),
        legalPoints: ['法律关系分析', '证据要求', '程序问题'],
        legalBasis: ['相关法律条文'],
        analysis: {
          legalRelation: '需进一步分析',
          burdenOfProof: '待确定',
          keyPoint: '关键法律问题'
        },
        note: 'AI调用失败，返回基础分析'
      })
    }

    const data = await response.json()
    console.log('📥 AI原始响应:', data.choices?.[0]?.message?.content?.substring(0, 200) + '...')

    // 解析AI响应
    let aiAnalysis
    try {
      const content = data.choices[0].message.content

      // 尝试提取JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        aiAnalysis = JSON.parse(jsonMatch[0])
      } else {
        aiAnalysis = JSON.parse(content)
      }

      console.log('✅ AI分析成功解析')

      return NextResponse.json({
        success: true,
        ...aiAnalysis
      })

    } catch (parseError) {
      console.error('❌ JSON解析失败:', parseError)

      // 返回基础分析结果
      return NextResponse.json({
        success: true,
        summary: event.title.substring(0, 30),
        legalPoints: ['需进一步分析'],
        legalBasis: ['相关法律法规'],
        analysis: {},
        note: 'AI响应解析失败，返回基础分析'
      })
    }

  } catch (error) {
    console.error('❌ 全局错误:', error)

    return NextResponse.json({
      success: false,
      error: error.message,
      summary: '事件概要',
      legalPoints: ['法律关系分析', '证据要求', '程序问题'],
      legalBasis: ['相关法律条文'],
      analysis: {
        legalRelation: '需进一步分析',
        burdenOfProof: '待确定',
        keyPoint: '关键法律问题'
      }
    }, { status: 500 })
  }
}