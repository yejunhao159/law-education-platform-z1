/**
 * 苏格拉底模块专用日志工具
 * @module utils/socratic-logger
 * @description 提供结构化日志记录、性能监控和调试支持
 */

import { LogLevel, LogEntry, LogContext } from '@/lib/types/socratic'

/**
 * 日志配置接口
 */
export interface LoggerConfig {
  /** 模块名称 */
  module: string
  /** 最低日志级别 */
  level?: LogLevel
  /** 是否输出到控制台 */
  enableConsole?: boolean
  /** 是否存储到内存 */
  enableStorage?: boolean
  /** 最大存储条数 */
  maxStorageSize?: number
  /** 默认上下文 */
  defaultContext?: Partial<LogContext>
}

/**
 * 计时器接口
 */
export interface Timer {
  /** 结束计时并记录 */
  end: (message: string, success?: boolean) => number
}

/**
 * 日志统计接口
 */
export interface LogStats {
  /** 总日志数 */
  total: number
  /** 按级别统计 */
  byLevel: Record<LogLevel, number>
  /** 模块列表 */
  modules: string[]
  /** 会话列表 */
  sessions: string[]
  /** 平均响应时间 */
  avgDuration?: number
}

/**
 * 苏格拉底日志记录器
 */
export class SocraticLogger {
  private config: Required<LoggerConfig>
  private startTime: number = Date.now()

  constructor(config: LoggerConfig) {
    this.config = {
      module: config.module,
      level: config.level ?? LogLevel.INFO,
      enableConsole: config.enableConsole ?? true,
      enableStorage: config.enableStorage ?? true,
      maxStorageSize: config.maxStorageSize ?? 1000,
      defaultContext: config.defaultContext ?? {}
    }
  }

  /**
   * 记录调试日志
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  /**
   * 记录信息日志
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context)
  }

  /**
   * 记录警告日志
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context)
  }

  /**
   * 记录错误日志
   */
  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context)
  }

  /**
   * 开始计时
   */
  startTimer(action: string): Timer {
    const startTime = Date.now()
    
    return {
      end: (message: string, success: boolean = true) => {
        const duration = Date.now() - startTime
        const level = success ? LogLevel.INFO : LogLevel.ERROR
        
        this.log(level, message, {
          action,
          duration,
          success
        })
        
        return duration
      }
    }
  }

  /**
   * 核心日志记录方法
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    // 级别过滤
    if (!this.shouldLog(level)) {
      return
    }

    // 合并上下文
    const fullContext = {
      ...this.config.defaultContext,
      ...context
    }

    // 创建日志条目
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      module: this.config.module,
      message,
      context: Object.keys(fullContext).length > 0 ? fullContext : undefined
    }

    // 输出到控制台
    if (this.config.enableConsole) {
      this.logToConsole(entry)
    }

    // 存储到内存
    if (this.config.enableStorage) {
      LogStorage.add(entry, this.config.maxStorageSize)
    }
  }

  /**
   * 判断是否应该记录
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
    const currentIndex = levels.indexOf(this.config.level)
    const targetIndex = levels.indexOf(level)
    return targetIndex >= currentIndex
  }

  /**
   * 输出到控制台
   */
  private logToConsole(entry: LogEntry): void {
    const formatted = this.formatMessage(entry)
    const extra = entry.context?.extra

    switch (entry.level) {
      case LogLevel.DEBUG:
        if (extra) {
          console.log(formatted, extra)
        } else {
          console.log(formatted)
        }
        break
      case LogLevel.INFO:
        if (extra) {
          console.info(formatted, extra)
        } else {
          console.info(formatted)
        }
        break
      case LogLevel.WARN:
        if (extra) {
          console.warn(formatted, extra)
        } else {
          console.warn(formatted)
        }
        break
      case LogLevel.ERROR:
        if (extra) {
          console.error(formatted, extra)
        } else {
          console.error(formatted)
        }
        break
    }
  }

  /**
   * 格式化消息
   */
  private formatMessage(entry: LogEntry): string {
    const parts = [`[${entry.module}] ${entry.message}`]
    
    if (entry.context) {
      const contextParts: string[] = []
      
      if (entry.context.sessionId) {
        contextParts.push(`Session: ${entry.context.sessionId}`)
      }
      if (entry.context.userId) {
        contextParts.push(`User: ${entry.context.userId}`)
      }
      if (entry.context.level !== undefined) {
        contextParts.push(`Level: ${entry.context.level}`)
      }
      if (entry.context.action) {
        contextParts.push(`Action: ${entry.context.action}`)
      }
      if (entry.context.duration !== undefined) {
        contextParts.push(`Duration: ${entry.context.duration}ms`)
      }
      if (entry.context.success !== undefined) {
        contextParts.push(`Success: ${entry.context.success}`)
      }
      
      if (contextParts.length > 0) {
        parts.push(` | ${contextParts.join(', ')}`)
      }
    }
    
    return parts.join('')
  }
}

/**
 * 日志存储管理器
 */
export class LogStorage {
  private static logs: LogEntry[] = []

  /**
   * 添加日志
   */
  static add(entry: LogEntry, maxSize: number = 1000): void {
    this.logs.push(entry)
    
    // 限制大小
    if (this.logs.length > maxSize) {
      this.logs = this.logs.slice(-maxSize)
    }
  }

  /**
   * 获取所有日志
   */
  static getAll(): LogEntry[] {
    return [...this.logs]
  }

  /**
   * 按模块筛选
   */
  static getByModule(module: string): LogEntry[] {
    return this.logs.filter(log => log.module === module)
  }

  /**
   * 按会话筛选
   */
  static getBySession(sessionId: string): LogEntry[] {
    return this.logs.filter(log => log.context?.sessionId === sessionId)
  }

  /**
   * 按级别筛选（包含更高级别）
   */
  static getByLevel(minLevel: LogLevel): LogEntry[] {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
    const minIndex = levels.indexOf(minLevel)
    
    return this.logs.filter(log => {
      const logIndex = levels.indexOf(log.level)
      return logIndex >= minIndex
    })
  }

  /**
   * 获取统计信息
   */
  static getStats(): LogStats {
    const stats: LogStats = {
      total: this.logs.length,
      byLevel: {
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 0,
        [LogLevel.WARN]: 0,
        [LogLevel.ERROR]: 0
      },
      modules: [],
      sessions: []
    }

    const moduleSet = new Set<string>()
    const sessionSet = new Set<string>()
    let totalDuration = 0
    let durationCount = 0

    this.logs.forEach(log => {
      // 级别统计
      stats.byLevel[log.level]++
      
      // 模块统计
      moduleSet.add(log.module)
      
      // 会话统计
      if (log.context?.sessionId) {
        sessionSet.add(log.context.sessionId)
      }
      
      // 耗时统计
      if (log.context?.duration) {
        totalDuration += log.context.duration
        durationCount++
      }
    })

    stats.modules = Array.from(moduleSet)
    stats.sessions = Array.from(sessionSet)
    
    if (durationCount > 0) {
      stats.avgDuration = totalDuration / durationCount
    }

    return stats
  }

  /**
   * 清空日志
   */
  static clear(): void {
    this.logs = []
  }

  /**
   * 清理旧日志
   */
  static cleanup(maxAge: number): void {
    const cutoff = Date.now() - maxAge
    this.logs = this.logs.filter(log => log.timestamp > cutoff)
  }

  /**
   * 清理特定会话
   */
  static clearSession(sessionId: string): void {
    this.logs = this.logs.filter(log => log.context?.sessionId !== sessionId)
  }

  /**
   * 导出日志
   */
  static export(): string {
    return JSON.stringify({
      logs: this.logs,
      exportedAt: Date.now(),
      totalCount: this.logs.length
    }, null, 2)
  }

  /**
   * 导入日志
   */
  static import(data: string): void {
    try {
      const parsed = JSON.parse(data)
      if (Array.isArray(parsed.logs)) {
        this.logs = parsed.logs
      }
    } catch (error) {
      console.error('Failed to import logs:', error)
    }
  }
}

/**
 * 创建模块日志记录器
 */
export function createLogger(module: string, config?: Partial<LoggerConfig>): SocraticLogger {
  return new SocraticLogger({
    module,
    ...config
  })
}

/**
 * 全局日志实例（用于快速调试）
 */
export const globalLogger = createLogger('socratic-global', {
  level: LogLevel.DEBUG
})

/**
 * 性能监控辅助函数
 */
export function measurePerformance<T>(
  logger: SocraticLogger,
  action: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const timer = logger.startTimer(action)
  
  try {
    const result = fn()
    
    if (result instanceof Promise) {
      return result
        .then(value => {
          timer.end(`${action} completed`, true)
          return value
        })
        .catch(error => {
          timer.end(`${action} failed: ${error.message}`, false)
          throw error
        })
    }
    
    timer.end(`${action} completed`, true)
    return result
  } catch (error) {
    timer.end(`${action} failed: ${(error as Error).message}`, false)
    throw error
  }
}

/**
 * 导出便捷方法
 */
export const logger = {
  create: createLogger,
  global: globalLogger,
  storage: LogStorage,
  measure: measurePerformance
}