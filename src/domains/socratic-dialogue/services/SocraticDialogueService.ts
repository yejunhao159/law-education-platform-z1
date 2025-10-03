/**
 * 苏格拉底对话服务 - 统一入口
 * 集成所有模块化组件：FullPromptBuilder + XML结构化 + 双提示词模式
 * DeepPractice Standards Compliant
 *
 * @description
 * 这是Socratic对话功能的唯一服务入口，整合了：
 * - AI调用（DeeChatAIClient）
 * - Prompt构建（FullPromptBuilder）
 * - 上下文格式化（@deepracticex/context-manager）
 */

import { DeeChatAIClient, createDeeChatConfig } from './DeeChatAIClient';
import { FullPromptBuilder, type FullPromptContext } from './FullPromptBuilder';
import {
  SocraticRequest,
  SocraticResponse,
  Message,
  DialogueLevel,
  DialogueMode,
  SocraticErrorCode
} from '../types';

/**
 * 苏格拉底对话服务配置
 */
export interface SocraticDialogueConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  enableXMLStructure: boolean;
  /** 是否包含诊断信息（默认false，仅用于调试） */
  includeDiagnostics?: boolean;
}

/**
 * 苏格拉底对话服务
 *
 * @example
 * ```typescript
 * const service = new SocraticDialogueService();
 * const response = await service.generateQuestion({
 *   currentTopic: "合同效力",
 *   caseContext: "案例信息...",
 *   level: "intermediate"
 * });
 * ```
 */
export class SocraticDialogueService {
  private config: SocraticDialogueConfig;
  private aiClient: DeeChatAIClient;

  constructor(config?: Partial<SocraticDialogueConfig>) {
    this.config = {
      apiUrl: process.env.NEXT_PUBLIC_DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 2500,  // 提高输出限制以支持深度教学引导
      enableXMLStructure: true,
      includeDiagnostics: false, // 默认不包含诊断信息（生产环境）
      ...config
    };

    // 创建DeeChatAIClient实例，配置支持双提示词
    const deeChatConfig = createDeeChatConfig({
      provider: 'deepseek',
      apiKey: this.config.apiKey,
      apiUrl: this.config.apiUrl,
      model: this.config.model,
      temperature: this.config.temperature,
      maxContextTokens: 8000,
      reserveTokens: 200,
      costThreshold: 0.10,
      enableCostOptimization: true
    });

    this.aiClient = new DeeChatAIClient(deeChatConfig);
  }

  /**
   * 生成苏格拉底式问题 - 主入口方法
   *
   * @param request - 对话请求，包含当前主题、案例上下文、教学层级等
   * @returns 苏格拉底响应，包含生成的问题和元数据
   *
   * @example
   * ```typescript
   * const response = await service.generateQuestion({
   *   currentTopic: "合同有效性分析",
   *   level: "intermediate",
   *   caseContext: "甲乙双方签订买卖合同..."
   * });
   * if (response.success) {
   *   console.log(response.data.question);
   * }
   * ```
   */
  async generateQuestion(request: SocraticRequest): Promise<SocraticResponse> {
    try {
      // 第1步：构建完整的 System Prompt（包含所有教学知识）
      const systemPrompt = this.buildSystemPrompt(request);

      // 第2步：构建对话历史消息
      const conversationMessages = this.buildConversationMessages(request.messages || []);

      // 第3步：构建当前用户输入
      const currentContext = this.buildCurrentContext(request);

      // 第4步：手动构建完整的messages数组（绕过ContextFormatter）
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        // System Message：完整的教学知识
        {
          role: 'system',
          content: systemPrompt
        },
        // 对话历史
        ...conversationMessages,
        // 当前用户输入
        {
          role: 'user',
          content: currentContext
        }
      ];

      // 生产环境最小日志：仅记录关键指标
      console.log(`[Socratic] Messages构建完成 - 总数:${messages.length}, SystemPrompt:${messages[0]?.content?.length || 0}chars, 对话历史:${conversationMessages.length}轮`);

      // 第4步：直接使用生成的 messages 调用 AI
      const aiResponse = await this.callAIWithMessages(messages);

      return {
        success: true,
        data: {
          question: aiResponse.content,
          content: aiResponse.content,
          level: request.level || 'intermediate' as DialogueLevel,
          mode: request.mode || 'exploration' as DialogueMode,
          timestamp: new Date().toISOString(),
          sessionId: request.sessionId || 'enhanced-session',
          metadata: {
            tokensUsed: (aiResponse as any).tokensUsed,
            cost: (aiResponse as any).cost,
            model: (aiResponse as any).model || 'deepseek-chat',
            processingTime: (aiResponse as any).duration
          }
        }
      };

    } catch (error) {
      console.error('SocraticDialogueService Error:', error);
      return {
        success: false,
        error: {
          code: SocraticErrorCode.AI_SERVICE_ERROR,
          message: '苏格拉底对话生成失败: ' + (error instanceof Error ? error.message : '未知错误'),
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * 生成苏格拉底式问题 - 流式输出版本
   *
   * @param request - 对话请求
   * @returns 异步流式迭代器，实时输出AI生成的内容
   *
   * @example
   * ```typescript
   * const stream = await service.generateQuestionStream(request);
   * for await (const chunk of stream) {
   *   console.log(chunk); // 实时输出每个token
   * }
   * ```
   */
  async *generateQuestionStream(request: SocraticRequest): AsyncIterable<string> {
    try {
      // 第1步：构建完整的 System Prompt（包含所有教学知识）
      const systemPrompt = this.buildSystemPrompt(request);

      // 第2步：构建对话历史消息
      const conversationMessages = this.buildConversationMessages(request.messages || []);

      // 第3步：构建当前用户输入
      const currentContext = this.buildCurrentContext(request);

      // 第4步：手动构建完整的messages数组（与非流式版本一致）
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...conversationMessages,
        {
          role: 'user',
          content: currentContext
        }
      ];

      console.log(`[Socratic Stream] Messages数:${messages.length}, SystemPrompt:${systemPrompt.length}chars`);

      // 直接使用ai-chat的流式迭代器，提取文本内容
      for await (const chunk of this.aiClient.sendCustomMessageStream(messages, {
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        enableCostOptimization: true
      })) {
        // 只yield文本内容给route.ts（保持简单的字符串接口）
        if (chunk.content) {
          yield chunk.content;
        }
      }

    } catch (error) {
      console.error('SocraticDialogueService Stream Error:', error);
      throw error;
    }
  }

  /**
   * 向后兼容方法：generateSocraticQuestion
   * @deprecated 请使用 generateQuestion 代替
   */
  async generateSocraticQuestion(request: SocraticRequest): Promise<SocraticResponse> {
    return this.generateQuestion(request);
  }

  /**
   * 构建System Prompt - 全量注入所有教学知识
   */
  private buildSystemPrompt(request: SocraticRequest): string {
    // 🔥 直接使用全量注入，不再保留简化版本
    return this.buildFullSystemPrompt(request);
  }

  /**
   * 🔥 构建全量System Prompt - 注入所有教学知识
   *
   * 注入策略：
   * 1. 基于AI注意力机制优化顺序（开头和结尾是高注意力区）
   * 2. 完整注入所有7个prompts模块
   * 3. 使用清晰的分隔符和标题结构
   * 4. 适配DeepSeek 128K Context Window
   */
  private buildFullSystemPrompt(request: SocraticRequest): string {
    const context: FullPromptContext = {
      mode: this.mapToTeachingMode(request.mode || 'exploration'),
      difficulty: this.mapToModernDifficultyLevel(request.level || 'intermediate'),
      topic: request.currentTopic,
      issuePhase: undefined, // 可以从SessionContext中获取，当前暂时不传
      includeDiagnostics: this.config.includeDiagnostics || false
    };

    return FullPromptBuilder.buildFullSystemPrompt(context);
  }

  /**
   * 映射DialogueMode到教学模式
   */
  private mapToTeachingMode(mode: DialogueMode): 'exploration' | 'analysis' | 'synthesis' | 'evaluation' {
    // DialogueMode和教学模式是一致的，直接返回
    return mode as 'exploration' | 'analysis' | 'synthesis' | 'evaluation';
  }

  /**
   * 构建User Prompt - 使用官方ContextFormatter的XML结构化
   */
  /**
   * 🗑️ 已废弃的方法（由集成架构替代）
   * - buildUserPrompt: 被 ContextFormatter.fromTemplateAsMessages 替代
   * - formatStructuredCase: 暂不需要，案例上下文直接传递
   * - buildSimpleContext: 被集成架构替代
   */

  /**
   * 调用AI服务 - 使用集成架构
   */
  /**
   * 使用完整的 messages 数组调用 AI（集成架构）
   */
  private async callAIWithMessages(messages: any[]) {
    // 过滤掉可能的 tool 角色消息，只保留基础角色
    const filteredMessages = messages
      .filter(msg => ['system', 'user', 'assistant'].includes(msg.role))
      .map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      }));

    return await this.aiClient.sendCustomMessage(filteredMessages, {
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      enableCostOptimization: true
    });
  }

  /**
   * 构建对话历史消息数组（修复Bug2和Bug3）
   * @returns 标准的messages数组格式
   */
  private buildConversationMessages(messages: Message[]): Array<{ role: 'user' | 'assistant'; content: string }> {
    // ✅ Bug2修复：空历史返回空数组，不返回占位文本
    if (messages.length === 0) {
      return [];
    }

    // ✅ Bug3修复：正确映射角色
    return messages.map(msg => ({
      role: msg.role === 'user' || msg.role === 'student' ? 'user' as const : 'assistant' as const,
      content: msg.content
    }));
  }

  /**
   * @deprecated 已废弃，使用 buildConversationMessages 代替
   */
  private buildConversationHistory(messages: Message[]): string[] {
    if (messages.length === 0) {
      return [];
    }

    return messages.map(msg => {
      const role = msg.role === 'student' || msg.role === 'user' ? '学生' : '导师';
      return `${role}: ${msg.content}`;
    });
  }

  /**
   * 构建当前问题上下文
   */
  private buildCurrentContext(request: SocraticRequest): string {
    const parts = [];

    if (request.caseContext) {
      const caseContextText = typeof request.caseContext === 'string'
        ? request.caseContext
        : JSON.stringify(request.caseContext, null, 2);
      parts.push(`案例背景：${caseContextText}`);
    }

    if (request.caseInfo) {
      parts.push(`案例要点：${JSON.stringify(request.caseInfo, null, 2)}`);
    }

    if (request.currentTopic) {
      parts.push(`当前讨论主题：${request.currentTopic}`);
    }

    const lastMessage = request.messages?.[request.messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      parts.push(`学生的最新回答：${lastMessage.content}`);
    }

    if (request.studentInput) {
      parts.push(`学生的补充输入：${request.studentInput}`);
    }

    return parts.join('\n');
  }

  /**
   * 构建结构化的上下文信息，供模板系统使用
   */
  private buildStructuredContext(request: SocraticRequest): Record<string, unknown> {
    const context: Record<string, unknown> = {
      mode: request.mode || 'exploration',
      level: request.level || 'intermediate',
      topic: request.currentTopic || '法学基础讨论'
    };

    if (request.sessionId) {
      context.sessionId = request.sessionId;
    }

    if (request.difficulty) {
      context.legacyDifficulty = request.difficulty;
    }

    if (request.caseContext) {
      context.caseContext = request.caseContext;
    }

    if (request.caseInfo) {
      context.caseInfo = request.caseInfo;
    }

    if (request.context) {
      context.additionalContext = request.context;
    }

    if (typeof request.messages?.length === 'number' && request.messages.length > 0) {
      context.turnCount = request.messages.length;
    }

    return context;
  }

  /**
   * 映射难度级别
   */
  private mapToModernDifficultyLevel(level: DialogueLevel): 'basic' | 'intermediate' | 'advanced' {
    switch (level) {
      case 'beginner':
        return 'basic';
      case 'intermediate':
        return 'intermediate';
      case 'advanced':
        return 'advanced';
      default:
        return 'intermediate';
    }
  }

// mapToModernTeachingMode function removed - no longer needed with buildAPICompatiblePrompt

  /**
   * 获取服务配置
   */
  getConfig(): SocraticDialogueConfig {
    return { ...this.config };
  }

  /**
   * 更新服务配置
   */
  updateConfig(updates: Partial<SocraticDialogueConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * 检查服务可用性
   */
  isAvailable(): boolean {
    return this.aiClient.isAvailable();
  }

  /**
   * 获取使用统计
   */
  getUsageStats() {
    return this.aiClient.getUsageStats();
  }
}