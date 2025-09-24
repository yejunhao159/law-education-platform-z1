/**
 * 苏格拉底案例相关类型定义
 * @module types/socratic/case
 * @description 案例信息、Agent上下文等相关类型
 */

import { DialogueLevel, Message, Performance } from './dialogue';
import { Difficulty } from './dialogue';

// ============== 案例相关接口 ==============

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

// ============== Agent相关接口 ==============

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

// ============== 常量定义 ==============

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
 * 缓存相似度阈值
 */
export const CACHE_SIMILARITY_THRESHOLD = 0.85;