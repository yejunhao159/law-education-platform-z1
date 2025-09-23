/**
 * DeeChat Conversation Storage - 法学教育平台本地集成版本
 * 专为法学教育场景优化的对话存储管理系统
 */

// 核心类导出
export { ConversationStorage } from './ConversationStorage';
export { MemoryStorage } from './storage/MemoryStorage';

// 类型导出
export type {
  ConversationSession,
  ConversationMessage,
  CreateSessionInput,
  UpdateSessionInput,
  CreateMessageInput,
  SessionQueryOptions,
  MessageQueryOptions,
  ConversationStats,
  ConversationStorageOptions,
  SearchOptions,
  SearchResult,
  ExportOptions,
  ExportResult,
  ImportOptions,
  ImportResult,
  AnalyticsResult,
  TokenUsage,
  CaseInfo,
  StudentProgress,
  TeachingMode,
  EducationLevel,
  SessionType,
  MessageType,
  DifficultyLevel,
  ConversationStorageError,
  ValidationError,
  NotFoundError,
  DatabaseError
} from './types';

// 便捷函数和全局实例管理
import { ConversationStorage } from './ConversationStorage';
import type { ConversationStorageOptions } from './types';

let globalStorage: ConversationStorage | null = null;

/**
 * 初始化全局对话存储管理器
 */
export async function initializeConversationStorage(
  options: ConversationStorageOptions = { storage_type: 'memory' }
): Promise<ConversationStorage> {
  if (globalStorage) {
    console.log('🔄 使用现有的对话存储管理器实例');
    return globalStorage;
  }

  try {
    globalStorage = new ConversationStorage(options);
    await globalStorage.initialize();

    console.log('✅ 全局对话存储管理器初始化完成');
    console.log(`📊 存储类型: ${options.storage_type}`);
    console.log(`⚙️ 自动保存: ${options.auto_save ? '启用' : '禁用'}`);

    return globalStorage;
  } catch (error) {
    console.error('❌ 对话存储管理器初始化失败:', error);
    throw error;
  }
}

/**
 * 获取全局对话存储管理器
 */
export function getConversationStorage(): ConversationStorage {
  if (!globalStorage) {
    throw new Error('Conversation Storage not initialized. Call initializeConversationStorage() first.');
  }
  return globalStorage;
}

/**
 * 关闭全局对话存储管理器
 */
export function closeConversationStorage(): void {
  if (globalStorage) {
    globalStorage.close();
    globalStorage = null;
    console.log('📦 全局对话存储管理器已关闭');
  }
}

// 便捷函数：会话管理

/**
 * 快速创建会话
 */
export function createQuickSession(
  title: string,
  teachingMode: 'socratic' | 'analysis' | 'extraction' | 'timeline' | 'summary' = 'socratic',
  legalDomain: string[] = ['民法']
) {
  const storage = getConversationStorage();
  return storage.createSession({
    title,
    ai_config_name: 'deepseek-chat',
    teaching_mode: teachingMode,
    legal_domain: legalDomain,
    education_level: 'undergraduate',
    session_type: 'individual'
  });
}

/**
 * 快速保存消息
 */
export function saveQuickMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  messageType?: 'question' | 'answer' | 'guidance' | 'feedback',
  tokenUsage?: any
) {
  const storage = getConversationStorage();
  return storage.saveMessage({
    session_id: sessionId,
    role,
    content,
    message_type: messageType,
    token_usage: tokenUsage
  });
}

/**
 * 获取会话对话历史（用于AI上下文）
 */
export function getDialogueHistory(sessionId: string, maxMessages: number = 20) {
  const storage = getConversationStorage();
  return storage.getDialogueContext(sessionId, maxMessages);
}

/**
 * 搜索对话内容
 */
export function searchConversations(query: string, filters?: any) {
  const storage = getConversationStorage();
  return storage.search({
    query,
    fields: ['title', 'content'],
    ...filters
  });
}

// 便捷函数：教学分析

/**
 * 获取学生参与度分析
 */
export function analyzeStudentEngagement(sessionId: string) {
  const storage = getConversationStorage();
  return storage.analyzeStudentEngagement(sessionId);
}

/**
 * 生成教学报告
 */
export function generateSessionReport(sessionId: string) {
  const storage = getConversationStorage();
  return storage.generateTeachingReport(sessionId);
}

/**
 * 获取教学统计数据
 */
export function getTeachingStats() {
  const storage = getConversationStorage();
  return storage.getStats();
}

/**
 * 获取教学分析报告
 */
export function getTeachingAnalytics(dateRange?: { start: string; end: string }) {
  const storage = getConversationStorage();
  return storage.getTeachingAnalytics(dateRange);
}

// 便捷函数：数据管理

/**
 * 导出会话数据
 */
export function exportSessionData(
  format: 'json' | 'csv' | 'xml' = 'json',
  filters?: any
) {
  const storage = getConversationStorage();
  return storage.export({
    format,
    include_metadata: true,
    session_filters: filters
  });
}

/**
 * 导入会话数据
 */
export function importSessionData(data: string, format: 'json' | 'csv' | 'xml' = 'json') {
  const storage = getConversationStorage();
  return storage.import(data, {
    format,
    merge_strategy: 'merge',
    validate: true
  });
}

/**
 * 获取系统健康状态
 */
export function getStorageHealth() {
  const storage = getConversationStorage();
  return storage.healthCheck();
}

// 教学场景专用函数

/**
 * 创建苏格拉底对话会话
 */
export function createSocraticSession(
  caseTitle: string,
  caseInfo?: any,
  educationLevel: 'undergraduate' | 'graduate' | 'professional' = 'undergraduate'
) {
  return createQuickSession(
    `苏格拉底对话: ${caseTitle}`,
    'socratic',
    ['民法', '案例分析']
  );
}

/**
 * 创建法律分析会话
 */
export function createAnalysisSession(
  documentTitle: string,
  analysisType: 'facts' | 'evidence' | 'reasoning' | 'timeline' | 'claims',
  legalDomain: string[] = ['民法']
) {
  return createQuickSession(
    `法律分析: ${documentTitle}`,
    'analysis',
    legalDomain
  );
}

/**
 * 获取最近的教学会话
 */
export function getRecentTeachingSessions(limit: number = 10) {
  const storage = getConversationStorage();
  return storage.getActiveSessions(limit);
}

/**
 * 按教学模式获取会话
 */
export function getSessionsByMode(mode: 'socratic' | 'analysis' | 'extraction' | 'timeline' | 'summary') {
  const storage = getConversationStorage();
  return storage.getSessionsByTeachingMode(mode);
}

/**
 * 按法律领域获取会话
 */
export function getSessionsByDomain(domain: string) {
  const storage = getConversationStorage();
  return storage.getSessionsByLegalDomain(domain);
}

// 学生进度跟踪

/**
 * 更新学生进度
 */
export function updateStudentProgress(
  sessionId: string,
  progress: {
    participation_level: number;
    comprehension_level: number;
    critical_thinking: number;
    legal_reasoning: number;
  }
) {
  const storage = getConversationStorage();
  const overallScore = (
    progress.participation_level +
    progress.comprehension_level +
    progress.critical_thinking +
    progress.legal_reasoning
  ) / 4;

  return storage.updateSession(sessionId, {
    student_progress: {
      ...progress,
      overall_score: Math.round(overallScore),
      strengths: [],
      improvement_areas: [],
      learning_objectives_met: []
    }
  });
}

/**
 * 获取学生学习历史
 */
export function getStudentLearningHistory(educationLevel?: string, limit: number = 50) {
  const storage = getConversationStorage();
  return storage.getSessions({
    education_level: educationLevel as any,
    orderBy: 'created_at',
    orderDirection: 'DESC',
    limit
  });
}

// 批量操作

/**
 * 批量创建演示会话
 */
export function createDemoSessions() {
  const demoSessions = [
    {
      title: '民法典合同编案例分析',
      teaching_mode: 'socratic' as const,
      legal_domain: ['合同法', '民法典'],
      case_info: {
        case_type: '买卖合同纠纷',
        parties: ['甲公司', '乙公司']
      }
    },
    {
      title: '侵权责任法要素提取',
      teaching_mode: 'extraction' as const,
      legal_domain: ['侵权法', '民法典'],
      case_info: {
        case_type: '交通事故损害赔偿',
        parties: ['张某', '李某']
      }
    },
    {
      title: '刑法案例时间轴分析',
      teaching_mode: 'timeline' as const,
      legal_domain: ['刑法', '刑事诉讼法'],
      case_info: {
        case_type: '故意伤害罪',
        parties: ['王某', '人民检察院']
      }
    }
  ];

  const storage = getConversationStorage();
  return demoSessions.map(demo => storage.createSession({
    title: demo.title,
    ai_config_name: 'deepseek-chat',
    teaching_mode: demo.teaching_mode,
    legal_domain: demo.legal_domain,
    education_level: 'undergraduate',
    session_type: 'individual',
    case_info: demo.case_info
  }));
}

// 实用工具

/**
 * 清理过期会话
 */
export function cleanupOldSessions(daysOld: number = 30) {
  const storage = getConversationStorage();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const sessions = storage.getSessions();
  let deletedCount = 0;

  sessions.forEach(session => {
    const sessionDate = new Date(session.created_at);
    if (sessionDate < cutoffDate) {
      storage.deleteSession(session.id);
      deletedCount++;
    }
  });

  console.log(`🧹 清理了 ${deletedCount} 个过期会话`);
  return deletedCount;
}

/**
 * 获取存储使用情况
 */
export function getStorageUsage() {
  const storage = getConversationStorage();
  const stats = storage.getStats();
  const health = storage.healthCheck();

  return {
    sessions: stats.total_sessions,
    messages: stats.total_messages,
    storage_health: health.status,
    popular_domains: stats.popular_legal_domains.slice(0, 5),
    teaching_modes: stats.sessions_by_teaching_mode,
    estimated_size: stats.total_messages * 100 // 粗略估算（字节）
  };
}

// 默认导出主类
export default ConversationStorage;

// 导出常量
export const TEACHING_MODES = {
  SOCRATIC: 'socratic',
  ANALYSIS: 'analysis',
  EXTRACTION: 'extraction',
  TIMELINE: 'timeline',
  SUMMARY: 'summary'
} as const;

export const EDUCATION_LEVELS = {
  UNDERGRADUATE: 'undergraduate',
  GRADUATE: 'graduate',
  PROFESSIONAL: 'professional'
} as const;

export const MESSAGE_TYPES = {
  QUESTION: 'question',
  ANSWER: 'answer',
  GUIDANCE: 'guidance',
  FEEDBACK: 'feedback',
  SUMMARY: 'summary',
  CHALLENGE: 'challenge'
} as const;

export const LEGAL_DOMAINS = [
  '民法',
  '刑法',
  '商法',
  '行政法',
  '经济法',
  '劳动法',
  '环境法',
  '知识产权法',
  '国际法',
  '诉讼法'
] as const;

// 版本信息
export const VERSION = '1.0.0-legal-education';
export const DESCRIPTION = 'Conversation Storage optimized for legal education platform';

// 快速开始指南
export const QUICK_START = {
  initialize: 'await initializeConversationStorage({ storage_type: "memory" })',
  create_session: 'createQuickSession("案例分析", "socratic", ["民法"])',
  save_message: 'saveQuickMessage(sessionId, "user", "学生的问题", "question")',
  get_history: 'getDialogueHistory(sessionId, 20)',
  analyze: 'analyzeStudentEngagement(sessionId)',
  export: 'exportSessionData("json")'
};

console.log('📚 DeeChat Conversation Storage 法学教育版本已加载');
console.log('🎯 专为法学教育场景优化，支持苏格拉底对话、案例分析等教学模式');
console.log('💡 使用 QUICK_START 常量查看快速开始指南');