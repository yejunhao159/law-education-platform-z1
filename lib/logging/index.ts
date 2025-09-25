/**
 * 统一日志模块 - 临时简化版本
 * 使用简单的console日志器避免复杂的类型导出问题
 */

// 简单的日志器接口
interface SimpleLogger {
  debug: (message: string, metadata?: any) => void;
  info: (message: string, metadata?: any) => void;
  warn: (message: string, metadata?: any) => void;
  error: (message: string, error?: any, metadata?: any) => void;
}

// 创建简单日志器
export function createLogger(module: string): SimpleLogger {
  return {
    debug: (message: string, metadata?: any) => console.debug(`[${module}]`, message, metadata),
    info: (message: string, metadata?: any) => console.info(`[${module}]`, message, metadata),
    warn: (message: string, metadata?: any) => console.warn(`[${module}]`, message, metadata),
    error: (message: string, error?: any, metadata?: any) => console.error(`[${module}]`, message, error, metadata)
  };
}

// 预配置的日志器实例
export const apiLogger = createLogger('api');
export const uiLogger = createLogger('ui');
export const storeLogger = createLogger('store');
export const aiLogger = createLogger('ai');
export const socraticLogger = createLogger('socratic');
export const globalLogger = createLogger('global');

// 便捷导出对象（兼容原socratic-logger的logger对象）
export const logger = {
  create: createLogger,
  global: globalLogger,
  debug: (message: string, metadata?: any) => globalLogger.debug(message, metadata),
  info: (message: string, metadata?: any) => globalLogger.info(message, metadata),
  warn: (message: string, metadata?: any) => globalLogger.warn(message, metadata),
  error: (message: string, error?: any, metadata?: any) => globalLogger.error(message, error, metadata)
};