/**
 * 日志存储管理器
 * 迁移自 lib/utils/socratic-logger.ts
 */

import { LogLevel, LogEntry, LogContext } from '../types/socratic';

/**
 * 日志统计接口
 */
export interface LogStats {
  /** 总日志数 */
  total: number;
  /** 按级别统计 */
  byLevel: Record<LogLevel, number>;
  /** 模块列表 */
  modules: string[];
  /** 会话列表 */
  sessions: string[];
  /** 平均响应时间 */
  avgDuration?: number;
}

/**
 * 日志存储管理器
 */
export class LogStorage {
  private static logs: LogEntry[] = [];

  /**
   * 添加日志
   */
  static add(entry: LogEntry, maxSize: number = 1000): void {
    this.logs.push(entry);

    // 限制大小
    if (this.logs.length > maxSize) {
      this.logs = this.logs.slice(-maxSize);
    }
  }

  /**
   * 获取所有日志
   */
  static getAll(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 按模块筛选
   */
  static getByModule(module: string): LogEntry[] {
    return this.logs.filter(log => log.module === module);
  }

  /**
   * 按会话筛选
   */
  static getBySession(sessionId: string): LogEntry[] {
    return this.logs.filter(log => log.context?.sessionId === sessionId);
  }

  /**
   * 按级别筛选（包含更高级别）
   */
  static getByLevel(minLevel: LogLevel): LogEntry[] {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const minIndex = levels.indexOf(minLevel);

    return this.logs.filter(log => {
      const logIndex = levels.indexOf(log.level);
      return logIndex >= minIndex;
    });
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
    };

    const moduleSet = new Set<string>();
    const sessionSet = new Set<string>();
    let totalDuration = 0;
    let durationCount = 0;

    this.logs.forEach(log => {
      // 级别统计
      stats.byLevel[log.level]++;

      // 模块统计
      moduleSet.add(log.module);

      // 会话统计
      if (log.context?.sessionId) {
        sessionSet.add(log.context.sessionId);
      }

      // 耗时统计
      if (log.context?.duration) {
        totalDuration += log.context.duration;
        durationCount++;
      }
    });

    stats.modules = Array.from(moduleSet);
    stats.sessions = Array.from(sessionSet);

    if (durationCount > 0) {
      stats.avgDuration = totalDuration / durationCount;
    }

    return stats;
  }

  /**
   * 清空日志
   */
  static clear(): void {
    this.logs = [];
  }

  /**
   * 清理旧日志
   */
  static cleanup(maxAge: number): void {
    const cutoff = Date.now() - maxAge;
    this.logs = this.logs.filter(log => log.timestamp > cutoff);
  }

  /**
   * 清理特定会话
   */
  static clearSession(sessionId: string): void {
    this.logs = this.logs.filter(log => log.context?.sessionId !== sessionId);
  }

  /**
   * 导出日志
   */
  static export(): string {
    return JSON.stringify({
      logs: this.logs,
      exportedAt: Date.now(),
      totalCount: this.logs.length
    }, null, 2);
  }

  /**
   * 导入日志
   */
  static import(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed.logs)) {
        this.logs = parsed.logs;
      }
    } catch (error) {
      console.error('Failed to import logs:', error);
    }
  }
}