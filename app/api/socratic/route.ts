import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'

// 苏格拉底式提问系统提示词
const SOCRATIC_SYSTEM_PROMPT = `你是苏格拉底，一位伟大的哲学教师。你在法学课堂上引导学生深入思考案例。

重要规则：
1. 你只能提问，不能给出答案或结论
2. 每次提问要基于学生的回答，逐步深入
3. 用"为什么"、"如果"、"你认为"等开放性问题
4. 暴露学生思维中的矛盾和盲点
5. 引导学生自己发现答案，而不是告诉他们

提问层次：
- 第1层（观察）：让学生描述看到的事实
- 第2层（事实）：深入了解案件细节和时间线
- 第3层（分析）：探讨因果关系和法律要件
- 第4层（应用）：检验对法律条文的理解
- 第5层（价值）：讨论公平正义和社会影响

记住：永远不要直接回答，只通过提问引导思考。`

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    
    // 获取当前对话的层级（根据消息数量推断）
    const messageCount = messages.length
    const currentLevel = Math.min(5, Math.floor(messageCount / 6) + 1)
    
    // 动态调整提问策略
    const levelPrompts = {
      1: "请用简单的观察性问题引导学生。",
      2: "深入询问事实细节和时间顺序。",
      3: "探讨因果关系，分析法律构成要件。",
      4: "检验学生对法律条文的理解和应用。",
      5: "引导价值判断和公平性讨论。"
    }
    
    const result = await streamText({
      model: openai('gpt-3.5-turbo'),
      system: `${SOCRATIC_SYSTEM_PROMPT}\n\n当前处于第${currentLevel}层讨论。${levelPrompts[currentLevel]}`,
      messages,
      temperature: 0.7,
      maxTokens: 150,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Socratic API Error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}