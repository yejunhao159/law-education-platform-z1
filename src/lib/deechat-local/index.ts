/**
 * DeeChat 本地集成模块 - 法学教育平台统一导出
 * 整合ai-client、token-calculator、context-manager、conversation-storage
 * 避免外部依赖问题，专为法学教育场景优化
 */

// AI 客户端
export { AIClient, AIChat } from './ai-client';

// Token 计算器 - 核心功能
export {
  TokenCalculator,
  CostCalculator,
  countTokens,
  countDeepSeek,
  estimateCost,
  estimateTeachingCost,
  compareLegalEducationModels,
  getMostEconomicalForEducation,
  estimateSemesterBudget,
  getTokenCalculator,
  getCostCalculator
} from './token-calculator';

// Context 管理器 - 核心功能
export {
  ContextFormatter,
  TemplateManager,
  templateManager,
  formatContext,
  buildMessages,
  buildSocraticContext,
  buildLegalAnalysisContext,
  getAvailableTemplates,
  recommendTemplate,
  smartRecommendTemplate
} from './context-manager';

// 对话存储 - 核心功能
export {
  ConversationStorage,
  MemoryStorage,
  initializeConversationStorage,
  getConversationStorage,
  closeConversationStorage,
  createQuickSession,
  saveQuickMessage,
  getDialogueHistory,
  searchConversations,
  analyzeStudentEngagement,
  generateSessionReport,
  getTeachingStats,
  createSocraticSession,
  createAnalysisSession
} from './conversation-storage';

// 类型导出
export type {
  // Token Calculator 类型
  Provider,
  TokenUsage,
  CostEstimate,
  ModelPricing,
  TokenizeOptions,
  BatchTokenResult,
  ModelInfo,
  TokenizerStrategy,
  LegalAnalysisTokenUsage,
  TeachingCostEstimate
} from './types';

export type {
  // Context Manager 类型
  ContextData,
  AIMessage,
  AIRole,
  LegalEducationContextData,
  SocraticDialogueContext,
  LegalAnalysisContext,
  SocraticMessage,
  ContextTemplate,
  LegalEducationTemplate,
  FormatterOptions,
  ContextBuildResult
} from './context-manager/types';

export type {
  // Conversation Storage 类型
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
  CaseInfo,
  StudentProgress,
  TeachingMode,
  EducationLevel,
  SessionType,
  MessageType,
  DifficultyLevel
} from './conversation-storage/types';

// 便捷常量
export const DEECHAT_VERSION = '1.0.0-legal-education';
export const DEECHAT_DESCRIPTION = 'DeeChat local integration optimized for legal education platform';

// 教学相关常量
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

// 快速开始指南
export const QUICK_START = {
  // AI 客户端
  ai_client: 'new AIClient({ baseUrl, model, apiKey })',

  // Token 计算
  token_count: 'countDeepSeek("你的法律文档内容")',
  cost_estimate: 'estimateTeachingCost("文档内容", "socratic", "undergraduate")',

  // 上下文管理
  format_context: 'formatContext({ role: "法学教授", current: "请分析这个案例" })',
  socratic_context: 'buildSocraticContext({ caseText: "...", studentLevel: "intermediate", currentTopic: "合同履行" })',

  // 对话存储
  init_storage: 'await initializeConversationStorage({ storage_type: "memory" })',
  create_session: 'createQuickSession("案例分析", "socratic", ["民法"])',
  save_message: 'saveQuickMessage(sessionId, "user", "学生的问题", "question")'
};

// 健康检查 - 确保所有模块正常工作
export function healthCheck() {
  const health = {
    status: 'healthy' as 'healthy' | 'degraded' | 'error',
    modules: {
      aiClient: false,
      tokenCalculator: false,
      contextManager: false,
      conversationStorage: false
    },
    errors: [] as string[],
    warnings: [] as string[]
  };

  try {
    // 检查 AI Client
    const aiClient = require('./ai-client');
    health.modules.aiClient = typeof aiClient.AIClient === 'function';
  } catch (error) {
    health.errors.push('AI Client 模块加载失败');
    health.status = 'error';
  }

  try {
    // 检查 Token Calculator
    const tokenCalc = require('./token-calculator');
    health.modules.tokenCalculator = typeof tokenCalc.countTokens === 'function';
  } catch (error) {
    health.errors.push('Token Calculator 模块加载失败');
    health.status = 'error';
  }

  try {
    // 检查 Context Manager
    const contextMgr = require('./context-manager');
    health.modules.contextManager = typeof contextMgr.ContextFormatter === 'function';
  } catch (error) {
    health.errors.push('Context Manager 模块加载失败');
    health.status = 'error';
  }

  try {
    // 检查 Conversation Storage
    const storage = require('./conversation-storage');
    health.modules.conversationStorage = typeof storage.ConversationStorage === 'function';
  } catch (error) {
    health.errors.push('Conversation Storage 模块加载失败');
    health.status = 'error';
  }

  // 确定整体状态
  const workingModules = Object.values(health.modules).filter(Boolean).length;
  if (workingModules === 4) {
    health.status = 'healthy';
  } else if (workingModules >= 2) {
    health.status = 'degraded';
    health.warnings.push(`${4 - workingModules} 个模块存在问题`);
  } else {
    health.status = 'error';
  }

  return health;
}

// 初始化所有模块
export async function initializeAll(config?: {
  aiConfig?: any;
  storageConfig?: any;
  enableDebug?: boolean;
}) {
  const results = {
    aiClient: false,
    conversationStorage: false,
    errors: [] as string[]
  };

  if (config?.enableDebug) {
    console.log('🚀 开始初始化 DeeChat 本地集成模块...');
  }

  try {
    // 初始化对话存储
    await initializeConversationStorage(config?.storageConfig);
    results.conversationStorage = true;
    if (config?.enableDebug) console.log('✅ 对话存储初始化完成');
  } catch (error) {
    results.errors.push(`对话存储初始化失败: ${error}`);
    if (config?.enableDebug) console.error('❌ 对话存储初始化失败:', error);
  }

  // AI Client 不需要全局初始化，使用时创建实例
  results.aiClient = true;

  if (config?.enableDebug) {
    console.log('✨ DeeChat 本地集成模块初始化完成');
    console.log(`📊 成功模块: AI Client(${results.aiClient}), Storage(${results.conversationStorage})`);
  }

  return results;
}

// 获取所有模块的版本信息
export function getVersionInfo() {
  return {
    deechat: DEECHAT_VERSION,
    description: DEECHAT_DESCRIPTION,
    modules: {
      'ai-client': '1.0.0-legal-education',
      'token-calculator': '1.0.0-legal-education',
      'context-manager': '1.0.0-legal-education',
      'conversation-storage': '1.0.0-legal-education'
    },
    buildDate: new Date().toISOString(),
    optimizedFor: 'Legal Education Platform'
  };
}

// 默认导出健康检查功能
export default {
  healthCheck,
  initializeAll,
  getVersionInfo,
  QUICK_START
};

// 启动时的欢迎信息
console.log('🎓 DeeChat 法学教育平台本地集成模块已加载');
console.log('📚 包含: AI客户端、Token计算器、上下文管理器、对话存储');
console.log('💡 使用 QUICK_START 查看快速开始指南');
console.log('🔍 使用 healthCheck() 检查模块状态');