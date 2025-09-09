/**
 * DeepSeek AI服务实现
 * 支持同步和流式调用
 */

import { BaseAIService, ServiceConfig, ServiceResponse } from './base-service';

export class DeepSeekService extends BaseAIService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;
  
  constructor(config: ServiceConfig = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.DEEPSEEK_API_KEY || '';
    this.apiUrl = config.apiUrl || process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';
    this.model = config.model || 'deepseek-chat';
  }
  
  /**
   * 同步分析
   */
  async analyze<T = any>(prompt: string, options?: any): Promise<ServiceResponse<T>> {
    const startTime = Date.now();
    
    try {
      const response = await this.callAPI(prompt, false);
      
      return {
        success: true,
        data: response as T,
        metadata: {
          model: this.model,
          processingTime: Date.now() - startTime,
          tokensUsed: response.usage?.total_tokens
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '分析失败',
        metadata: {
          model: this.model,
          processingTime: Date.now() - startTime
        }
      };
    }
  }
  
  /**
   * 流式响应生成器
   */
  async *stream(prompt: string, options?: any): AsyncGenerator<any> {
    try {
      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: '你是一位专业的法律AI助手。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          stream: true,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('无法获取响应流');
      }
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            
            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                yield { type: 'content', content };
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error: any) {
      yield { type: 'error', error: error.message };
    }
  }
  
  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.analyze('测试连接', { maxTokens: 10 });
      return response.success;
    } catch {
      return false;
    }
  }
  
  /**
   * 内部API调用
   */
  private async callAPI(prompt: string, stream: boolean = false): Promise<any> {
    const endpoint = this.apiUrl.includes('/chat/completions') 
      ? this.apiUrl 
      : `${this.apiUrl}/chat/completions`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的中国法律文书分析专家。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        stream,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API错误: ${error}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    // 尝试解析JSON响应
    try {
      if (content?.includes('```json')) {
        const match = content.match(/```json\n([\s\S]*?)\n```/);
        if (match?.[1]) {
          return JSON.parse(match[1]);
        }
      }
      return JSON.parse(content);
    } catch {
      return content;
    }
  }
}

// 导出单例
export const deepseekService = new DeepSeekService();