/**
 * DeeChat驱动的AI客户端 - 使用ai-chat 0.5.0
 * 集成官方@deepracticex/ai-chat包，提供统一的AI接口
 * DeepPractice Standards Compliant
 */

import { AIChat, type ChatStreamChunk } from '@deepracticex/ai-chat';
import { countTokens, CostCalculator, TokenCalculator } from '@deepracticex/token-calculator';
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

export class DeeChatAIClient {
  private aiChat: AIChat;
  private config: DeeChatConfig;
  private requestCount = 0;
  private totalCost = 0;

  constructor(config: DeeChatConfig) {
    this.config = config;

    // 使用ai-chat 0.5.0创建实例
    this.aiChat = new AIChat({
      baseUrl: this.getBaseUrl(),
      model: config.model,
      apiKey: config.apiKey,
      temperature: config.temperature,
      maxTokens: config.maxContextTokens,
      timeout: 180000  // 🔧 修复：增加到180秒（3分钟），支持判决书长文本提取
    });

    console.log('✅ DeeChatAIClient初始化完成:', {
      provider: config.provider,
      model: config.model,
      baseUrl: this.getBaseUrl()
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

      const isOptimal = availableTokens > 300; // 至少300个token用于输出

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
   * 发送自定义消息 - 使用ai-chat的流式迭代器（非流式完整响应）
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
      // 转换为ai-chat格式
      const aiChatMessages = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      let content = '';
      let usage: any;
      let model = '';

      // 使用ai-chat的流式迭代器聚合为完整响应
      for await (const chunk of this.aiChat.sendMessage(aiChatMessages, {
        temperature: options?.temperature || this.config.temperature,
        maxTokens: options?.maxTokens || this.config.maxContextTokens
      })) {
        if (chunk.content) {
          content += chunk.content;
        }
        if (chunk.usage) usage = chunk.usage;
        if (chunk.model) model = chunk.model;
        if (chunk.error) throw new Error(chunk.error);
        if (chunk.done) break;
      }

      // 计算成本
      const inputTokens = usage?.prompt_tokens || 0;
      const outputTokens = usage?.completion_tokens || 0;
      const cost = await this.estimateRequestCost(inputTokens, outputTokens);

      // 更新统计
      this.requestCount++;
      this.totalCost += cost.totalCost;

      const duration = Date.now() - startTime;

      return {
        content,
        tokensUsed: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens
        },
        cost: cost,
        model: model || this.config.model,
        provider: this.config.provider,
        duration
      };

    } catch (error) {
      console.error('DeeChat AI调用失败:', error);
      throw error;
    }
  }

  /**
   * 发送流式自定义消息 - 直接返回ai-chat的流式迭代器
   */
  async *sendCustomMessageStream(
    messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      enableCostOptimization?: boolean;
    }
  ): AsyncIterable<ChatStreamChunk> {
    // 转换为ai-chat格式
    const aiChatMessages = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    // 直接yield ai-chat的chunks
    for await (const chunk of this.aiChat.sendMessage(aiChatMessages, {
      temperature: options?.temperature || this.config.temperature,
      maxTokens: options?.maxTokens || this.config.maxContextTokens
    })) {
      yield chunk;
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

    // 重新创建AIChat实例
    this.aiChat = new AIChat({
      baseUrl: this.getBaseUrl(),
      model: this.config.model,
      apiKey: this.config.apiKey,
      temperature: this.config.temperature,
      maxTokens: this.config.maxContextTokens,
      timeout: 90000
    });
  }
}

// 默认配置工厂函数
export function createDeeChatConfig(overrides: Partial<DeeChatConfig> = {}): DeeChatConfig {
  // 导入AI_DEFAULTS作为集中默认配置来源
  const AI_DEFAULTS = require('@/src/config/ai-defaults').AI_DEFAULTS;

  const config = {
    provider: overrides.provider || 'deepseek' as const,
    // 使用 overrides → AI_DEFAULTS → 空值 的顺序，避免硬编码密钥
    apiKey: overrides.apiKey ?? AI_DEFAULTS.apiKey ?? '',
    apiUrl: overrides.apiUrl || AI_DEFAULTS.apiUrl || 'https://api.deepseek.com/v1',
    model: overrides.model || AI_DEFAULTS.model || 'deepseek-chat',
    maxContextTokens: overrides.maxContextTokens || 8000,
    reserveTokens: overrides.reserveTokens || 100,
    costThreshold: overrides.costThreshold ?? 0.50,
    temperature: overrides.temperature ?? 0.7,
    enableStreaming: overrides.enableStreaming ?? true,
    enableCostOptimization: overrides.enableCostOptimization ?? true,
  };

  console.log('🔧 DeeChatConfig创建:', {
    provider: config.provider,
    apiUrl: config.apiUrl,
    model: config.model,
    hasApiKey: !!config.apiKey,
    keySource: overrides.apiKey ? 'override' : (AI_DEFAULTS.apiKey ? 'env' : 'missing')
  });

  return config;
}

/**
 * 清洗Markdown输出 - 保留结构，去除冗余
 * 与 markdownToPlainText 不同，此函数保留Markdown格式，只去除冗余符号
 */
export function cleanMarkdown(markdown: string): string {
  let text = markdown;

  // 1. 清理冗余的标题标记（如 #### 标题 #### 这种前后都有的）
  text = text.replace(/^(#{1,6})\s+(.+?)\s+\1\s*$/gm, '$1 $2');

  // 2. 清理冗余的强调标记（如 **文本** ** 多余的星号）
  text = text.replace(/\*{3,}/g, '**'); // ***以上 -> **以上
  text = text.replace(/_{3,}/g, '__'); // ___以上 -> __以上

  // 3. 清理冗余的分隔线（保留一条，删除连续的多条）
  text = text.replace(/(^[\s]*[-*_]{3,}[\s]*$\n?)+/gm, '---\n');

  // 4. 清理多余的空行（3个以上空行压缩为2个）
  text = text.replace(/\n{4,}/g, '\n\n\n');

  // 5. 保留选项标记的格式统一（A. B. C. -> 统一用 A. 格式）
  text = text.replace(/^[\s]*([A-E])[、:：]\s*/gm, '$1. ');

  // 6. 清理行尾多余空格
  text = text.replace(/[ \t]+$/gm, '');

  // 7. 清理首尾空白
  text = text.trim();

  return text;
}

/**
 * Markdown转纯文本 - 清洗输出格式（旧版，完全去除格式）
 * 保留选项标记(A. B. C. D. E.)用于ISSUE方法论
 * @deprecated 请使用 cleanMarkdown 以保留Markdown结构
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
