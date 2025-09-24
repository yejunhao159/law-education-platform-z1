/**
 * 环境配置管理
 * 负责管理和验证所有环境变量
 */

import { z } from 'zod';
import { createLogger } from '../logging';

const logger = createLogger('environment');

/**
 * 环境类型
 */
export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test'
}

/**
 * 配置模式
 */
const ConfigSchema = z.object({
  // 基础配置
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  HOST: z.string().default('localhost'),
  BASE_URL: z.string().url().optional(),

  // 数据库配置
  DATABASE_URL: z.string().optional(),
  DATABASE_POOL_MIN: z.string().default('2').transform(Number),
  DATABASE_POOL_MAX: z.string().default('10').transform(Number),
  
  // Redis配置
  REDIS_URL: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TTL: z.string().default('3600').transform(Number),

  // AI服务配置
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-3.5-turbo'),
  OPENAI_MAX_TOKENS: z.string().default('500').transform(Number),
  OPENAI_TEMPERATURE: z.string().default('0.7').transform(Number),
  
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_API_URL: z.string().url().default('https://api.deepseek.com/v1/chat/completions'),

  // 会话配置
  SESSION_SECRET: z.string().min(32).optional(),
  SESSION_MAX_AGE: z.string().default('86400000').transform(Number), // 24小时
  SESSION_NAME: z.string().default('socratic.sid'),

  // WebSocket配置
  WS_PORT: z.string().default('3001').transform(Number),
  WS_CORS_ORIGIN: z.string().default('*'),
  WS_MAX_CONNECTIONS: z.string().default('1000').transform(Number),
  WS_PING_INTERVAL: z.string().default('30000').transform(Number),

  // 缓存配置
  CACHE_ENABLED: z.string().default('true').transform(v => v === 'true'),
  CACHE_TTL: z.string().default('3600').transform(Number),
  CACHE_MAX_SIZE: z.string().default('100').transform(Number),

  // 限流配置
  RATE_LIMIT_ENABLED: z.string().default('true').transform(v => v === 'true'),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  AI_RATE_LIMIT_MAX_REQUESTS: z.string().default('10').transform(Number),

  // 日志配置
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'text']).default('json'),
  LOG_FILE_PATH: z.string().default('./logs/app.log'),
  LOG_MAX_FILES: z.string().default('5').transform(Number),
  LOG_MAX_SIZE: z.string().default('10485760').transform(Number), // 10MB

  // 监控配置
  MONITORING_ENABLED: z.string().default('true').transform(v => v === 'true'),
  METRICS_INTERVAL: z.string().default('60000').transform(Number),
  PROMETHEUS_ENABLED: z.string().default('false').transform(v => v === 'true'),
  PROMETHEUS_PUSHGATEWAY_URL: z.string().url().optional(),
  GRAFANA_ENABLED: z.string().default('false').transform(v => v === 'true'),
  GRAFANA_ENDPOINT: z.string().url().optional(),
  GRAFANA_API_KEY: z.string().optional(),

  // 安全配置
  CORS_ENABLED: z.string().default('true').transform(v => v === 'true'),
  CORS_ORIGIN: z.string().default('*'),
  CSRF_ENABLED: z.string().default('true').transform(v => v === 'true'),
  HELMET_ENABLED: z.string().default('true').transform(v => v === 'true'),
  
  // 功能开关
  FEATURE_SOCRATIC_ENABLED: z.string().default('true').transform(v => v === 'true'),
  FEATURE_CLASSROOM_ENABLED: z.string().default('true').transform(v => v === 'true'),
  FEATURE_VOTING_ENABLED: z.string().default('true').transform(v => v === 'true'),
  FEATURE_AI_FALLBACK_ENABLED: z.string().default('true').transform(v => v === 'true'),
  
  // 告警配置
  ALERT_WEBHOOK_URL: z.string().url().optional(),
  ALERT_EMAIL: z.string().email().optional(),
  ALERT_THRESHOLD_ERROR_RATE: z.string().default('0.05').transform(Number),
  ALERT_THRESHOLD_RESPONSE_TIME: z.string().default('5000').transform(Number),

  // 维护模式
  MAINTENANCE_MODE: z.string().default('false').transform(v => v === 'true'),
  MAINTENANCE_MESSAGE: z.string().default('系统维护中，请稍后再试'),
  MAINTENANCE_END_TIME: z.string().optional()
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * 环境配置管理器
 */
export class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private config: Config;
  private validationErrors: z.ZodError | null = null;

  private constructor() {
    this.config = this.loadAndValidate();
  }

  public static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  /**
   * 加载并验证配置
   */
  private loadAndValidate(): Config {
    try {
      const rawConfig = this.loadFromEnvironment();
      const validated = ConfigSchema.parse(rawConfig);
      
      logger.info('环境配置加载成功', {
        environment: validated.NODE_ENV,
        port: validated.PORT
      });
      
      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.validationErrors = error;
        logger.error('环境配置验证失败', error.errors);
        
        // 在测试环境使用默认值
        if (process.env.NODE_ENV === 'test') {
          return this.getDefaults();
        }
        
        throw new Error(`配置验证失败: ${this.formatValidationErrors(error)}`);
      }
      throw error;
    }
  }

  /**
   * 从环境变量加载配置
   */
  private loadFromEnvironment(): Record<string, any> {
    return process.env;
  }

  /**
   * 格式化验证错误
   */
  private formatValidationErrors(error: z.ZodError): string {
    return error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
  }

  /**
   * 获取默认配置
   */
  private getDefaults(): Config {
    const defaults: any = {};
    const shape = ConfigSchema.shape;
    
    for (const [key, schema] of Object.entries(shape)) {
      if ('_def' in schema && 'defaultValue' in (schema as any)._def) {
        defaults[key] = (schema as any)._def.defaultValue();
      }
    }
    
    return defaults as Config;
  }

  /**
   * 获取配置值
   */
  public get<K extends keyof Config>(key: K): Config[K] {
    return this.config[key];
  }

  /**
   * 获取所有配置
   */
  public getAll(): Config {
    return { ...this.config };
  }

  /**
   * 获取环境类型
   */
  public getEnvironment(): Environment {
    return this.config.NODE_ENV as Environment;
  }

  /**
   * 检查是否为开发环境
   */
  public isDevelopment(): boolean {
    return this.config.NODE_ENV === Environment.DEVELOPMENT;
  }

  /**
   * 检查是否为生产环境
   */
  public isProduction(): boolean {
    return this.config.NODE_ENV === Environment.PRODUCTION;
  }

  /**
   * 检查是否为测试环境
   */
  public isTest(): boolean {
    return this.config.NODE_ENV === Environment.TEST;
  }

  /**
   * 检查功能是否启用
   */
  public isFeatureEnabled(feature: string): boolean {
    const key = `FEATURE_${feature.toUpperCase()}_ENABLED` as keyof Config;
    return this.config[key] === true;
  }

  /**
   * 检查是否处于维护模式
   */
  public isMaintenanceMode(): boolean {
    if (!this.config.MAINTENANCE_MODE) return false;
    
    if (this.config.MAINTENANCE_END_TIME) {
      const endTime = new Date(this.config.MAINTENANCE_END_TIME);
      if (endTime < new Date()) {
        return false; // 维护已结束
      }
    }
    
    return true;
  }

  /**
   * 获取数据库配置
   */
  public getDatabaseConfig() {
    return {
      url: this.config.DATABASE_URL,
      pool: {
        min: this.config.DATABASE_POOL_MIN,
        max: this.config.DATABASE_POOL_MAX
      }
    };
  }

  /**
   * 获取Redis配置
   */
  public getRedisConfig() {
    return {
      url: this.config.REDIS_URL,
      password: this.config.REDIS_PASSWORD,
      ttl: this.config.REDIS_TTL
    };
  }

  /**
   * 获取AI服务配置
   */
  public getAIConfig() {
    return {
      openai: {
        apiKey: this.config.OPENAI_API_KEY,
        model: this.config.OPENAI_MODEL,
        maxTokens: this.config.OPENAI_MAX_TOKENS,
        temperature: this.config.OPENAI_TEMPERATURE
      },
      deepseek: {
        apiKey: this.config.DEEPSEEK_API_KEY,
        apiUrl: this.config.DEEPSEEK_API_URL
      }
    };
  }

  /**
   * 获取WebSocket配置
   */
  public getWebSocketConfig() {
    return {
      port: this.config.WS_PORT,
      cors: {
        origin: this.config.WS_CORS_ORIGIN
      },
      maxConnections: this.config.WS_MAX_CONNECTIONS,
      pingInterval: this.config.WS_PING_INTERVAL
    };
  }

  /**
   * 获取限流配置
   */
  public getRateLimitConfig() {
    return {
      enabled: this.config.RATE_LIMIT_ENABLED,
      windowMs: this.config.RATE_LIMIT_WINDOW_MS,
      maxRequests: this.config.RATE_LIMIT_MAX_REQUESTS,
      aiMaxRequests: this.config.AI_RATE_LIMIT_MAX_REQUESTS
    };
  }

  /**
   * 验证必需的配置
   */
  public validateRequired(keys: Array<keyof Config>): boolean {
    const missing: string[] = [];
    
    for (const key of keys) {
      if (!this.config[key]) {
        missing.push(key);
      }
    }
    
    if (missing.length > 0) {
      logger.error('缺少必需的配置', { missing });
      return false;
    }
    
    return true;
  }

  /**
   * 获取配置摘要（隐藏敏感信息）
   */
  public getSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    const sensitiveKeys = [
      'DATABASE_URL',
      'REDIS_PASSWORD',
      'OPENAI_API_KEY',
      'DEEPSEEK_API_KEY',
      'SESSION_SECRET',
      'GRAFANA_API_KEY',
      'ALERT_WEBHOOK_URL'
    ];
    
    for (const [key, value] of Object.entries(this.config)) {
      if (sensitiveKeys.includes(key)) {
        summary[key] = value ? '[CONFIGURED]' : '[NOT_SET]';
      } else {
        summary[key] = value;
      }
    }
    
    return summary;
  }

  /**
   * 检查配置健康状态
   */
  public checkHealth(): {
    healthy: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    // 检查AI服务配置
    if (this.isFeatureEnabled('SOCRATIC') && !this.config.OPENAI_API_KEY && !this.config.DEEPSEEK_API_KEY) {
      issues.push('苏格拉底功能已启用但未配置AI服务');
    }
    
    // 检查会话安全
    if (this.isProduction() && !this.config.SESSION_SECRET) {
      issues.push('生产环境缺少SESSION_SECRET');
    }
    
    // 检查数据库连接
    if (!this.config.DATABASE_URL && this.isProduction()) {
      issues.push('生产环境缺少数据库配置');
    }
    
    // 检查监控配置
    if (this.config.MONITORING_ENABLED && !this.config.PROMETHEUS_ENABLED && !this.config.GRAFANA_ENABLED) {
      issues.push('监控已启用但未配置监控后端');
    }
    
    return {
      healthy: issues.length === 0,
      issues
    };
  }

  /**
   * 重新加载配置（用于热更新）
   */
  public reload(): void {
    logger.info('重新加载环境配置');
    this.config = this.loadAndValidate();
  }
}

// 导出单例实例
export const config = EnvironmentConfig.getInstance();

// 导出便捷方法
export const getConfig = <K extends keyof Config>(key: K): Config[K] => config.get(key);
export const isProduction = () => config.isProduction();
export const isDevelopment = () => config.isDevelopment();
export const isTest = () => config.isTest();
export const isFeatureEnabled = (feature: string) => config.isFeatureEnabled(feature);