/**
 * 本地AI客户端实现
 * 替代@deepracticex/ai-chat，专为法学教育平台优化
 */

interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AIOptions {
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface AIResponse {
  content: string;
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AIClientConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export class AIClient {
  private config: AIClientConfig;

  constructor(config: AIClientConfig) {
    this.config = config;
  }

  /**
   * 发送消息并获取响应
   */
  async sendMessage(messages: AIMessage[], options: AIOptions = {}): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1000,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`AI API调用失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        content: data.choices[0]?.message?.content || '',
        model: data.model,
        usage: data.usage
      };
    } catch (error) {
      console.error('AI客户端调用失败:', error);
      throw error;
    }
  }

  /**
   * 发送流式消息
   */
  async sendMessageStream(messages: AIMessage[], options: AIOptions = {}): Promise<ReadableStream> {
    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1000,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`AI流式API调用失败: ${response.status} ${response.statusText}`);
      }

      return response.body || new ReadableStream();
    } catch (error) {
      console.error('AI流式客户端调用失败:', error);
      throw error;
    }
  }

  /**
   * 检查API可用性
   */
  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// 为了兼容性，导出为AIChat
export { AIClient as AIChat };

// 默认导出
export default AIClient;