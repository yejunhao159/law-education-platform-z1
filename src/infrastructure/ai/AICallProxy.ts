/**
 * AI调用代理层 - 统一AI服务调用入口
 *
 * 功能：
 * - 拦截所有DeepSeek API调用，重定向到DeeChatAIClient
 * - 提供与原DeepSeek API完全一致的响应格式
 * - 统一成本控制、错误处理、日志记录
 * - 最小化对现有业务逻辑的侵入
 *
 * 解决Issue #21: 统一AI调用协议，减少重复开发
 */

import { DeeChatAIClient, createDeeChatConfig } from '../../domains/socratic-dialogue/services/DeeChatAIClient';
import { AI_DEFAULTS } from '@/src/config/ai-defaults';

interface AICallProxyConfig {
  provider: 'deepseek' | 'openai' | 'claude';
  apiKey: string;
  apiUrl?: string;
  model: string;
  maxRetries: number;
  timeout: number;
  enableCostTracking: boolean;
  // enableErrorFallback已删除 - 不再支持错误降级
}

interface DeepSeekAPIRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  response_format?: any;
}

interface DeepSeekAPIResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    index: number;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  id: string;
  created: number;
}

/**
 * AI调用代理类
 * 核心职责：无缝拦截并重定向AI调用，保证业务逻辑透明性
 */
export class AICallProxy {
  private static instance: AICallProxy;
  private aiClient: DeeChatAIClient;
  private config: AICallProxyConfig;
  private callStats = {
    totalCalls: 0,
    totalTokens: 0,
    totalCost: 0,
    errors: 0
  };

  private constructor(config: AICallProxyConfig) {
    this.config = config;

    // 基于DeeChatAIClient创建统一AI客户端
    const deeChatConfig = createDeeChatConfig({
      provider: config.provider,
      apiKey: config.apiKey,
      apiUrl: config.apiUrl || 'https://api.deepseek.com/v1',
      model: config.model,
      temperature: 0.7,
      maxContextTokens: 8000,
      reserveTokens: 200,
      costThreshold: 0.50, // 提高阈值到50美分，确保法学教育AI功能正常运行
      enableCostOptimization: config.enableCostTracking
    });

    this.aiClient = new DeeChatAIClient(deeChatConfig);
  }

  /**
   * 获取代理实例（单例模式）
   */
  static getInstance(config?: AICallProxyConfig): AICallProxy {
    if (!AICallProxy.instance) {
      // 使用简化的默认配置
      const defaultConfig: AICallProxyConfig = {
        provider: 'deepseek',
        apiKey: AI_DEFAULTS.apiKey,
        apiUrl: AI_DEFAULTS.apiUrl,
        model: AI_DEFAULTS.model,
        maxRetries: AI_DEFAULTS.maxRetries,
        timeout: AI_DEFAULTS.timeout,
        enableCostTracking: true
      };

      console.log('🚀 AICallProxy初始化配置:', {
        provider: defaultConfig.provider,
        apiUrl: defaultConfig.apiUrl,
        model: defaultConfig.model,
        hasApiKey: !!defaultConfig.apiKey,
        keyPrefix: defaultConfig.apiKey ? defaultConfig.apiKey.substring(0, 8) + '...' : 'N/A'
      });

      AICallProxy.instance = new AICallProxy(config || defaultConfig);
    }
    return AICallProxy.instance;
  }

  /**
   * 核心方法：拦截DeepSeek API调用
   *
   * @param _url 原始API URL（兼容性，实际不使用）
   * @param options 原始fetch options
   * @returns 与DeepSeek API完全一致的Response对象
   */
  async interceptDeepSeekCall(_url: string, options: RequestInit): Promise<Response> {
    const startTime = Date.now();
    const callId = `ai-call-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      console.log(`🤖 [${callId}] AI调用拦截 - 开始处理`);

      // 1. 解析原始DeepSeek请求
      const originalRequest = await this.parseDeepSeekRequest(options);

      // 2. 提取system和user消息
      const { systemPrompt, userPrompt, requestOptions } = this.extractPrompts(originalRequest);

      // 3. 成本预检查
      if (this.config.enableCostTracking) {
        await this.checkCostLimits();
      }

      // 4. 调用DeeChatAIClient（统一AI调用）
      const aiResult = await this.callUnifiedAI(systemPrompt, userPrompt, requestOptions);

      // 5. 转换为DeepSeek API格式响应
      const deepSeekResponse = this.formatAsDeepSeekResponse(aiResult, originalRequest.model);

      // 6. 记录调用统计
      this.updateCallStats(aiResult, Date.now() - startTime);

      console.log(`✅ [${callId}] AI调用完成 - 耗时: ${Date.now() - startTime}ms, Tokens: ${aiResult.tokensUsed || 0}, Cost: ${aiResult.cost || 0}`);

      // 7. 返回标准Response对象
      return new Response(JSON.stringify(deepSeekResponse), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-AI-Proxy': 'DeeChatAI',
          'X-Call-ID': callId,
          'X-Tokens-Used': (aiResult.tokensUsed || 0).toString(),
          'X-Cost': (aiResult.cost || 0).toString()
        }
      });

    } catch (error) {
      console.error(`❌ [${callId}] AI调用失败:`, error);
      this.callStats.errors++;

      // 直接抛出错误，不做降级处理
      // 让上层调用者明确知道失败，并返回正确的HTTP状态码
      throw error;
    }
  }

  /**
   * 通用AI调用方法（供业务层直接使用）
   */
  async callAI(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      responseFormat?: 'json' | 'text';
    }
  ): Promise<{
    content: string;
    tokensUsed: number;
    cost: number;
    model: string;
    callId: string;
  }> {
    const callId = `direct-call-${Date.now()}`;

    try {
      const result = await this.callUnifiedAI(systemPrompt, userPrompt, options || {});
      return {
        ...result,
        callId
      };
    } catch (error) {
      console.error(`❌ [${callId}] 直接AI调用失败:`, error);
      throw error;
    }
  }

  /**
   * 获取调用统计
   */
  getCallStats() {
    return {
      ...this.callStats,
      successRate: this.callStats.totalCalls > 0
        ? ((this.callStats.totalCalls - this.callStats.errors) / this.callStats.totalCalls * 100).toFixed(2) + '%'
        : '0%',
      averageCostPerCall: this.callStats.totalCalls > 0
        ? (this.callStats.totalCost / this.callStats.totalCalls).toFixed(4)
        : '0'
    };
  }

  // ========== 私有辅助方法 ==========

  /**
   * 解析DeepSeek请求格式
   */
  private async parseDeepSeekRequest(options: RequestInit): Promise<DeepSeekAPIRequest> {
    if (!options.body) {
      throw new Error('AI调用代理: 请求体为空');
    }

    try {
      const body = typeof options.body === 'string'
        ? JSON.parse(options.body)
        : options.body;

      return body as DeepSeekAPIRequest;
    } catch (error) {
      throw new Error('AI调用代理: 请求体格式错误 - ' + (error as Error).message);
    }
  }

  /**
   * 提取system和user提示词
   */
  private extractPrompts(request: DeepSeekAPIRequest) {
    const messages = request.messages || [];

    let systemPrompt = '';
    let userPrompt = '';

    // 按标准OpenAI格式解析消息
    for (const message of messages) {
      if (message.role === 'system') {
        systemPrompt = message.content;
      } else if (message.role === 'user') {
        userPrompt += (userPrompt ? '\n\n' : '') + message.content;
      }
    }

    // 如果没有明确的system消息，使用默认
    if (!systemPrompt) {
      systemPrompt = '你是一位专业的AI助手，请根据用户需求提供准确、有用的回答。';
    }

    return {
      systemPrompt,
      userPrompt,
      requestOptions: {
        temperature: request.temperature || 0.7,
        maxTokens: request.max_tokens || 1000,
        responseFormat: request.response_format ? 'json' : 'text'
      }
    };
  }

  /**
   * 调用统一AI服务
   */
  private async callUnifiedAI(
    systemPrompt: string,
    userPrompt: string,
    options: any
  ): Promise<{
    content: string;
    tokensUsed: number;
    cost: number;
    model: string;
    duration: number;
  }> {
    const startTime = Date.now();

    // 检查API Key是否配置
    if (!this.config.apiKey) {
      console.error('❌ DEEPSEEK_API_KEY未配置');
      throw new Error('API Key未配置，请在.env.local中设置DEEPSEEK_API_KEY');
    }

    try {
      // 使用DeeChatAIClient的sendCustomMessage方法
      // 修复：第一个参数必须是messages数组，不是字符串
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt }
      ];

      // sendCustomMessage 只接受2个参数：messages和options
      const result = await this.aiClient.sendCustomMessage(
        messages, // 传递messages数组而不是字符串
        {
          temperature: options.temperature ?? AI_DEFAULTS.temperature,
          maxTokens: options.maxTokens ?? AI_DEFAULTS.maxTokens,
          enableCostOptimization: options.enableCostOptimization ?? true
        }
      );

      return {
        content: result.content,
        tokensUsed: result.tokensUsed.total,
        cost: result.cost.total,
        model: result.model,
        duration: Date.now() - startTime
      };

    } catch (error) {
      console.error('统一AI调用失败:', error);
      // 如果是API Key错误，提供更友好的错误信息
      if (error instanceof Error && error.message.includes('401')) {
        throw new Error('API Key无效或已过期，请检查DEEPSEEK_API_KEY配置');
      }
      throw error;
    }
  }

  /**
   * 格式化为DeepSeek API响应格式
   */
  private formatAsDeepSeekResponse(
    aiResult: any,
    originalModel: string
  ): DeepSeekAPIResponse {
    const tokensUsed = aiResult.tokensUsed || 0;
    return {
      choices: [{
        message: {
          content: aiResult.content || '',
          role: 'assistant'
        },
        index: 0,
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: Math.floor(tokensUsed * 0.7), // 估算
        completion_tokens: Math.floor(tokensUsed * 0.3),
        total_tokens: tokensUsed
      },
      model: originalModel || this.config.model,
      id: `chatcmpl-${Date.now()}`,
      created: Math.floor(Date.now() / 1000)
    };
  }

  /**
   * 成本限制检查
   */
  private async checkCostLimits(): Promise<void> {
    // 简单的成本检查逻辑
    if (this.callStats.totalCost > 10.0) { // $10限制
      console.warn('⚠️ AI调用成本接近限制，请检查使用情况');
    }
  }

  /**
   * 更新调用统计
   */
  private updateCallStats(result: any, _duration: number): void {
    this.callStats.totalCalls++;
    this.callStats.totalTokens += result.tokensUsed || 0;
    this.callStats.totalCost += result.cost || 0;
  }

  /**
   * 已删除 generateFallbackResponse 方法
   * 原因：不应该隐藏错误，让问题明确暴露
   * 所有错误直接抛出，由上层处理并返回正确的HTTP状态码
   */
}

/**
 * 便捷的导出函数，供API层直接使用
 */
export async function interceptDeepSeekCall(url: string, options: RequestInit): Promise<Response> {
  const proxy = AICallProxy.getInstance();
  return proxy.interceptDeepSeekCall(url, options);
}

/**
 * 直接AI调用函数，供业务层使用
 */
export async function callUnifiedAI(
  systemPrompt: string,
  userPrompt: string,
  options?: any
) {
  const proxy = AICallProxy.getInstance();
  return proxy.callAI(systemPrompt, userPrompt, options);
}

/**
 * 获取AI调用统计
 */
export function getAICallStats() {
  const proxy = AICallProxy.getInstance();
  return proxy.getCallStats();
}

/**
 * 流式AI调用函数，供需要实时响应的API使用
 */
export async function callUnifiedAIStream(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'json' | 'text';
    onChunk?: (chunk: string) => void;
  }
) {
  const proxy = AICallProxy.getInstance();

  // 🔧 关键修复：如果要求JSON格式，在system prompt中强制要求
  let finalSystemPrompt = systemPrompt;
  if (options?.responseFormat === 'json') {
    finalSystemPrompt = systemPrompt + '\n\n**重要：你必须返回一个有效的JSON对象，不要包含任何markdown格式标记（如```json），直接返回纯JSON。**';
  }

  // 创建流式调用方法
  const messages = [
    { role: 'system' as const, content: finalSystemPrompt },
    { role: 'user' as const, content: userPrompt }
  ];

  try {
    // 使用DeeChatAIClient的流式方法
    const aiClient = (proxy as any).aiClient;
    if (!aiClient || typeof aiClient.sendCustomMessageStream !== 'function') {
      throw new Error('AI客户端不支持流式调用');
    }

    // 🔧 修复：sendCustomMessageStream返回AsyncIterable，不需要await
    const streamIterable = aiClient.sendCustomMessageStream(
      messages,
      {
        temperature: options?.temperature || 0.7,
        maxTokens: options?.maxTokens || 1000
      }
    );

    // 返回包装后的异步迭代器，支持onChunk回调
    return {
      async *[Symbol.asyncIterator]() {
        // ✅ 修复：直接迭代streamIterable，不是streamIterable.stream
        for await (const chunk of streamIterable) {
          // 🔧 关键修复：确保text总是字符串，并处理DeepSeek特殊chunk
          let text: string;
          if (typeof chunk === 'string') {
            text = chunk;
          } else if (typeof chunk === 'object' && chunk !== null) {
            // 🔧 DeepSeek特殊处理：跳过元数据chunk（如 {phase: 'thinking'}）
            const chunkObj = chunk as any;

            // 如果是DeepSeek的元数据chunk，跳过
            if (chunkObj.phase === 'thinking' || chunkObj.phase === 'responding') {
              continue; // 跳过这种元数据
            }

            // 尝试提取content或text字段
            text = chunkObj.content || chunkObj.text || chunkObj.delta?.content || '';

            // 如果都没有，记录警告并跳过
            if (!text) {
              console.warn('⚠️ [AICallProxy] 流式chunk无法提取文本内容:', JSON.stringify(chunk).substring(0, 100));
              continue; // 跳过无效chunk
            }
          } else {
            continue; // 跳过非字符串非对象的chunk
          }

          if (text && options?.onChunk) {
            options.onChunk(text);
          }
          yield text;
        }
      }
    };
  } catch (error) {
    console.error('流式AI调用失败:', error);
    throw error;
  }
}