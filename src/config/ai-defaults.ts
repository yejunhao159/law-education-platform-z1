/**
 * AI调用默认配置
 * 简单直接，支持环境变量覆盖
 */

// 获取环境变量，带默认值
const getEnv = (key: string, defaultValue: any) => {
  // 优先使用已有的硬编码值（如果存在）
  if (key === 'DEEPSEEK_API_KEY' && !process.env[key]) {
    // 使用已知的有效API Key作为fallback
    return 'sk-6b081a93258346379182141661293345';
  }

  if (typeof process !== 'undefined' && process.env[key] !== undefined && process.env[key] !== '') {
    const value = process.env[key];
    // 自动类型转换
    if (typeof defaultValue === 'number') {
      return parseFloat(value) || defaultValue;
    }
    if (typeof defaultValue === 'boolean') {
      return value === 'true';
    }
    return value;
  }
  return defaultValue;
};

/**
 * AI模型默认配置
 * 可通过环境变量覆盖
 */
export const AI_DEFAULTS = {
  // 模型配置
  model: getEnv('AI_MODEL', 'deepseek-chat'),
  temperature: getEnv('AI_TEMPERATURE', 0.7),
  maxTokens: getEnv('AI_MAX_TOKENS', 2000),

  // API配置
  apiKey: getEnv('DEEPSEEK_API_KEY', 'sk-6b081a93258346379182141661293345'),
  apiUrl: getEnv('DEEPSEEK_API_URL', 'https://api.deepseek.com/v1'),

  // 性能配置
  timeout: getEnv('AI_TIMEOUT', 30000),
  maxRetries: getEnv('AI_MAX_RETRIES', 3),

  // 特定服务的温度配置（可选）
  temperatures: {
    analysis: getEnv('AI_ANALYSIS_TEMPERATURE', 0.5),    // 分析类更精确
    generation: getEnv('AI_GENERATION_TEMPERATURE', 0.8), // 生成类更创造
    reasoning: getEnv('AI_REASONING_TEMPERATURE', 0.3),   // 推理类更严谨
    dialogue: getEnv('AI_DIALOGUE_TEMPERATURE', 0.7)      // 对话类平衡
  }
};

/**
 * 获取服务专用配置
 * 如果没有特殊配置，返回默认值
 */
export function getAIParams(serviceName?: string) {
  // 服务映射到温度类型
  const serviceMap: Record<string, keyof typeof AI_DEFAULTS.temperatures> = {
    'dispute-analysis': 'analysis',
    'claim-analysis': 'reasoning',
    'evidence-intelligence': 'analysis',
    'case-narrative': 'generation',
    'socratic-dialogue': 'dialogue'
  };

  const temperatureType = serviceName ? serviceMap[serviceName] : null;
  const temperature = temperatureType
    ? AI_DEFAULTS.temperatures[temperatureType]
    : AI_DEFAULTS.temperature;

  return {
    temperature,
    maxTokens: AI_DEFAULTS.maxTokens
  };
}