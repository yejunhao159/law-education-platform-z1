/**
 * 苏格拉底对话服务类型定义
 * DeepPractice Standards Compliant
 */

// ========== 基础实体类型 ==========

export interface SocraticMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  level?: DialogueLevel;
}

export interface SocraticSession {
  id: string;
  messages: SocraticMessage[];
  currentLevel: DialogueLevel;
  caseInfo?: any;
  mode: SocraticMode;
  difficulty: SocraticDifficulty;
  startedAt: number;
  lastActiveAt: number;
  metadata?: SocraticSessionMetadata;
}

export interface SocraticSessionMetadata {
  totalQuestions: number;
  correctAnswers: number;
  averageResponseTime: number;
  progressScore: number;
  completedLevels: DialogueLevel[];
}

// ========== 枚举类型 ==========

export enum DialogueLevel {
  BEGINNER = 'beginner',      // 初级水平
  INTERMEDIATE = 'intermediate', // 中级水平
  ADVANCED = 'advanced'       // 高级水平
}

export enum SocraticMode {
  EXPLORATION = 'exploration',  // 探索模式
  ANALYSIS = 'analysis',        // 分析模式
  SYNTHESIS = 'synthesis',      // 综合模式
  EVALUATION = 'evaluation'     // 评估模式
}

export enum SocraticDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export enum SocraticErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_CONTENT = 'INVALID_CONTENT',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

// ========== 请求类型 ==========

export interface SocraticRequest {
  messages?: SocraticMessage[];
  caseInfo?: any;
  level?: DialogueLevel;
  mode?: SocraticMode;
  sessionId?: string;
  difficulty?: SocraticDifficulty;
  streaming?: boolean;
  caseContext?: string;
  currentTopic?: string;
}

export interface SocraticGenerateRequest {
  sessionId: string;
  userResponse: string;
  level?: DialogueLevel;
  context?: any;
}

// ========== 响应类型 ==========

export interface SocraticResponse {
  success: boolean;
  data?: SocraticResponseData;
  error?: SocraticError;
  fallback?: boolean;
  performance?: SocraticPerformanceData;
}

export interface SocraticResponseData {
  question: string;
  content: string;
  level: DialogueLevel;
  mode: SocraticMode;
  timestamp: string;
  sessionId: string;
  metadata?: SocraticResponseMetadata;
  cached?: boolean;
  suggestions?: string[];
}

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

export interface SocraticError {
  message: string;
  code: SocraticErrorCode;
  timestamp: string;
  details?: string;
  type?: string;
}

export interface SocraticPerformanceData {
  duration: number;
  requestId: string;
  aiDuration?: number;
}

// ========== 配置类型 ==========

export interface SocraticConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  levelPrompts: Record<DialogueLevel, string>;
  fallbackQuestions: Record<DialogueLevel, string>;
}

// ========== AI客户端类型 ==========

export interface AIRequest {
  messages: SocraticMessage[];
  systemMessage: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

export interface AIResponse {
  content: string;
  usage?: any;
  model?: string;
}

// ========== 性能监控类型 ==========

export interface PerformanceMetrics {
  aiCallDuration: number;
  totalDuration: number;
  success: boolean;
  fallbackUsed: boolean;
  sessionId: string;
}

export interface FallbackMetrics {
  type: 'ai_unavailable' | 'timeout' | 'error';
  sessionId: string;
  responseTime: number;
  success: boolean;
}