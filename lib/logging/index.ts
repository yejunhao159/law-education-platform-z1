/**
 * 统一日志模块
 * 整合所有日志功能，提供兼容接口
 */

// 核心日志器
export { StructuredLogger, createStructuredLogger, LoggerConfig as StructuredLoggerConfig } from '../monitoring/structured-logger';

// 日志存储
export { LogStorage, LogStats } from './log-storage';

// 性能监控
export { measurePerformance, timed } from './performance';

// 工厂函数和预配置实例
export {
  createLogger,
  apiLogger,
  uiLogger,
  storeLogger,
  aiLogger,
  socraticLogger,
  globalLogger
} from './factory';

// 类型导出（保持兼容性）
export { LogLevel, LogEntry, LogContext } from '../types/socratic';

// 便捷导出对象（兼容原socratic-logger的logger对象）
import { createLogger, globalLogger } from './factory';
import { LogStorage } from './log-storage';
import { measurePerformance } from './performance';

export const logger = {
  create: createLogger,
  global: globalLogger,
  storage: LogStorage,
  measure: measurePerformance
};