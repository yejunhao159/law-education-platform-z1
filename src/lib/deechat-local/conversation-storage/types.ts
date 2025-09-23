/**
 * 对话存储类型定义 - 法学教育平台优化版本
 * 基于原始DeeChat conversation-storage，但针对法学教育场景进行了扩展
 */

// === 基础数据库实体类型 ===

// 对话会话表 - 增强版
export interface ConversationSession {
  id: string;
  title: string;
  ai_config_name: string;
  created_at: string;                  // ISO格式时间戳
  updated_at: string;                  // ISO格式时间戳
  message_count: number;

  // 法学教育扩展字段
  case_info?: CaseInfo;                // 案例信息
  teaching_mode?: TeachingMode;        // 教学模式
  education_level?: EducationLevel;    // 教育水平
  legal_domain?: string[];             // 法律领域
  session_type?: SessionType;          // 会话类型
  student_progress?: StudentProgress;  // 学生进度
  metadata?: { [key: string]: any };   // 扩展元数据
}

// 对话消息表 - 增强版
export interface ConversationMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;                   // ISO格式时间戳
  token_usage?: TokenUsage;            // token使用统计

  // 法学教育扩展字段
  message_type?: MessageType;          // 消息类型
  legal_reference?: string[];          // 法条引用
  pedagogical_intent?: string;         // 教学意图
  difficulty_level?: DifficultyLevel;  // 难度等级
  evaluation_score?: number;           // 评估分数
  feedback?: string;                   // 反馈信息
  metadata?: { [key: string]: any };   // 扩展元数据
}

// Token使用统计
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost?: number;             // 估算成本
  provider?: string;                   // AI提供商
  model?: string;                      // 使用的模型
}

// 案例信息
export interface CaseInfo {
  case_number?: string;                // 案号
  court?: string;                      // 法院
  parties?: string[];                  // 当事人
  case_type?: string;                  // 案件类型
  legal_issues?: string[];             // 法律争议
  judgment_date?: string;              // 判决日期
}

// 学生进度
export interface StudentProgress {
  participation_level: number;        // 参与度 (0-100)
  comprehension_level: number;        // 理解度 (0-100)
  critical_thinking: number;          // 批判性思维 (0-100)
  legal_reasoning: number;            // 法律推理能力 (0-100)
  overall_score: number;              // 总体评分 (0-100)
  strengths: string[];                // 优势
  improvement_areas: string[];        // 改进领域
  learning_objectives_met: string[];  // 已达成学习目标
}

// 枚举类型
export type TeachingMode = 'socratic' | 'analysis' | 'extraction' | 'timeline' | 'summary' | 'discussion';
export type EducationLevel = 'undergraduate' | 'graduate' | 'professional';
export type SessionType = 'individual' | 'group' | 'classroom' | 'self-study';
export type MessageType = 'question' | 'answer' | 'guidance' | 'feedback' | 'summary' | 'challenge';
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

// === 输入/输出 Schema ===

// 创建会话输入
export interface CreateSessionInput {
  title: string;
  ai_config_name: string;
  // 法学教育扩展
  case_info?: CaseInfo;
  teaching_mode?: TeachingMode;
  education_level?: EducationLevel;
  legal_domain?: string[];
  session_type?: SessionType;
  metadata?: { [key: string]: any };
}

// 更新会话输入
export interface UpdateSessionInput {
  title?: string;
  ai_config_name?: string;
  case_info?: CaseInfo;
  teaching_mode?: TeachingMode;
  education_level?: EducationLevel;
  legal_domain?: string[];
  session_type?: SessionType;
  student_progress?: StudentProgress;
  metadata?: { [key: string]: any };
}

// 创建消息输入
export interface CreateMessageInput {
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  token_usage?: TokenUsage;
  // 法学教育扩展
  message_type?: MessageType;
  legal_reference?: string[];
  pedagogical_intent?: string;
  difficulty_level?: DifficultyLevel;
  evaluation_score?: number;
  feedback?: string;
  metadata?: { [key: string]: any };
}

// === 查询选项 ===

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface SessionQueryOptions extends QueryOptions {
  ai_config_name?: string;
  teaching_mode?: TeachingMode;
  education_level?: EducationLevel;
  legal_domain?: string;
  session_type?: SessionType;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface MessageQueryOptions extends QueryOptions {
  session_id?: string;
  role?: 'user' | 'assistant' | 'system';
  message_type?: MessageType;
  difficulty_level?: DifficultyLevel;
  has_legal_reference?: boolean;
  date_range?: {
    start: string;
    end: string;
  };
}

// === 错误类型 ===

export class ConversationStorageError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'ConversationStorageError';
  }
}

export class ValidationError extends ConversationStorageError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends ConversationStorageError {
  constructor(resource: string, identifier: string) {
    super(`${resource} not found: ${identifier}`, 'NOT_FOUND_ERROR');
  }
}

export class DatabaseError extends ConversationStorageError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', details);
  }
}

// === 配置选项 ===

export interface ConversationStorageOptions {
  storage_type: 'memory' | 'localstorage' | 'indexeddb';  // 存储类型
  table_prefix?: string;                                  // 表前缀
  auto_save?: boolean;                                    // 自动保存
  max_sessions?: number;                                  // 最大会话数
  max_messages_per_session?: number;                      // 每会话最大消息数
  enable_compression?: boolean;                           // 启用压缩
  encryption?: {                                          // 加密选项
    enabled: boolean;
    key?: string;
  };
}

// === 统计信息类型 ===

export interface ConversationStats {
  total_sessions: number;              // 总会话数
  total_messages: number;              // 总消息数
  messages_by_role: {                  // 按角色分组的消息数
    user: number;
    assistant: number;
    system: number;
  };
  // 法学教育扩展统计
  sessions_by_teaching_mode: { [mode in TeachingMode]?: number };
  sessions_by_education_level: { [level in EducationLevel]?: number };
  messages_by_type: { [type in MessageType]?: number };
  average_session_length: number;      // 平均会话长度
  average_tokens_per_message: number;  // 平均每消息token数
  total_cost: number;                  // 总成本
  popular_legal_domains: Array<{       // 热门法律领域
    domain: string;
    count: number;
  }>;
  student_performance_summary: {       // 学生表现摘要
    average_participation: number;
    average_comprehension: number;
    average_critical_thinking: number;
    average_legal_reasoning: number;
  };
}

// === 导出/导入类型 ===

export interface ExportOptions {
  format: 'json' | 'csv' | 'xml';
  include_metadata?: boolean;
  session_filters?: SessionQueryOptions;
  message_filters?: MessageQueryOptions;
  anonymize?: boolean;                 // 匿名化敏感信息
}

export interface ImportOptions {
  format: 'json' | 'csv' | 'xml';
  merge_strategy: 'replace' | 'merge' | 'skip_existing';
  validate?: boolean;
  backup_before_import?: boolean;
}

export interface ExportResult {
  data: string;                        // 导出数据
  metadata: {
    export_date: string;
    total_sessions: number;
    total_messages: number;
    format: string;
  };
}

export interface ImportResult {
  success: boolean;
  imported_sessions: number;
  imported_messages: number;
  errors: string[];
  warnings: string[];
}

// === 搜索和分析类型 ===

export interface SearchOptions {
  query: string;                       // 搜索关键词
  fields?: ('title' | 'content' | 'legal_reference')[];  // 搜索字段
  session_filters?: SessionQueryOptions;
  message_filters?: MessageQueryOptions;
  highlight?: boolean;                 // 高亮搜索结果
  fuzzy?: boolean;                     // 模糊搜索
}

export interface SearchResult {
  sessions: Array<ConversationSession & { relevance_score: number }>;
  messages: Array<ConversationMessage & { relevance_score: number }>;
  total_matches: number;
  suggestions: string[];               // 搜索建议
}

export interface AnalyticsResult {
  time_series: Array<{                 // 时间序列数据
    date: string;
    sessions_created: number;
    messages_sent: number;
    tokens_used: number;
    cost: number;
  }>;
  top_legal_domains: Array<{           // 热门法律领域
    domain: string;
    usage_count: number;
    percentage: number;
  }>;
  teaching_effectiveness: {            // 教学效果
    engagement_trend: number;          // 参与度趋势
    learning_progress: number;         // 学习进度
    knowledge_retention: number;       // 知识保持率
  };
  cost_analysis: {                     // 成本分析
    total_cost: number;
    cost_per_session: number;
    cost_per_message: number;
    cost_by_model: { [model: string]: number };
  };
}