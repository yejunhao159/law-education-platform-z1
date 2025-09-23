/**
 * 结构化日志系统
 * 提供生产环境的JSON格式日志和高级日志功能
 */

import { createLogger as createBaseLogger, LogLevel } from '../utils/socratic-logger';
import { defaultPerformanceMonitor } from '../../src/domains/socratic-dialogue/monitoring/PerformanceMonitor';

export interface LogContext {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  correlationId?: string;
  sessionId?: string;
  userId?: string;
  traceId?: string;
  spanId?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: {
    duration?: number;
    startTime?: string;
    endTime?: string;
  };
  tags?: string[];
}

export interface LoggerConfig {
  module: string;
  level?: LogLevel;
  format?: 'json' | 'text';
  output?: 'console' | 'file' | 'both';
  filePath?: string;
  maxFileSize?: number;
  maxFiles?: number;
  enableCorrelation?: boolean;
  enablePerformance?: boolean;
  enableSampling?: boolean;
  samplingRate?: number;
  redactFields?: string[];
}

export class StructuredLogger {
  private baseLogger: ReturnType<typeof createBaseLogger>;
  private config: Required<LoggerConfig>;
  private correlationMap = new Map<string, string>();
  private performanceMap = new Map<string, number>();
  private buffer: LogContext[] = [];
  private readonly maxBufferSize = 1000;
  
  constructor(config: LoggerConfig) {
    this.config = {
      level: LogLevel.INFO,
      format: 'json',
      output: 'console',
      filePath: './logs/app.log',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      enableCorrelation: true,
      enablePerformance: true,
      enableSampling: false,
      samplingRate: 1,
      redactFields: ['password', 'token', 'apiKey', 'secret'],
      ...config
    };
    
    this.baseLogger = createBaseLogger({ module: config.module });
  }

  /**
   * 记录调试日志
   */
  debug(message: string, metadata?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * 记录信息日志
   */
  info(message: string, metadata?: Record<string, any>) {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * 记录警告日志
   */
  warn(message: string, metadata?: Record<string, any>) {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * 记录错误日志
   */
  error(message: string, error?: Error | any, metadata?: Record<string, any>) {
    const errorContext = this.formatError(error);
    this.log(LogLevel.ERROR, message, { ...metadata, error: errorContext });
  }

  /**
   * 记录致命错误
   */
  fatal(message: string, error?: Error | any, metadata?: Record<string, any>) {
    const errorContext = this.formatError(error);
    this.log(LogLevel.ERROR, `[FATAL] ${message}`, { ...metadata, error: errorContext });
    
    // 触发告警
    this.triggerAlert('fatal', message, error);
  }

  /**
   * 开始性能跟踪
   */
  startTimer(operationId: string): void {
    if (this.config.enablePerformance) {
      this.performanceMap.set(operationId, Date.now());
    }
  }

  /**
   * 结束性能跟踪并记录
   */
  endTimer(operationId: string, message: string, metadata?: Record<string, any>) {
    if (!this.config.enablePerformance) return;
    
    const startTime = this.performanceMap.get(operationId);
    if (!startTime) {
      this.warn(`Timer ${operationId} not found`);
      return;
    }
    
    const duration = Date.now() - startTime;
    this.performanceMap.delete(operationId);
    
    this.info(message, {
      ...metadata,
      performance: {
        duration,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date().toISOString()
      }
    });
    
    // 记录到性能监控
    // socraticPerformance.recordAPIRequest({
      endpoint: operationId,
      method: 'OPERATION',
      duration,
      status: 200
    });
  }

  /**
   * 设置关联ID
   */
  setCorrelationId(id: string, parentId?: string) {
    if (this.config.enableCorrelation) {
      this.correlationMap.set(id, parentId || id);
    }
  }

  /**
   * 获取关联ID
   */
  getCorrelationId(id: string): string | undefined {
    return this.correlationMap.get(id);
  }

  /**
   * 创建子日志器
   */
  child(context: Partial<LogContext>): StructuredLogger {
    const childLogger = new StructuredLogger({
      ...this.config,
      module: `${this.config.module}:${context.module || 'child'}`
    });
    
    // 继承关联ID
    if (context.correlationId) {
      childLogger.setCorrelationId(context.correlationId);
    }
    
    return childLogger;
  }

  /**
   * 核心日志方法
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>) {
    // 采样检查
    if (this.config.enableSampling && Math.random() > this.config.samplingRate) {
      return;
    }
    
    // 级别检查
    if (level < this.config.level) {
      return;
    }
    
    // 构建日志上下文
    const context: LogContext = {
      timestamp: new Date().toISOString(),
      level,
      module: this.config.module,
      message,
      metadata: this.redactSensitiveData(metadata)
    };
    
    // 添加关联ID
    if (this.config.enableCorrelation && metadata?.correlationId) {
      context.correlationId = metadata.correlationId;
    }
    
    // 添加会话和用户信息
    if (metadata?.sessionId) context.sessionId = metadata.sessionId;
    if (metadata?.userId) context.userId = metadata.userId;
    
    // 添加追踪信息
    if (metadata?.traceId) context.traceId = metadata.traceId;
    if (metadata?.spanId) context.spanId = metadata.spanId;
    
    // 添加标签
    if (metadata?.tags) context.tags = metadata.tags;
    
    // 输出日志
    this.output(context);
    
    // 缓冲日志
    this.bufferLog(context);
  }

  /**
   * 输出日志
   */
  private output(context: LogContext) {
    const formatted = this.config.format === 'json' 
      ? JSON.stringify(context)
      : this.formatText(context);
    
    switch (this.config.output) {
      case 'console':
        this.outputToConsole(context, formatted);
        break;
      case 'file':
        this.outputToFile(formatted);
        break;
      case 'both':
        this.outputToConsole(context, formatted);
        this.outputToFile(formatted);
        break;
    }
  }

  /**
   * 输出到控制台
   */
  private outputToConsole(context: LogContext, formatted: string) {
    switch (context.level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }
  }

  /**
   * 输出到文件
   */
  private outputToFile(formatted: string) {
    // 在实际应用中，这里应该使用文件系统或日志服务
    // 为了演示，我们只是记录到缓冲区
    if (typeof window === 'undefined') {
      // Node.js环境
      try {
        const fs = require('fs');
        fs.appendFileSync(this.config.filePath, formatted + '\n');
      } catch (error) {
        console.error('Failed to write log to file:', error);
      }
    }
  }

  /**
   * 格式化文本输出
   */
  private formatText(context: LogContext): string {
    const parts = [
      context.timestamp,
      `[${LogLevel[context.level]}]`,
      `[${context.module}]`,
      context.message
    ];
    
    if (context.correlationId) {
      parts.push(`[CID:${context.correlationId}]`);
    }
    
    if (context.metadata && Object.keys(context.metadata).length > 0) {
      parts.push(JSON.stringify(context.metadata));
    }
    
    return parts.join(' ');
  }

  /**
   * 格式化错误
   */
  private formatError(error: Error | any): LogContext['error'] | undefined {
    if (!error) return undefined;
    
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      };
    }
    
    return {
      name: 'UnknownError',
      message: String(error),
      stack: undefined,
      code: undefined
    };
  }

  /**
   * 脱敏敏感数据
   */
  private redactSensitiveData(data: any): any {
    if (!data) return data;
    
    if (typeof data !== 'object') return data;
    
    const redacted = { ...data };
    
    for (const field of this.config.redactFields) {
      if (field in redacted) {
        redacted[field] = '[REDACTED]';
      }
    }
    
    // 递归处理嵌套对象
    for (const key in redacted) {
      if (typeof redacted[key] === 'object' && redacted[key] !== null) {
        redacted[key] = this.redactSensitiveData(redacted[key]);
      }
    }
    
    return redacted;
  }

  /**
   * 缓冲日志
   */
  private bufferLog(context: LogContext) {
    this.buffer.push(context);
    
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }
  }

  /**
   * 触发告警
   */
  private triggerAlert(severity: string, message: string, error?: any) {
    // 这里应该集成告警服务
    console.error(`[ALERT][${severity.toUpperCase()}] ${message}`, error);
    
    // 记录到性能监控
    // socraticPerformance.recordAPIRequest({
      endpoint: 'alert',
      method: 'ALERT',
      duration: 0,
      status: 500,
      error: message
    });
  }

  /**
   * 获取缓冲的日志
   */
  getBufferedLogs(filter?: {
    level?: LogLevel;
    startTime?: Date;
    endTime?: Date;
    module?: string;
    correlationId?: string;
  }): LogContext[] {
    let logs = [...this.buffer];
    
    if (filter) {
      if (filter.level !== undefined) {
        logs = logs.filter(l => l.level >= filter.level!);
      }
      
      if (filter.startTime) {
        logs = logs.filter(l => new Date(l.timestamp) >= filter.startTime!);
      }
      
      if (filter.endTime) {
        logs = logs.filter(l => new Date(l.timestamp) <= filter.endTime!);
      }
      
      if (filter.module) {
        logs = logs.filter(l => l.module.includes(filter.module!));
      }
      
      if (filter.correlationId) {
        logs = logs.filter(l => l.correlationId === filter.correlationId);
      }
    }
    
    return logs;
  }

  /**
   * 清空缓冲
   */
  clearBuffer() {
    this.buffer = [];
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalLogs: number;
    logsByLevel: Record<string, number>;
    errorCount: number;
    averageMetadataSize: number;
  } {
    const stats = {
      totalLogs: this.buffer.length,
      logsByLevel: {} as Record<string, number>,
      errorCount: 0,
      averageMetadataSize: 0
    };
    
    let totalMetadataSize = 0;
    
    for (const log of this.buffer) {
      const levelName = LogLevel[log.level];
      stats.logsByLevel[levelName] = (stats.logsByLevel[levelName] || 0) + 1;
      
      if (log.level === LogLevel.ERROR) {
        stats.errorCount++;
      }
      
      if (log.metadata) {
        totalMetadataSize += JSON.stringify(log.metadata).length;
      }
    }
    
    if (this.buffer.length > 0) {
      stats.averageMetadataSize = totalMetadataSize / this.buffer.length;
    }
    
    return stats;
  }
}

/**
 * 创建结构化日志器的便捷方法
 */
export function createStructuredLogger(config: LoggerConfig): StructuredLogger {
  return new StructuredLogger(config);
}

/**
 * 全局日志器实例
 */
export const globalLogger = new StructuredLogger({
  module: 'global',
  level: process.env.LOG_LEVEL as LogLevel || LogLevel.INFO,
  format: process.env.LOG_FORMAT as 'json' | 'text' || 'json',
  enableCorrelation: true,
  enablePerformance: true,
  enableSampling: process.env.NODE_ENV === 'production',
  samplingRate: 0.1 // 生产环境10%采样
});

// 导出便捷方法
export const logger = {
  debug: (message: string, metadata?: any) => globalLogger.debug(message, metadata),
  info: (message: string, metadata?: any) => globalLogger.info(message, metadata),
  warn: (message: string, metadata?: any) => globalLogger.warn(message, metadata),
  error: (message: string, error?: any, metadata?: any) => globalLogger.error(message, error, metadata),
  fatal: (message: string, error?: any, metadata?: any) => globalLogger.fatal(message, error, metadata),
  startTimer: (id: string) => globalLogger.startTimer(id),
  endTimer: (id: string, message: string, metadata?: any) => globalLogger.endTimer(id, message, metadata),
  child: (context: any) => globalLogger.child(context)
};