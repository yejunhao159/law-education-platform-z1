/**
 * DeeChat驱动的AI客户端
 * 集成官方DeeChat包，提供统一的AI接口
 * DeepPractice Standards Compliant
 */

import { AIChat } from '@deepracticex/ai-chat';
import { countTokens, CostCalculator, TokenCalculator } from '@deepracticex/token-calculator';
import { ContextFormatter } from '@deepracticex/context-manager';
// import {
//   SocraticMessage,
//   SocraticRequest,
//   SocraticErrorCode
// } from '@/lib/types/socratic/ai-service';

// 临时类型定义，解决导入问题
type SocraticMessage = {
  role: string;
  content: string;
  timestamp?: string;
};

type SocraticRequest = {
  messages?: SocraticMessage[];
  level?: string;
  mode?: string;
  currentTopic?: string;
};

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
    this.aiChat = new AIChat({
      baseUrl: this.getBaseUrl(),
      model: config.model,
      apiKey: config.apiKey
    });
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

      // 发送请求
      const response = await this.aiChat.sendMessageComplete(messages, {
        temperature: this.config.temperature,
        maxTokens: tokenInfo.maxOutputTokens
      });

      // 计算实际使用的token和成本
      const outputTokens = countTokens(response.message.content, this.config.provider, this.config.model);
      const actualCost = await this.estimateRequestCost(tokenInfo.inputTokens, outputTokens);

      // 更新统计
      this.requestCount++;
      this.totalCost += actualCost.totalCost;

      const duration = Date.now() - startTime;

      return {
        content: response.message.content,
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

      // 发送流式请求
      const stream = this.aiChat.sendMessage(messages, {
        temperature: this.config.temperature,
        maxTokens: tokenInfo.maxOutputTokens
      });

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

      // 发送请求到AI服务
      const response = await this.aiChat.sendMessageComplete(messages, {
        temperature: finalOptions.temperature,
        maxTokens: finalOptions.maxTokens
      });

      // 计算实际使用的token和成本
      const outputTokens = countTokens(response.message.content, this.config.provider, this.config.model);
      const actualCost = await this.estimateRequestCost(inputTokens, outputTokens);

      // 更新统计
      this.requestCount++;
      this.totalCost += actualCost.totalCost;

      const duration = Date.now() - startTime;

      return {
        content: response.message.content,
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

      // 发送流式请求
      const stream = this.aiChat.sendMessage(messages, {
        temperature: finalOptions.temperature,
        maxTokens: finalOptions.maxTokens
      });

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
}

// 默认配置工厂函数
export function createDeeChatConfig(overrides: Partial<DeeChatConfig> = {}): DeeChatConfig {
  return {
    provider: 'deepseek',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    model: 'deepseek-chat',
    maxContextTokens: 8000,
    reserveTokens: 100,
    costThreshold: 0.10, // 10分钱，给AI对话更多预算空间
    temperature: 0.7,
    enableStreaming: true,
    enableCostOptimization: true,
    ...overrides
  };
}