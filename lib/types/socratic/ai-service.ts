/**
 * 苏格拉底AI服务相关类型定义
 * @module types/socratic/ai-service
 * @description AI难度级别、请求响应、配置等相关类型
 */

// ============== AI服务枚举 ==============

/**
 * AI难度级别枚举（区别于教学层级）
 */
export enum SocraticDifficultyLevel {
  BEGINNER = 'beginner',      // 初级水平
  INTERMEDIATE = 'intermediate', // 中级水平
  ADVANCED = 'advanced'       // 高级水平
}

/**
 * 苏格拉底模式枚举
 */
export enum SocraticMode {
  EXPLORATION = 'exploration',  // 探索模式
  ANALYSIS = 'analysis',        // 分析模式
  SYNTHESIS = 'synthesis',      // 综合模式
  EVALUATION = 'evaluation'     // 评估模式
}

/**
 * 苏格拉底难度枚举
 */
export enum SocraticDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

/**
 * 错误代码枚举
 */
export enum SocraticErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_CONTENT = 'INVALID_CONTENT',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

// ============== AI服务基础类型 ==============

/**
 * 苏格拉底消息接口（AI服务专用）
 */
export interface SocraticMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  level?: SocraticDifficultyLevel;
}

/**
 * 苏格拉底会话接口（AI服务专用）
 */
export interface SocraticSession {
  id: string;
  messages: SocraticMessage[];
  currentLevel: SocraticDifficultyLevel;
  caseInfo?: any;
  mode: SocraticMode;
  difficulty: SocraticDifficulty;
  startedAt: number;
  lastActiveAt: number;
  metadata?: SocraticSessionMetadata;
}

/**
 * 苏格拉底会话元数据
 */
export interface SocraticSessionMetadata {
  totalQuestions: number;
  correctAnswers: number;
  averageResponseTime: number;
  progressScore: number;
  completedLevels: SocraticDifficultyLevel[];
}

// ============== 请求响应类型 ==============

/**
 * 苏格拉底请求接口
 */
export interface SocraticRequest {
  messages?: SocraticMessage[];
  caseInfo?: any;
  level?: SocraticDifficultyLevel;
  mode?: SocraticMode;
  sessionId?: string;
  difficulty?: SocraticDifficulty;
  streaming?: boolean;
  caseContext?: string;
  currentTopic?: string;
}

/**
 * 苏格拉底生成请求接口
 */
export interface SocraticGenerateRequest {
  sessionId: string;
  userResponse: string;
  level?: SocraticDifficultyLevel;
  context?: any;
}

/**
 * 苏格拉底响应接口
 */
export interface SocraticResponse {
  success: boolean;
  data?: SocraticResponseData;
  error?: SocraticError;
  fallback?: boolean;
  performance?: SocraticPerformanceData;
}

/**
 * 苏格拉底响应数据
 */
export interface SocraticResponseData {
  question: string;
  content: string;
  level: SocraticDifficultyLevel;
  mode: SocraticMode;
  timestamp: string;
  sessionId: string;
  metadata?: SocraticResponseMetadata;
  cached?: boolean;
  suggestions?: string[];
}

/**
 * 苏格拉底响应元数据
 */
export interface SocraticResponseMetadata {
  provider?: string;
  fallback?: boolean;
  cost?: number;
  tokensUsed?: number;
  duration?: number;
  sessionId?: string;
  model?: string;
  usage?: any;
  confidence?: number;
}

/**
 * 苏格拉底错误接口
 */
export interface SocraticError {
  message: string;
  code: SocraticErrorCode;
  timestamp: string;
  details?: string;
  type?: string;
}

/**
 * 苏格拉底性能数据
 */
export interface SocraticPerformanceData {
  duration: number;
  requestId: string;
  aiDuration?: number;
}

// ============== 配置相关类型 ==============

/**
 * 苏格拉底配置接口
 */
export interface SocraticConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  levelPrompts: Record<SocraticDifficultyLevel, string>;
  fallbackQuestions: Record<SocraticDifficultyLevel, string>;
}

/**
 * AI请求接口
 */
export interface AIRequest {
  messages: SocraticMessage[];
  systemMessage: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

/**
 * AI响应接口
 */
export interface AIResponse {
  content: string;
  usage?: any;
  model?: string;
}

// ============== 性能监控类型 ==============

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  aiCallDuration: number;
  totalDuration: number;
  success: boolean;
  fallbackUsed: boolean;
  sessionId: string;
}

/**
 * 后备指标接口
 */
export interface FallbackMetrics {
  type: 'ai_unavailable' | 'timeout' | 'error';
  sessionId: string;
  responseTime: number;
  success: boolean;
}