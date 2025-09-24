/**
 * 苏格拉底对话系统类型定义统一导出
 * @module types/socratic
 * @description 提供所有苏格拉底相关类型的统一导出入口
 */

// ============== 对话相关类型 ==============
export {
  // 枚举
  MessageRole,
  DialogueLevel,
  ControlMode,
  Difficulty,

  // 接口
  type MessageMetadata,
  type Message,
  type Performance,
  type DialogueState,
  type DialogueMetrics,

  // 类型和常量
  type LevelConfig,
  type PromptTemplate,
  LEVEL_CONFIG
} from './dialogue';

// ============== 课堂管理类型 ==============
export {
  // 枚举
  SessionMode,

  // 接口
  type StudentInfo,
  type VoteChoice,
  type VoteData,
  type ClassroomSession,

  // 常量
  SESSION_EXPIRY_TIME,
  CLASSROOM_CODE_LENGTH
} from './classroom';

// ============== AI服务类型 ==============
export {
  // 枚举
  SocraticDifficultyLevel,
  SocraticMode,
  SocraticDifficulty,
  SocraticErrorCode,

  // 接口
  type SocraticMessage,
  type SocraticSession,
  type SocraticSessionMetadata,
  type SocraticRequest,
  type SocraticGenerateRequest,
  type SocraticResponse,
  type SocraticResponseData,
  type SocraticResponseMetadata,
  type SocraticError,
  type SocraticPerformanceData,
  type SocraticConfig,
  type AIRequest,
  type AIResponse,
  type PerformanceMetrics,
  type FallbackMetrics
} from './ai-service';

// ============== 案例相关类型 ==============
export {
  // 接口
  type CaseInfo,
  type AgentSettings,
  type AgentContext,
  type AgentResponse,
  type CachedResponse,
  type CacheStats,

  // 常量
  DEFAULT_AGENT_SETTINGS,
  CACHE_SIMILARITY_THRESHOLD
} from './case';

// ============== 快捷类型别名 ==============

// 类型别名已移除，请直接使用原类型：
// - DialogueLevel (教学层级)
// - SocraticDifficultyLevel (AI难度级别)
// - SocraticMessage (苏格拉底消息)
// - Message (对话消息)