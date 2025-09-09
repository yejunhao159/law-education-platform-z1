/**
 * 指标收集服务
 * 负责收集和聚合苏格拉底模块的所有运行时指标
 */

import { socraticPerformance } from './socratic-performance';
import { createLogger } from '../utils/socratic-logger';
import { EventEmitter } from 'events';

const logger = createLogger('metrics-collector');

export interface MetricEvent {
  type: string;
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: Date;
}

export interface AggregatedMetrics {
  timestamp: Date;
  interval: number; // 毫秒
  metrics: {
    // 实时指标
    activeUsers: number;
    activeSessions: number;
    messagesPerSecond: number;
    avgResponseTime: number;
    
    // 累计指标
    totalRequests: number;
    totalErrors: number;
    errorRate: number;
    
    // AI相关
    aiCalls: number;
    aiAvgResponseTime: number;
    aiFallbackRate: number;
    
    // WebSocket相关
    wsConnections: number;
    wsMessageRate: number;
    wsLatency: number;
    
    // 系统资源
    cpuUsage: number;
    memoryUsage: number;
    heapUsage: number;
  };
}

export class MetricsCollector extends EventEmitter {
  private static instance: MetricsCollector;
  private collectInterval: NodeJS.Timeout | null = null;
  private metricsBuffer: MetricEvent[] = [];
  private aggregationInterval = 5000; // 5秒聚合一次
  private maxBufferSize = 10000;
  
  // 实时计数器
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();
  
  private constructor() {
    super();
    this.startCollection();
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * 开始指标收集
   */
  private startCollection() {
    this.collectInterval = setInterval(() => {
      this.aggregateAndEmit();
    }, this.aggregationInterval);

    logger.info('指标收集服务已启动', {
      aggregationInterval: this.aggregationInterval
    });
  }

  /**
   * 记录计数器指标
   */
  public incrementCounter(name: string, value: number = 1, tags?: Record<string, string>) {
    const key = this.getMetricKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    
    this.addToBuffer({
      type: 'counter',
      name,
      value,
      tags,
      timestamp: new Date()
    });
  }

  /**
   * 记录仪表盘指标（瞬时值）
   */
  public setGauge(name: string, value: number, tags?: Record<string, string>) {
    const key = this.getMetricKey(name, tags);
    this.gauges.set(key, value);
    
    this.addToBuffer({
      type: 'gauge',
      name,
      value,
      tags,
      timestamp: new Date()
    });
  }

  /**
   * 记录直方图指标（分布）
   */
  public recordHistogram(name: string, value: number, tags?: Record<string, string>) {
    const key = this.getMetricKey(name, tags);
    const values = this.histograms.get(key) || [];
    values.push(value);
    
    // 保持最近1000个值
    if (values.length > 1000) {
      values.shift();
    }
    
    this.histograms.set(key, values);
    
    this.addToBuffer({
      type: 'histogram',
      name,
      value,
      tags,
      timestamp: new Date()
    });
  }

  /**
   * 收集WebSocket指标
   */
  public collectWebSocketMetrics(params: {
    event: 'connect' | 'disconnect' | 'message' | 'error';
    sessionId?: string;
    messageSize?: number;
    latency?: number;
  }) {
    const { event, sessionId, messageSize, latency } = params;
    
    switch (event) {
      case 'connect':
        this.incrementCounter('ws.connections');
        this.incrementGauge('ws.active_connections');
        break;
      
      case 'disconnect':
        this.decrementGauge('ws.active_connections');
        break;
      
      case 'message':
        this.incrementCounter('ws.messages');
        if (messageSize) {
          this.recordHistogram('ws.message_size', messageSize);
        }
        if (latency) {
          this.recordHistogram('ws.latency', latency);
        }
        break;
      
      case 'error':
        this.incrementCounter('ws.errors');
        break;
    }

    // 记录到性能监控服务
    socraticPerformance.recordWebSocketMetrics({
      event,
      sessionId,
      latency
    });
  }

  /**
   * 收集HTTP请求指标
   */
  public collectHttpMetrics(params: {
    method: string;
    path: string;
    statusCode: number;
    duration: number;
    requestSize?: number;
    responseSize?: number;
  }) {
    const { method, path, statusCode, duration, requestSize, responseSize } = params;
    
    // 记录请求数
    this.incrementCounter('http.requests', 1, {
      method,
      path,
      status: statusCode.toString()
    });
    
    // 记录响应时间
    this.recordHistogram('http.duration', duration, {
      method,
      path
    });
    
    // 记录请求/响应大小
    if (requestSize) {
      this.recordHistogram('http.request_size', requestSize);
    }
    if (responseSize) {
      this.recordHistogram('http.response_size', responseSize);
    }
    
    // 记录错误
    if (statusCode >= 400) {
      this.incrementCounter('http.errors', 1, {
        method,
        path,
        status: statusCode.toString()
      });
    }
  }

  /**
   * 收集业务指标
   */
  public collectBusinessMetrics(params: {
    metric: string;
    value: number;
    type: 'counter' | 'gauge' | 'histogram';
    tags?: Record<string, string>;
  }) {
    const { metric, value, type, tags } = params;
    
    switch (type) {
      case 'counter':
        this.incrementCounter(`business.${metric}`, value, tags);
        break;
      case 'gauge':
        this.setGauge(`business.${metric}`, value, tags);
        break;
      case 'histogram':
        this.recordHistogram(`business.${metric}`, value, tags);
        break;
    }
  }

  /**
   * 聚合并发送指标
   */
  private async aggregateAndEmit() {
    try {
      const now = new Date();
      
      // 获取性能报告
      const perfReport = await socraticPerformance.generatePerformanceReport(
        new Date(now.getTime() - this.aggregationInterval),
        now
      );
      
      // 计算实时指标
      const aggregated: AggregatedMetrics = {
        timestamp: now,
        interval: this.aggregationInterval,
        metrics: {
          // 实时指标
          activeUsers: this.gauges.get('ws.active_connections') || 0,
          activeSessions: this.gauges.get('sessions.active') || 0,
          messagesPerSecond: this.calculateRate('ws.messages'),
          avgResponseTime: this.calculateAverage('http.duration'),
          
          // 累计指标
          totalRequests: this.counters.get('http.requests') || 0,
          totalErrors: this.counters.get('http.errors') || 0,
          errorRate: this.calculateErrorRate(),
          
          // AI相关
          aiCalls: perfReport.socratic?.ai?.totalCalls || 0,
          aiAvgResponseTime: perfReport.socratic?.ai?.avgResponseTime || 0,
          aiFallbackRate: this.calculateFallbackRate(),
          
          // WebSocket相关
          wsConnections: this.counters.get('ws.connections') || 0,
          wsMessageRate: this.calculateRate('ws.messages'),
          wsLatency: this.calculateAverage('ws.latency'),
          
          // 系统资源
          cpuUsage: perfReport.systemHealth?.avgCpu || 0,
          memoryUsage: perfReport.systemHealth?.avgMemory || 0,
          heapUsage: perfReport.systemHealth?.avgHeap || 0
        }
      };
      
      // 发送聚合后的指标
      this.emit('metrics', aggregated);
      
      // 记录到日志（采样）
      if (Math.random() < 0.1) { // 10%采样率
        logger.debug('指标聚合完成', aggregated);
      }
      
      // 清理过期数据
      this.cleanupOldData();
      
    } catch (error) {
      logger.error('指标聚合失败', error);
    }
  }

  /**
   * 计算速率
   */
  private calculateRate(metricName: string): number {
    const key = metricName;
    const current = this.counters.get(key) || 0;
    const previous = this.counters.get(`${key}.previous`) || 0;
    
    this.counters.set(`${key}.previous`, current);
    
    const diff = current - previous;
    const rate = (diff / this.aggregationInterval) * 1000; // 转换为每秒
    
    return Math.max(0, rate);
  }

  /**
   * 计算平均值
   */
  private calculateAverage(metricName: string): number {
    const values = this.histograms.get(metricName) || [];
    if (values.length === 0) return 0;
    
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  /**
   * 计算错误率
   */
  private calculateErrorRate(): number {
    const totalRequests = this.counters.get('http.requests') || 0;
    const totalErrors = this.counters.get('http.errors') || 0;
    
    if (totalRequests === 0) return 0;
    return totalErrors / totalRequests;
  }

  /**
   * 计算降级率
   */
  private calculateFallbackRate(): number {
    const totalAiCalls = this.counters.get('socratic.ai.calls') || 0;
    const fallbackCalls = this.counters.get('socratic.fallback.ai_unavailable_count') || 0;
    
    if (totalAiCalls === 0) return 0;
    return fallbackCalls / totalAiCalls;
  }

  /**
   * 清理旧数据
   */
  private cleanupOldData() {
    // 清理缓冲区
    if (this.metricsBuffer.length > this.maxBufferSize) {
      const toRemove = this.metricsBuffer.length - this.maxBufferSize;
      this.metricsBuffer.splice(0, toRemove);
    }
    
    // 清理直方图中的旧数据
    for (const [key, values] of this.histograms.entries()) {
      if (values.length > 1000) {
        this.histograms.set(key, values.slice(-1000));
      }
    }
  }

  /**
   * 添加到缓冲区
   */
  private addToBuffer(event: MetricEvent) {
    this.metricsBuffer.push(event);
    
    // 实时发送重要事件
    if (event.name.includes('error') || event.name.includes('fallback')) {
      this.emit('alert', event);
    }
  }

  /**
   * 获取指标键
   */
  private getMetricKey(name: string, tags?: Record<string, string>): string {
    if (!tags) return name;
    
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    
    return `${name}{${tagStr}}`;
  }

  /**
   * 增加仪表值
   */
  private incrementGauge(name: string, value: number = 1) {
    const current = this.gauges.get(name) || 0;
    this.gauges.set(name, current + value);
  }

  /**
   * 减少仪表值
   */
  private decrementGauge(name: string, value: number = 1) {
    const current = this.gauges.get(name) || 0;
    this.gauges.set(name, Math.max(0, current - value));
  }

  /**
   * 获取当前指标快照
   */
  public getSnapshot(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, { avg: number; min: number; max: number; count: number }>;
  } {
    const snapshot = {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: {} as Record<string, any>
    };
    
    for (const [key, values] of this.histograms.entries()) {
      if (values.length > 0) {
        snapshot.histograms[key] = {
          avg: this.calculateAverage(key),
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    }
    
    return snapshot;
  }

  /**
   * 重置所有指标
   */
  public reset() {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.metricsBuffer = [];
    
    logger.info('所有指标已重置');
  }

  /**
   * 停止指标收集
   */
  public stop() {
    if (this.collectInterval) {
      clearInterval(this.collectInterval);
      this.collectInterval = null;
    }
    
    this.removeAllListeners();
    logger.info('指标收集服务已停止');
  }
}

// 导出单例实例
export const metricsCollector = MetricsCollector.getInstance();