/**
 * 日志器工厂
 * 提供兼容socratic-logger的createLogger接口
 */

import { StructuredLogger, LoggerConfig as StructuredLoggerConfig } from '../monitoring/structured-logger';
import { LogLevel } from '../types/socratic';

/**
 * 兼容性日志配置接口
 */
export interface LoggerConfig {
  /** 模块名称 */
  module?: string;
  /** 最低日志级别 */
  level?: LogLevel;
  /** 是否输出到控制台 */
  enableConsole?: boolean;
  /** 是否存储到内存 */
  enableStorage?: boolean;
  /** 最大存储条数 */
  maxStorageSize?: number;
  /** 默认上下文 */
  defaultContext?: any;
  /** 前缀（用于emoji装饰） */
  prefix?: string;
}

/**
 * 创建日志记录器
 * 兼容原socratic-logger的createLogger接口
 */
export function createLogger(module: string, config?: Partial<LoggerConfig>): StructuredLogger {
  const structuredConfig: StructuredLoggerConfig = {
    module,
    level: config?.level || LogLevel.INFO,
    format: 'text', // 默认文本格式，保持控制台友好
    output: 'console',
    enableCorrelation: true,
    enablePerformance: true,
    enableSampling: false,
    samplingRate: 1.0
  };

  const logger = new StructuredLogger(structuredConfig);

  // 如果有前缀配置，可以在这里处理emoji装饰
  if (config?.prefix) {
    // 创建带前缀的子日志器
    return logger.child({ module: `${config.prefix} ${module}` });
  }

  return logger;
}

/**
 * 预配置的专用日志器
 */
export const apiLogger = createLogger('API', { prefix: '🌐' });
export const uiLogger = createLogger('UI', { prefix: '🎨' });
export const storeLogger = createLogger('Store', { prefix: '📦' });
export const aiLogger = createLogger('AI', { prefix: '🤖' });
export const socraticLogger = createLogger('socratic', { enableStorage: true });
export const globalLogger = createLogger('global', { level: LogLevel.DEBUG });