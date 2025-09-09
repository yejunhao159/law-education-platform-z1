/**
 * 日志聚合服务
 * 负责收集、分析和报告日志数据
 */

import { StructuredLogger, LogContext, LogLevel } from './structured-logger';
import { EventEmitter } from 'events';
import { createLogger } from '../utils/socratic-logger';

const logger = createLogger('log-aggregator');

export interface LogPattern {
  id: string;
  name: string;
  pattern: RegExp;
  severity: 'info' | 'warning' | 'error' | 'critical';
  action?: 'alert' | 'aggregate' | 'ignore';
  threshold?: number;
  timeWindow?: number;
}

export interface LogMetrics {
  timestamp: Date;
  totalCount: number;
  errorCount: number;
  warningCount: number;
  errorRate: number;
  topErrors: Array<{ message: string; count: number }>;
  topModules: Array<{ module: string; count: number }>;
  averageResponseTime?: number;
  p95ResponseTime?: number;
  p99ResponseTime?: number;
}

export interface AlertConfig {
  errorRateThreshold: number;
  errorCountThreshold: number;
  responseTimeThreshold: number;
  checkInterval: number;
  cooldownPeriod: number;
}

export class LogAggregator extends EventEmitter {
  private static instance: LogAggregator;
  private logs: LogContext[] = [];
  private patterns: Map<string, LogPattern> = new Map();
  private alerts: Map<string, Date> = new Map();
  private metrics: LogMetrics[] = [];
  private aggregationInterval: NodeJS.Timeout | null = null;
  private alertCheckInterval: NodeJS.Timeout | null = null;
  
  private config: AlertConfig = {
    errorRateThreshold: 0.05, // 5%错误率
    errorCountThreshold: 100,  // 100个错误
    responseTimeThreshold: 5000, // 5秒
    checkInterval: 60000,       // 1分钟检查一次
    cooldownPeriod: 300000     // 5分钟冷却期
  };

  private constructor() {
    super();
    this.initializePatterns();
    this.startAggregation();
    this.startAlertChecking();
  }

  public static getInstance(): LogAggregator {
    if (!LogAggregator.instance) {
      LogAggregator.instance = new LogAggregator();
    }
    return LogAggregator.instance;
  }

  /**
   * 初始化日志模式
   */
  private initializePatterns() {
    // 错误模式
    this.addPattern({
      id: 'null-reference',
      name: 'Null Reference Error',
      pattern: /Cannot read prop(erty|erties) .* of (null|undefined)/i,
      severity: 'error',
      action: 'aggregate'
    });

    this.addPattern({
      id: 'network-error',
      name: 'Network Error',
      pattern: /(network|connection|timeout|ECONNREFUSED|ETIMEDOUT)/i,
      severity: 'error',
      action: 'aggregate',
      threshold: 10,
      timeWindow: 60000
    });

    this.addPattern({
      id: 'auth-failure',
      name: 'Authentication Failure',
      pattern: /(unauthorized|authentication failed|invalid token|403|401)/i,
      severity: 'warning',
      action: 'alert',
      threshold: 5,
      timeWindow: 60000
    });

    this.addPattern({
      id: 'rate-limit',
      name: 'Rate Limit Exceeded',
      pattern: /(rate limit|too many requests|429)/i,
      severity: 'warning',
      action: 'aggregate'
    });

    this.addPattern({
      id: 'memory-leak',
      name: 'Potential Memory Leak',
      pattern: /(memory leak|heap out of memory|maximum call stack)/i,
      severity: 'critical',
      action: 'alert',
      threshold: 1
    });

    this.addPattern({
      id: 'sql-injection',
      name: 'SQL Injection Attempt',
      pattern: /(DROP TABLE|DELETE FROM|UNION SELECT|<script|javascript:)/i,
      severity: 'critical',
      action: 'alert',
      threshold: 1
    });

    this.addPattern({
      id: 'slow-query',
      name: 'Slow Query/Operation',
      pattern: /took (\d+)ms/i,
      severity: 'warning',
      action: 'aggregate'
    });
  }

  /**
   * 开始日志聚合
   */
  private startAggregation() {
    this.aggregationInterval = setInterval(() => {
      this.aggregate();
    }, 60000); // 每分钟聚合一次
  }

  /**
   * 开始告警检查
   */
  private startAlertChecking() {
    this.alertCheckInterval = setInterval(() => {
      this.checkAlerts();
    }, this.config.checkInterval);
  }

  /**
   * 添加日志模式
   */
  public addPattern(pattern: LogPattern) {
    this.patterns.set(pattern.id, pattern);
  }

  /**
   * 摄入日志
   */
  public ingest(log: LogContext) {
    this.logs.push(log);
    
    // 保持最近1小时的日志
    const oneHourAgo = Date.now() - 3600000;
    this.logs = this.logs.filter(l => 
      new Date(l.timestamp).getTime() > oneHourAgo
    );
    
    // 检查模式匹配
    this.checkPatterns(log);
    
    // 实时检查严重错误
    if (log.level === LogLevel.ERROR) {
      this.checkCriticalError(log);
    }
  }

  /**
   * 批量摄入日志
   */
  public ingestBatch(logs: LogContext[]) {
    for (const log of logs) {
      this.ingest(log);
    }
  }

  /**
   * 检查模式匹配
   */
  private checkPatterns(log: LogContext) {
    const message = log.message + ' ' + JSON.stringify(log.metadata || {});
    
    for (const pattern of this.patterns.values()) {
      if (pattern.pattern.test(message)) {
        this.handlePatternMatch(pattern, log);
      }
    }
  }

  /**
   * 处理模式匹配
   */
  private handlePatternMatch(pattern: LogPattern, log: LogContext) {
    logger.debug(`Pattern matched: ${pattern.name}`, {
      patternId: pattern.id,
      log: log.message
    });
    
    // 检查阈值
    if (pattern.threshold && pattern.timeWindow) {
      const recentMatches = this.countPatternMatches(
        pattern.id,
        pattern.timeWindow
      );
      
      if (recentMatches >= pattern.threshold) {
        this.triggerPatternAlert(pattern, recentMatches);
      }
    }
    
    // 执行动作
    switch (pattern.action) {
      case 'alert':
        this.sendAlert({
          type: 'pattern',
          pattern: pattern.name,
          severity: pattern.severity,
          message: log.message,
          timestamp: log.timestamp
        });
        break;
        
      case 'aggregate':
        // 聚合处理在aggregate方法中进行
        break;
        
      case 'ignore':
        // 忽略
        break;
    }
  }

  /**
   * 统计模式匹配次数
   */
  private countPatternMatches(patternId: string, timeWindow: number): number {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return 0;
    
    const windowStart = Date.now() - timeWindow;
    let count = 0;
    
    for (const log of this.logs) {
      if (new Date(log.timestamp).getTime() < windowStart) continue;
      
      const message = log.message + ' ' + JSON.stringify(log.metadata || {});
      if (pattern.pattern.test(message)) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * 触发模式告警
   */
  private triggerPatternAlert(pattern: LogPattern, matchCount: number) {
    const alertKey = `pattern_${pattern.id}`;
    
    if (this.isInCooldown(alertKey)) {
      return;
    }
    
    this.sendAlert({
      type: 'pattern_threshold',
      pattern: pattern.name,
      severity: pattern.severity,
      threshold: pattern.threshold,
      actual: matchCount,
      timeWindow: pattern.timeWindow,
      message: `Pattern "${pattern.name}" exceeded threshold: ${matchCount}/${pattern.threshold}`
    });
    
    this.alerts.set(alertKey, new Date());
  }

  /**
   * 检查严重错误
   */
  private checkCriticalError(log: LogContext) {
    if (log.message.toLowerCase().includes('fatal') ||
        log.message.toLowerCase().includes('critical')) {
      this.sendAlert({
        type: 'critical_error',
        severity: 'critical',
        message: log.message,
        module: log.module,
        timestamp: log.timestamp,
        metadata: log.metadata
      });
    }
  }

  /**
   * 聚合日志数据
   */
  private aggregate() {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60000); // 最近1分钟
    
    const recentLogs = this.logs.filter(l => 
      new Date(l.timestamp) >= windowStart
    );
    
    if (recentLogs.length === 0) return;
    
    // 计算指标
    const metrics: LogMetrics = {
      timestamp: now,
      totalCount: recentLogs.length,
      errorCount: recentLogs.filter(l => l.level === LogLevel.ERROR).length,
      warningCount: recentLogs.filter(l => l.level === LogLevel.WARN).length,
      errorRate: 0,
      topErrors: [],
      topModules: []
    };
    
    // 计算错误率
    metrics.errorRate = metrics.totalCount > 0 
      ? metrics.errorCount / metrics.totalCount 
      : 0;
    
    // 统计Top错误
    const errorCounts = new Map<string, number>();
    for (const log of recentLogs) {
      if (log.level === LogLevel.ERROR) {
        const key = log.message.substring(0, 100);
        errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
      }
    }
    
    metrics.topErrors = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }));
    
    // 统计Top模块
    const moduleCounts = new Map<string, number>();
    for (const log of recentLogs) {
      moduleCounts.set(log.module, (moduleCounts.get(log.module) || 0) + 1);
    }
    
    metrics.topModules = Array.from(moduleCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([module, count]) => ({ module, count }));
    
    // 计算响应时间（如果有性能数据）
    const responseTimes: number[] = [];
    for (const log of recentLogs) {
      if (log.performance?.duration) {
        responseTimes.push(log.performance.duration);
      }
    }
    
    if (responseTimes.length > 0) {
      responseTimes.sort((a, b) => a - b);
      metrics.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      metrics.p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
      metrics.p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)];
    }
    
    // 保存指标
    this.metrics.push(metrics);
    
    // 保持最近24小时的指标
    const dayAgo = new Date(now.getTime() - 86400000);
    this.metrics = this.metrics.filter(m => m.timestamp >= dayAgo);
    
    // 发送指标事件
    this.emit('metrics', metrics);
    
    logger.debug('日志聚合完成', {
      totalLogs: metrics.totalCount,
      errorRate: `${(metrics.errorRate * 100).toFixed(2)}%`
    });
  }

  /**
   * 检查告警条件
   */
  private checkAlerts() {
    const latestMetrics = this.metrics[this.metrics.length - 1];
    if (!latestMetrics) return;
    
    // 检查错误率
    if (latestMetrics.errorRate > this.config.errorRateThreshold) {
      this.sendAlert({
        type: 'high_error_rate',
        severity: 'error',
        threshold: this.config.errorRateThreshold,
        actual: latestMetrics.errorRate,
        message: `错误率过高: ${(latestMetrics.errorRate * 100).toFixed(2)}%`
      });
    }
    
    // 检查错误数量
    if (latestMetrics.errorCount > this.config.errorCountThreshold) {
      this.sendAlert({
        type: 'high_error_count',
        severity: 'warning',
        threshold: this.config.errorCountThreshold,
        actual: latestMetrics.errorCount,
        message: `错误数量过多: ${latestMetrics.errorCount}`
      });
    }
    
    // 检查响应时间
    if (latestMetrics.p95ResponseTime && 
        latestMetrics.p95ResponseTime > this.config.responseTimeThreshold) {
      this.sendAlert({
        type: 'slow_response',
        severity: 'warning',
        threshold: this.config.responseTimeThreshold,
        actual: latestMetrics.p95ResponseTime,
        message: `响应时间过慢: P95=${latestMetrics.p95ResponseTime}ms`
      });
    }
  }

  /**
   * 发送告警
   */
  private sendAlert(alert: any) {
    const alertKey = `${alert.type}_${alert.severity}`;
    
    if (this.isInCooldown(alertKey)) {
      return;
    }
    
    this.alerts.set(alertKey, new Date());
    this.emit('alert', alert);
    
    logger.warn('告警触发', alert);
  }

  /**
   * 检查是否在冷却期
   */
  private isInCooldown(alertKey: string): boolean {
    const lastAlert = this.alerts.get(alertKey);
    if (!lastAlert) return false;
    
    return Date.now() - lastAlert.getTime() < this.config.cooldownPeriod;
  }

  /**
   * 获取日志统计
   */
  public getStatistics(timeRange?: { start: Date; end: Date }): {
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    errorRate: number;
    topErrors: Array<{ message: string; count: number }>;
    topModules: Array<{ module: string; count: number }>;
    timeDistribution: Array<{ time: string; count: number }>;
  } {
    let logsToAnalyze = this.logs;
    
    if (timeRange) {
      logsToAnalyze = this.logs.filter(l => {
        const logTime = new Date(l.timestamp);
        return logTime >= timeRange.start && logTime <= timeRange.end;
      });
    }
    
    const stats = {
      totalLogs: logsToAnalyze.length,
      errorCount: logsToAnalyze.filter(l => l.level === LogLevel.ERROR).length,
      warningCount: logsToAnalyze.filter(l => l.level === LogLevel.WARN).length,
      errorRate: 0,
      topErrors: [] as Array<{ message: string; count: number }>,
      topModules: [] as Array<{ module: string; count: number }>,
      timeDistribution: [] as Array<{ time: string; count: number }>
    };
    
    stats.errorRate = stats.totalLogs > 0 
      ? stats.errorCount / stats.totalLogs 
      : 0;
    
    // 统计Top错误
    const errorMap = new Map<string, number>();
    for (const log of logsToAnalyze) {
      if (log.level === LogLevel.ERROR) {
        const key = log.message.substring(0, 100);
        errorMap.set(key, (errorMap.get(key) || 0) + 1);
      }
    }
    
    stats.topErrors = Array.from(errorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }));
    
    // 统计Top模块
    const moduleMap = new Map<string, number>();
    for (const log of logsToAnalyze) {
      moduleMap.set(log.module, (moduleMap.get(log.module) || 0) + 1);
    }
    
    stats.topModules = Array.from(moduleMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([module, count]) => ({ module, count }));
    
    // 时间分布（按小时）
    const timeMap = new Map<string, number>();
    for (const log of logsToAnalyze) {
      const hour = new Date(log.timestamp).toISOString().substring(0, 13);
      timeMap.set(hour, (timeMap.get(hour) || 0) + 1);
    }
    
    stats.timeDistribution = Array.from(timeMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([time, count]) => ({ time, count }));
    
    return stats;
  }

  /**
   * 获取最近的指标
   */
  public getRecentMetrics(count: number = 10): LogMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * 清理旧数据
   */
  public cleanup(olderThan: Date) {
    this.logs = this.logs.filter(l => 
      new Date(l.timestamp) > olderThan
    );
    
    this.metrics = this.metrics.filter(m => 
      m.timestamp > olderThan
    );
  }

  /**
   * 停止服务
   */
  public stop() {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }
    
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
    }
    
    this.removeAllListeners();
    logger.info('日志聚合服务已停止');
  }
}

// 导出单例实例
export const logAggregator = LogAggregator.getInstance();