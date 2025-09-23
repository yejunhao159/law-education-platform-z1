/**
 * 苏格拉底对话应用服务
 * 核心业务逻辑，从API层分离
 * DeepPractice Standards Compliant
 */

import { validatePrompt, validateApiInput } from '../../../../lib/security/input-validator';
import { defaultPerformanceMonitor } from '../monitoring/PerformanceMonitor';
import { SocraticAIClient } from './SocraticAIClient';
import {
  SocraticRequest,
  SocraticResponse,
  SocraticResponseData,
  SocraticMessage,
  DialogueLevel,
  SocraticMode,
  SocraticDifficulty,
  SocraticErrorCode,
  PerformanceMetrics,
  FallbackMetrics
} from './types/SocraticTypes';

export class SocraticApplicationService {
  private aiClient: SocraticAIClient;

  constructor(aiClient?: SocraticAIClient) {
    this.aiClient = aiClient || new SocraticAIClient();
  }

  /**
   * 主要业务流程：生成苏格拉底式问题
   */
  async generateSocraticQuestion(request: SocraticRequest): Promise<SocraticResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      console.log('📊 开始苏格拉底对话生成...');

      // Step 1: 验证输入
      const validationResult = this.validateRequest(request);
      if (!validationResult.isValid) {
        return this.buildErrorResponse(
          validationResult.reason || '输入验证失败',
          SocraticErrorCode.INVALID_INPUT
        );
      }

      // Step 2: 设置默认值
      const processedRequest = this.processRequest(validationResult.sanitized || request);

      // Step 3: 验证消息内容
      const messageValidation = this.validateMessages(processedRequest.messages || []);
      if (!messageValidation.isValid) {
        return this.buildErrorResponse(
          '消息内容包含不允许的内容',
          SocraticErrorCode.INVALID_CONTENT
        );
      }

      // Step 4: 构建AI请求
      const aiRequest = this.buildAIRequest(processedRequest);

      // Step 5: 调用AI服务
      const aiStartTime = Date.now();
      const aiResponse = await this.callAIService(aiRequest, processedRequest.streaming);
      const aiDuration = Date.now() - aiStartTime;

      // Step 6: 记录性能指标
      const totalDuration = Date.now() - startTime;
      await this.recordPerformanceMetrics({
        aiCallDuration: aiDuration,
        totalDuration,
        success: true,
        fallbackUsed: false,
        sessionId: processedRequest.sessionId || requestId
      });

      // Step 7: 构建响应
      const result = this.buildSuccessResponse(
        aiResponse.content,
        processedRequest,
        aiResponse,
        totalDuration,
        requestId
      );

      console.log('✅ 苏格拉底对话生成完成');
      return result;

    } catch (error) {
      console.error('❌ 苏格拉底对话生成错误:', error);
      return await this.handleError(error, request, startTime, requestId);
    }
  }

  /**
   * 处理流式响应
   */
  async generateStreamResponse(request: SocraticRequest): Promise<ReadableStream> {
    const processedRequest = this.processRequest(request);
    const aiRequest = this.buildAIRequest(processedRequest);

    return await this.aiClient.createStreamResponse(aiRequest);
  }

  // ========== 私有业务方法 ==========

  /**
   * Step 1: 验证请求
   */
  private validateRequest(request: SocraticRequest): { isValid: boolean; reason?: string; sanitized?: any } {
    try {
      return validateApiInput(request);
    } catch (error) {
      return {
        isValid: false,
        reason: '请求格式错误'
      };
    }
  }

  /**
   * Step 2: 处理请求，设置默认值
   */
  private processRequest(request: SocraticRequest): Required<SocraticRequest> {
    return {
      messages: request.messages || [],
      caseInfo: request.caseInfo || null,
      currentLevel: request.currentLevel || DialogueLevel.OBSERVATION,
      mode: request.mode || SocraticMode.AUTO,
      sessionId: request.sessionId || `session-${Date.now()}`,
      difficulty: request.difficulty || SocraticDifficulty.NORMAL,
      streaming: request.streaming || false
    };
  }

  /**
   * Step 3: 验证消息内容
   */
  private validateMessages(messages: SocraticMessage[]): { isValid: boolean; reason?: string } {
    for (const message of messages) {
      if (message.content && typeof message.content === 'string') {
        const validation = validatePrompt(message.content);
        if (!validation.isValid) {
          return {
            isValid: false,
            reason: '消息内容包含不允许的内容'
          };
        }
        // 更新消息内容为清理后的内容
        message.content = validation.sanitized || message.content;
      }
    }
    return { isValid: true };
  }

  /**
   * Step 4: 构建AI请求
   */
  private buildAIRequest(request: Required<SocraticRequest>) {
    const config = this.aiClient.getConfig();
    const levelPrompt = config.levelPrompts[request.currentLevel] || '';

    const systemMessage = `${config.systemPrompt}\n\n当前处于第${request.currentLevel}层讨论。${levelPrompt}\n\n案例上下文：${JSON.stringify(request.caseInfo, null, 2)}`;

    return {
      messages: request.messages,
      systemMessage,
      temperature: 0.7,
      maxTokens: 500,
      streaming: request.streaming
    };
  }

  /**
   * Step 5: 调用AI服务
   */
  private async callAIService(aiRequest: any, streaming: boolean) {
    if (!this.aiClient.isAvailable()) {
      throw new Error('AI服务不可用');
    }

    if (streaming) {
      // 流式响应的处理在generateStreamResponse中
      return { content: '' };
    }

    return await this.aiClient.generateQuestion(aiRequest);
  }

  /**
   * Step 6: 记录性能指标
   */
  private async recordPerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      // 使用新的PerformanceMonitor记录请求
      defaultPerformanceMonitor.recordRequest({
        provider: 'deepseek',
        duration: metrics.aiCallDuration,
        tokens: {
          input: 0,  // 这些值需要从实际响应中获取
          output: 0,
          total: 0
        },
        cost: 0,   // 成本需要根据实际使用计算
        success: metrics.success,
        error: metrics.success ? undefined : 'AI调用失败'
      });
    } catch (error) {
      console.error('记录性能指标失败:', error);
    }
  }

  /**
   * Step 7: 构建成功响应
   */
  private buildSuccessResponse(
    content: string,
    request: Required<SocraticRequest>,
    aiResponse: any,
    duration: number,
    requestId: string
  ): SocraticResponse {
    const responseData: SocraticResponseData = {
      content,
      level: request.currentLevel,
      metadata: {
        sessionId: request.sessionId,
        model: aiResponse.model,
        usage: aiResponse.usage
      },
      cached: false
    };

    return {
      success: true,
      data: responseData,
      performance: {
        duration,
        requestId
      }
    };
  }

  /**
   * 错误处理和降级方案
   */
  private async handleError(
    error: unknown,
    request: SocraticRequest,
    startTime: number,
    requestId: string
  ): Promise<SocraticResponse> {
    const duration = Date.now() - startTime;

    // 记录错误指标
    await this.recordErrorMetrics(duration, requestId);

    // 尝试降级方案
    try {
      const fallbackLevel = DialogueLevel.OBSERVATION;
      const config = this.aiClient.getConfig();
      const fallbackContent = config.fallbackQuestions[fallbackLevel];

      // 记录降级指标
      await this.recordFallbackMetrics({
        type: 'ai_unavailable',
        sessionId: requestId,
        responseTime: duration,
        success: true
      });

      return {
        success: false,
        fallback: true,
        data: {
          content: fallbackContent,
          level: fallbackLevel,
          metadata: {
            sessionId: requestId,
            fallback: true
          }
        },
        error: {
          message: 'AI服务暂时不可用，使用备选问题',
          code: SocraticErrorCode.SERVICE_UNAVAILABLE,
          type: 'fallback'
        }
      };
    } catch (fallbackError) {
      return this.buildErrorResponse(
        '服务暂时不可用，请稍后重试',
        SocraticErrorCode.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * 构建错误响应
   */
  private buildErrorResponse(message: string, code: SocraticErrorCode): SocraticResponse {
    return {
      success: false,
      error: {
        message,
        code
      }
    };
  }

  /**
   * 记录错误指标
   */
  private async recordErrorMetrics(duration: number, requestId: string): Promise<void> {
    try {
      // 使用新的PerformanceMonitor记录失败的请求
      defaultPerformanceMonitor.recordRequest({
        provider: 'deepseek',
        duration,
        tokens: { input: 0, output: 0, total: 0 },
        cost: 0,
        success: false,
        error: 'AI service error'
      });
    } catch (error) {
      console.error('记录错误指标失败:', error);
    }
  }

  /**
   * 记录降级指标
   */
  private async recordFallbackMetrics(metrics: FallbackMetrics): Promise<void> {
    try {
      // 使用新的PerformanceMonitor记录降级请求
      defaultPerformanceMonitor.recordRequest({
        provider: 'fallback',
        duration: metrics.duration || 0,
        tokens: { input: 0, output: 0, total: 0 },
        cost: 0,
        success: metrics.success || false,
        fallback: true
      });
    } catch (error) {
      console.error('记录降级指标失败:', error);
    }
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}