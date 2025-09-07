/**
 * 统一日志管理工具
 * 提供客户端和服务器端的日志记录功能
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  enabled: boolean;
  level: LogLevel;
  showTimestamp: boolean;
  showLocation: boolean;
  prefix?: string;
}

class Logger {
  private config: LogConfig;
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  constructor(config?: Partial<LogConfig>) {
    this.config = {
      enabled: process.env.NODE_ENV !== 'production',
      level: 'debug',
      showTimestamp: true,
      showLocation: true,
      prefix: '🔍',
      ...config
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return this.levels[level] >= this.levels[this.config.level];
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const parts: string[] = [];
    
    // 添加时间戳
    if (this.config.showTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }
    
    // 添加日志级别
    const levelEmojis = {
      debug: '🐛',
      info: '📘',
      warn: '⚠️',
      error: '❌'
    };
    parts.push(`${levelEmojis[level]} ${level.toUpperCase()}`);
    
    // 添加前缀
    if (this.config.prefix) {
      parts.push(this.config.prefix);
    }
    
    // 添加消息
    parts.push(message);
    
    return parts.join(' ');
  }

  private getCallerLocation(): string {
    const error = new Error();
    const stack = error.stack?.split('\n')[3]; // 获取调用栈的第3行
    if (stack) {
      const match = stack.match(/\((.+)\)/);
      if (match) {
        return match[1];
      }
    }
    return 'unknown';
  }

  debug(message: string, data?: any): void {
    if (!this.shouldLog('debug')) return;
    
    const formattedMessage = this.formatMessage('debug', message, data);
    
    if (data) {
      console.log(formattedMessage, data);
    } else {
      console.log(formattedMessage);
    }
    
    if (this.config.showLocation) {
      console.log('  📍 位置:', this.getCallerLocation());
    }
  }

  info(message: string, data?: any): void {
    if (!this.shouldLog('info')) return;
    
    const formattedMessage = this.formatMessage('info', message, data);
    
    if (data) {
      console.info(formattedMessage, data);
    } else {
      console.info(formattedMessage);
    }
  }

  warn(message: string, data?: any): void {
    if (!this.shouldLog('warn')) return;
    
    const formattedMessage = this.formatMessage('warn', message, data);
    
    if (data) {
      console.warn(formattedMessage, data);
    } else {
      console.warn(formattedMessage);
    }
  }

  error(message: string, error?: any): void {
    if (!this.shouldLog('error')) return;
    
    const formattedMessage = this.formatMessage('error', message, error);
    
    if (error) {
      console.error(formattedMessage);
      console.error('  错误详情:', error);
      if (error.stack) {
        console.error('  调用栈:', error.stack);
      }
    } else {
      console.error(formattedMessage);
    }
  }

  // 分组日志
  group(label: string): void {
    if (!this.config.enabled) return;
    console.group(`📦 ${label}`);
  }

  groupEnd(): void {
    if (!this.config.enabled) return;
    console.groupEnd();
  }

  // 表格日志
  table(data: any[], columns?: string[]): void {
    if (!this.config.enabled) return;
    console.log('📊 数据表格:');
    console.table(data, columns);
  }

  // 性能计时
  time(label: string): void {
    if (!this.config.enabled) return;
    console.time(`⏱️ ${label}`);
  }

  timeEnd(label: string): void {
    if (!this.config.enabled) return;
    console.timeEnd(`⏱️ ${label}`);
  }

  // 断言
  assert(condition: boolean, message: string): void {
    if (!this.config.enabled) return;
    console.assert(condition, `❗ ${message}`);
  }

  // 清空控制台
  clear(): void {
    if (!this.config.enabled) return;
    console.clear();
  }

  // 创建子日志器
  createChild(prefix: string, config?: Partial<LogConfig>): Logger {
    return new Logger({
      ...this.config,
      ...config,
      prefix: `${this.config.prefix} ${prefix}`
    });
  }
}

// 创建默认日志器实例
export const logger = new Logger({
  prefix: '🏛️ 法律教育平台'
});

// 创建专门的日志器
export const apiLogger = logger.createChild('API', { prefix: '🌐' });
export const uiLogger = logger.createChild('UI', { prefix: '🎨' });
export const storeLogger = logger.createChild('Store', { prefix: '📦' });
export const aiLogger = logger.createChild('AI', { prefix: '🤖' });

// 导出类型
export type { LogLevel, LogConfig };
export { Logger };