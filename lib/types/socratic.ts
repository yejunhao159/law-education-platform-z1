/**
 * 苏格拉底式问答模块核心类型定义
 * @module types/socratic
 * @description 定义苏格拉底式问答所需的所有TypeScript类型和接口
 */

// ============== 枚举类型 ==============

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
 * 对话层级枚举（五层递进式）
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
 * 会话模式枚举
 */
export enum SessionMode {
  CLASSROOM = 'classroom',  // 课堂模式
  DEMO = 'demo'            // 演示模式
}

/**
 * 任务难度枚举
 */
export enum Difficulty {
  EASY = 'easy',
  NORMAL = 'normal',
  HARD = 'hard'
}

// ============== 基础接口 ==============

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

// ============== 核心状态接口 ==============

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

// ============== Agent相关接口 ==============

/**
 * 案例信息接口（用于Agent上下文）- 扩展版本以匹配LegalCase
 */
export interface CaseInfo {
  /** 案例ID */
  id: string;
  /** 案例标题 */
  title?: string;
  /** 案例描述/摘要 */
  description?: string;
  /** 案例类型 */
  type?: '民事' | '刑事' | '行政' | '执行';
  /** 案号 */
  caseNumber?: string;
  /** 法院 */
  court?: string;
  /** 判决日期 */
  judgeDate?: string;
  /** 案件事实列表 */
  facts: string[];
  /** 争议焦点列表 */
  disputes: string[];
  /** 证据列表 */
  evidence?: any[];
  /** 涉及法条 */
  laws?: string[];
  /** 判决结果 */
  judgment?: string;
  /** 难度级别 */
  difficulty?: 'easy' | 'medium' | 'hard';
  /** 案例分类 */
  category?: string;
  /** 原始文本 */
  sourceText?: string;
  /** 时间线事件 */
  timeline?: Array<{
    date: string;
    event: string;
    importance?: 'critical' | 'important' | 'normal';
  }>;
  /** 当事人信息 */
  parties?: {
    plaintiff?: string[];
    defendant?: string[];
    thirdParty?: string[];
  };
}

/**
 * Agent设置接口
 */
export interface AgentSettings {
  /** 难度级别 */
  difficulty: Difficulty;
  /** 语言 */
  language: 'zh-CN';
  /** 法律体系 */
  legalSystem: 'chinese';
  /** 最大token数 */
  maxTokens?: number;
  /** 温度参数 */
  temperature?: number;
  /** 是否启用流式响应 */
  streaming?: boolean;
}

/**
 * Agent上下文接口
 */
export interface AgentContext {
  /** 案例信息 */
  case: CaseInfo;
  /** 对话信息 */
  dialogue: {
    /** 当前层级 */
    level: DialogueLevel;
    /** 历史消息 */
    history: Message[];
    /** 性能统计 */
    performance: Performance;
  };
  /** Agent设置 */
  settings: AgentSettings;
  /** 会话元数据 */
  metadata?: {
    /** 教师ID（如果有） */
    teacherId?: string;
    /** 课堂名称 */
    className?: string;
    /** 自定义标签 */
    tags?: string[];
  };
}

/**
 * Agent响应接口
 */
export interface AgentResponse {
  /** 生成的问题或回复 */
  content: string;
  /** 建议的下一层级 */
  suggestedLevel?: DialogueLevel;
  /** 识别的关键概念 */
  concepts?: string[];
  /** 回答质量评估 */
  evaluation?: {
    /** 理解程度 (0-100) */
    understanding: number;
    /** 是否可以进入下一层 */
    canProgress: boolean;
    /** 需要加强的方面 */
    weakPoints?: string[];
  };
  /** 是否使用了缓存 */
  cached?: boolean;
  /** 响应时间（毫秒） */
  responseTime?: number;
}

// ============== 课堂相关接口 ==============

/**
 * 学生信息接口
 */
export interface StudentInfo {
  /** 临时学生ID */
  id: string;
  /** 显示名称（随机生成或自定义） */
  displayName: string;
  /** 加入时间 */
  joinedAt: number;
  /** 是否举手 */
  handRaised?: boolean;
  /** 举手时间 */
  handRaisedAt?: number;
  /** 是否在线 */
  isOnline: boolean;
  /** 最后活动时间 */
  lastActiveAt: number;
}

/**
 * 投票选项接口
 */
export interface VoteChoice {
  /** 选项ID */
  id: string;
  /** 选项文本 */
  text: string;
  /** 投票数 */
  count: number;
}

/**
 * 投票数据接口
 */
export interface VoteData {
  /** 投票ID */
  id: string;
  /** 问题 */
  question: string;
  /** 选项列表 */
  choices: VoteChoice[];
  /** 已投票的学生ID */
  votedStudents: Set<string>;
  /** 投票创建时间 */
  createdAt: number;
  /** 投票结束时间 */
  endsAt?: number;
  /** 是否已结束 */
  isEnded: boolean;
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

/**
 * 课堂会话接口
 */
export interface ClassroomSession {
  /** 6位数字课堂码 */
  code: string;
  /** 创建时间 */
  createdAt: number;
  /** 过期时间（6小时后） */
  expiresAt: number;
  /** 教师ID（可选） */
  teacherId?: string;
  /** 学生Map */
  students: Map<string, StudentInfo>;
  /** 当前问题 */
  currentQuestion?: string;
  /** 当前投票 */
  currentVote?: VoteData;
  /** 会话状态 */
  status: 'waiting' | 'active' | 'ended';
  /** 统计信息 */
  statistics?: {
    /** 总参与人数 */
    totalParticipants: number;
    /** 活跃人数 */
    activeParticipants: number;
    /** 平均理解度 */
    avgUnderstanding: number;
    /** 各层级时长 */
    levelDurations: Record<DialogueLevel, number>;
  };
}

// ============== 缓存相关接口 ==============

/**
 * 缓存项接口
 */
export interface CachedResponse {
  /** 缓存键 */
  key: string;
  /** 问题内容 */
  question: string;
  /** 响应内容 */
  response: AgentResponse;
  /** 使用次数 */
  useCount: number;
  /** 质量评分 */
  qualityScore: number;
  /** 创建时间 */
  createdAt: number;
  /** 最后使用时间 */
  lastUsedAt: number;
  /** 适用场景标签 */
  tags?: string[];
}

/**
 * 缓存统计接口
 */
export interface CacheStats {
  /** 总缓存数 */
  totalItems: number;
  /** 命中次数 */
  hits: number;
  /** 未命中次数 */
  misses: number;
  /** 命中率 */
  hitRate: number;
  /** 平均节省时间（毫秒） */
  avgTimeSaved: number;
  /** 总节省的token数 */
  tokensSaved: number;
}

// ============== 日志相关接口 ==============

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * 日志上下文接口
 */
export interface LogContext {
  /** 会话ID */
  sessionId?: string;
  /** 用户ID */
  userId?: string;
  /** 当前层级 */
  level?: DialogueLevel;
  /** 操作名称 */
  action?: string;
  /** 耗时（毫秒） */
  duration?: number;
  /** 是否成功 */
  success?: boolean;
  /** 额外数据 */
  extra?: Record<string, any>;
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  /** 时间戳 */
  timestamp: number;
  /** 日志级别 */
  level: LogLevel;
  /** 模块名称 */
  module: string;
  /** 日志消息 */
  message: string;
  /** 上下文信息 */
  context?: LogContext;
}

// ============== 错误相关接口 ==============

/**
 * 错误代码枚举
 */
export enum ErrorCode {
  // Agent相关
  AGENT_UNAVAILABLE = 'AGENT_001',
  AGENT_TIMEOUT = 'AGENT_002',
  AGENT_INVALID_RESPONSE = 'AGENT_003',
  
  // 会话相关
  SESSION_NOT_FOUND = 'SESSION_001',
  SESSION_EXPIRED = 'SESSION_002',
  SESSION_FULL = 'SESSION_003',
  
  // 输入相关
  INVALID_INPUT = 'INPUT_001',
  PROMPT_INJECTION = 'INPUT_002',
  
  // 系统相关
  RATE_LIMIT = 'SYSTEM_001',
  INTERNAL_ERROR = 'SYSTEM_002'
}

/**
 * 错误接口
 */
export interface SocraticError {
  /** 错误代码 */
  code: ErrorCode;
  /** 错误消息 */
  message: string;
  /** 详细信息 */
  details?: any;
  /** 时间戳 */
  timestamp: number;
}

// ============== 工具函数类型 ==============

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

// ============== 导出常量 ==============

/**
 * 层级配置
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

/**
 * 默认Agent设置
 */
export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  difficulty: Difficulty.NORMAL,
  language: 'zh-CN',
  legalSystem: 'chinese',
  maxTokens: 500,
  temperature: 0.7,
  streaming: true
};

/**
 * 会话过期时间（6小时）
 */
export const SESSION_EXPIRY_TIME = 6 * 60 * 60 * 1000;

/**
 * 课堂码长度
 */
export const CLASSROOM_CODE_LENGTH = 6;

/**
 * 缓存相似度阈值
 */
export const CACHE_SIMILARITY_THRESHOLD = 0.85;

/**
 * 对话案例示例
 */
export const DIALOGUE_EXAMPLES = {
  'contract-breach': {
    title: '合同违约案例',
    description: '探讨合同违约的构成要件和法律后果',
    content: `某公司与供应商签订采购合同，约定在指定时间内交付货物，但供应商未能按时交付，导致公司损失。请分析此案的法律关系和责任认定。`,
    difficulty: 'intermediate' as const,
    estimatedTime: 45
  },
  'tort-liability': {
    title: '侵权责任案例',
    description: '分析侵权行为的认定和赔偿标准',
    content: `行人在过马路时被机动车撞伤，机动车驾驶员声称行人闯红灯，但现场监控显示信号灯状态不明。请分析双方的责任划分。`,
    difficulty: 'intermediate' as const,
    estimatedTime: 40
  },
  'criminal-defense': {
    title: '刑事辩护案例',
    description: '研究刑事案件中的辩护策略和程序',
    content: `某人因涉嫌盗窃被起诉，但其声称当时是借用物品且有证人证明。请分析辩护策略和举证责任。`,
    difficulty: 'advanced' as const,
    estimatedTime: 60
  }
} as const;