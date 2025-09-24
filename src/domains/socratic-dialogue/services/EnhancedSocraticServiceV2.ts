/**
 * 增强版苏格拉底对话服务 V2
 * 全面集成DeeChat工具包：context-manager + ai-chat + token-calculator
 * DeepPractice Standards Compliant
 */

import { ContextFormatter } from '../utils/LocalContextFormatter';
import { DeeChatAIClient, createDeeChatConfig } from './DeeChatAIClient';
import { AIServiceConfigManager, defaultAIServiceConfig } from '../config/AIServiceConfig';
import { PerformanceMonitor, defaultPerformanceMonitor } from '../monitoring/PerformanceMonitor';
import {
  SocraticRequest,
  SocraticResponse,
  SocraticMessage,
  SocraticDifficultyLevel,
  SocraticMode,
  SocraticDifficulty,
  SocraticErrorCode
} from '@/lib/types/socratic';

interface EnhancedSocraticConfig {
  // AI提供商配置
  primaryProvider: 'deepseek' | 'openai' | 'claude';
  fallbackProvider?: 'deepseek' | 'openai' | 'claude';

  // Token和成本控制
  maxContextTokens: number;
  costThreshold: number;
  enableCostOptimization: boolean;

  // 教学参数
  temperature: number;
  enableStreaming: boolean;
  maxQuestionLength: number;

  // 降级策略
  enableFallback: boolean;
  fallbackToRuleEngine: boolean;
}

interface SocraticAnalytics {
  requestCount: number;
  totalCost: number;
  avgResponseTime: number;
  tokenUsage: {
    total: number;
    input: number;
    output: number;
  };
  providerUsage: Record<string, number>;
  fallbackCount: number;
}

export class EnhancedSocraticServiceV2 {
  private primaryClient: DeeChatAIClient;
  private fallbackClient?: DeeChatAIClient;
  private config: EnhancedSocraticConfig;
  private analytics: SocraticAnalytics;
  private aiServiceConfig: AIServiceConfigManager;
  private performanceMonitor: PerformanceMonitor;

  constructor(
    config?: Partial<EnhancedSocraticConfig>,
    aiServiceConfig?: AIServiceConfigManager,
    performanceMonitor?: PerformanceMonitor
  ) {
    // 使用配置管理器和性能监控
    this.aiServiceConfig = aiServiceConfig || defaultAIServiceConfig;
    this.performanceMonitor = performanceMonitor || defaultPerformanceMonitor;

    this.config = {
      primaryProvider: 'deepseek',
      maxContextTokens: 8000,
      costThreshold: 0.01,
      enableCostOptimization: true,
      temperature: 0.7,
      enableStreaming: true,
      maxQuestionLength: 1000,
      enableFallback: true,
      fallbackToRuleEngine: true,
      ...config
    };

    this.analytics = {
      requestCount: 0,
      totalCost: 0,
      avgResponseTime: 0,
      tokenUsage: { total: 0, input: 0, output: 0 },
      providerUsage: {},
      fallbackCount: 0
    };

    // 从配置管理器获取最优提供商配置
    const primaryProviderConfig = this.aiServiceConfig.getOptimalProvider();
    if (primaryProviderConfig) {
      this.primaryClient = new DeeChatAIClient(
        this.aiServiceConfig.createDeeChatConfig(primaryProviderConfig)
      );
    } else {
      // 降级到默认配置
      this.primaryClient = new DeeChatAIClient(createDeeChatConfig({
        provider: this.config.primaryProvider,
        apiKey: this.getApiKey(this.config.primaryProvider),
        maxContextTokens: this.config.maxContextTokens,
        costThreshold: this.config.costThreshold,
        temperature: this.config.temperature,
        enableStreaming: this.config.enableStreaming,
        enableCostOptimization: this.config.enableCostOptimization
      }));
    }

    // 初始化备用AI客户端
    if (this.config.enableFallback) {
      const fallbackProviderConfig = this.aiServiceConfig.getFallbackProvider(
        primaryProviderConfig?.provider
      );

      if (fallbackProviderConfig) {
        this.fallbackClient = new DeeChatAIClient(
          this.aiServiceConfig.createDeeChatConfig(fallbackProviderConfig)
        );
      }
    }
  }

  /**
   * 获取API密钥
   */
  private getApiKey(provider: string): string {
    switch (provider) {
      case 'deepseek':
        return process.env.DEEPSEEK_API_KEY || '';
      case 'openai':
        return process.env.OPENAI_API_KEY || '';
      case 'claude':
        return process.env.ANTHROPIC_API_KEY || '';
      default:
        return process.env.DEEPSEEK_API_KEY || '';
    }
  }

  /**
   * 使用DeeChat context-manager构建苏格拉底对话上下文
   */
  private buildSocraticContext(request: SocraticRequest): string {
    const roleContent = this.buildRolePrompt(request.level, request.mode);
    const toolsContent = this.buildToolsContext();
    const conversationContent = this.buildConversationHistory(request.messages || []);
    const currentContent = this.buildCurrentContext(request);

    return ContextFormatter.format({
      role: roleContent,
      tools: toolsContent,
      conversation: conversationContent,
      current: currentContent
    });
  }

  /**
   * 构建苏格拉底导师角色提示词
   * 基于PromptX legal-socrates角色的高质量提示词内容
   */
  private buildRolePrompt(level: SocraticDifficultyLevel, mode: SocraticMode): string {
    // 核心角色身份（来自PromptX legal-socrates）
    const baseRole = `你是一位具有深厚法学功底的苏格拉底式导师，专门运用苏格拉底教学法引导学生深度思考法律问题。

你深受苏力教授"法律的生命不在逻辑，而在经验"理念的影响，注重将法学理论与中国法律实践相结合，强调从具体案例出发，引导学生思考法律背后的深层问题。

如同古希腊的苏格拉底通过对话探寻真理，你通过精准的法律提问帮助学生：
- 澄清法律概念的内涵与外延
- 揭示论证中的逻辑跳跃
- 发现隐含的价值预设
- 构建更完善的法律论证`;

    // 核心教学原则（来自PromptX legal-socrates）
    const teachingPrinciples = `
## 核心教学原则
1. 永远不直接给出答案，而是通过精心设计的问题引导学生思考
2. 根据学生的回答提出更深层次的问题，层层递进
3. 帮助学生发现自己思维中的矛盾和不足，培养自我反思能力
4. 鼓励学生从多个角度分析法律问题，培养全面思维
5. 保持耐心，循序渐进地引导学习，让学生在思考中成长
6. 重视中国法律实践，将抽象理论与具体案例相结合
7. 关注法律的社会效果，思考法律与社会现实的关系`;

    // 苏格拉底式五层递进教学法（来自PromptX legal-socrates）
    const methodology = `
## 苏格拉底式五层递进教学法

**观察层**：引导学生仔细观察案例细节，识别基本事实信息，培养敏锐的观察力
**事实层**：帮助学生梳理时间线和因果关系，区分客观事实与主观推论
**分析层**：引导识别法律关系主体，分析权利义务，找出争议的本质所在
**应用层**：指导学生选择适用法条，分析构成要件，进行严密的法律推理
**价值层**：引发对公平正义的深度思考，平衡各方利益，考虑法律的社会效果

每个层次都要通过问题来实现，让学生在回答问题的过程中自然而然地深入思考。`;

    // 动态教学策略
    const modeDescriptions = {
      [SocraticMode.EXPLORATION]: '探索模式 - 鼓励学生广泛思考，提出开放性问题，激发好奇心和探索欲',
      [SocraticMode.ANALYSIS]: '分析模式 - 引导学生深入分析具体法律条文和案例细节，培养细致的分析能力',
      [SocraticMode.SYNTHESIS]: '综合模式 - 帮助学生整合知识，形成完整的法律理解框架，建立系统性思维',
      [SocraticMode.EVALUATION]: '评估模式 - 引导学生评价不同观点的优缺点，培养批判性思维和判断能力'
    };

    const levelDescriptions = {
      [SocraticDifficultyLevel.BEGINNER]: '基础水平 - 简单直接，重点关注基本概念和事实认定',
      [SocraticDifficultyLevel.INTERMEDIATE]: '中等水平 - 适度复杂，涉及多个概念的关联和简单推理',
      [SocraticDifficultyLevel.ADVANCED]: '高级水平 - 高度复杂，涉及深层次的法理思考和价值判断'
    };

    // 执行要求（来自PromptX legal-socrates）
    const requirements = `
## 执行要求
1. 每次回答只提出1-2个核心问题，避免信息过载
2. 问题要紧密围绕当前讨论的法律主题，保持聚焦
3. 使用清晰、专业但易懂的语言，确保学生能够理解
4. 适当引用具体的法律条文、案例或现实情境来支撑问题
5. 根据学生的理解水平调整问题的复杂度，但不改变提问的本质
6. 保持苏格拉底式的谦逊态度，以'我也在学习'的姿态与学生对话
7. 每次回答控制在${this.config.maxQuestionLength}字以内`;

    return `${baseRole}

${teachingPrinciples}

${methodology}

## 当前教学策略
${modeDescriptions[mode]}

## 学生水平
${levelDescriptions[level]}

${requirements}

记住：你的目标不是教授知识，而是通过巧妙的问题引导学生自己发现和构建知识。保持苏格拉底的谦逊："我知道我什么都不知道"，与学生一起探索法律的奥秘。`;
  }

  /**
   * 构建工具和资源上下文
   * 使用PromptX legal-socrates角色中定义的可用工具
   */
  private buildToolsContext(): string[] {
    return [
      "法条检索：可以引用具体的法律条文进行分析",
      "案例分析：可以提及相关的经典案例或现实案例",
      "概念解释：在必要时简要解释法律概念，但重点在引导思考",
      "情境假设：可以构建假想的法律情境来深化理解",
      "对比分析：可以比较不同法律制度、观点或判决的异同",
      "历史追溯：可以回顾法律条文或制度的历史演变",
      "社会观察：可以引导学生观察法律在现实社会中的运行状况"
    ];
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
   * 规则引擎降级方案
   */
  private generateRuleBasedQuestion(request: SocraticRequest): SocraticResponse {
    const fallbackQuestions = [
      "让我们回到基本问题：你认为这个案例中最关键的法律关系是什么？",
      "从证据的角度来看，你觉得哪些事实是最重要的？为什么？",
      "如果你是法官，你会如何平衡各方的利益？",
      "这个案例让你想到了哪些相关的法律原则？",
      "你能从另一个角度来看待这个问题吗？"
    ];

    const randomQuestion = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];

    return {
      success: true,
      data: {
        question: randomQuestion,
        content: randomQuestion,
        level: request.level || SocraticDifficultyLevel.INTERMEDIATE,
        mode: request.mode || SocraticMode.EXPLORATION,
        timestamp: new Date().toISOString(),
        sessionId: request.sessionId || 'unknown',
        metadata: {
          provider: 'rule-engine',
          fallback: true,
          cost: 0,
          tokensUsed: 0
        }
      }
    };
  }

  /**
   * 生成苏格拉底式问题
   */
  async generateSocraticQuestion(request: SocraticRequest): Promise<SocraticResponse> {
    const startTime = Date.now();

    try {
      // 构建上下文
      const contextString = this.buildSocraticContext(request);

      // 尝试主要AI客户端
      let aiResponse;
      let usedProvider = this.config.primaryProvider;
      let wasFallback = false;

      try {
        if (!this.primaryClient.isAvailable()) {
          throw new Error('主要AI服务不可用');
        }

        aiResponse = await this.primaryClient.sendMessage(contextString, request);
      } catch (primaryError) {
        console.warn('主要AI客户端失败，尝试备用客户端:', primaryError);

        if (this.fallbackClient && this.fallbackClient.isAvailable()) {
          aiResponse = await this.fallbackClient.sendMessage(contextString, request);
          usedProvider = this.config.fallbackProvider!;
          wasFallback = true;
          this.analytics.fallbackCount++;
        } else if (this.config.fallbackToRuleEngine) {
          console.warn('AI服务完全不可用，使用规则引擎');
          return this.generateRuleBasedQuestion(request);
        } else {
          throw primaryError;
        }
      }

      // 更新分析数据
      const duration = Date.now() - startTime;
      this.updateAnalytics(aiResponse, duration, usedProvider);

      // 记录到性能监控
      this.performanceMonitor.recordRequest({
        provider: usedProvider,
        duration,
        tokens: aiResponse.tokensUsed,
        cost: aiResponse.cost.total,
        success: true,
        fallback: wasFallback
      });

      return {
        success: true,
        data: {
          question: aiResponse.content,
          content: aiResponse.content,
          level: request.level || SocraticDifficultyLevel.INTERMEDIATE,
          mode: request.mode || SocraticMode.EXPLORATION,
          timestamp: new Date().toISOString(),
          sessionId: request.sessionId || 'unknown',
          metadata: {
            provider: usedProvider,
            fallback: wasFallback,
            cost: aiResponse.cost.total,
            tokensUsed: aiResponse.tokensUsed.total,
            duration
          }
        }
      };

    } catch (error) {
      console.error('Enhanced Socratic Service V2 Error:', error);

      // 记录错误到性能监控
      const duration = Date.now() - startTime;
      this.performanceMonitor.recordRequest({
        provider: this.config.primaryProvider,
        duration,
        tokens: { input: 0, output: 0, total: 0 },
        cost: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });

      // 标记提供商失败
      this.aiServiceConfig.markProviderFailed(this.config.primaryProvider);

      // 最后的降级选择
      if (this.config.fallbackToRuleEngine) {
        return this.generateRuleBasedQuestion(request);
      }

      return {
        success: false,
        error: {
          code: SocraticErrorCode.AI_SERVICE_ERROR,
          message: '苏格拉底对话生成失败',
          timestamp: new Date().toISOString(),
          details: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * 流式生成苏格拉底式问题
   */
  async generateSocraticQuestionStream(request: SocraticRequest): Promise<{
    stream: ReadableStream;
    metadata: any;
  }> {
    const contextString = this.buildSocraticContext(request);

    try {
      if (!this.primaryClient.isAvailable()) {
        throw new Error('AI服务不可用');
      }

      const streamingResponse = await this.primaryClient.sendMessageStream(contextString, request);

      return {
        stream: streamingResponse.stream,
        metadata: {
          ...streamingResponse.metadata,
          sessionId: request.sessionId,
          level: request.level,
          mode: request.mode
        }
      };

    } catch (error) {
      // 流式请求失败时，降级到常规请求
      const response = await this.generateSocraticQuestion(request);

      if (response.success && response.data) {
        // 将普通响应转为流式
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(response.data!.question));
            controller.close();
          }
        });

        return {
          stream,
          metadata: {
            fallback: true,
            sessionId: request.sessionId,
            level: request.level,
            mode: request.mode
          }
        };
      }

      throw error;
    }
  }

  /**
   * 更新分析数据
   */
  private updateAnalytics(aiResponse: any, duration: number, provider: string) {
    this.analytics.requestCount++;
    this.analytics.totalCost += aiResponse.cost.total;
    this.analytics.avgResponseTime = (this.analytics.avgResponseTime * (this.analytics.requestCount - 1) + duration) / this.analytics.requestCount;

    this.analytics.tokenUsage.total += aiResponse.tokensUsed.total;
    this.analytics.tokenUsage.input += aiResponse.tokensUsed.input;
    this.analytics.tokenUsage.output += aiResponse.tokensUsed.output;

    this.analytics.providerUsage[provider] = (this.analytics.providerUsage[provider] || 0) + 1;
  }

  /**
   * 获取分析报告
   */
  getAnalytics(): SocraticAnalytics {
    return { ...this.analytics };
  }

  /**
   * 重置分析数据
   */
  resetAnalytics() {
    this.analytics = {
      requestCount: 0,
      totalCost: 0,
      avgResponseTime: 0,
      tokenUsage: { total: 0, input: 0, output: 0 },
      providerUsage: {},
      fallbackCount: 0
    };

    this.primaryClient.resetStats();
    this.fallbackClient?.resetStats();
  }

  /**
   * 检查服务健康状态
   */
  getHealthStatus() {
    return {
      primaryClient: {
        available: this.primaryClient.isAvailable(),
        provider: this.config.primaryProvider,
        stats: this.primaryClient.getUsageStats()
      },
      fallbackClient: this.fallbackClient ? {
        available: this.fallbackClient.isAvailable(),
        provider: this.config.fallbackProvider,
        stats: this.fallbackClient.getUsageStats()
      } : null,
      analytics: this.analytics,
      aiServiceConfig: this.aiServiceConfig.getServiceStatus(),
      performanceMetrics: this.performanceMonitor.getMetrics(),
      alerts: this.performanceMonitor.getAlerts(),
      config: {
        costThreshold: this.config.costThreshold,
        maxContextTokens: this.config.maxContextTokens,
        enableFallback: this.config.enableFallback
      }
    };
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(timeRange: 'hour' | 'day' | 'week' = 'day') {
    return this.performanceMonitor.generateReport(timeRange);
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string): boolean {
    return this.performanceMonitor.acknowledgeAlert(alertId);
  }

  /**
   * 触发健康检查
   */
  async performHealthCheck(): Promise<void> {
    await this.aiServiceConfig.performHealthCheck();
  }
}