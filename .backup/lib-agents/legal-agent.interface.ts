/**
 * 法学苏格拉底Agent接口定义
 * @module agents/legal-agent.interface
 * @description 定义法学AI Agent的核心契约和行为规范
 */

import {
  AgentContext,
  AgentResponse,
  DialogueLevel,
  Message,
  MessageRole,
  CaseInfo,
  Difficulty
} from '@/lib/types/socratic'

// ============== 核心Agent接口 ==============

/**
 * 问题生成选项
 */
export interface QuestionGenerationOptions {
  /** 目标层级 */
  targetLevel: DialogueLevel
  /** 难度级别 */
  difficulty: Difficulty
  /** 最大问题数量 */
  maxQuestions?: number
  /** 是否需要提示 */
  includeHints?: boolean
  /** 上下文窗口大小 */
  contextWindowSize?: number
  /** 是否强制重新生成（忽略缓存） */
  forceRegenerate?: boolean
}

/**
 * 答案分析选项
 */
export interface AnswerAnalysisOptions {
  /** 期望的关键词 */
  expectedKeywords?: string[]
  /** 严格程度 */
  strictness: 'lenient' | 'normal' | 'strict'
  /** 是否提供详细反馈 */
  detailedFeedback?: boolean
  /** 最低通过分数 */
  minPassingScore?: number
}

/**
 * 进度评估选项
 */
export interface ProgressEvaluationOptions {
  /** 评估窗口大小（最近N条消息） */
  windowSize?: number
  /** 是否包含建议 */
  includeSuggestions?: boolean
  /** 层级提升的最低要求 */
  levelUpThreshold?: number
}

/**
 * Agent能力统计
 */
export interface AgentCapabilities {
  /** 支持的法律领域 */
  supportedAreas: string[]
  /** 支持的语言 */
  supportedLanguages: string[]
  /** 最大上下文长度 */
  maxContextLength: number
  /** 是否支持流式响应 */
  supportsStreaming: boolean
  /** 是否支持批量处理 */
  supportsBatch: boolean
}

/**
 * Agent执行统计
 */
export interface AgentStats {
  /** 处理的问题总数 */
  totalQuestions: number
  /** 分析的答案总数 */
  totalAnswers: number
  /** 平均响应时间（毫秒） */
  avgResponseTime: number
  /** 缓存命中率 */
  cacheHitRate: number
  /** 成功率 */
  successRate: number
  /** 最近24小时的调用次数 */
  recentCalls: number
}

// ============== 核心Agent接口 ==============

/**
 * 法学苏格拉底Agent核心接口
 * 
 * 该接口定义了法学AI Agent的所有核心能力，包括：
 * - 苏格拉底式问题生成
 * - 学生答案智能分析 
 * - 学习进度评估
 * - 层级推进判断
 */
export interface ILegalAgent {
  // ============== 基础属性 ==============
  
  /** Agent唯一标识符 */
  readonly id: string
  
  /** Agent名称 */
  readonly name: string
  
  /** Agent版本 */
  readonly version: string
  
  /** Agent能力描述 */
  readonly capabilities: AgentCapabilities
  
  // ============== 核心方法 ==============
  
  /**
   * 生成苏格拉底式问题
   * 
   * 基于当前对话上下文和目标层级，生成启发式问题来引导学生思考。
   * 问题应该遵循苏格拉底方法：不直接给出答案，而是通过提问引导发现。
   * 
   * @param context - Agent上下文，包含案例、对话历史、性能统计等
   * @param options - 问题生成选项
   * @returns Promise<AgentResponse> - 包含生成的问题和相关元数据
   * 
   * @example
   * ```typescript
   * const response = await agent.generateQuestion(context, {
   *   targetLevel: DialogueLevel.ANALYSIS,
   *   difficulty: Difficulty.NORMAL,
   *   includeHints: true
   * });
   * ```
   */
  generateQuestion(
    context: AgentContext,
    options: QuestionGenerationOptions
  ): Promise<AgentResponse>
  
  /**
   * 分析学生答案
   * 
   * 评估学生答案的质量、准确性和完整性。
   * 识别关键法律概念，判断理解程度，提供建设性反馈。
   * 
   * @param context - Agent上下文
   * @param studentAnswer - 学生的答案内容
   * @param options - 分析选项
   * @returns Promise<AgentResponse> - 包含分析结果和评价
   * 
   * @example
   * ```typescript
   * const analysis = await agent.analyzeAnswer(context, "学生的答案", {
   *   strictness: 'normal',
   *   detailedFeedback: true
   * });
   * ```
   */
  analyzeAnswer(
    context: AgentContext,
    studentAnswer: string,
    options: AnswerAnalysisOptions
  ): Promise<AgentResponse>
  
  /**
   * 评估学习进度
   * 
   * 基于对话历史分析学生的学习进度，判断是否可以进入下一层级。
   * 考虑理解程度、参与度、答案质量等多个维度。
   * 
   * @param context - Agent上下文
   * @param options - 评估选项
   * @returns Promise<AgentResponse> - 包含进度评估和层级建议
   * 
   * @example
   * ```typescript
   * const evaluation = await agent.evaluateProgress(context, {
   *   windowSize: 5,
   *   includeSuggestions: true
   * });
   * ```
   */
  evaluateProgress(
    context: AgentContext,
    options?: ProgressEvaluationOptions
  ): Promise<AgentResponse>
  
  // ============== 辅助方法 ==============
  
  /**
   * 获取Agent运行统计
   * 
   * @returns Promise<AgentStats> - Agent的执行统计信息
   */
  getStats(): Promise<AgentStats>
  
  /**
   * 重置Agent状态
   * 
   * 清理缓存、重置统计等。通常用于开发测试或出现异常时。
   * 
   * @returns Promise<void>
   */
  reset(): Promise<void>
  
  /**
   * 健康检查
   * 
   * 检查Agent及其依赖服务的健康状态
   * 
   * @returns Promise<boolean> - 是否健康
   */
  healthCheck(): Promise<boolean>
}

// ============== 辅助接口 ==============

/**
 * Agent工厂接口
 * 
 * 用于创建和管理不同类型的法学Agent实例
 */
export interface ILegalAgentFactory {
  /**
   * 创建法学Agent实例
   * 
   * @param config - Agent配置
   * @returns Promise<ILegalAgent>
   */
  createAgent(config: AgentFactoryConfig): Promise<ILegalAgent>
  
  /**
   * 获取支持的Agent类型列表
   * 
   * @returns string[] - 支持的类型列表
   */
  getSupportedTypes(): string[]
  
  /**
   * 销毁Agent实例
   * 
   * @param agentId - Agent ID
   * @returns Promise<void>
   */
  destroyAgent(agentId: string): Promise<void>
}

/**
 * Agent工厂配置
 */
export interface AgentFactoryConfig {
  /** Agent类型 */
  type: 'openai' | 'claude' | 'local' | 'fallback'
  /** 配置参数 */
  config: Record<string, unknown>
  /** 是否启用缓存 */
  enableCache?: boolean
  /** 缓存配置 */
  cacheConfig?: {
    maxSize?: number
    ttl?: number
  }
}

/**
 * Agent错误类型
 */
export enum AgentErrorType {
  /** 网络错误 */
  NETWORK_ERROR = 'network_error',
  /** API配额错误 */
  QUOTA_ERROR = 'quota_error',
  /** 解析错误 */
  PARSING_ERROR = 'parsing_error',
  /** 上下文过长错误 */
  CONTEXT_TOO_LONG = 'context_too_long',
  /** 内容过滤错误 */
  CONTENT_FILTER = 'content_filter',
  /** 未知错误 */
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * Agent错误类
 */
export class AgentError extends Error {
  constructor(
    public readonly type: AgentErrorType,
    message: string,
    public readonly originalError?: Error,
    public readonly context?: AgentContext
  ) {
    super(message)
    this.name = 'AgentError'
  }
}

// ============== 常量定义 ==============

/**
 * Agent默认配置常量
 */
export const AGENT_DEFAULTS = {
  /** 默认最大token数 */
  MAX_TOKENS: 2048,
  /** 默认温度参数 */
  TEMPERATURE: 0.7,
  /** 默认上下文窗口大小 */
  CONTEXT_WINDOW: 10,
  /** 默认响应超时时间（毫秒） */
  TIMEOUT: 30000,
  /** 默认重试次数 */
  MAX_RETRIES: 3,
  /** 默认缓存TTL（毫秒） */
  CACHE_TTL: 3600000, // 1小时
  /** 默认批处理大小 */
  BATCH_SIZE: 5
} as const

/**
 * 层级相关常量
 */
export const LEVEL_CONSTANTS = {
  /** 各层级的最小问题数 */
  MIN_QUESTIONS_PER_LEVEL: {
    [DialogueLevel.OBSERVATION]: 2,
    [DialogueLevel.FACTS]: 3,
    [DialogueLevel.ANALYSIS]: 4,
    [DialogueLevel.APPLICATION]: 3,
    [DialogueLevel.VALUES]: 2
  },
  /** 层级提升所需的最低分数 */
  LEVEL_UP_THRESHOLD: {
    [DialogueLevel.OBSERVATION]: 70,
    [DialogueLevel.FACTS]: 75,
    [DialogueLevel.ANALYSIS]: 80,
    [DialogueLevel.APPLICATION]: 75,
    [DialogueLevel.VALUES]: 70
  }
} as const