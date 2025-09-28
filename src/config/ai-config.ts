/**
 * AI调用配置中心
 * 解决硬编码问题，支持灵活配置
 * 优先级：环境变量 > 默认配置
 */

export interface AIModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface AIServiceConfig {
  // 基础配置
  provider: 'deepseek' | 'openai' | 'claude';
  apiKey: string;
  apiUrl: string;

  // 模型配置
  models: {
    default: AIModelConfig;
    analysis: AIModelConfig;     // 分析类任务
    generation: AIModelConfig;   // 生成类任务
    reasoning: AIModelConfig;    // 推理类任务
    dialogue: AIModelConfig;     // 对话类任务
  };

  // 性能配置
  timeout: number;
  maxRetries: number;
  retryDelay: number;

  // 成本控制
  enableCostTracking: boolean;
  maxCostPerRequest?: number;
  dailyCostLimit?: number;
}

/**
 * 从环境变量获取值，支持类型转换
 */
function getEnvValue<T>(key: string, defaultValue: T): T {
  if (typeof window !== 'undefined') {
    // 客户端环境
    const value = (window as any).__ENV__?.[key];
    if (value !== undefined) {
      return parseValue(value, defaultValue);
    }
  }

  // 服务端环境
  const value = process.env[key];
  if (value !== undefined) {
    return parseValue(value, defaultValue);
  }

  return defaultValue;
}

/**
 * 解析环境变量值
 */
function parseValue<T>(value: string, defaultValue: T): T {
  if (typeof defaultValue === 'number') {
    return (parseFloat(value) || defaultValue) as T;
  }
  if (typeof defaultValue === 'boolean') {
    return (value === 'true') as T;
  }
  return value as T;
}

/**
 * 默认模型配置
 */
const DEFAULT_MODEL_CONFIG: AIModelConfig = {
  model: getEnvValue('AI_MODEL', 'deepseek-chat'),
  temperature: getEnvValue('AI_TEMPERATURE', 0.7),
  maxTokens: getEnvValue('AI_MAX_TOKENS', 2000),
  topP: getEnvValue('AI_TOP_P', 0.95),
  frequencyPenalty: getEnvValue('AI_FREQUENCY_PENALTY', 0.0),
  presencePenalty: getEnvValue('AI_PRESENCE_PENALTY', 0.0)
};

/**
 * 获取AI服务配置
 */
export function getAIConfig(): AIServiceConfig {
  return {
    // 基础配置
    provider: getEnvValue('AI_PROVIDER', 'deepseek') as any,
    apiKey: getEnvValue('DEEPSEEK_API_KEY', ''),
    apiUrl: getEnvValue('DEEPSEEK_API_URL', 'https://api.deepseek.com/v1'),

    // 不同场景的模型配置
    models: {
      // 默认配置
      default: DEFAULT_MODEL_CONFIG,

      // 分析类任务（更低温度，更高准确性）
      analysis: {
        ...DEFAULT_MODEL_CONFIG,
        temperature: getEnvValue('AI_ANALYSIS_TEMPERATURE', 0.5),
        maxTokens: getEnvValue('AI_ANALYSIS_MAX_TOKENS', 2500)
      },

      // 生成类任务（更高温度，更有创造性）
      generation: {
        ...DEFAULT_MODEL_CONFIG,
        temperature: getEnvValue('AI_GENERATION_TEMPERATURE', 0.8),
        maxTokens: getEnvValue('AI_GENERATION_MAX_TOKENS', 3000)
      },

      // 推理类任务（低温度，高逻辑性）
      reasoning: {
        ...DEFAULT_MODEL_CONFIG,
        temperature: getEnvValue('AI_REASONING_TEMPERATURE', 0.3),
        maxTokens: getEnvValue('AI_REASONING_MAX_TOKENS', 2000)
      },

      // 对话类任务（平衡的配置）
      dialogue: {
        ...DEFAULT_MODEL_CONFIG,
        temperature: getEnvValue('AI_DIALOGUE_TEMPERATURE', 0.7),
        maxTokens: getEnvValue('AI_DIALOGUE_MAX_TOKENS', 1500)
      }
    },

    // 性能配置
    timeout: getEnvValue('AI_TIMEOUT', 30000),
    maxRetries: getEnvValue('AI_MAX_RETRIES', 3),
    retryDelay: getEnvValue('AI_RETRY_DELAY', 1000),

    // 成本控制
    enableCostTracking: getEnvValue('AI_ENABLE_COST_TRACKING', true),
    maxCostPerRequest: getEnvValue('AI_MAX_COST_PER_REQUEST', 0.5),
    dailyCostLimit: getEnvValue('AI_DAILY_COST_LIMIT', 50)
  };
}

/**
 * 根据任务类型获取模型配置
 */
export function getModelConfig(taskType: 'default' | 'analysis' | 'generation' | 'reasoning' | 'dialogue' = 'default'): AIModelConfig {
  const config = getAIConfig();
  return config.models[taskType] || config.models.default;
}

/**
 * 获取特定服务的配置
 */
export function getServiceConfig(serviceName: string): AIModelConfig {
  const serviceConfigs: Record<string, keyof AIServiceConfig['models']> = {
    'dispute-analysis': 'analysis',
    'claim-analysis': 'reasoning',
    'evidence-intelligence': 'analysis',
    'case-narrative': 'generation',
    'socratic-dialogue': 'dialogue',
    'timeline-analysis': 'analysis'
  };

  const taskType = serviceConfigs[serviceName] || 'default';
  return getModelConfig(taskType as any);
}

/**
 * 配置验证
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const config = getAIConfig();
  const errors: string[] = [];

  if (!config.apiKey) {
    errors.push('API Key未配置');
  }

  if (!config.apiUrl) {
    errors.push('API URL未配置');
  }

  if (config.models.default.temperature < 0 || config.models.default.temperature > 1) {
    errors.push('Temperature必须在0-1之间');
  }

  if (config.models.default.maxTokens < 1) {
    errors.push('MaxTokens必须大于0');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// 导出配置实例供调试
export const AI_CONFIG = getAIConfig();