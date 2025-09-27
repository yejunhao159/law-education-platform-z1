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

interface AICallProxyConfig {
  provider: 'deepseek' | 'openai' | 'claude';
  apiKey: string;
  apiUrl?: string;
  model: string;
  maxRetries: number;
  timeout: number;
  enableCostTracking: boolean;
  enableErrorFallback: boolean;
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
      // 在Next.js环境中安全地获取环境变量
      const getEnvVar = (key: string, fallback: string = '') => {
        return typeof process !== 'undefined' && process.env ? process.env[key] || fallback : fallback;
      };

      const defaultConfig: AICallProxyConfig = {
        provider: 'deepseek',
        apiKey: getEnvVar('DEEPSEEK_API_KEY', 'sk-6b081a93258346379182141661293345'), // 使用.env.local中的key作为fallback
        apiUrl: getEnvVar('DEEPSEEK_API_URL', 'https://api.deepseek.com/v1'),
        model: 'deepseek-chat',
        maxRetries: 3,
        timeout: 30000,
        enableCostTracking: true,
        enableErrorFallback: true
      };

      console.log('🚀 AICallProxy初始化配置:', {
        provider: defaultConfig.provider,
        apiUrl: defaultConfig.apiUrl,
        model: defaultConfig.model,
        hasApiKey: !!defaultConfig.apiKey,
        keyPrefix: defaultConfig.apiKey.substring(0, 8) + '...'
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

      console.log(`✅ [${callId}] AI调用完成 - 耗时: ${Date.now() - startTime}ms, Tokens: ${aiResult.tokensUsed}`);

      // 7. 返回标准Response对象
      return new Response(JSON.stringify(deepSeekResponse), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-AI-Proxy': 'DeeChatAI',
          'X-Call-ID': callId,
          'X-Tokens-Used': aiResult.tokensUsed.toString(),
          'X-Cost': aiResult.cost.toString()
        }
      });

    } catch (error) {
      console.error(`❌ [${callId}] AI调用失败:`, error);
      this.callStats.errors++;

      // 错误降级处理
      if (this.config.enableErrorFallback) {
        return this.generateFallbackResponse(error as Error, callId);
      } else {
        throw error;
      }
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
          temperature: options.temperature || 0.7,
          maxTokens: options.maxTokens || 1000,
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
    return {
      choices: [{
        message: {
          content: aiResult.content,
          role: 'assistant'
        },
        index: 0,
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: Math.floor(aiResult.tokensUsed * 0.7), // 估算
        completion_tokens: Math.floor(aiResult.tokensUsed * 0.3),
        total_tokens: aiResult.tokensUsed
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
    this.callStats.totalTokens += result.tokensUsed;
    this.callStats.totalCost += result.cost;
  }

  /**
   * 生成降级响应
   */
  private generateFallbackResponse(error: Error, callId: string): Response {
    const fallbackResponse: DeepSeekAPIResponse = {
      choices: [{
        message: {
          content: `抱歉，AI分析服务暂时不可用。错误信息：${error.message}。请稍后重试或联系管理员。`,
          role: 'assistant'
        },
        index: 0,
        finish_reason: 'error'
      }],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 50,
        total_tokens: 50
      },
      model: this.config.model,
      id: `fallback-${callId}`,
      created: Math.floor(Date.now() / 1000)
    };

    return new Response(JSON.stringify(fallbackResponse), {
      status: 200, // 返回200但内容表明错误，保持业务逻辑兼容
      headers: {
        'Content-Type': 'application/json',
        'X-AI-Proxy': 'DeeChatAI-Fallback',
        'X-Call-ID': callId,
        'X-Error': 'true'
      }
    });
  }
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