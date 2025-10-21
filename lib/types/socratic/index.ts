/**
 * 苏格拉底对话系统类型定义统一导出
 * @module types/socratic
 * @description 提供实际使用的苏格拉底相关类型导出
 *
 * ⚠️ 本文件已清理未使用导出（2025-01-21）
 * 清理前：49个导出，清理后：1个导出
 * 详见: src/types/unused-exports.md
 */

// ============== 课堂管理类型（实际使用） ==============
export {
  type ClassroomSession, // 被 TeacherSocratic.tsx 和 ClassroomCode.tsx 使用
} from './classroom';

// ============== 已移除的未使用导出 ==============
// 如需使用以下类型，请直接从原始文件导入：
//
// 对话类型 (lib/types/socratic/dialogue):
//   - MessageRole, DialogueLevel, ControlMode, Difficulty
//   - MessageMetadata, Message, Performance, DialogueState, DialogueMetrics
//   - LevelConfig, PromptTemplate, LEVEL_CONFIG
//
// 课堂管理 (lib/types/socratic/classroom):
//   - SessionMode, StudentInfo, VoteChoice, VoteData
//   - SESSION_EXPIRY_TIME, CLASSROOM_CODE_LENGTH
//
// AI服务 (lib/types/socratic/ai-service):
//   - SocraticDifficultyLevel, SocraticMode, SocraticDifficulty, SocraticErrorCode
//   - SocraticMessage, SocraticSession, SocraticSessionMetadata
//   - SocraticRequest, SocraticGenerateRequest, SocraticResponse
//   - SocraticResponseData, SocraticResponseMetadata, SocraticError
//   - SocraticPerformanceData, SocraticConfig
//   - AIRequest, AIResponse, PerformanceMetrics, FallbackMetrics
//
// 案例管理 (lib/types/socratic/case):
//   - CaseInfo, AgentSettings, AgentContext, AgentResponse
//   - CachedResponse, CacheStats
//   - DEFAULT_AGENT_SETTINGS, CACHE_SIMILARITY_THRESHOLD
//
// 日志 (lib/types/socratic):
//   - LogLevel, LogEntry, LogContext
//
// 注意：项目已迁移到新的类型系统（src/domains/），旧的lib/types/socratic/
// 主要用于向后兼容。新功能请使用 src/domains/socratic-dialogue/types/