/**
 * 统一日志管理工具
 * 迁移自 lib/utils/logger.ts
 * 提供客户端和服务器端的日志记录功能
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogConfig {
  enabled: boolean
  level: LogLevel
  showTimestamp: boolean
  showLocation: boolean
  prefix?: string
  context?: string
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  context?: string
  data?: unknown
  location?: string
}

/**
 * 日志记录器类
 */
export class Logger {
  private config: LogConfig
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  }

  constructor(context?: string, config?: Partial<LogConfig>) {
    this.config = {
      enabled: process.env.NODE_ENV !== 'production',
      level: (process.env.LOG_LEVEL as LogLevel) || 'debug',
      showTimestamp: true,
      showLocation: true,
      prefix: '🔍',
      context,
      ...config
    }
  }

  /**
   * 检查是否应该记录该级别的日志
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false
    return this.levels[level] >= this.levels[this.config.level]
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const parts: string[] = []

    // 添加时间戳
    if (this.config.showTimestamp) {
      parts.push(`[${new Date().toISOString()}]`)
    }

    // 添加日志级别
    const levelEmojis = {
      debug: '🐛',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    }
    parts.push(`${levelEmojis[level]} [${level.toUpperCase()}]`)

    // 添加上下文
    if (this.config.context) {
      parts.push(`[${this.config.context}]`)
    }

    // 添加前缀
    if (this.config.prefix) {
      parts.push(this.config.prefix)
    }

    // 添加消息
    parts.push(message)

    // 添加数据
    if (data !== undefined) {
      if (typeof data === 'object') {
        parts.push('\n' + JSON.stringify(data, null, 2))
      } else {
        parts.push(String(data))
      }
    }

    return parts.join(' ')
  }

  /**
   * 获取调用位置信息
   */
  private getLocation(): string | undefined {
    if (!this.config.showLocation) return undefined

    const stack = new Error().stack
    if (!stack) return undefined

    const lines = stack.split('\n')
    // 跳过 Error、getLocation、和调用的日志方法
    const callerLine = lines[4]
    if (!callerLine) return undefined

    const match = callerLine.match(/at\s+(.*)\s+\((.*):(\d+):(\d+)\)/)
    if (match) {
      const [, funcName, file, line] = match
      if (file) {
        const fileName = file.split('/').pop()
        return `${fileName}:${line} (${funcName})`
      }
    }

    return undefined
  }

  /**
   * 创建日志条目
   */
  private createLogEntry(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      level,
      message,
      timestamp: new Date(),
      context: this.config.context,
      data,
      location: this.getLocation()
    }
  }

  /**
   * 输出日志
   */
  private output(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return

    const formattedMessage = this.formatMessage(level, message, data)
    const logEntry = this.createLogEntry(level, message, data)

    // 控制台输出
    switch (level) {
      case 'debug':
        console.debug(formattedMessage)
        break
      case 'info':
        console.info(formattedMessage)
        break
      case 'warn':
        console.warn(formattedMessage)
        break
      case 'error':
        console.error(formattedMessage)
        break
    }

    // 触发日志事件（用于外部监听）
    this.emit('log', logEntry)
  }

  /**
   * Debug级别日志
   */
  debug(message: string, data?: unknown): void {
    this.output('debug', message, data)
  }

  /**
   * Info级别日志
   */
  info(message: string, data?: unknown): void {
    this.output('info', message, data)
  }

  /**
   * Warning级别日志
   */
  warn(message: string, data?: unknown): void {
    this.output('warn', message, data)
  }

  /**
   * Error级别日志
   */
  error(message: string, error?: Error | unknown): void {
    let errorData: unknown = error

    if (error instanceof Error) {
      errorData = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      }
    }

    this.output('error', message, errorData)
  }

  /**
   * 带性能计时的日志
   */
  time<T>(label: string, fn: () => T): T
  time<T>(label: string, fn: () => Promise<T>): Promise<T>
  time<T>(label: string, fn: () => T | Promise<T>): T | Promise<T> {
    const start = Date.now()
    this.debug(`⏱️ 开始计时: ${label}`)

    const logEnd = (result?: unknown) => {
      const duration = Date.now() - start
      this.info(`⏱️ 计时结束: ${label} (${duration}ms)`, result)
    }

    try {
      const result = fn()

      if (result instanceof Promise) {
        return result
          .then((value) => {
            logEnd(value)
            return value
          })
          .catch((error) => {
            this.error(`⏱️ 计时失败: ${label}`, error)
            throw error
          })
      } else {
        logEnd(result)
        return result
      }
    } catch (error) {
      this.error(`⏱️ 计时失败: ${label}`, error)
      throw error
    }
  }

  /**
   * 创建子日志器
   */
  child(context: string, config?: Partial<LogConfig>): Logger {
    const childContext = this.config.context
      ? `${this.config.context}:${context}`
      : context

    return new Logger(childContext, {
      ...this.config,
      ...config,
      context: childContext
    })
  }

  /**
   * 更新配置
   */
  setConfig(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取当前配置
   */
  getConfig(): LogConfig {
    return { ...this.config }
  }

  // 事件发射器功能
  private listeners: Map<string, Array<(entry: LogEntry) => void>> = new Map()

  private emit(event: string, data: LogEntry): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error('日志事件处理器错误:', error)
        }
      })
    }
  }

  /**
   * 监听日志事件
   */
  on(event: 'log', handler: (entry: LogEntry) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(handler)
  }

  /**
   * 移除事件监听器
   */
  off(event: 'log', handler: (entry: LogEntry) => void): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index !== -1) {
        handlers.splice(index, 1)
      }
    }
  }
}

/**
 * 创建日志器实例
 */
export function createLogger(context?: string, config?: Partial<LogConfig>): Logger {
  return new Logger(context, config)
}

/**
 * 默认日志器实例
 */
export const logger = createLogger('shared')

/**
 * 日志级别工具
 */
export const LogLevels = {
  DEBUG: 'debug' as const,
  INFO: 'info' as const,
  WARN: 'warn' as const,
  ERROR: 'error' as const,

  /**
   * 检查级别优先级
   */
  isAtLeast(current: LogLevel, target: LogLevel): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 }
    return levels[current] >= levels[target]
  },

  /**
   * 从字符串解析日志级别
   */
  fromString(level: string): LogLevel {
    const normalized = level.toLowerCase()
    if (['debug', 'info', 'warn', 'error'].includes(normalized)) {
      return normalized as LogLevel
    }
    return 'info'
  }
}