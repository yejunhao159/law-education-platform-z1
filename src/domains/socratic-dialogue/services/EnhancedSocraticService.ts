/**
 * 增强版苏格拉底对话服务
 * 集成所有模块化组件：UnifiedPromptBuilder + XML结构化 + 双提示词模式
 * DeepPractice Standards Compliant
 */

import { DeeChatAIClient, createDeeChatConfig, type DeeChatConfig } from './DeeChatAIClient';
import { buildAPICompatiblePrompt } from '../prompts/builders/UnifiedPromptBuilder';
import { ContextFormatter } from '../utils/LocalContextFormatter';
import {
  SocraticRequest,
  SocraticResponse,
  SocraticMessage,
  SocraticDifficultyLevel,
  SocraticMode,
  SocraticErrorCode
} from '@/lib/types/socratic/ai-service';

interface EnhancedSocraticConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  enableXMLStructure: boolean;
  enableModularPrompts: boolean;
}

export class EnhancedSocraticService {
  private config: EnhancedSocraticConfig;
  private aiClient: DeeChatAIClient;

  constructor(config?: Partial<EnhancedSocraticConfig>) {
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
   * 生成苏格拉底式问题 - 使用完整的模块化架构
   */
  async generateSocraticQuestion(request: SocraticRequest): Promise<SocraticResponse> {
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
          level: request.level || SocraticDifficultyLevel.INTERMEDIATE,
          mode: request.mode || SocraticMode.EXPLORATION,
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
      console.error('EnhancedSocraticService Error:', error);
      return {
        success: false,
        error: {
          code: SocraticErrorCode.AI_SERVICE_ERROR,
          message: '增强苏格拉底对话生成失败: ' + (error instanceof Error ? error.message : '未知错误'),
          timestamp: new Date().toISOString()
        }
      };
    }
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
    const difficulty = this.mapToModernDifficultyLevel(request.level || SocraticDifficultyLevel.INTERMEDIATE);

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

    // 使用XML结构化格式
    const contextData = {
      current: this.buildCurrentContext(request),
      conversation: this.buildConversationHistory(request.messages || []),
      case: request.caseContext || '无特定案例',
      topic: request.currentTopic || '法学基础讨论'
    };

    return ContextFormatter.format(contextData);
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
  private buildConversationHistory(messages: SocraticMessage[]): string[] {
    if (messages.length === 0) {
      return ['这是对话的开始，还没有历史消息。'];
    }

    return messages.slice(-6).map(msg => {
      const role = msg.role === 'user' ? '学生' : '导师';
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
  private mapToModernDifficultyLevel(level: SocraticDifficultyLevel): 'basic' | 'intermediate' | 'advanced' {
    switch (level) {
      case SocraticDifficultyLevel.BEGINNER:
        return 'basic';
      case SocraticDifficultyLevel.INTERMEDIATE:
        return 'intermediate';
      case SocraticDifficultyLevel.ADVANCED:
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