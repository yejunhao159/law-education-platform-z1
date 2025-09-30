/**
 * DeeChat驱动的AI客户端
 * 集成官方DeeChat包，提供统一的AI接口
 * DeepPractice Standards Compliant
 */

import { AIChat } from '@deepracticex/ai-chat';
import { countTokens, CostCalculator, TokenCalculator } from '@deepracticex/token-calculator';
import { ContextFormatter } from '@deepracticex/context-manager';
import type { Message, SocraticRequest } from '../types';

// 类型别名，保持兼容
type SocraticMessage = Message;

export interface DeeChatConfig {
  // AI提供商配置
  provider: 'deepseek' | 'openai' | 'claude';
  apiKey: string;
  apiUrl?: string;
  model: string;

  // Token管理配置
  maxContextTokens: number;
  reserveTokens: number;
  costThreshold: number; // 每次请求最大成本（美元）

  // 行为配置
  temperature: number;
  enableStreaming: boolean;
  enableCostOptimization: boolean;
}

interface AIResponse {
  content: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  cost: {
    input: number;
    output: number;
    total: number;
  };
  model: string;
  provider: string;
  duration: number;
}

interface StreamingResponse {
  stream: AsyncIterable<any>;
  metadata: {
    estimatedTokens: number;
    estimatedCost: number;
    model: string;
    provider: string;
  };
}

export class DeeChatAIClient {
  private aiChat: AIChat;
  private config: DeeChatConfig;
  private requestCount = 0;
  private totalCost = 0;

  constructor(config: DeeChatConfig) {
    this.config = config;
    // Phase B修复: 暂时不初始化有问题的AIChat
    // @ts-ignore - aiChat将被原生fetch替代
    this.aiChat = null;
  }

  /**
   * 获取AI提供商的基础URL
   */
  private getBaseUrl(): string {
    if (this.config.apiUrl) return this.config.apiUrl;

    switch (this.config.provider) {
      case 'deepseek':
        return 'https://api.deepseek.com/v1';
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'claude':
        return 'https://api.anthropic.com/v1';
      default:
        return 'https://api.deepseek.com/v1';
    }
  }

  /**
   * 智能Token计算 - 优化上下文长度
   */
  async calculateOptimalTokens(messages: SocraticMessage[], contextString: string): Promise<{
    inputTokens: number;
    maxOutputTokens: number;
    isOptimal: boolean;
    suggestion?: string;
  }> {
    try {
      // 计算输入token数
      const inputTokens = countTokens(contextString, this.config.provider, this.config.model);

      // 计算最优输出token数
      const availableTokens = this.config.maxContextTokens - inputTokens - this.config.reserveTokens;
      const maxOutputTokens = Math.max(100, Math.min(1000, availableTokens));

      const isOptimal = availableTokens > 200; // 至少200个token用于输出

      return {
        inputTokens,
        maxOutputTokens,
        isOptimal,
        suggestion: !isOptimal ? '上下文过长，建议缩短对话历史' : undefined
      };
    } catch (error) {
      console.warn('Token计算失败，使用默认值:', error);
      return {
        inputTokens: Math.floor(contextString.length / 4), // 粗略估算
        maxOutputTokens: 500,
        isOptimal: false,
        suggestion: '无法精确计算token，使用估算值'
      };
    }
  }

  /**
   * 成本预估
   */
  async estimateRequestCost(inputTokens: number, outputTokens: number): Promise<{
    inputCost: number;
    outputCost: number;
    totalCost: number;
    withinBudget: boolean;
  }> {
    try {
      const tokenCalculator = new TokenCalculator();
      const costCalculator = new CostCalculator(tokenCalculator);
      const tokenUsage = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens
      };

      const costEstimate = costCalculator.estimateCost(tokenUsage, this.config.model);

      return {
        inputCost: costEstimate.inputCost,
        outputCost: costEstimate.outputCost,
        totalCost: costEstimate.totalCost,
        withinBudget: costEstimate.totalCost <= this.config.costThreshold
      };
    } catch (error) {
      console.warn('成本估算失败:', error);
      return {
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
        withinBudget: true
      };
    }
  }

  /**
   * 发送消息 - 统一接口
   */
  async sendMessage(contextString: string, request: SocraticRequest): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Token优化
      const tokenInfo = await this.calculateOptimalTokens(
        request.messages || [],
        contextString
      );

      // 成本检查
      if (this.config.enableCostOptimization) {
        const costEstimate = await this.estimateRequestCost(
          tokenInfo.inputTokens,
          tokenInfo.maxOutputTokens
        );

        if (!costEstimate.withinBudget) {
          throw new Error(`预估成本 $${costEstimate.totalCost.toFixed(4)} 超出阈值 $${this.config.costThreshold}`);
        }
      }

      // 构建消息
      const messages = [
        {
          role: 'user' as const,
          content: contextString
        }
      ];

      // Phase B修复: 使用原生fetch
      const apiResponse = await fetch(`${this.getBaseUrl()}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          temperature: this.config.temperature,
          max_tokens: tokenInfo.maxOutputTokens
        })
      });

      if (!apiResponse.ok) {
        throw new Error(`API调用失败: ${apiResponse.status} ${apiResponse.statusText}`);
      }

      const apiResult = await apiResponse.json();
      const content = apiResult.choices?.[0]?.message?.content || '';

      // 计算实际使用的token和成本
      const outputTokens = countTokens(content, this.config.provider, this.config.model);
      const actualCost = await this.estimateRequestCost(tokenInfo.inputTokens, outputTokens);

      // 更新统计
      this.requestCount++;
      this.totalCost += actualCost.totalCost;

      const duration = Date.now() - startTime;

      return {
        content,
        tokensUsed: {
          input: tokenInfo.inputTokens,
          output: outputTokens,
          total: tokenInfo.inputTokens + outputTokens
        },
        cost: {
          input: actualCost.inputCost,
          output: actualCost.outputCost,
          total: actualCost.totalCost
        },
        model: this.config.model,
        provider: this.config.provider,
        duration
      };

    } catch (error) {
      console.error('DeeChat AI调用失败:', error);
      throw error;
    }
  }

  /**
   * 流式响应 - 实时生成
   */
  async sendMessageStream(contextString: string, request: SocraticRequest): Promise<StreamingResponse> {
    try {
      // Token和成本预估
      const tokenInfo = await this.calculateOptimalTokens(
        request.messages || [],
        contextString
      );

      const costEstimate = await this.estimateRequestCost(
        tokenInfo.inputTokens,
        tokenInfo.maxOutputTokens
      );

      if (this.config.enableCostOptimization && !costEstimate.withinBudget) {
        throw new Error(`预估成本超出预算`);
      }

      // 构建消息
      const messages = [
        {
          role: 'user' as const,
          content: contextString
        }
      ];

      // Phase B优化: 同样的TLS解决方案
      const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'text/event-stream',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          temperature: this.config.temperature,
          max_tokens: tokenInfo.maxOutputTokens,
          stream: true
        }),
        keepalive: true,
        // @ts-ignore
        duplex: 'half'
      });

      if (!response.ok) {
        throw new Error(`流式API调用失败: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('响应body为空');
      }

      const stream = this.createStreamIterator(response.body);

      return {
        stream,
        metadata: {
          estimatedTokens: tokenInfo.inputTokens + tokenInfo.maxOutputTokens,
          estimatedCost: costEstimate.totalCost,
          model: this.config.model,
          provider: this.config.provider
        }
      };

    } catch (error) {
      console.error('DeeChat流式调用失败:', error);
      throw error;
    }
  }

  /**
   * 检查服务可用性
   */
  isAvailable(): boolean {
    return Boolean(this.config.apiKey);
  }

  /**
   * 获取使用统计
   */
  getUsageStats() {
    return {
      requestCount: this.requestCount,
      totalCost: this.totalCost,
      averageCostPerRequest: this.requestCount > 0 ? this.totalCost / this.requestCount : 0,
      provider: this.config.provider,
      model: this.config.model
    };
  }

  /**
   * 重置统计
   */
  resetStats() {
    this.requestCount = 0;
    this.totalCost = 0;
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<DeeChatConfig>) {
    this.config = { ...this.config, ...updates };

    // 更新AIChat实例
    this.aiChat = new AIChat({
      baseUrl: this.getBaseUrl(),
      model: this.config.model,
      apiKey: this.config.apiKey
    });
  }

  /**
   * 发送自定义消息 - 支持双提示词模式 (System + User)
   * 为EnhancedSocraticService的模块化架构提供支持
   */
  async sendCustomMessage(
    messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      enableCostOptimization?: boolean;
    }
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // 参数验证
      if (!Array.isArray(messages)) {
        throw new Error(`DeeChatAIClient.sendCustomMessage: messages参数必须是数组，实际类型: ${typeof messages}`);
      }

      // 合并配置选项
      const finalOptions = {
        temperature: options?.temperature || this.config.temperature,
        maxTokens: options?.maxTokens || 1000,
        enableCostOptimization: options?.enableCostOptimization ?? this.config.enableCostOptimization
      };

      // 计算输入token数（合并所有消息内容）
      const combinedContent = messages.map(m => m.content).join('\n');
      const inputTokens = countTokens(combinedContent, this.config.provider, this.config.model);

      // 成本检查
      if (finalOptions.enableCostOptimization) {
        const costEstimate = await this.estimateRequestCost(
          inputTokens,
          finalOptions.maxTokens
        );

        if (!costEstimate.withinBudget) {
          throw new Error(`预估成本 $${costEstimate.totalCost.toFixed(4)} 超出阈值 $${this.config.costThreshold}`);
        }
      }

      // Phase B修复: 使用原生fetch替换有问题的ai-chat包
      const apiResponse = await fetch(`${this.getBaseUrl()}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          temperature: finalOptions.temperature,
          max_tokens: finalOptions.maxTokens
        })
      });

      if (!apiResponse.ok) {
        throw new Error(`API调用失败: ${apiResponse.status} ${apiResponse.statusText}`);
      }

      const apiResult = await apiResponse.json();
      const content = apiResult.choices?.[0]?.message?.content || '';

      // 计算实际使用的token和成本
      const outputTokens = countTokens(content, this.config.provider, this.config.model);
      const actualCost = await this.estimateRequestCost(inputTokens, outputTokens);

      // 更新统计
      this.requestCount++;
      this.totalCost += actualCost.totalCost;

      const duration = Date.now() - startTime;

      return {
        content,
        tokensUsed: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens
        },
        cost: {
          input: actualCost.inputCost,
          output: actualCost.outputCost,
          total: actualCost.totalCost
        },
        model: this.config.model,
        provider: this.config.provider,
        duration
      };

    } catch (error) {
      console.error('DeeChat自定义消息调用失败:', error);
      throw error;
    }
  }

  /**
   * 发送流式自定义消息 - 支持双提示词模式的流式响应
   */
  async sendCustomMessageStream(
    messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      enableCostOptimization?: boolean;
    }
  ): Promise<StreamingResponse> {
    try {
      // 合并配置选项
      const finalOptions = {
        temperature: options?.temperature || this.config.temperature,
        maxTokens: options?.maxTokens || 1000,
        enableCostOptimization: options?.enableCostOptimization ?? this.config.enableCostOptimization
      };

      // 计算输入token数和成本预估
      const combinedContent = messages.map(m => m.content).join('\n');
      const inputTokens = countTokens(combinedContent, this.config.provider, this.config.model);
      const costEstimate = await this.estimateRequestCost(inputTokens, finalOptions.maxTokens);

      if (finalOptions.enableCostOptimization && !costEstimate.withinBudget) {
        throw new Error(`预估成本超出预算`);
      }

      // Phase B优化: 解决TLS socket断连问题
      // 方案: 使用keep-alive和优化的fetch配置
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000); // 增加到90秒

      let stream;
      try {
        const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Accept': 'text/event-stream',
            'Connection': 'keep-alive', // 保持连接
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            temperature: finalOptions.temperature,
            max_tokens: finalOptions.maxTokens,
            stream: true
          }),
          signal: controller.signal,
          // 关键优化: Next.js环境下的fetch配置
          keepalive: true, // 启用keep-alive
          // @ts-ignore - Next.js特定配置
          duplex: 'half' // 流式请求必需
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`流式API调用失败: ${response.status} - ${errorText}`);
        }

        if (!response.body) {
          throw new Error('响应body为空');
        }

        stream = this.createStreamIterator(response.body);
      } catch (error) {
        clearTimeout(timeout);
        console.error('流式fetch失败,详细错误:', error);
        throw error;
      }

      return {
        stream,
        metadata: {
          estimatedTokens: inputTokens + finalOptions.maxTokens,
          estimatedCost: costEstimate.totalCost,
          model: this.config.model,
          provider: this.config.provider
        }
      };

    } catch (error) {
      console.error('DeeChat自定义流式调用失败:', error);
      throw error;
    }
  }

  /**
   * Phase B新增: 创建SSE流迭代器
   * 将ReadableStream转换为AsyncIterable<string>
   */
  private async *createStreamIterator(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留不完整的行

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const jsonStr = trimmed.slice(6); // 移除 "data: " 前缀
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;

              if (content) {
                // Phase B: 直接yield原始内容,不做Markdown转换
                // Markdown转换由前端或最终输出时统一处理
                yield content;
              }
            } catch (e) {
              console.warn('解析SSE数据失败:', trimmed, e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// 默认配置工厂函数
export function createDeeChatConfig(overrides: Partial<DeeChatConfig> = {}): DeeChatConfig {
  // 优先使用传入的配置，其次是环境变量，最后是默认值
  const config = {
    provider: overrides.provider || 'deepseek' as const,
    apiKey: overrides.apiKey || process.env.DEEPSEEK_API_KEY || '',
    apiUrl: overrides.apiUrl || process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',
    model: overrides.model || 'deepseek-chat',
    maxContextTokens: overrides.maxContextTokens || 8000,
    reserveTokens: overrides.reserveTokens || 100,
    costThreshold: overrides.costThreshold ?? 0.50, // 增加到50美分，确保AI功能正常工作
    temperature: overrides.temperature ?? 0.7,
    enableStreaming: overrides.enableStreaming ?? true,
    enableCostOptimization: overrides.enableCostOptimization ?? true,
  };

  // 调试信息
  console.log('🔧 DeeChatConfig创建:', {
    provider: config.provider,
    apiUrl: config.apiUrl,
    model: config.model,
    hasApiKey: !!config.apiKey,
    costThreshold: config.costThreshold
  });

  return config;
}

/**
 * Markdown转纯文本 - 清洗输出格式
 * Phase B新增: 将AI返回的Markdown转为清爽的纯文本
 * 特殊处理: 保留选项标记(A. B. C. D. E.)用于ISSUE方法论
 */
export function markdownToPlainText(markdown: string): string {
  let text = markdown;

  // 删除代码块标记
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```\w*\n?/g, '').replace(/```/g, '');
  });

  // 删除行内代码标记
  text = text.replace(/`([^`]+)`/g, '$1');

  // 删除标题标记 (## 标题 -> 标题)
  text = text.replace(/^#{1,6}\s+/gm, '');

  // 删除加粗/斜体标记
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1'); // **粗体**
  text = text.replace(/\*([^*]+)\*/g, '$1');     // *斜体*
  text = text.replace(/__([^_]+)__/g, '$1');     // __粗体__
  text = text.replace(/_([^_]+)_/g, '$1');       // _斜体_

  // 删除链接标记 [文本](url) -> 文本
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 删除图片标记
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');

  // 删除引用标记
  text = text.replace(/^>\s+/gm, '');

  // 清理列表标记,但保留选项标记(A. B. C. D. E.)
  // 先标记选项行,避免被清理
  const optionLines = new Map<string, string>();
  let lineIndex = 0;
  text = text.replace(/^[\s]*([A-E])[.、:：]\s*(.+)$/gm, (match, letter, content) => {
    const placeholder = `__OPTION_${lineIndex}__`;
    optionLines.set(placeholder, `${letter}. ${content}`);
    lineIndex++;
    return placeholder;
  });

  // 清理普通列表标记
  text = text.replace(/^[\s]*[-*+]\s+/gm, '  • '); // 无序列表
  text = text.replace(/^[\s]*\d+\.\s+/gm, '  ');   // 有序列表(但不包括选项)

  // 恢复选项行
  optionLines.forEach((value, key) => {
    text = text.replace(key, value);
  });

  // 删除水平分割线
  text = text.replace(/^[\s]*[-*_]{3,}[\s]*$/gm, '');

  // 清理多余空行(3个以上空行压缩为2个)
  text = text.replace(/\n{3,}/g, '\n\n');

  // 清理首尾空白
  text = text.trim();

  return text;
}