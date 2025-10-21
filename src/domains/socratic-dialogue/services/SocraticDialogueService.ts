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
      includeDiagnostics: process.env.NODE_ENV === 'development', // 开发环境默认开启诊断
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

      const responseData: any = {
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
      };

      // 🔍 开发环境添加诊断信息
      if (this.config.includeDiagnostics) {
        responseData.diagnostics = {
          systemPrompt: systemPrompt,
          systemPromptLength: systemPrompt.length,
          systemPromptTokens: Math.floor(systemPrompt.length / 2),
          messagesCount: messages.length,
          conversationHistoryLength: conversationMessages.length
        };
      }

      return {
        success: true,
        data: responseData
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
      console.log(`🔍 [DEBUG] includeDiagnostics配置: ${this.config.includeDiagnostics}`);

      // 🔍 强制输出完整的System Prompt（帮助验证提示词注入）
      console.log('\n========== 📋 完整System Prompt ==========');
      console.log(systemPrompt);
      console.log('========== 📋 用户输入 ==========');
      console.log(currentContext);
      console.log('========================================\n');

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
   * 生成初始问题 - 对话启动时使用
   * AI会先内部分析案件（事实、法律关系、争议焦点），然后生成第一个启发式问题
   *
   * @param request - 初始化请求，必须包含 caseContext
   * @returns 苏格拉底响应，包含生成的初始问题
   *
   * @example
   * ```typescript
   * const response = await service.generateInitialQuestion({
   *   caseContext: "甲方支付50万元，但只得到价值5万元的货物...",
   *   currentTopic: "合同效力分析",
   *   level: "intermediate"
   * });
   * ```
   */
  async generateInitialQuestion(request: SocraticRequest): Promise<SocraticResponse> {
    try {
      // 验证必须有案例上下文
      if (!request.caseContext) {
        return {
          success: false,
          error: {
            code: SocraticErrorCode.INVALID_INPUT,
            message: '初始问题生成需要提供案例上下文（caseContext）',
            timestamp: new Date().toISOString()
          }
        };
      }

      // 第1步：构建特殊的 System Prompt（包含初始问题生成指令）
      const systemPrompt = this.buildInitialQuestionSystemPrompt(request);

      // 第2步：构建案例上下文（作为用户输入）
      const caseContextMessage = this.buildInitialCaseContext(request);

      // 第3步：构建 messages 数组（无对话历史，因为是第一个问题）
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: caseContextMessage
        }
      ];

      const contextLength = typeof request.caseContext === 'string' ? request.caseContext.length : JSON.stringify(request.caseContext).length;
      console.log(`[Socratic Initial] 生成初始问题 - 案例长度:${contextLength}chars, Topic:${request.currentTopic || '未指定'}`);

      // 第4步：调用 AI 生成初始问题
      const aiResponse = await this.callAIWithMessages(messages);

      return {
        success: true,
        data: {
          question: aiResponse.content,
          content: aiResponse.content,
          level: request.level || 'intermediate' as DialogueLevel,
          mode: request.mode || 'exploration' as DialogueMode,
          timestamp: new Date().toISOString(),
          sessionId: request.sessionId || `initial-session-${Date.now()}`,
          metadata: {
            tokensUsed: (aiResponse as any).tokensUsed,
            cost: (aiResponse as any).cost,
            model: (aiResponse as any).model || 'deepseek-chat',
            processingTime: (aiResponse as any).duration
          }
        }
      };

    } catch (error) {
      console.error('SocraticDialogueService Initial Question Error:', error);
      return {
        success: false,
        error: {
          code: SocraticErrorCode.AI_SERVICE_ERROR,
          message: '初始问题生成失败: ' + (error instanceof Error ? error.message : '未知错误'),
          timestamp: new Date().toISOString()
        }
      };
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
   * 构建初始问题生成的 System Prompt
   * 与普通 System Prompt 的区别：设置 isInitialQuestion: true
   */
  private buildInitialQuestionSystemPrompt(request: SocraticRequest): string {
    const context: FullPromptContext = {
      mode: this.mapToTeachingMode(request.mode || 'exploration'),
      difficulty: this.mapToModernDifficultyLevel(request.level || 'intermediate'),
      topic: request.currentTopic,
      issuePhase: undefined,
      isInitialQuestion: true,  // 🔥 标记为初始问题生成
      includeDiagnostics: this.config.includeDiagnostics || false
    };

    return FullPromptBuilder.buildFullSystemPrompt(context);
  }

  /**
   * 构建初始案例上下文（用于初始问题生成）
   */
  private buildInitialCaseContext(request: SocraticRequest): string {
    const parts = [];

    // 案例上下文（必需）
    const caseContextText = typeof request.caseContext === 'string'
      ? request.caseContext
      : JSON.stringify(request.caseContext, null, 2);
    parts.push(`## 案例信息\n\n${caseContextText}`);

    // 讨论主题（可选）
    if (request.currentTopic) {
      parts.push(`\n## 讨论主题\n\n${request.currentTopic}`);
    }

    // 案例要点（可选）
    if (request.caseInfo) {
      parts.push(`\n## 案例要点\n\n${JSON.stringify(request.caseInfo, null, 2)}`);
    }

    parts.push(`\n---\n\n**请基于以上案例信息，生成你的第一个苏格拉底式问题。**`);

    return parts.join('\n');
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
   * 支持完整的 LegalCase 对象，结构化输出所有案件信息
   */
  private buildCurrentContext(request: SocraticRequest): string {
    const parts = [];

    // 处理案件上下文
    if (request.caseContext) {
      if (typeof request.caseContext === 'object' && request.caseContext !== null) {
        // 🔥 处理完整的 LegalCase 对象
        parts.push(this.formatLegalCase(request.caseContext));
      } else if (typeof request.caseContext === 'string') {
        // 兼容旧版本字符串格式
        parts.push(`## 案例背景\n${request.caseContext}`);
      }
    }

    // 其他上下文信息
    if (request.caseInfo) {
      parts.push(`\n## 案例要点\n${JSON.stringify(request.caseInfo, null, 2)}`);
    }

    if (request.currentTopic) {
      parts.push(`\n## 当前讨论主题\n${request.currentTopic}`);
    }

    const lastMessage = request.messages?.[request.messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      parts.push(`\n## 学生的最新回答\n${lastMessage.content}`);
    }

    if (request.studentInput) {
      parts.push(`\n## 学生的补充输入\n${request.studentInput}`);
    }

    return parts.join('\n');
  }

  /**
   * 格式化完整的 LegalCase 对象为结构化文本
   */
  private formatLegalCase(caseData: any): string {
    const sections = [];

    // 1. 基本信息
    if (caseData.basicInfo) {
      sections.push('## 案件基本信息');
      const info = caseData.basicInfo;
      if (info.caseNumber) sections.push(`案号：${info.caseNumber}`);
      if (info.court) sections.push(`法院：${info.court}`);
      if (info.judgeDate) sections.push(`判决日期：${info.judgeDate}`);
      if (info.caseType) sections.push(`案件类型：${info.caseType}`);

      // 当事人信息
      if (info.parties) {
        sections.push('\n### 当事人');
        if (info.parties.plaintiff?.length > 0) {
          sections.push(`原告：${info.parties.plaintiff.map((p: any) => p.name).join('、')}`);
        }
        if (info.parties.defendant?.length > 0) {
          sections.push(`被告：${info.parties.defendant.map((p: any) => p.name).join('、')}`);
        }
        if (info.parties.thirdParty?.length > 0) {
          sections.push(`第三人：${info.parties.thirdParty.map((p: any) => p.name).join('、')}`);
        }
      }
    }

    // 2. 事实认定
    if (caseData.threeElements?.facts) {
      sections.push('\n## 事实认定');
      const facts = caseData.threeElements.facts;

      if (facts.summary) {
        sections.push(`\n事实摘要：${facts.summary}`);
      }

      if (facts.keyFacts?.length > 0) {
        sections.push('\n### 关键事实');
        facts.keyFacts.forEach((fact: string, i: number) => {
          sections.push(`${i + 1}. ${fact}`);
        });
      }

      if (facts.disputedFacts?.length > 0) {
        sections.push('\n### 争议事实');
        facts.disputedFacts.forEach((fact: string, i: number) => {
          sections.push(`${i + 1}. ${fact}`);
        });
      }

      if (facts.undisputedFacts?.length > 0) {
        sections.push('\n### 无争议事实');
        facts.undisputedFacts.forEach((fact: string, i: number) => {
          sections.push(`${i + 1}. ${fact}`);
        });
      }
    }

    // 3. 证据
    if (caseData.threeElements?.evidence) {
      sections.push('\n## 证据');
      const evidence = caseData.threeElements.evidence;

      if (evidence.summary) {
        sections.push(`\n证据摘要：${evidence.summary}`);
      }

      if (evidence.items?.length > 0) {
        sections.push('\n### 证据列表');
        evidence.items.forEach((item: any, i: number) => {
          sections.push(`${i + 1}. ${item.name}（${item.type}，${item.submittedBy}提交）`);
          if (item.description) {
            sections.push(`   - 证明目的：${item.description}`);
          }
          if (item.courtOpinion) {
            sections.push(`   - 法院意见：${item.courtOpinion}`);
          }
          if (item.accepted !== undefined) {
            sections.push(`   - 是否采纳：${item.accepted ? '是' : '否'}`);
          }
        });
      }

      if (evidence.chainAnalysis) {
        sections.push('\n### 证据链分析');
        const chain = evidence.chainAnalysis;
        sections.push(`- 完整性：${chain.complete ? '完整' : '不完整'}`);
        sections.push(`- 强度：${chain.strength}`);
        if (chain.missingLinks?.length > 0) {
          sections.push(`- 缺失环节：${chain.missingLinks.join('、')}`);
        }
        if (chain.analysis) {
          sections.push(`- 分析：${chain.analysis}`);
        }
      }
    }

    // 4. 法律依据
    if (caseData.threeElements?.reasoning?.legalBasis?.length > 0) {
      sections.push('\n## 法律依据');
      caseData.threeElements.reasoning.legalBasis.forEach((basis: any, i: number) => {
        sections.push(`\n${i + 1}. ${basis.law} ${basis.article}${basis.clause ? ` ${basis.clause}` : ''}`);
        if (basis.content) {
          sections.push(`   - 条文：${basis.content}`);
        }
        if (basis.application) {
          sections.push(`   - 适用：${basis.application}`);
        }
        if (basis.interpretation) {
          sections.push(`   - 解释：${basis.interpretation}`);
        }
      });
    }

    // 5. 逻辑推理链
    if (caseData.threeElements?.reasoning?.logicChain?.length > 0) {
      sections.push('\n## 逻辑推理链');
      caseData.threeElements.reasoning.logicChain.forEach((step: any, i: number) => {
        sections.push(`\n${i + 1}. 推理步骤`);
        sections.push(`   - 前提：${step.premise}`);
        sections.push(`   - 推理：${step.inference}`);
        sections.push(`   - 结论：${step.conclusion}`);
        if (step.supportingEvidence?.length > 0) {
          sections.push(`   - 支持证据：${step.supportingEvidence.join('、')}`);
        }
      });
    }

    // 6. 关键论点
    if (caseData.threeElements?.reasoning?.keyArguments?.length > 0) {
      sections.push('\n## 关键论点');
      caseData.threeElements.reasoning.keyArguments.forEach((arg: string, i: number) => {
        sections.push(`${i + 1}. ${arg}`);
      });
    }

    // 7. 判决结论
    if (caseData.threeElements?.reasoning?.judgment) {
      sections.push('\n## 判决结论');
      sections.push(caseData.threeElements.reasoning.judgment);
    }

    // 8. 时间线（如果有详细时间线且与facts.timeline不重复）
    if (caseData.timeline?.length > 0) {
      sections.push('\n## 时间线');
      caseData.timeline.forEach((event: any, i: number) => {
        let eventLine = `${i + 1}. ${event.date}: ${event.event || event.title || ''}`;
        if (event.actors?.length > 0) {
          eventLine += ` （涉及：${event.actors.join('、')}）`;
        }
        if (event.location) {
          eventLine += ` [${event.location}]`;
        }
        if (event.importance) {
          const importanceMap: Record<string, string> = {
            critical: '关键',
            important: '重要',
            normal: '一般'
          };
          eventLine += ` 【${importanceMap[event.importance] || event.importance}】`;
        }
        sections.push(eventLine);
      });
    }

    return sections.join('\n');
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