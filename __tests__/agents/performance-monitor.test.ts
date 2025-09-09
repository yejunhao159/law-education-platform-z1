import { PerformanceMonitor, AggregationType, AlertRule } from '../../lib/agents/performance-monitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('基础指标记录', () => {
    it('应该能够记录简单指标', async () => {
      await monitor.recordMetric('test.metric', 100, { tag: 'value' }, 'ms');
      
      const stats = await monitor.getMetricsStats('test.metric');
      expect(stats.count).toBe(1);
      expect(stats.avg).toBe(100);
      expect(stats.sum).toBe(100);
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(100);
    });

    it('应该能够记录多个指标值', async () => {
      await monitor.recordMetric('test.metric', 100);
      await monitor.recordMetric('test.metric', 200);
      await monitor.recordMetric('test.metric', 300);
      
      const stats = await monitor.getMetricsStats('test.metric');
      expect(stats.count).toBe(3);
      expect(stats.sum).toBe(600);
      expect(stats.avg).toBe(200);
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(300);
    });

    it('应该能够计算百分位数', async () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      for (const value of values) {
        await monitor.recordMetric('test.percentile', value);
      }
      
      const stats = await monitor.getMetricsStats('test.percentile');
      expect(stats.p95).toBeGreaterThanOrEqual(9);
      expect(stats.p99).toBeGreaterThanOrEqual(10);
    });
  });

  describe('计时器功能', () => {
    it('应该能够开始和结束计时器', async () => {
      monitor.startTimer('test-timer', { operation: 'test' });
      
      // 模拟一些延迟
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const duration = await monitor.endTimer('test-timer', 'test.duration');
      
      expect(duration).toBeGreaterThanOrEqual(40); // 允许一些误差
      
      const stats = await monitor.getMetricsStats('test.duration');
      expect(stats.count).toBe(1);
      expect(stats.avg).toBeGreaterThanOrEqual(40);
    });

    it('应该在计时器不存在时抛出错误', async () => {
      await expect(monitor.endTimer('nonexistent')).rejects.toThrow('Timer nonexistent not found');
    });
  });

  describe('系统指标', () => {
    it('应该能够记录系统指标', async () => {
      await monitor.recordSystemMetrics();
      
      const cpuStats = await monitor.getMetricsStats('system.cpu');
      const memoryStats = await monitor.getMetricsStats('system.memory');
      const heapStats = await monitor.getMetricsStats('system.heap');
      
      expect(cpuStats.count).toBe(1);
      expect(memoryStats.count).toBe(1);
      expect(heapStats.count).toBe(1);
      
      expect(cpuStats.avg).toBeGreaterThanOrEqual(0);
      expect(memoryStats.avg).toBeGreaterThan(0);
      expect(heapStats.avg).toBeGreaterThan(0);
    });
  });

  describe('请求指标', () => {
    it('应该能够记录请求指标', async () => {
      await monitor.recordRequestMetrics({
        requestId: 'req-123',
        method: 'GET',
        endpoint: '/api/test',
        duration: 150,
        status: 200,
        timestamp: new Date(),
        userAgent: 'test-agent',
        ip: '127.0.0.1'
      });
      
      const durationStats = await monitor.getMetricsStats('request.duration');
      const countStats = await monitor.getMetricsStats('request.count');
      
      expect(durationStats.count).toBe(1);
      expect(durationStats.avg).toBe(150);
      expect(countStats.count).toBe(1);
      expect(countStats.sum).toBe(1);
    });
  });

  describe('Agent指标', () => {
    it('应该能够记录成功的Agent调用', async () => {
      await monitor.recordAgentMetrics({
        agentId: 'agent-123',
        provider: 'openai',
        operation: 'generate',
        duration: 2000,
        tokensUsed: 150,
        cost: 0.003,
        success: true,
        timestamp: new Date()
      });
      
      const durationStats = await monitor.getMetricsStats('agent.duration');
      const requestStats = await monitor.getMetricsStats('agent.requests');
      const tokenStats = await monitor.getMetricsStats('agent.tokens');
      const costStats = await monitor.getMetricsStats('agent.cost');
      
      expect(durationStats.avg).toBe(2000);
      expect(requestStats.sum).toBe(1);
      expect(tokenStats.sum).toBe(150);
      expect(costStats.sum).toBe(0.003);
    });

    it('应该能够记录失败的Agent调用', async () => {
      await monitor.recordAgentMetrics({
        agentId: 'agent-123',
        provider: 'openai',
        operation: 'generate',
        duration: 1000,
        success: false,
        errorType: 'rate_limit',
        timestamp: new Date()
      });
      
      const requestStats = await monitor.getMetricsStats('agent.requests');
      expect(requestStats.sum).toBe(1);
    });
  });

  describe('缓存指标', () => {
    it('应该能够记录缓存指标', async () => {
      await monitor.recordCacheMetrics({
        hits: 8,
        misses: 2,
        hitRate: 80,
        size: 100,
        evictions: 1,
        timestamp: new Date()
      });
      
      const hitsStats = await monitor.getMetricsStats('cache.hits');
      const missesStats = await monitor.getMetricsStats('cache.misses');
      const hitRateStats = await monitor.getMetricsStats('cache.hit_rate');
      const sizeStats = await monitor.getMetricsStats('cache.size');
      const evictionsStats = await monitor.getMetricsStats('cache.evictions');
      
      expect(hitsStats.sum).toBe(8);
      expect(missesStats.sum).toBe(2);
      expect(hitRateStats.avg).toBe(80);
      expect(sizeStats.avg).toBe(100);
      expect(evictionsStats.sum).toBe(1);
    });
  });

  describe('告警功能', () => {
    it('应该能够添加和触发告警', async () => {
      const rule: AlertRule = {
        id: 'test-alert',
        name: '高响应时间告警',
        metric: 'response.time',
        condition: 'gt',
        threshold: 1000,
        window: 60,
        enabled: true,
        actions: [
          { type: 'log', config: {} }
        ]
      };
      
      monitor.addAlertRule(rule);
      
      // 使用Promise包装事件监听
      const alertPromise = new Promise((resolve) => {
        monitor.on('alert', (alert) => {
          resolve(alert);
        });
      });
      
      await monitor.recordMetric('response.time', 1500);
      
      const alert: any = await alertPromise;
      expect(alert.ruleId).toBe('test-alert');
      expect(alert.value).toBe(1500);
      expect(alert.threshold).toBe(1000);
    });

    it('应该能够解决告警', async () => {
      const rule: AlertRule = {
        id: 'test-resolve',
        name: '测试解决告警',
        metric: 'test.value',
        condition: 'gt',
        threshold: 100,
        window: 60,
        enabled: true,
        actions: []
      };
      
      monitor.addAlertRule(rule);
      
      let alertTriggered = false;
      let alertResolved = false;
      
      monitor.on('alert', () => {
        alertTriggered = true;
      });
      
      monitor.on('alertResolved', (alert) => {
        alertResolved = true;
        expect(alert.resolved).toBe(true);
        expect(alert.resolvedAt).toBeDefined();
      });
      
      // 触发告警
      await monitor.recordMetric('test.value', 150);
      expect(alertTriggered).toBe(true);
      
      // 解决告警
      await monitor.recordMetric('test.value', 50);
      expect(alertResolved).toBe(true);
    });

    it('应该能够获取活跃告警', async () => {
      const rule: AlertRule = {
        id: 'test-active',
        name: '测试活跃告警',
        metric: 'test.active',
        condition: 'gt',
        threshold: 10,
        window: 60,
        enabled: true,
        actions: []
      };
      
      monitor.addAlertRule(rule);
      
      await monitor.recordMetric('test.active', 20);
      
      const activeAlerts = monitor.getActiveAlerts();
      expect(activeAlerts.length).toBe(1);
      expect(activeAlerts[0].ruleId).toBe('test-active');
    });
  });

  describe('聚合查询', () => {
    beforeEach(async () => {
      // 设置测试数据
      const values = [10, 20, 30, 40, 50];
      for (const value of values) {
        await monitor.recordMetric('test.aggregation', value, { type: 'test' });
      }
    });

    it('应该能够计算不同的聚合类型', async () => {
      const stats = await monitor.getMetricsStats('test.aggregation');
      
      expect(stats.count).toBe(5);
      expect(stats.sum).toBe(150);
      expect(stats.avg).toBe(30);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
    });
  });

  describe('性能报告', () => {
    beforeEach(async () => {
      // 设置测试数据
      const now = new Date();
      
      await monitor.recordMetric('request.count', 1, { endpoint: '/api/users' });
      await monitor.recordMetric('request.duration', 200, { endpoint: '/api/users' });
      await monitor.recordMetric('agent.requests', 1, { provider: 'openai' });
      await monitor.recordMetric('agent.cost', 0.001);
      await monitor.recordMetric('system.cpu', 25);
      await monitor.recordMetric('system.memory', 512);
      await monitor.recordMetric('system.heap', 256);
    });

    it('应该能够生成性能报告', async () => {
      const startTime = new Date(Date.now() - 3600000); // 1小时前
      const endTime = new Date();
      
      const report = await monitor.generateReport(startTime, endTime);
      
      expect(report.summary.totalRequests).toBe(1);
      expect(report.summary.avgResponseTime).toBe(200);
      expect(report.summary.totalAgentCalls).toBe(1);
      expect(report.summary.totalCost).toBe(0.001);
      expect(report.systemHealth.avgCpu).toBe(25);
      expect(report.systemHealth.avgMemory).toBe(512);
      expect(report.systemHealth.avgHeap).toBe(256);
    });
  });

  describe('事件发射', () => {
    it('应该在记录指标时发射事件', async () => {
      // 使用Promise包装事件监听
      const metricPromise = new Promise((resolve) => {
        monitor.on('metric', (metric) => {
          resolve(metric);
        });
      });
      
      await monitor.recordMetric('test.event', 42);
      
      const metric: any = await metricPromise;
      expect(metric.name).toBe('test.event');
      expect(metric.value).toBe(42);
    });
  });

  describe('清理功能', () => {
    it('应该能够正确停止监控器', () => {
      expect(() => monitor.stop()).not.toThrow();
    });
  });

  describe('时间过滤', () => {
    it('应该能够按时间范围查询指标', async () => {
      const startTime = new Date();
      
      await monitor.recordMetric('time.test', 100);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const endTime = new Date();
      
      await monitor.recordMetric('time.test', 200);
      
      // 查询时间范围内的指标
      const stats = await monitor.getMetricsStats('time.test', startTime, endTime);
      expect(stats.count).toBe(1);
      expect(stats.avg).toBe(100);
    });
  });
});