/**
 * 苏格拉底对话AI客户端
 * 负责与外部AI服务的交互
 * DeepPractice Standards Compliant
 */

import {
  AIRequest,
  AIResponse,
  SocraticConfig,
  SocraticErrorCode
} from '@/lib/types/socratic';

export class SocraticAIClient {
  private config: SocraticConfig;

  constructor(config?: Partial<SocraticConfig>) {
    this.config = {
      apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions',
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 500,
      systemPrompt: this.getDefaultSystemPrompt(),
      levelPrompts: this.getDefaultLevelPrompts(),
      fallbackQuestions: this.getDefaultFallbackQuestions(),
      ...config
    };
  }

  /**
   * 检查AI服务是否可用
   */
  isAvailable(): boolean {
    return !!this.config.apiKey && !!this.config.apiUrl;
  }

  /**
   * 生成苏格拉底式问题
   */
  async generateQuestion(request: AIRequest): Promise<AIResponse> {
    if (!this.isAvailable()) {
      throw new Error('AI服务不可用');
    }

    try {
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: request.systemMessage
            },
            ...request.messages
          ],
          temperature: request.temperature || this.config.temperature,
          max_tokens: request.maxTokens || this.config.maxTokens,
          stream: request.streaming || false
        })
      });

      if (!response.ok) {
        throw new Error(`AI API错误: ${response.status}`);
      }

      if (request.streaming) {
        return {
          content: '', // 流式响应的内容将通过stream处理
          model: this.config.model
        };
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '抱歉，我暂时无法生成问题。';

      return {
        content,
        usage: result.usage,
        model: this.config.model
      };

    } catch (error) {
      console.error('AI客户端错误:', error);
      throw error;
    }
  }

  /**
   * 创建流式响应
   */
  async createStreamResponse(request: AIRequest): Promise<ReadableStream> {
    const response = await fetch(this.config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: request.systemMessage
          },
          ...request.messages
        ],
        temperature: request.temperature || this.config.temperature,
        max_tokens: request.maxTokens || this.config.maxTokens,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`AI API错误: ${response.status}`);
    }

    return response.body!;
  }

  /**
   * 获取配置
   */
  getConfig(): SocraticConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<SocraticConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // ========== 私有方法 ==========

  private getDefaultSystemPrompt(): string {
    return `你是苏格拉底，一位伟大的哲学教师。你在法学课堂上引导学生深入思考案例。

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

记住：永远不要直接回答，只通过提问引导思考。`;
  }

  private getDefaultLevelPrompts(): Record<number, string> {
    return {
      1: "请用简单的观察性问题引导学生，让他们描述案件表面现象。",
      2: "深入询问事实细节和时间顺序，帮助学生理清案件脉络。",
      3: "探讨因果关系，分析法律构成要件，引导深度思考。",
      4: "检验学生对法律条文的理解和应用能力。",
      5: "引导价值判断和公平性讨论，探讨社会影响。"
    };
  }

  private getDefaultFallbackQuestions(): Record<number, string> {
    return {
      1: "你在这个案件中看到了哪些关键事实？能具体描述一下当事人的行为吗？",
      2: "这些事件的时间顺序是怎样的？哪个事件是关键的转折点？为什么？",
      3: "为什么你认为这是关键问题？它与相关的法律构成要件有什么关系？",
      4: "这个案件应该适用哪些具体的法律条文？你的理由是什么？",
      5: "如果你是法官，这样的判决公平吗？对社会会产生什么样的影响？"
    };
  }
}