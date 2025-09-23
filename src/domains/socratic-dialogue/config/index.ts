/**
 * 苏格拉底对话配置模块导出
 * 统一导出所有配置相关的类型和实例
 */

export {
  AIServiceConfigManager,
  defaultAIServiceConfig,
  createAIServiceConfig,
  type AIProviderConfig,
  type AIServiceGlobalConfig,
  type LoadBalancingStrategy
} from './AIServiceConfig';

// 配置常量
export const AI_SERVICE_DEFAULTS = {
  COST_THRESHOLD: 0.01,
  MAX_CONTEXT_TOKENS: 8000,
  TEMPERATURE: 0.7,
  REQUEST_TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  DAILY_COST_LIMIT: 5.00,
  HEALTH_CHECK_INTERVAL: 300000 // 5分钟
} as const;

// 提供商优先级映射
export const PROVIDER_PRIORITIES = {
  deepseek: 1,
  openai: 2,
  claude: 3
} as const;

// 模型映射
export const MODEL_MAPPINGS = {
  deepseek: 'deepseek-chat',
  openai: 'gpt-4o-mini',
  claude: 'claude-3-haiku-20240307'
} as const;