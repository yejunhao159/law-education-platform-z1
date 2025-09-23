/**
 * AI服务性能监控和成本管理
 * 监控AI调用性能、成本消耗、错误率等关键指标
 * DeepPractice Standards Compliant
 */

import { EventEmitter } from 'events';

export interface PerformanceMetrics {
  // 请求统计
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;

  // Token使用
  totalTokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  avgTokensPerRequest: number;

  // 成本分析
  totalCost: number;
  avgCostPerRequest: number;
  costByProvider: Record<string, number>;
  dailyCosts: Record<string, number>; // 按日期统计

  // 错误分析
  errorRate: number;
  errorsByType: Record<string, number>;
  lastErrors: ErrorRecord[];

  // 提供商分析
  providerUsage: Record<string, ProviderMetrics>;
  fallbackCount: number;
}

export interface ProviderMetrics {
  requests: number;
  successRate: number;
  avgResponseTime: number;
  totalCost: number;
  tokensUsed: number;
  lastUsed: Date;
  healthScore: number; // 0-100健康评分
}

export interface ErrorRecord {
  timestamp: Date;
  provider: string;
  errorType: string;
  message: string;
  requestId?: string;
  cost?: number;
}

export interface AlertConfig {
  // 成本告警
  dailyCostThreshold: number;
  hourlyCostThreshold: number;
  unusualSpendingMultiplier: number; // 异常消费倍数

  // 性能告警
  maxResponseTime: number;
  minSuccessRate: number;
  maxErrorRate: number;

  // 使用量告警
  maxTokensPerHour: number;
  maxRequestsPerMinute: number;

  // 启用状态
  enableCostAlerts: boolean;
  enablePerformanceAlerts: boolean;
  enableUsageAlerts: boolean;
}

export interface Alert {
  id: string;
  type: 'cost' | 'performance' | 'usage' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  data?: any;
  acknowledged: boolean;
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics;
  private alertConfig: AlertConfig;
  private alerts: Alert[] = [];
  private requestHistory: Array<{
    timestamp: Date;
    provider: string;
    duration: number;
    tokens: number;
    cost: number;
    success: boolean;
    error?: string;
  }> = [];

  private readonly MAX_HISTORY_SIZE = 10000;
  private readonly MAX_ERROR_RECORDS = 100;
  private readonly MAX_ALERTS = 50;

  constructor(alertConfig?: Partial<AlertConfig>) {
    super();

    this.metrics = this.initializeMetrics();

    this.alertConfig = {
      dailyCostThreshold: 5.00,
      hourlyCostThreshold: 0.50,
      unusualSpendingMultiplier: 3.0,
      maxResponseTime: 30000,
      minSuccessRate: 0.95,
      maxErrorRate: 0.05,
      maxTokensPerHour: 100000,
      maxRequestsPerMinute: 60,
      enableCostAlerts: true,
      enablePerformanceAlerts: true,
      enableUsageAlerts: true,
      ...alertConfig
    };

    // 定期清理历史数据
    setInterval(() => this.cleanupHistory(), 3600000); // 每小时清理一次
  }

  /**
   * 初始化指标
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      totalTokensUsed: 0,
      inputTokens: 0,
      outputTokens: 0,
      avgTokensPerRequest: 0,
      totalCost: 0,
      avgCostPerRequest: 0,
      costByProvider: {},
      dailyCosts: {},
      errorRate: 0,
      errorsByType: {},
      lastErrors: [],
      providerUsage: {},
      fallbackCount: 0
    };
  }

  /**
   * 记录AI请求
   */
  recordRequest(data: {
    provider: string;
    duration: number;
    tokens: {
      input: number;
      output: number;
      total: number;
    };
    cost: number;
    success: boolean;
    error?: string;
    fallback?: boolean;
  }) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // 更新基础指标
    this.metrics.totalRequests++;

    if (data.success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
      this.recordError(data.provider, data.error || 'Unknown error');
    }

    if (data.fallback) {
      this.metrics.fallbackCount++;
    }

    // 更新响应时间指标
    this.updateResponseTimeMetrics(data.duration);

    // 更新Token指标
    this.updateTokenMetrics(data.tokens);

    // 更新成本指标
    this.updateCostMetrics(data.provider, data.cost, today);

    // 更新提供商指标
    this.updateProviderMetrics(data.provider, data);

    // 记录历史
    this.requestHistory.push({
      timestamp: now,
      provider: data.provider,
      duration: data.duration,
      tokens: data.tokens.total,
      cost: data.cost,
      success: data.success,
      error: data.error
    });

    // 限制历史记录大小
    if (this.requestHistory.length > this.MAX_HISTORY_SIZE) {
      this.requestHistory.shift();
    }

    // 检查告警条件
    this.checkAlerts();

    // 发出指标更新事件
    this.emit('metricsUpdated', this.metrics);
  }

  /**
   * 更新响应时间指标
   */
  private updateResponseTimeMetrics(duration: number) {
    const totalRequests = this.metrics.totalRequests;
    this.metrics.avgResponseTime =
      (this.metrics.avgResponseTime * (totalRequests - 1) + duration) / totalRequests;

    this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, duration);
    this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, duration);
  }

  /**
   * 更新Token指标
   */
  private updateTokenMetrics(tokens: { input: number; output: number; total: number }) {
    this.metrics.totalTokensUsed += tokens.total;
    this.metrics.inputTokens += tokens.input;
    this.metrics.outputTokens += tokens.output;
    this.metrics.avgTokensPerRequest = this.metrics.totalTokensUsed / this.metrics.totalRequests;
  }

  /**
   * 更新成本指标
   */
  private updateCostMetrics(provider: string, cost: number, today: string) {
    this.metrics.totalCost += cost;
    this.metrics.avgCostPerRequest = this.metrics.totalCost / this.metrics.totalRequests;

    // 按提供商统计
    this.metrics.costByProvider[provider] = (this.metrics.costByProvider[provider] || 0) + cost;

    // 按日期统计
    this.metrics.dailyCosts[today] = (this.metrics.dailyCosts[today] || 0) + cost;
  }

  /**
   * 更新提供商指标
   */
  private updateProviderMetrics(provider: string, data: any) {
    if (!this.metrics.providerUsage[provider]) {
      this.metrics.providerUsage[provider] = {
        requests: 0,
        successRate: 1.0,
        avgResponseTime: 0,
        totalCost: 0,
        tokensUsed: 0,
        lastUsed: new Date(),
        healthScore: 100
      };
    }

    const providerMetrics = this.metrics.providerUsage[provider];
    const prevRequests = providerMetrics.requests;

    providerMetrics.requests++;
    providerMetrics.lastUsed = new Date();
    providerMetrics.totalCost += data.cost;
    providerMetrics.tokensUsed += data.tokens.total;

    // 更新平均响应时间
    providerMetrics.avgResponseTime =
      (providerMetrics.avgResponseTime * prevRequests + data.duration) / providerMetrics.requests;

    // 更新成功率
    const successfulRequests = Math.floor(providerMetrics.successRate * prevRequests) + (data.success ? 1 : 0);
    providerMetrics.successRate = successfulRequests / providerMetrics.requests;

    // 更新健康评分
    this.updateProviderHealthScore(provider);
  }

  /**
   * 更新提供商健康评分
   */
  private updateProviderHealthScore(provider: string) {
    const metrics = this.metrics.providerUsage[provider];
    if (!metrics) return;

    let score = 100;

    // 成功率影响 (60%)
    score *= metrics.successRate;

    // 响应时间影响 (30%)
    const responseTimePenalty = Math.min(metrics.avgResponseTime / 10000, 1); // 10秒为基准
    score *= (1 - responseTimePenalty * 0.3);

    // 最近使用影响 (10%)
    const hoursSinceLastUse = (Date.now() - metrics.lastUsed.getTime()) / (1000 * 60 * 60);
    const recencyPenalty = Math.min(hoursSinceLastUse / 24, 1); // 24小时为基准
    score *= (1 - recencyPenalty * 0.1);

    metrics.healthScore = Math.max(0, Math.min(100, score));
  }

  /**
   * 记录错误
   */
  private recordError(provider: string, errorMessage: string) {
    const errorType = this.categorizeError(errorMessage);

    // 更新错误统计
    this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
    this.metrics.errorRate = this.metrics.failedRequests / this.metrics.totalRequests;

    // 记录错误详情
    const errorRecord: ErrorRecord = {
      timestamp: new Date(),
      provider,
      errorType,
      message: errorMessage,
      requestId: this.generateRequestId()
    };

    this.metrics.lastErrors.unshift(errorRecord);

    // 限制错误记录数量
    if (this.metrics.lastErrors.length > this.MAX_ERROR_RECORDS) {
      this.metrics.lastErrors = this.metrics.lastErrors.slice(0, this.MAX_ERROR_RECORDS);
    }
  }

  /**
   * 错误分类
   */
  private categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();

    if (message.includes('timeout') || message.includes('请求超时')) {
      return 'timeout';
    } else if (message.includes('rate limit') || message.includes('频率限制')) {
      return 'rate_limit';
    } else if (message.includes('auth') || message.includes('unauthorized') || message.includes('认证')) {
      return 'auth_error';
    } else if (message.includes('quota') || message.includes('配额')) {
      return 'quota_exceeded';
    } else if (message.includes('network') || message.includes('网络')) {
      return 'network_error';
    } else if (message.includes('server') || message.includes('服务器')) {
      return 'server_error';
    } else {
      return 'unknown_error';
    }
  }

  /**
   * 检查告警条件
   */
  private checkAlerts() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();

    // 成本告警
    if (this.alertConfig.enableCostAlerts) {
      this.checkCostAlerts(today, currentHour);
    }

    // 性能告警
    if (this.alertConfig.enablePerformanceAlerts) {
      this.checkPerformanceAlerts();
    }

    // 使用量告警
    if (this.alertConfig.enableUsageAlerts) {
      this.checkUsageAlerts(currentHour);
    }
  }

  /**
   * 检查成本告警
   */
  private checkCostAlerts(today: string, currentHour: number) {
    const dailyCost = this.metrics.dailyCosts[today] || 0;

    // 日成本告警
    if (dailyCost > this.alertConfig.dailyCostThreshold) {
      this.createAlert({
        type: 'cost',
        severity: 'high',
        title: '日成本超限',
        message: `今日成本 $${dailyCost.toFixed(4)} 已超过阈值 $${this.alertConfig.dailyCostThreshold}`,
        data: { dailyCost, threshold: this.alertConfig.dailyCostThreshold }
      });
    }

    // 小时成本告警
    const hourlyRequests = this.requestHistory.filter(r => {
      const requestHour = r.timestamp.getHours();
      const requestDate = r.timestamp.toISOString().split('T')[0];
      return requestDate === today && requestHour === currentHour;
    });

    const hourlyCost = hourlyRequests.reduce((sum, r) => sum + r.cost, 0);

    if (hourlyCost > this.alertConfig.hourlyCostThreshold) {
      this.createAlert({
        type: 'cost',
        severity: 'medium',
        title: '小时成本超限',
        message: `当前小时成本 $${hourlyCost.toFixed(4)} 已超过阈值 $${this.alertConfig.hourlyCostThreshold}`,
        data: { hourlyCost, threshold: this.alertConfig.hourlyCostThreshold }
      });
    }
  }

  /**
   * 检查性能告警
   */
  private checkPerformanceAlerts() {
    // 响应时间告警
    if (this.metrics.avgResponseTime > this.alertConfig.maxResponseTime) {
      this.createAlert({
        type: 'performance',
        severity: 'medium',
        title: '响应时间过长',
        message: `平均响应时间 ${this.metrics.avgResponseTime}ms 超过阈值 ${this.alertConfig.maxResponseTime}ms`,
        data: { avgResponseTime: this.metrics.avgResponseTime, threshold: this.alertConfig.maxResponseTime }
      });
    }

    // 成功率告警
    const successRate = this.metrics.successfulRequests / this.metrics.totalRequests;
    if (successRate < this.alertConfig.minSuccessRate) {
      this.createAlert({
        type: 'performance',
        severity: 'high',
        title: '成功率过低',
        message: `当前成功率 ${(successRate * 100).toFixed(2)}% 低于阈值 ${(this.alertConfig.minSuccessRate * 100).toFixed(2)}%`,
        data: { successRate, threshold: this.alertConfig.minSuccessRate }
      });
    }

    // 错误率告警
    if (this.metrics.errorRate > this.alertConfig.maxErrorRate) {
      this.createAlert({
        type: 'error',
        severity: 'high',
        title: '错误率过高',
        message: `当前错误率 ${(this.metrics.errorRate * 100).toFixed(2)}% 超过阈值 ${(this.alertConfig.maxErrorRate * 100).toFixed(2)}%`,
        data: { errorRate: this.metrics.errorRate, threshold: this.alertConfig.maxErrorRate }
      });
    }
  }

  /**
   * 检查使用量告警
   */
  private checkUsageAlerts(currentHour: number) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);

    // 计算过去一小时的使用量
    const recentRequests = this.requestHistory.filter(r => r.timestamp > oneHourAgo);
    const hourlyTokens = recentRequests.reduce((sum, r) => sum + r.tokens, 0);

    if (hourlyTokens > this.alertConfig.maxTokensPerHour) {
      this.createAlert({
        type: 'usage',
        severity: 'medium',
        title: '小时Token使用量过高',
        message: `过去一小时使用 ${hourlyTokens} tokens，超过阈值 ${this.alertConfig.maxTokensPerHour}`,
        data: { hourlyTokens, threshold: this.alertConfig.maxTokensPerHour }
      });
    }

    // 计算过去一分钟的请求量
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const recentRequestsCount = this.requestHistory.filter(r => r.timestamp > oneMinuteAgo).length;

    if (recentRequestsCount > this.alertConfig.maxRequestsPerMinute) {
      this.createAlert({
        type: 'usage',
        severity: 'medium',
        title: '分钟请求量过高',
        message: `过去一分钟请求 ${recentRequestsCount} 次，超过阈值 ${this.alertConfig.maxRequestsPerMinute}`,
        data: { requestsPerMinute: recentRequestsCount, threshold: this.alertConfig.maxRequestsPerMinute }
      });
    }
  }

  /**
   * 创建告警
   */
  private createAlert(alertData: {
    type: Alert['type'];
    severity: Alert['severity'];
    title: string;
    message: string;
    data?: any;
  }) {
    // 检查是否已存在相同告警（避免重复告警）
    const existingAlert = this.alerts.find(a =>
      !a.acknowledged &&
      a.type === alertData.type &&
      a.title === alertData.title &&
      Date.now() - a.timestamp.getTime() < 300000 // 5分钟内的相同告警
    );

    if (existingAlert) return;

    const alert: Alert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      acknowledged: false,
      ...alertData
    };

    this.alerts.unshift(alert);

    // 限制告警数量
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(0, this.MAX_ALERTS);
    }

    // 发出告警事件
    this.emit('alert', alert);
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成告警ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理历史数据
   */
  private cleanupHistory() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 清理请求历史
    this.requestHistory = this.requestHistory.filter(r => r.timestamp > oneWeekAgo);

    // 清理过期的日成本记录
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const cutoffDate = oneMonthAgo.toISOString().split('T')[0];

    for (const date in this.metrics.dailyCosts) {
      if (date < cutoffDate) {
        delete this.metrics.dailyCosts[date];
      }
    }

    // 清理已确认的告警
    this.alerts = this.alerts.filter(a => !a.acknowledged ||
      Date.now() - a.timestamp.getTime() < 24 * 60 * 60 * 1000 // 保留24小时内的告警
    );
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取告警列表
   */
  getAlerts(includeAcknowledged = false): Alert[] {
    return this.alerts.filter(a => includeAcknowledged || !a.acknowledged);
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alertAcknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * 获取性能报告
   */
  generateReport(timeRange: 'hour' | 'day' | 'week' = 'day') {
    const now = new Date();
    let startTime: Date;

    switch (timeRange) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    const filteredHistory = this.requestHistory.filter(r => r.timestamp >= startTime);

    const totalRequests = filteredHistory.length;
    const successfulRequests = filteredHistory.filter(r => r.success).length;
    const totalCost = filteredHistory.reduce((sum, r) => sum + r.cost, 0);
    const totalTokens = filteredHistory.reduce((sum, r) => sum + r.tokens, 0);
    const avgResponseTime = filteredHistory.reduce((sum, r) => sum + r.duration, 0) / totalRequests || 0;

    return {
      timeRange,
      startTime,
      endTime: now,
      totalRequests,
      successfulRequests,
      successRate: totalRequests > 0 ? successfulRequests / totalRequests : 0,
      totalCost,
      avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
      totalTokens,
      avgTokensPerRequest: totalRequests > 0 ? totalTokens / totalRequests : 0,
      avgResponseTime,
      providerBreakdown: this.getProviderBreakdown(filteredHistory),
      errorBreakdown: this.getErrorBreakdown(filteredHistory)
    };
  }

  /**
   * 获取提供商使用分解
   */
  private getProviderBreakdown(history: typeof this.requestHistory) {
    const breakdown: Record<string, {
      requests: number;
      cost: number;
      tokens: number;
      successRate: number;
    }> = {};

    history.forEach(r => {
      if (!breakdown[r.provider]) {
        breakdown[r.provider] = { requests: 0, cost: 0, tokens: 0, successRate: 0 };
      }

      breakdown[r.provider].requests++;
      breakdown[r.provider].cost += r.cost;
      breakdown[r.provider].tokens += r.tokens;
    });

    // 计算成功率
    Object.keys(breakdown).forEach(provider => {
      const providerHistory = history.filter(r => r.provider === provider);
      const successful = providerHistory.filter(r => r.success).length;
      breakdown[provider].successRate = successful / providerHistory.length;
    });

    return breakdown;
  }

  /**
   * 获取错误分解
   */
  private getErrorBreakdown(history: typeof this.requestHistory) {
    const errorBreakdown: Record<string, number> = {};

    history.filter(r => !r.success).forEach(r => {
      const errorType = this.categorizeError(r.error || '');
      errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
    });

    return errorBreakdown;
  }

  /**
   * 重置指标
   */
  resetMetrics() {
    this.metrics = this.initializeMetrics();
    this.requestHistory = [];
    this.alerts = [];
    this.emit('metricsReset');
  }

  /**
   * 更新告警配置
   */
  updateAlertConfig(updates: Partial<AlertConfig>) {
    this.alertConfig = { ...this.alertConfig, ...updates };
  }

  /**
   * 获取告警配置
   */
  getAlertConfig(): AlertConfig {
    return { ...this.alertConfig };
  }
}

// 默认性能监控实例
export const defaultPerformanceMonitor = new PerformanceMonitor();