import { NextRequest } from 'next/server'

// DeepSeek API配置
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''

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

export async function POST(req: NextRequest) {
  try {
    const { messages, currentLevel = 1 } = await req.json()
    
    // 动态调整提问策略
    const levelPrompts = {
      1: "请用简单的观察性问题引导学生，让他们描述案件表面现象。",
      2: "深入询问事实细节和时间顺序，帮助学生理清案件脉络。",
      3: "探讨因果关系，分析法律构成要件，引导深度思考。",
      4: "检验学生对法律条文的理解和应用能力。",
      5: "引导价值判断和公平性讨论，探讨社会影响。"
    }
    
    // 构建DeepSeek请求
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
            content: `${SOCRATIC_SYSTEM_PROMPT}\n\n当前处于第${currentLevel}层讨论。${levelPrompts[currentLevel as keyof typeof levelPrompts]}`
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 200,
        stream: true // 启用流式响应
      })
    })

    if (!response.ok) {
      console.error('DeepSeek API Error:', response.status)
      // 降级方案：使用预设问题
      return new Response(JSON.stringify({
        content: getFallbackQuestion(currentLevel),
        fallback: true
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 返回流式响应
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    console.error('Socratic API Error:', error)
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// 降级方案：预设问题库
function getFallbackQuestion(level: number): string {
  const fallbackQuestions = {
    1: "你在这个案件中看到了哪些关键事实？能具体描述一下吗？",
    2: "这些事件的时间顺序是怎样的？哪个事件是转折点？",
    3: "为什么你认为这是关键问题？它与法律要件有什么关系？",
    4: "这个案件应该适用哪些法律条文？为什么？",
    5: "如果你是法官，这样判决公平吗？对社会有什么影响？"
  }
  
  return fallbackQuestions[level as keyof typeof fallbackQuestions] || fallbackQuestions[1]
}