/**
 * 增强版苏格拉底对话服务
 * 集成DeeChat的context-manager进行上下文管理
 * DeepPractice Standards Compliant
 */

import { ContextFormatter } from '../../../lib/deechat-local/context-manager';
import { SOCRATIC_ROLE_CONFIG } from '../prompts/socratic-role';
import {
  SocraticRequest,
  SocraticResponse,
  SocraticMessage,
  DialogueLevel,
  SocraticMode,
  SocraticDifficulty,
  SocraticErrorCode
} from './types/SocraticTypes';

interface EnhancedSocraticConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export class EnhancedSocraticService {
  private config: EnhancedSocraticConfig;
  private contextFormatter = ContextFormatter;

  constructor(config?: Partial<EnhancedSocraticConfig>) {
    this.config = {
      apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions',
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 500,
      ...config
    };
  }

  /**
   * 使用DeeChat context-manager构建苏格拉底对话上下文
   */
  private buildSocraticContext(request: SocraticRequest): string {
    const roleContent = this.buildRolePrompt(request.level, request.mode);
    const toolsContent = this.buildToolsContext();
    const conversationContent = this.buildConversationHistory(request.messages || []);
    const currentContent = this.buildCurrentContext(request);

    return this.contextFormatter.format({
      role: roleContent,
      tools: toolsContent,
      conversation: conversationContent,
      current: currentContent
    });
  }

  /**
   * 构建苏格拉底导师角色提示词
   * 使用统一的角色配置，避免重复定义
   */
  private buildRolePrompt(level: DialogueLevel, mode: SocraticMode): string {
    // 使用统一的角色配置
    const roleConfig = SOCRATIC_ROLE_CONFIG;

    // 动态教学策略
    const modeDescriptions = {
      [SocraticMode.EXPLORATION]: '探索模式 - 鼓励学生广泛思考，提出开放性问题，激发好奇心和探索欲',
      [SocraticMode.ANALYSIS]: '分析模式 - 引导学生深入分析具体法律条文和案例细节，培养细致的分析能力',
      [SocraticMode.SYNTHESIS]: '综合模式 - 帮助学生整合知识，形成完整的法律理解框架，建立系统性思维',
      [SocraticMode.EVALUATION]: '评估模式 - 引导学生评价不同观点的优缺点，培养批判性思维和判断能力'
    };

    const levelDescriptions = {
      [DialogueLevel.BEGINNER]: '基础水平 - 简单直接，重点关注基本概念和事实认定',
      [DialogueLevel.INTERMEDIATE]: '中等水平 - 适度复杂，涉及多个概念的关联和简单推理',
      [DialogueLevel.ADVANCED]: '高级水平 - 高度复杂，涉及深层次的法理思考和价值判断'
    };

    return `${roleConfig.baseRole}

## 核心教学原则
${roleConfig.teachingPrinciples.map((principle, index) => `${index + 1}. ${principle}`).join('\n')}

${roleConfig.methodology}

## 当前教学策略
${modeDescriptions[mode]}

## 学生水平
${levelDescriptions[level]}

## 执行要求
${roleConfig.requirements.map((req, index) => `${index + 1}. ${req}`).join('\n')}

记住：你的目标不是教授知识，而是通过巧妙的问题引导学生自己发现和构建知识。保持苏格拉底的谦逊："我知道我什么都不知道"，与学生一起探索法律的奥秘。`;
  }

  /**
   * 构建工具和资源上下文
   * 使用统一的工具配置
   */
  private buildToolsContext(): string[] {
    return SOCRATIC_ROLE_CONFIG.availableTools;
  }

  /**
   * 构建对话历史上下文
   */
  private buildConversationHistory(messages: SocraticMessage[]): string[] {
    if (messages.length === 0) {
      return ['这是对话的开始，还没有历史消息。'];
    }

    const recentMessages = messages.slice(-6); // 只保留最近6条消息
    return recentMessages.map(msg => {
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

    if (request.difficulty) {
      const difficultyText = {
        [SocraticDifficulty.EASY]: '简单',
        [SocraticDifficulty.MEDIUM]: '中等',
        [SocraticDifficulty.HARD]: '困难'
      };
      parts.push(`期望难度：${difficultyText[request.difficulty]}`);
    }

    return parts.join('\n\n');
  }

  /**
   * 生成苏格拉底式问题
   */
  async generateSocraticQuestion(request: SocraticRequest): Promise<SocraticResponse> {
    try {
      // 使用context-manager构建结构化上下文
      const contextPrompt = this.buildSocraticContext(request);

      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'user',
              content: contextPrompt
            }
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens
        })
      });

      if (!response.ok) {
        throw new Error(`AI API调用失败: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      return {
        success: true,
        data: {
          question: aiResponse,
          content: aiResponse,
          level: request.level || DialogueLevel.INTERMEDIATE,
          mode: request.mode || SocraticMode.EXPLORATION,
          timestamp: new Date().toISOString(),
          sessionId: request.sessionId || 'unknown'
        }
      };

    } catch (error) {
      console.error('Enhanced Socratic Service Error:', error);

      return {
        success: false,
        error: {
          code: SocraticErrorCode.AI_SERVICE_ERROR,
          message: '苏格拉底对话生成失败',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * 流式生成苏格拉底式问题（未来扩展）
   */
  async generateSocraticQuestionStream(request: SocraticRequest): Promise<ReadableStream> {
    // 为未来的流式实现保留接口
    throw new Error('流式生成功能将在未来版本中实现');
  }
}