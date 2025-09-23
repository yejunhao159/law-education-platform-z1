import { EventEmitter } from 'events';

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
  unit?: string;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  heap: number;
  eventLoop: number;
  timestamp: Date;
}

export interface RequestMetrics {
  requestId: string;
  method: string;
  endpoint: string;
  duration: number;
  status: number;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
}

export interface AgentMetrics {
  agentId: string;
  provider: string;
  operation: string;
  duration: number;
  tokensUsed?: number;
  cost?: number;
  success: boolean;
  errorType?: string;
  timestamp: Date;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  evictions: number;
  timestamp: Date;
}

export interface MetricsStorage {
  store(metric: PerformanceMetric): Promise<void>;
  query(filter: MetricsFilter): Promise<PerformanceMetric[]>;
  aggregate(filter: MetricsFilter, aggregation: AggregationType): Promise<number>;
  cleanup(olderThan: Date): Promise<number>;
}

export interface MetricsFilter {
  name?: string;
  startTime?: Date;
  endTime?: Date;
  tags?: Record<string, string>;
  limit?: number;
}

export enum AggregationType {
  SUM = 'sum',
  AVERAGE = 'average',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
  PERCENTILE_95 = 'p95',
  PERCENTILE_99 = 'p99'
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  window: number; // 时间窗口（秒）
  enabled: boolean;
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'log';
  config: Record<string, any>;
}

export interface Alert {
  id: string;
  ruleId: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

class InMemoryMetricsStorage implements MetricsStorage {
  private metrics: PerformanceMetric[] = [];
  private readonly maxSize = 10000;

  async store(metric: PerformanceMetric): Promise<void> {
    this.metrics.push(metric);
    
    // 保持存储大小限制
    if (this.metrics.length > this.maxSize) {
      this.metrics = this.metrics.slice(-this.maxSize);
    }
  }

  async query(filter: MetricsFilter): Promise<PerformanceMetric[]> {
    let result = this.metrics;

    if (filter.name) {
      result = result.filter(m => m.name === filter.name);
    }

    if (filter.startTime) {
      result = result.filter(m => m.timestamp >= filter.startTime!);
    }

    if (filter.endTime) {
      result = result.filter(m => m.timestamp <= filter.endTime!);
    }

    if (filter.tags) {
      result = result.filter(m => {
        if (!m.tags) return false;
        return Object.entries(filter.tags!).every(([key, value]) => m.tags![key] === value);
      });
    }

    if (filter.limit) {
      result = result.slice(-filter.limit);
    }

    return result;
  }

  async aggregate(filter: MetricsFilter, aggregation: AggregationType): Promise<number> {
    const metrics = await this.query(filter);
    const values = metrics.map(m => m.value);

    if (values.length === 0) return 0;

    switch (aggregation) {
      case AggregationType.SUM:
        return values.reduce((sum, val) => sum + val, 0);
      
      case AggregationType.AVERAGE:
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      
      case AggregationType.MIN:
        return Math.min(...values);
      
      case AggregationType.MAX:
        return Math.max(...values);
      
      case AggregationType.COUNT:
        return values.length;
      
      case AggregationType.PERCENTILE_95:
        return this.percentile(values, 0.95);
      
      case AggregationType.PERCENTILE_99:
        return this.percentile(values, 0.99);
      
      default:
        return 0;
    }
  }

  async cleanup(olderThan: Date): Promise<number> {
    const initialLength = this.metrics.length;
    this.metrics = this.metrics.filter(m => m.timestamp > olderThan);
    return initialLength - this.metrics.length;
  }

  private percentile(values: number[], p: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index] || 0;
  }
}

export class PerformanceMonitor extends EventEmitter {
  private storage: MetricsStorage;
  private alerts: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private timers: Map<string, { startTime: number; tags?: Record<string, string> }> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(storage?: MetricsStorage) {
    super();
    this.storage = storage || new InMemoryMetricsStorage();
    this.startCleanupTask();
  }

  // 记录指标
  async recordMetric(name: string, value: number, tags?: Record<string, string>, unit?: string): Promise<void> {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date(),
      tags,
      unit
    };

    await this.storage.store(metric);
    this.emit('metric', metric);
    await this.checkAlerts(metric);
  }

  // 开始计时
  startTimer(id: string, tags?: Record<string, string>): void {
    this.timers.set(id, { startTime: Date.now(), tags });
  }

  // 结束计时并记录指标
  async endTimer(id: string, metricName?: string): Promise<number> {
    const timer = this.timers.get(id);
    if (!timer) {
      throw new Error(`Timer ${id} not found`);
    }

    const duration = Date.now() - timer.startTime;
    this.timers.delete(id);

    const name = metricName || `timer.${id}`;
    await this.recordMetric(name, duration, timer.tags, 'ms');

    return duration;
  }

  // 记录系统指标
  async recordSystemMetrics(): Promise<void> {
    const metrics: SystemMetrics = {
      cpu: process.cpuUsage().user / 1000, // 转换为毫秒
      memory: process.memoryUsage().rss / 1024 / 1024, // 转换为MB
      heap: process.memoryUsage().heapUsed / 1024 / 1024, // 转换为MB
      eventLoop: 0, // 需要额外库来测量
      timestamp: new Date()
    };

    await this.recordMetric('system.cpu', metrics.cpu, {}, 'ms');
    await this.recordMetric('system.memory', metrics.memory, {}, 'MB');
    await this.recordMetric('system.heap', metrics.heap, {}, 'MB');
  }

  // 记录请求指标
  async recordRequestMetrics(metrics: RequestMetrics): Promise<void> {
    const tags = {
      method: metrics.method,
      endpoint: metrics.endpoint,
      status: metrics.status.toString()
    };

    await this.recordMetric('request.duration', metrics.duration, tags, 'ms');
    await this.recordMetric('request.count', 1, tags);
  }

  // 记录Agent指标
  async recordAgentMetrics(metrics: AgentMetrics): Promise<void> {
    const tags = {
      agentId: metrics.agentId,
      provider: metrics.provider,
      operation: metrics.operation,
      success: metrics.success.toString()
    };

    if (metrics.errorType) {
      tags.errorType = metrics.errorType;
    }

    await this.recordMetric('agent.duration', metrics.duration, tags, 'ms');
    await this.recordMetric('agent.requests', 1, tags);

    if (metrics.tokensUsed) {
      await this.recordMetric('agent.tokens', metrics.tokensUsed, tags);
    }

    if (metrics.cost) {
      await this.recordMetric('agent.cost', metrics.cost, tags, 'USD');
    }
  }

  // 记录缓存指标
  async recordCacheMetrics(metrics: CacheMetrics): Promise<void> {
    await this.recordMetric('cache.hits', metrics.hits);
    await this.recordMetric('cache.misses', metrics.misses);
    await this.recordMetric('cache.hit_rate', metrics.hitRate, {}, 'percent');
    await this.recordMetric('cache.size', metrics.size);
    await this.recordMetric('cache.evictions', metrics.evictions);
  }

  // 获取指标统计
  async getMetricsStats(name: string, startTime?: Date, endTime?: Date): Promise<{
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  }> {
    const filter: MetricsFilter = { name, startTime, endTime };

    const [count, sum, avg, min, max, p95, p99] = await Promise.all([
      this.storage.aggregate(filter, AggregationType.COUNT),
      this.storage.aggregate(filter, AggregationType.SUM),
      this.storage.aggregate(filter, AggregationType.AVERAGE),
      this.storage.aggregate(filter, AggregationType.MIN),
      this.storage.aggregate(filter, AggregationType.MAX),
      this.storage.aggregate(filter, AggregationType.PERCENTILE_95),
      this.storage.aggregate(filter, AggregationType.PERCENTILE_99)
    ]);

    return { count, sum, avg, min, max, p95, p99 };
  }

  // 添加告警规则
  addAlertRule(rule: AlertRule): void {
    this.alerts.set(rule.id, rule);
  }

  // 移除告警规则
  removeAlertRule(ruleId: string): void {
    this.alerts.delete(ruleId);
  }

  // 检查告警
  private async checkAlerts(metric: PerformanceMetric): Promise<void> {
    for (const [ruleId, rule] of this.alerts) {
      if (!rule.enabled || rule.metric !== metric.name) {
        continue;
      }

      const shouldAlert = this.evaluateCondition(metric.value, rule.condition, rule.threshold);
      const existingAlert = this.activeAlerts.get(ruleId);

      if (shouldAlert && !existingAlert) {
        // 创建新告警
        const alert: Alert = {
          id: `${ruleId}-${Date.now()}`,
          ruleId,
          metric: metric.name,
          value: metric.value,
          threshold: rule.threshold,
          timestamp: new Date(),
          resolved: false
        };

        this.activeAlerts.set(ruleId, alert);
        this.emit('alert', alert);
        await this.executeAlertActions(rule, alert);
      } else if (!shouldAlert && existingAlert && !existingAlert.resolved) {
        // 解决告警
        existingAlert.resolved = true;
        existingAlert.resolvedAt = new Date();
        this.emit('alertResolved', existingAlert);
        this.activeAlerts.delete(ruleId);
      }
    }
  }

  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  private async executeAlertActions(rule: AlertRule, alert: Alert): Promise<void> {
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'log':
            console.warn(`Alert triggered: ${rule.name} - ${alert.metric} ${alert.value} ${rule.condition} ${alert.threshold}`);
            break;
          
          case 'webhook':
            // 实现webhook调用
            break;
          
          case 'email':
            // 实现邮件发送
            break;
        }
      } catch (error) {
        console.error('Failed to execute alert action:', error);
      }
    }
  }

  // 获取活跃告警
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  // 生成性能报告
  async generateReport(startTime: Date, endTime: Date): Promise<{
    summary: {
      totalRequests: number;
      avgResponseTime: number;
      errorRate: number;
      totalAgentCalls: number;
      totalCost: number;
    };
    topEndpoints: Array<{ endpoint: string; count: number; avgDuration: number }>;
    errorsByType: Record<string, number>;
    systemHealth: {
      avgCpu: number;
      avgMemory: number;
      avgHeap: number;
    };
  }> {
    const filter: MetricsFilter = { startTime, endTime };

    // 获取汇总数据
    const totalRequests = await this.storage.aggregate(
      { ...filter, name: 'request.count' },
      AggregationType.SUM
    );

    const avgResponseTime = await this.storage.aggregate(
      { ...filter, name: 'request.duration' },
      AggregationType.AVERAGE
    );

    const totalAgentCalls = await this.storage.aggregate(
      { ...filter, name: 'agent.requests' },
      AggregationType.SUM
    );

    const totalCost = await this.storage.aggregate(
      { ...filter, name: 'agent.cost' },
      AggregationType.SUM
    );

    const avgCpu = await this.storage.aggregate(
      { ...filter, name: 'system.cpu' },
      AggregationType.AVERAGE
    );

    const avgMemory = await this.storage.aggregate(
      { ...filter, name: 'system.memory' },
      AggregationType.AVERAGE
    );

    const avgHeap = await this.storage.aggregate(
      { ...filter, name: 'system.heap' },
      AggregationType.AVERAGE
    );

    // 计算错误率
    const errorRequests = await this.storage.query({
      ...filter,
      name: 'request.count',
      tags: { status: '500' }
    });
    const errorRate = totalRequests > 0 ? (errorRequests.length / totalRequests) * 100 : 0;

    return {
      summary: {
        totalRequests,
        avgResponseTime,
        errorRate,
        totalAgentCalls,
        totalCost
      },
      topEndpoints: [], // 需要更复杂的查询来实现
      errorsByType: {}, // 需要更复杂的查询来实现
      systemHealth: {
        avgCpu,
        avgMemory,
        avgHeap
      }
    };
  }

  // 启动清理任务
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await this.storage.cleanup(oneDayAgo);
    }, 60 * 60 * 1000); // 每小时执行一次
  }

  // 停止监控器
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.removeAllListeners();
  }
}

// 单例实例
export const performanceMonitor = new PerformanceMonitor();

// 中间件工厂
export function createPerformanceMiddleware() {
  return async (req: any, res: any, next: any) => {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    performanceMonitor.startTimer(requestId, {
      method: req.method,
      endpoint: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    res.on('finish', async () => {
      const duration = await performanceMonitor.endTimer(requestId);
      
      await performanceMonitor.recordRequestMetrics({
        requestId,
        method: req.method,
        endpoint: req.path,
        duration,
        status: res.statusCode,
        timestamp: new Date(),
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    });

    next();
  };
}