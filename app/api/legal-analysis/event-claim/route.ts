/**
 * 单个事件的请求权分析API
 * 专注分析判决书中原告和被告在特定时间节点的行为及其法律性质
 */

import { NextRequest, NextResponse } from 'next/server'
import { callUnifiedAI } from '@/src/infrastructure/ai/AICallProxy'
import { getAIParams } from '@/src/config/ai-defaults'

interface TimelineEvent {
  id?: string;
  date: string;
  title?: string;
  description?: string;
  type?: string;
  parties?: string[];
  evidence?: string[];
}

interface EventClaimAnalysis {
  eventId: string;
  eventSummary: {
    date: string;
    title: string;
    parties: string[];
    legalNature: string;
  };
  plaintiffAnalysis: {
    action: string;
    legalBasis: string;
    requirements: string[];
    evidence: string[];
    strength: 'strong' | 'medium' | 'weak';
  };
  defendantAnalysis: {
    action: string;
    response: string;
    defenses: string[];
    counterClaims: string[];
    strength: 'strong' | 'medium' | 'weak';
  };
  legalSignificance: {
    impact: string;
    consequences: string[];
    relatedClaims: string[];
  };
  courtPerspective: {
    keyFindings: string[];
    appliedLaws: string[];
    reasoning: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { event }: { event: TimelineEvent } = await request.json()

    if (!event || !event.date || !event.title) {
      return NextResponse.json(
        { error: '事件数据不完整' },
        { status: 400 }
      )
    }

    console.log('🎯 单个事件请求权分析:', {
      eventId: event.id,
      date: event.date,
      title: event.title
    })

    const prompt = `基于已决判决书的学习分析，深入剖析以下时间节点的法律行为：

# 事件信息
日期：${event.date}
事件：${event.title}
描述：${event.description || ''}
涉及方：${event.parties?.join('、') || '原告、被告'}

# 分析任务
这是一个判决书学习场景，请分析该时间节点上：

## 1. 原告行为分析
- 原告在该时间点的具体行为
- 该行为的法律性质（如签约、履约、主张权利等）
- 形成的请求权基础（具体法条）
- 需要满足的构成要件
- 原告需要提供的证据
- 该行为的法律强度评估

## 2. 被告行为分析
- 被告在该时间点的具体行为
- 被告的应对方式（履约、抗辩、反驳等）
- 可能的抗辩理由
- 反请求权的形成
- 被告的法律地位强度

## 3. 法律意义
- 该事件在整个案件中的关键影响
- 对后续法律关系的影响
- 相关的请求权链条

## 4. 法院视角
- 法院如何认定该事件
- 适用的法律条文
- 法院的推理过程

请以JSON格式返回分析结果，格式如下：
{
  "eventId": "${event.id || event.date}",
  "eventSummary": {
    "date": "${event.date}",
    "title": "${event.title}",
    "parties": ["原告", "被告"],
    "legalNature": "法律行为性质"
  },
  "plaintiffAnalysis": {
    "action": "原告的具体行为",
    "legalBasis": "《民法典》第XXX条",
    "requirements": ["构成要件1", "构成要件2"],
    "evidence": ["需要的证据类型"],
    "strength": "strong|medium|weak"
  },
  "defendantAnalysis": {
    "action": "被告的具体行为",
    "response": "被告的应对方式",
    "defenses": ["抗辩理由1", "抗辩理由2"],
    "counterClaims": ["反请求权"],
    "strength": "strong|medium|weak"
  },
  "legalSignificance": {
    "impact": "关键法律影响",
    "consequences": ["法律后果1", "法律后果2"],
    "relatedClaims": ["相关请求权"]
  },
  "courtPerspective": {
    "keyFindings": ["法院认定1", "法院认定2"],
    "appliedLaws": ["《民法典》第XXX条", "《民法典》第YYY条"],
    "reasoning": "法院的推理过程"
  }
}`

    const params = getAIParams('claim-analysis')
    const result = await callUnifiedAI(
      '你是专业的法学教授，专门教授判决书分析和请求权理论。请以JSON格式返回详细的事件法律分析。',
      prompt,
      {
        ...params,
        temperature: 0.3, // 低温度确保准确性
        maxTokens: 2000,
        responseFormat: 'json'
      }
    )

let analysisData: EventClaimAnalysis
    try {
      // 处理可能的markdown包装
      let jsonContent = result.content.trim()
      if (jsonContent.includes('```json')) {
        const match = jsonContent.match(/```json\s*([\s\S]*?)\s*```/)
        if (match && match[1]) {
          jsonContent = match[1]
        }
      }

      analysisData = JSON.parse(jsonContent) as EventClaimAnalysis
    } catch (parseError) {
      console.error('解析AI响应失败:', parseError)
      // 返回基础分析结构
      analysisData = {
        eventId: event.id || event.date,
        eventSummary: {
          date: event.date,
          title: event.title || '未命名事件',
          parties: event.parties || ['原告', '被告'],
          legalNature: '需要进一步分析'
        },
        plaintiffAnalysis: {
          action: '原告行为待分析',
          legalBasis: '法律依据待确定',
          requirements: ['构成要件待分析'],
          evidence: ['证据要求待分析'],
          strength: 'medium' as const
        },
        defendantAnalysis: {
          action: '被告行为待分析',
          response: '应对方式待分析',
          defenses: ['抗辩理由待分析'],
          counterClaims: [],
          strength: 'medium' as const
        },
        legalSignificance: {
          impact: '法律影响待分析',
          consequences: ['后果待分析'],
          relatedClaims: []
        },
        courtPerspective: {
          keyFindings: ['法院认定待分析'],
          appliedLaws: ['适用法条待确定'],
          reasoning: '推理过程待分析'
        }
      }
    }

    console.log('✅ 事件请求权分析完成')
    return NextResponse.json(analysisData)

  } catch (error) {
    console.error('❌ 事件请求权分析失败:', error)
    return NextResponse.json(
      {
        error: '分析失败，请稍后重试',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}
