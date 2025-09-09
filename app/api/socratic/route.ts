import { NextRequest } from 'next/server'
import { validatePrompt, validateApiInput } from '@/lib/security/input-validator'
import { socraticPerformance } from '@/lib/services/socratic-performance'

// DeepSeek API配置
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''

// 对话层级枚举
enum DialogueLevel {
  OBSERVATION = 1,  // 观察层：识别基本信息
  FACTS = 2,        // 事实层：梳理时间线
  ANALYSIS = 3,     // 分析层：法律关系分析
  APPLICATION = 4,  // 应用层：法条适用
  VALUES = 5        // 价值层：公平正义探讨
}

// 苏格拉底式提问系统提示词
const SOCRATIC_SYSTEM_PROMPT = `你是苏格拉底，一位伟大的哲学教师。你在法学课堂上引导学生深入思考案例。

重要规则：
1. 你只能提问，不能给出答案或结论
2. 每次提问要基于学生的回答，逐步深入
3. 用"为什么"、"如果"、"你认为"等开放性问题
4. 暴露学生思维中的矛盾和盲点
5. 引导学生自己发现答案，而不是告诉他们
6. 每次回复控制在2-3个问题内，保持简洁

提问层次：
- 第1层（观察）：让学生描述看到的事实
- 第2层（事实）：深入了解案件细节和时间线
- 第3层（分析）：探讨因果关系和法律要件
- 第4层（应用）：检验对法律条文的理解
- 第5层（价值）：讨论公平正义和社会影响

记住：永远不要直接回答，只通过提问引导思考。`

// 性能监控简化版
class SimplePerformanceMonitor {
  private metrics: Map<string, number> = new Map()
  private timers: Map<string, number> = new Map()

  startTimer(id: string, metadata?: any) {
    this.timers.set(id, Date.now())
  }

  endTimer(id: string, metricName?: string): number {
    const startTime = this.timers.get(id)
    if (startTime) {
      const duration = Date.now() - startTime
      this.timers.delete(id)
      if (metricName) {
        this.recordMetric(metricName, duration)
      }
      return duration
    }
    return 0
  }

  recordMetric(name: string, value: number, metadata?: any) {
    const current = this.metrics.get(name) || 0
    this.metrics.set(name, current + value)
  }
}

const performanceMonitor = new SimplePerformanceMonitor()

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const requestId = `req-${startTime}-${Math.random().toString(36).substring(7)}`
  const apiStartTime = Date.now()
  
  try {
    // 开始性能监控
    performanceMonitor.startTimer(requestId)

    // 获取并验证请求体
    const body = await req.json()
    const validation = validateApiInput(body)
    if (!validation.isValid) {
      return Response.json({
        success: false,
        error: {
          message: validation.reason || '输入验证失败',
          type: 'invalid_input'
        }
      }, { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    const { 
      messages = [], 
      caseInfo,
      currentLevel = DialogueLevel.OBSERVATION,
      mode = 'auto',
      sessionId = `session-${Date.now()}`,
      difficulty = 'normal',
      streaming = false
    } = validation.sanitized || body
    
    // 验证消息内容
    for (const message of messages) {
      if (message.content && typeof message.content === 'string') {
        const msgValidation = validatePrompt(message.content)
        if (!msgValidation.isValid) {
          return Response.json({
            success: false,
            error: {
              message: '消息内容包含不允许的内容',
              type: 'invalid_content'
            }
          }, { 
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          })
        }
        message.content = msgValidation.sanitized || message.content
      }
    }
    
    // 动态调整提问策略
    const levelPrompts = {
      [DialogueLevel.OBSERVATION]: "请用简单的观察性问题引导学生，让他们描述案件表面现象。",
      [DialogueLevel.FACTS]: "深入询问事实细节和时间顺序，帮助学生理清案件脉络。",
      [DialogueLevel.ANALYSIS]: "探讨因果关系，分析法律构成要件，引导深度思考。",
      [DialogueLevel.APPLICATION]: "检验学生对法律条文的理解和应用能力。",
      [DialogueLevel.VALUES]: "引导价值判断和公平性讨论，探讨社会影响。"
    }
    
    // 构建完整的上下文消息
    const systemMessage = `${SOCRATIC_SYSTEM_PROMPT}\n\n当前处于第${currentLevel}层讨论。${levelPrompts[currentLevel]}\n\n案例上下文：${JSON.stringify(caseInfo, null, 2)}`
    
    // 构建DeepSeek请求
    const deepSeekResponse = await fetch(DEEPSEEK_API_URL, {
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
            content: systemMessage
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 500,
        stream: streaming
      })
    })

    if (!deepSeekResponse.ok) {
      console.error('DeepSeek API Error:', deepSeekResponse.status)
      throw new Error(`DeepSeek API Error: ${deepSeekResponse.status}`)
    }

    // 记录性能指标
    const duration = performanceMonitor.endTimer(requestId, 'socratic.api.duration')
    performanceMonitor.recordMetric('socratic.api.success', 1)
    
    // 记录到专业性能监控服务
    const aiDuration = Date.now() - apiStartTime
    await socraticPerformance.recordAICall({
      provider: 'deepseek',
      operation: 'generate_question',
      duration: aiDuration,
      success: true
    })
    
    await socraticPerformance.recordAPIRequest({
      endpoint: '/api/socratic',
      method: 'POST',
      duration,
      status: 200
    })

    // 如果是流式响应
    if (streaming) {
      return new Response(deepSeekResponse.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      })
    }

    // 非流式响应
    const result = await deepSeekResponse.json()
    const content = result.choices?.[0]?.message?.content || '抱歉，我暂时无法生成问题。'

    return new Response(JSON.stringify({
      success: true,
      data: {
        content,
        level: currentLevel,
        metadata: {
          sessionId,
          model: 'deepseek-chat',
          usage: result.usage
        },
        cached: false
      },
      performance: {
        duration,
        requestId
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('Socratic API Error:', error)
    
    // 记录错误指标
    performanceMonitor.recordMetric('socratic.api.error', 1)
    
    // 记录到专业性能监控服务
    const apiDuration = Date.now() - (apiStartTime || Date.now())
    await socraticPerformance.recordAPIRequest({
      endpoint: '/api/socratic',
      method: 'POST',
      duration: apiDuration,
      status: 503,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    // 尝试降级方案
    try {
      const fallbackLevel = DialogueLevel.OBSERVATION
      const fallbackContent = getFallbackQuestion(fallbackLevel)
      
      // 记录降级指标
      await socraticPerformance.recordFallbackMetrics({
        type: 'ai_unavailable',
        sessionId: requestId,
        responseTime: Date.now() - (apiStartTime || Date.now()),
        success: true
      })
      
      return new Response(JSON.stringify({
        success: false,
        fallback: true,
        data: {
          content: fallbackContent,
          level: fallbackLevel,
          metadata: { fallback: true }
        },
        error: {
          message: 'AI服务暂时不可用，使用备选问题',
          type: 'fallback'
        }
      }), {
        status: 200, // 降级成功也返回200
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    } catch (fallbackError) {
      return new Response(JSON.stringify({
        success: false,
        error: {
          message: '服务暂时不可用，请稍后重试',
          type: 'service_unavailable'
        }
      }), { 
        status: 503,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }
  }
}

// 创建流式响应
function createStreamResponse(content: string): ReadableStream {
  const encoder = new TextEncoder()
  
  return new ReadableStream({
    start(controller) {
      // 分割内容为小块进行流式传输
      const chunks = content.split('').reduce((acc: string[], char, index) => {
        const chunkIndex = Math.floor(index / 3) // 每3个字符一块
        if (!acc[chunkIndex]) acc[chunkIndex] = ''
        acc[chunkIndex] += char
        return acc
      }, [])
      
      let chunkIndex = 0
      
      function pushChunk() {
        if (chunkIndex < chunks.length) {
          const chunk = chunks[chunkIndex]
          const data = {
            type: 'chunk',
            content: chunk,
            index: chunkIndex,
            total: chunks.length
          }
          
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          )
          
          chunkIndex++
          setTimeout(pushChunk, 50) // 50ms延迟模拟流式输出
        } else {
          // 发送结束信号
          const endData = {
            type: 'end',
            content: '',
            complete: true
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(endData)}\n\n`)
          )
          controller.close()
        }
      }
      
      // 开始推送
      pushChunk()
    }
  })
}

// 降级方案：预设问题库
function getFallbackQuestion(level: DialogueLevel): string {
  const fallbackQuestions = {
    [DialogueLevel.OBSERVATION]: "你在这个案件中看到了哪些关键事实？能具体描述一下当事人的行为吗？",
    [DialogueLevel.FACTS]: "这些事件的时间顺序是怎样的？哪个事件是关键的转折点？为什么？",
    [DialogueLevel.ANALYSIS]: "为什么你认为这是关键问题？它与相关的法律构成要件有什么关系？",
    [DialogueLevel.APPLICATION]: "这个案件应该适用哪些具体的法律条文？你的理由是什么？",
    [DialogueLevel.VALUES]: "如果你是法官，这样的判决公平吗？对社会会产生什么样的影响？"
  }
  
  return fallbackQuestions[level] || fallbackQuestions[DialogueLevel.OBSERVATION]
}

// 添加OPTIONS支持CORS预检请求
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}