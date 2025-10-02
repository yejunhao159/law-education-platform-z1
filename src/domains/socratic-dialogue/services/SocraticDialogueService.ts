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
import { ContextFormatter } from '@deepracticex/context-manager';
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
      maxTokens: 1200,
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

      // 第2步：准备标准输入数据（role = System Prompt）
      const standardInput = {
        role: systemPrompt,  // 完整的 System Prompt 作为 role
        conversation: this.buildConversationHistory(request.messages || []),
        current: this.buildCurrentContext(request)
      };

      // 第3步：使用 ContextFormatter 生成完整的 messages 数组（集成！）
      const messages = ContextFormatter.fromTemplateAsMessages('standard', standardInput);

      // 调试：查看生成的消息结构
      console.log('[集成架构] 生成的 messages 数量:', messages.length);
      console.log('[集成架构] System Prompt 长度:', messages[0]?.content?.length || 0);

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
            tokensUsed: aiResponse.tokensUsed,
            cost: aiResponse.cost,
            model: aiResponse.model,
            processingTime: aiResponse.duration
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

      // 第2步：准备标准输入数据（role = System Prompt）
      const standardInput = {
        role: systemPrompt,  // 完整的 System Prompt 作为 role
        conversation: this.buildConversationHistory(request.messages || []),
        current: this.buildCurrentContext(request)
      };

      // 第3步：使用 ContextFormatter 生成完整的 messages 数组（集成！）
      const messages = ContextFormatter.fromTemplateAsMessages('standard', standardInput);

      // 第4步：过滤并调用流式 API
      const filteredMessages = messages
        .filter(msg => ['system', 'user', 'assistant'].includes(msg.role))
        .map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content
        }));

      // 直接使用ai-chat的流式迭代器，提取文本内容
      for await (const chunk of this.aiClient.sendCustomMessageStream(filteredMessages, {
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
   * 构建对话历史上下文
   */
  private buildConversationHistory(messages: Message[]): string[] {
    if (messages.length === 0) {
      return ['这是对话的开始，还没有历史消息。'];
    }

    // 保留完整对话历史，让AI能记住所有讨论内容
    return messages.map(msg => {
      const role = msg.role === 'student' ? '学生' : '导师';
      return `${role}: ${msg.content}`;
    });
  }

  /**
   * 构建当前问题上下文
   */
  private buildCurrentContext(request: SocraticRequest): string {
    const parts = [];

    if (request.caseContext) {
      parts.push(`案例背景：${request.caseContext}`);
    }

    if (request.currentTopic) {
      parts.push(`当前讨论主题：${request.currentTopic}`);
    }

    const lastMessage = request.messages?.[request.messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      parts.push(`学生的最新回答：${lastMessage.content}`);
    }

    return parts.join('\n');
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