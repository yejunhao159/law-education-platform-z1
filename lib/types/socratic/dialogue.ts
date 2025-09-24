/**
 * 苏格拉底对话相关类型定义
 * @module types/socratic/dialogue
 * @description 对话层级、消息、教学控制等相关类型
 */

// ============== 教学相关枚举 ==============

/**
 * 消息角色枚举
 */
export enum MessageRole {
  STUDENT = 'student',
  AGENT = 'agent',
  TEACHER = 'teacher',
  SYSTEM = 'system'
}

/**
 * 对话层级枚举（五层递进式教学法）
 */
export enum DialogueLevel {
  OBSERVATION = 1,  // 观察层：识别基本信息
  FACTS = 2,        // 事实层：梳理时间线
  ANALYSIS = 3,     // 分析层：法律关系分析
  APPLICATION = 4,  // 应用层：法条适用
  VALUES = 5        // 价值层：公平正义探讨
}

/**
 * 控制模式枚举
 */
export enum ControlMode {
  AUTO = 'auto',        // 全自动：AI完全控制
  SEMI_AUTO = 'semi',   // 半自动：AI建议+教师确认
  MANUAL = 'manual'     // 手动：教师完全控制
}

/**
 * 任务难度枚举
 */
export enum Difficulty {
  EASY = 'easy',
  NORMAL = 'normal',
  HARD = 'hard'
}

// ============== 对话相关接口 ==============

/**
 * 消息元数据接口
 */
export interface MessageMetadata {
  /** AI识别的关键法律概念 */
  keywords?: string[];
  /** 回答质量评分 (0-100) */
  quality?: number;
  /** 改进建议 */
  suggestions?: string[];
  /** 思考时间（毫秒） */
  thinkingTime?: number;
  /** 相似问题ID（用于缓存） */
  similarQuestionId?: string;
}

/**
 * 消息接口
 */
export interface Message {
  /** 消息唯一ID */
  id: string;
  /** 发送者角色 */
  role: MessageRole;
  /** 消息内容 */
  content: string;
  /** 对话层级 */
  level: DialogueLevel;
  /** 时间戳 */
  timestamp: number;
  /** 元数据 */
  metadata?: MessageMetadata;
  /** 是否为流式消息 */
  streaming?: boolean;
}

/**
 * 性能统计接口
 */
export interface Performance {
  /** 问题回答数量 */
  questionCount: number;
  /** 正确率 (0-100) */
  correctRate: number;
  /** 每个回答的思考时间 */
  thinkingTime: number[];
  /** 平均响应时间 */
  avgResponseTime?: number;
  /** 层级停留时间 */
  levelDuration?: Record<DialogueLevel, number>;
}

/**
 * 对话状态接口
 */
export interface DialogueState {
  /** 会话ID（6位数字码或UUID） */
  sessionId: string;
  /** 案例ID */
  caseId: string;
  /** 当前对话层级 */
  currentLevel: DialogueLevel;
  /** 消息历史 */
  messages: Message[];
  /** 参与者列表（临时ID） */
  participants: string[];
  /** 控制模式 */
  mode: ControlMode;
  /** 性能统计 */
  performance: Performance;
  /** 会话创建时间 */
  createdAt: number;
  /** 最后活动时间 */
  lastActivityAt: number;
  /** 是否已结束 */
  isEnded?: boolean;
}

/**
 * 对话指标接口
 */
export interface DialogueMetrics {
  /** 平均质量分 */
  averageQuality: number;
  /** 总时长（秒） */
  totalTime: number;
  /** 总消息数 */
  totalMessages: number;
  /** 完成率 */
  completionRate: number;
  /** 层级进度 */
  levelProgress: Record<DialogueLevel, number>;
  /** 洞察 */
  insights: string[];
  /** 优势 */
  strengths: string[];
  /** 改进建议 */
  improvements: string[];
}

// ============== 教学配置 ==============

/**
 * 层级配置类型
 */
export type LevelConfig = {
  [key in DialogueLevel]: {
    name: string;
    description: string;
    objective: string;
    minQuestions: number;
    maxQuestions: number;
  };
};

/**
 * 提示词模板类型
 */
export type PromptTemplate = {
  [key in DialogueLevel]: {
    systemPrompt: string;
    userPromptTemplate: string;
    examples?: string[];
  };
};

/**
 * 层级配置常量
 */
export const LEVEL_CONFIG: LevelConfig = {
  [DialogueLevel.OBSERVATION]: {
    name: '观察层',
    description: '你看到了什么？',
    objective: '识别案件基本信息和表面事实',
    minQuestions: 3,
    maxQuestions: 5
  },
  [DialogueLevel.FACTS]: {
    name: '事实层',
    description: '发生了什么？',
    objective: '梳理时间线，理清事实关系',
    minQuestions: 3,
    maxQuestions: 6
  },
  [DialogueLevel.ANALYSIS]: {
    name: '分析层',
    description: '为什么会这样？',
    objective: '分析法律关系和构成要件',
    minQuestions: 4,
    maxQuestions: 7
  },
  [DialogueLevel.APPLICATION]: {
    name: '应用层',
    description: '法律如何适用？',
    objective: '适用法律条文，论证法律逻辑',
    minQuestions: 3,
    maxQuestions: 6
  },
  [DialogueLevel.VALUES]: {
    name: '价值层',
    description: '这样公平吗？',
    objective: '探讨公平正义，反思判决影响',
    minQuestions: 2,
    maxQuestions: 4
  }
};