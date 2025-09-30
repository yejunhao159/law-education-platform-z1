/**
 * 苏格拉底对话服务 - 统一入口
 * 集成所有模块化组件：UnifiedPromptBuilder + XML结构化 + 双提示词模式
 * DeepPractice Standards Compliant
 *
 * @description
 * 这是Socratic对话功能的唯一服务入口，整合了：
 * - AI调用（DeeChatAIClient）
 * - Prompt构建（UnifiedPromptBuilder）
 * - 上下文格式化（LocalContextFormatter）
 */

import { DeeChatAIClient, createDeeChatConfig, type DeeChatConfig } from './DeeChatAIClient';
import { buildAPICompatiblePrompt } from '../prompts/builders/UnifiedPromptBuilder';
import { ContextFormatter } from '../utils/LocalContextFormatter';
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
  enableModularPrompts: boolean;
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
      enableModularPrompts: true,
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
      // 第1步：使用UnifiedPromptBuilder构建System Prompt
      const systemPrompt = this.buildSystemPrompt(request);

      // 第2步：使用LocalContextFormatter构建XML结构化的User Prompt
      const userPrompt = this.buildUserPrompt(request);

      // 第3步：使用修改后的DeeChatAIClient进行双提示词调用
      const aiResponse = await this.callAIWithDualPrompts(systemPrompt, userPrompt);

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
  async generateQuestionStream(request: SocraticRequest): Promise<AsyncIterable<string>> {
    try {
      // 第1步：构建System Prompt
      const systemPrompt = this.buildSystemPrompt(request);

      // 第2步：构建XML结构化的User Prompt
      const userPrompt = this.buildUserPrompt(request);

      // 第3步：使用流式调用
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt }
      ];

      const streamingResponse = await this.aiClient.sendCustomMessageStream(messages, {
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        enableCostOptimization: true
      });

      return streamingResponse.stream;

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
   * 构建System Prompt - 使用简化的API兼容提示词构建器
   */
  private buildSystemPrompt(request: SocraticRequest): string {
    if (!this.config.enableModularPrompts) {
      // 简化版系统提示词
      return `你是一位专业的中国法学苏格拉底导师，使用问题引导学生思考。
每次只问一个问题，提供3-5个思考选项，保持开放性探索。`;
    }

    // 使用API兼容的简化提示词构建器
    const difficulty = this.mapToModernDifficultyLevel(request.level || 'intermediate');

    return buildAPICompatiblePrompt(
      difficulty,
      'response', // 固定使用response模式，适合对话生成
      {
        topic: request.currentTopic,
        caseInfo: request.caseContext
      }
    );
  }

  /**
   * 构建User Prompt - 使用LocalContextFormatter的XML结构化
   */
  private buildUserPrompt(request: SocraticRequest): string {
    if (!this.config.enableXMLStructure) {
      // 简单文本格式
      return this.buildSimpleContext(request);
    }

    // 处理案例上下文：支持字符串和结构化对象
    let caseContextText = '无特定案例';
    if (request.caseContext) {
      if (typeof request.caseContext === 'string') {
        caseContextText = request.caseContext;
      } else {
        // 结构化案例上下文转换为富文本
        caseContextText = this.formatStructuredCase(request.caseContext);
      }
    }

    // 使用XML结构化格式
    const contextData = {
      current: this.buildCurrentContext(request),
      conversation: this.buildConversationHistory(request.messages || []),
      case: caseContextText,
      topic: request.currentTopic || '法学基础讨论'
    };

    return ContextFormatter.format(contextData);
  }

  /**
   * 格式化结构化案例上下文为可读文本
   */
  private formatStructuredCase(caseData: any): string {
    const sections: string[] = [];

    sections.push(`【案件名称】${caseData.title}`);

    if (caseData.facts && Array.isArray(caseData.facts)) {
      sections.push('\n【案件事实】');
      caseData.facts.forEach((fact: any, index: number) => {
        const factNum = index + 1;
        let factText = `事实${factNum}: ${fact.content}`;
        if (fact.date) factText += ` (时间: ${fact.date})`;
        if (fact.evidence && fact.evidence.length > 0) {
          factText += ` [证据: ${fact.evidence.join('、')}]`;
        }
        sections.push(factText);
      });
    }

    if (caseData.laws && Array.isArray(caseData.laws)) {
      sections.push('\n【相关法条】');
      caseData.laws.forEach((law: any) => {
        let lawText = `${law.article}: ${law.content}`;
        if (law.relevance) lawText += ` (适用于: ${law.relevance})`;
        sections.push(lawText);
      });
    }

    if (caseData.disputes) {
      sections.push('\n【争议焦点】');
      if (Array.isArray(caseData.disputes)) {
        if (typeof caseData.disputes[0] === 'string') {
          caseData.disputes.forEach((d: string, i: number) => {
            sections.push(`争议${i + 1}: ${d}`);
          });
        } else {
          caseData.disputes.forEach((dispute: any, i: number) => {
            sections.push(`争议${i + 1}: ${dispute.focus}`);
            if (dispute.plaintiffView) sections.push(`  原告观点: ${dispute.plaintiffView}`);
            if (dispute.defendantView) sections.push(`  被告观点: ${dispute.defendantView}`);
          });
        }
      }
    }

    return sections.join('\n');
  }

  /**
   * 调用AI服务 - 支持双提示词模式
   */
  private async callAIWithDualPrompts(
    systemPrompt: string,
    userPrompt: string
  ) {
    // 构造双提示词消息数组
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt }
    ];

    // 使用扩展的DeeChatAIClient方法
    return await this.aiClient.sendCustomMessage(messages, {
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
   * 构建简单上下文（备选方案）
   */
  private buildSimpleContext(request: SocraticRequest): string {
    let context = '';

    if (request.currentTopic) {
      context += `当前主题：${request.currentTopic}\n`;
    }

    if (request.caseContext) {
      context += `案例信息：${request.caseContext}\n`;
    }

    if (request.messages && request.messages.length > 0) {
      const lastMessage = request.messages[request.messages.length - 1];
      if (lastMessage) {
        context += `学生说：${lastMessage.content}\n`;
      }
    }

    context += '\n请基于以上信息，提出一个引导性的苏格拉底问题。';
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
  getConfig(): EnhancedSocraticConfig {
    return { ...this.config };
  }

  /**
   * 更新服务配置
   */
  updateConfig(updates: Partial<EnhancedSocraticConfig>): void {
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