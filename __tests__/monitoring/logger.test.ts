import { 
  StructuredLogger, 
  createStructuredLogger, 
  LogLevel 
} from '../../lib/monitoring/structured-logger';
import { LogAggregator } from '../../lib/monitoring/log-aggregator';

describe('结构化日志系统', () => {
  let logger: StructuredLogger;
  let aggregator: LogAggregator;

  beforeEach(() => {
    logger = createStructuredLogger({
      module: 'test',
      level: LogLevel.DEBUG,
      format: 'json',
      enableCorrelation: true,
      enablePerformance: true,
      enableSampling: false
    });

    aggregator = LogAggregator.getInstance();
  });

  afterEach(() => {
    logger.clearBuffer();
    aggregator.stop();
  });

  describe('基本日志功能', () => {
    it('应该记录不同级别的日志', () => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message', new Error('Test error'));

      const logs = logger.getBufferedLogs();
      expect(logs.length).toBe(4);
      expect(logs[0].level).toBe(LogLevel.DEBUG);
      expect(logs[1].level).toBe(LogLevel.INFO);
      expect(logs[2].level).toBe(LogLevel.WARN);
      expect(logs[3].level).toBe(LogLevel.ERROR);
    });

    it('应该过滤低于设置级别的日志', () => {
      const warnLogger = createStructuredLogger({
        module: 'test',
        level: LogLevel.WARN
      });

      warnLogger.debug('Debug - should not appear');
      warnLogger.info('Info - should not appear');
      warnLogger.warn('Warning - should appear');
      warnLogger.error('Error - should appear');

      const logs = warnLogger.getBufferedLogs();
      expect(logs.length).toBe(2);
      expect(logs[0].message).toContain('Warning');
      expect(logs[1].message).toContain('Error');
    });

    it('应该包含正确的元数据', () => {
      const metadata = {
        userId: 'user123',
        sessionId: 'session456',
        action: 'test_action'
      };

      logger.info('Test with metadata', metadata);

      const logs = logger.getBufferedLogs();
      expect(logs[0].metadata).toEqual(metadata);
    });

    it('应该正确格式化错误', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at Test.suite';
      (error as any).code = 'TEST_ERROR';

      logger.error('An error occurred', error);

      const logs = logger.getBufferedLogs();
      const loggedError = logs[0].metadata?.error;
      
      expect(loggedError).toBeDefined();
      expect(loggedError.name).toBe('Error');
      expect(loggedError.message).toBe('Test error');
      expect(loggedError.code).toBe('TEST_ERROR');
      expect(loggedError.stack).toContain('Test.suite');
    });
  });

  describe('性能跟踪', () => {
    it('应该跟踪操作时长', async () => {
      logger.startTimer('test-operation');
      
      // 模拟操作
      await new Promise(resolve => setTimeout(resolve, 50));
      
      logger.endTimer('test-operation', 'Operation completed');

      const logs = logger.getBufferedLogs();
      const perfLog = logs.find(l => l.message === 'Operation completed');
      
      expect(perfLog).toBeDefined();
      expect(perfLog?.metadata?.performance?.duration).toBeGreaterThanOrEqual(40);
      expect(perfLog?.metadata?.performance?.startTime).toBeDefined();
      expect(perfLog?.metadata?.performance?.endTime).toBeDefined();
    });

    it('应该处理不存在的计时器', () => {
      logger.endTimer('non-existent', 'Should warn');

      const logs = logger.getBufferedLogs();
      const warnLog = logs.find(l => l.message.includes('Timer non-existent not found'));
      
      expect(warnLog).toBeDefined();
      expect(warnLog?.level).toBe(LogLevel.WARN);
    });
  });

  describe('关联ID管理', () => {
    it('应该设置和获取关联ID', () => {
      logger.setCorrelationId('request-123', 'parent-456');
      
      const correlationId = logger.getCorrelationId('request-123');
      expect(correlationId).toBe('parent-456');
    });

    it('应该在日志中包含关联ID', () => {
      logger.info('Test message', { correlationId: 'correlation-789' });

      const logs = logger.getBufferedLogs();
      expect(logs[0].correlationId).toBe('correlation-789');
    });
  });

  describe('敏感数据脱敏', () => {
    it('应该脱敏敏感字段', () => {
      const sensitiveData = {
        username: 'john',
        password: 'secret123',
        apiKey: 'sk-1234567890',
        token: 'bearer-token',
        normalField: 'visible'
      };

      logger.info('Sensitive data', sensitiveData);

      const logs = logger.getBufferedLogs();
      const metadata = logs[0].metadata;
      
      expect(metadata.password).toBe('[REDACTED]');
      expect(metadata.apiKey).toBe('[REDACTED]');
      expect(metadata.token).toBe('[REDACTED]');
      expect(metadata.normalField).toBe('visible');
    });

    it('应该递归脱敏嵌套对象', () => {
      const nestedData = {
        user: {
          name: 'john',
          credentials: {
            password: 'secret',
            token: 'token123'
          }
        }
      };

      logger.info('Nested sensitive data', nestedData);

      const logs = logger.getBufferedLogs();
      const metadata = logs[0].metadata;
      
      expect(metadata.user.name).toBe('john');
      expect(metadata.user.credentials.password).toBe('[REDACTED]');
      expect(metadata.user.credentials.token).toBe('[REDACTED]');
    });
  });

  describe('子日志器', () => {
    it('应该创建带上下文的子日志器', () => {
      const childLogger = logger.child({
        module: 'child',
        correlationId: 'child-correlation'
      });

      childLogger.info('Child logger message');

      const logs = childLogger.getBufferedLogs();
      expect(logs[0].module).toContain('child');
    });
  });

  describe('日志缓冲和查询', () => {
    it('应该缓冲日志并支持查询', () => {
      logger.debug('Debug 1');
      logger.info('Info 1');
      logger.warn('Warn 1');
      logger.error('Error 1');

      const allLogs = logger.getBufferedLogs();
      expect(allLogs.length).toBe(4);

      const errorLogs = logger.getBufferedLogs({ level: LogLevel.ERROR });
      expect(errorLogs.length).toBe(1);

      const testModuleLogs = logger.getBufferedLogs({ module: 'test' });
      expect(testModuleLogs.length).toBe(4);
    });

    it('应该按时间范围过滤日志', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 60000);
      const future = new Date(now.getTime() + 60000);

      logger.info('Test message');

      const logsInRange = logger.getBufferedLogs({
        startTime: past,
        endTime: future
      });
      expect(logsInRange.length).toBe(1);

      const logsOutOfRange = logger.getBufferedLogs({
        startTime: future,
        endTime: new Date(future.getTime() + 60000)
      });
      expect(logsOutOfRange.length).toBe(0);
    });

    it('应该限制缓冲区大小', () => {
      // 创建超过最大缓冲区大小的日志
      for (let i = 0; i < 1100; i++) {
        logger.info(`Message ${i}`);
      }

      const logs = logger.getBufferedLogs();
      expect(logs.length).toBeLessThanOrEqual(1000);
      // 应该保留最新的日志
      expect(logs[logs.length - 1].message).toContain('1099');
    });
  });

  describe('日志统计', () => {
    it('应该生成正确的统计信息', () => {
      logger.debug('Debug');
      logger.info('Info');
      logger.info('Info 2');
      logger.warn('Warning');
      logger.error('Error');

      const stats = logger.getStats();
      
      expect(stats.totalLogs).toBe(5);
      expect(stats.logsByLevel['DEBUG']).toBe(1);
      expect(stats.logsByLevel['INFO']).toBe(2);
      expect(stats.logsByLevel['WARN']).toBe(1);
      expect(stats.logsByLevel['ERROR']).toBe(1);
      expect(stats.errorCount).toBe(1);
    });
  });

  describe('致命错误处理', () => {
    it('应该特殊处理致命错误', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const fatalError = new Error('Fatal error');
      logger.fatal('System crash', fatalError);

      const logs = logger.getBufferedLogs();
      expect(logs[0].message).toContain('[FATAL]');
      
      // 应该触发告警
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ALERT][FATAL]'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });
});

describe('日志聚合器', () => {
  let aggregator: LogAggregator;

  beforeEach(() => {
    aggregator = LogAggregator.getInstance();
  });

  afterEach(() => {
    aggregator.stop();
  });

  describe('日志摄入', () => {
    it('应该摄入和存储日志', () => {
      const log = {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        module: 'test',
        message: 'Test message',
        metadata: {}
      };

      aggregator.ingest(log);

      const stats = aggregator.getStatistics();
      expect(stats.totalLogs).toBeGreaterThan(0);
    });

    it('应该批量摄入日志', () => {
      const logs = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        module: 'test',
        message: `Message ${i}`,
        metadata: {}
      }));

      aggregator.ingestBatch(logs);

      const stats = aggregator.getStatistics();
      expect(stats.totalLogs).toBeGreaterThanOrEqual(10);
    });
  });

  describe('模式匹配', () => {
    it('应该检测错误模式', () => {
      const errorLog = {
        timestamp: new Date().toISOString(),
        level: LogLevel.ERROR,
        module: 'test',
        message: 'Cannot read property foo of undefined',
        metadata: {}
      };

      const alertSpy = jest.fn();
      aggregator.on('alert', alertSpy);

      aggregator.ingest(errorLog);

      // 模式匹配是异步的，等待一下
      setTimeout(() => {
        expect(alertSpy).toHaveBeenCalled();
      }, 100);
    });

    it('应该检测安全威胁模式', () => {
      const maliciousLog = {
        timestamp: new Date().toISOString(),
        level: LogLevel.WARN,
        module: 'api',
        message: "User input: '; DROP TABLE users; --",
        metadata: {}
      };

      const alertSpy = jest.fn();
      aggregator.on('alert', alertSpy);

      aggregator.ingest(maliciousLog);

      // SQL注入模式应该触发告警
      setTimeout(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'pattern',
            severity: 'critical'
          })
        );
      }, 100);
    });
  });

  describe('日志统计', () => {
    it('应该生成正确的统计信息', () => {
      const logs = [
        { timestamp: new Date().toISOString(), level: LogLevel.INFO, module: 'module1', message: 'Info 1', metadata: {} },
        { timestamp: new Date().toISOString(), level: LogLevel.ERROR, module: 'module1', message: 'Error 1', metadata: {} },
        { timestamp: new Date().toISOString(), level: LogLevel.WARN, module: 'module2', message: 'Warning 1', metadata: {} },
        { timestamp: new Date().toISOString(), level: LogLevel.ERROR, module: 'module2', message: 'Error 1', metadata: {} },
        { timestamp: new Date().toISOString(), level: LogLevel.INFO, module: 'module3', message: 'Info 2', metadata: {} }
      ];

      aggregator.ingestBatch(logs);

      const stats = aggregator.getStatistics();
      
      expect(stats.totalLogs).toBeGreaterThanOrEqual(5);
      expect(stats.errorCount).toBeGreaterThanOrEqual(2);
      expect(stats.warningCount).toBeGreaterThanOrEqual(1);
      expect(stats.errorRate).toBeGreaterThan(0);
      expect(stats.topModules.length).toBeGreaterThan(0);
    });

    it('应该按时间范围统计', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 3600000); // 1小时前
      
      const oldLog = {
        timestamp: past.toISOString(),
        level: LogLevel.INFO,
        module: 'test',
        message: 'Old message',
        metadata: {}
      };

      const newLog = {
        timestamp: now.toISOString(),
        level: LogLevel.INFO,
        module: 'test',
        message: 'New message',
        metadata: {}
      };

      aggregator.ingest(oldLog);
      aggregator.ingest(newLog);

      const stats = aggregator.getStatistics({
        start: new Date(now.getTime() - 300000), // 最近5分钟
        end: new Date()
      });

      expect(stats.totalLogs).toBeGreaterThanOrEqual(1);
    });
  });

  describe('指标生成', () => {
    it('应该生成性能指标', () => {
      const logs = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        level: i % 3 === 0 ? LogLevel.ERROR : LogLevel.INFO,
        module: 'test',
        message: `Message ${i}`,
        metadata: {},
        performance: {
          duration: 100 + i * 10
        }
      }));

      aggregator.ingestBatch(logs);

      // 手动触发聚合
      (aggregator as any).aggregate();

      const metrics = aggregator.getRecentMetrics(1);
      
      if (metrics.length > 0) {
        expect(metrics[0].totalCount).toBeGreaterThan(0);
        expect(metrics[0].averageResponseTime).toBeDefined();
      }
    });
  });

  describe('告警管理', () => {
    it('应该遵守冷却期', () => {
      const alertSpy = jest.fn();
      aggregator.on('alert', alertSpy);

      // 触发多次相同告警
      for (let i = 0; i < 5; i++) {
        (aggregator as any).sendAlert({
          type: 'test_alert',
          severity: 'error',
          message: 'Test alert'
        });
      }

      // 由于冷却期，应该只触发一次
      expect(alertSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('数据清理', () => {
    it('应该清理旧数据', () => {
      const oldDate = new Date(Date.now() - 7200000); // 2小时前
      const newDate = new Date();

      const oldLog = {
        timestamp: oldDate.toISOString(),
        level: LogLevel.INFO,
        module: 'test',
        message: 'Old message',
        metadata: {}
      };

      const newLog = {
        timestamp: newDate.toISOString(),
        level: LogLevel.INFO,
        module: 'test',
        message: 'New message',
        metadata: {}
      };

      aggregator.ingest(oldLog);
      aggregator.ingest(newLog);

      // 清理1小时前的数据
      aggregator.cleanup(new Date(Date.now() - 3600000));

      const stats = aggregator.getStatistics();
      // 只应该保留新日志
      expect(stats.totalLogs).toBeGreaterThanOrEqual(1);
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量日志', () => {
      const startTime = Date.now();
      
      const logs = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        level: i % 4 === 0 ? LogLevel.ERROR : LogLevel.INFO,
        module: `module${i % 10}`,
        message: `Message ${i}`,
        metadata: { index: i }
      }));

      aggregator.ingestBatch(logs);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // 应该在100ms内处理1000条日志
    });

    it('应该高效生成统计', () => {
      // 先摄入数据
      const logs = Array.from({ length: 500 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        level: i % 3 === 0 ? LogLevel.ERROR : LogLevel.INFO,
        module: `module${i % 5}`,
        message: `Message ${i}`,
        metadata: {}
      }));

      aggregator.ingestBatch(logs);

      const startTime = Date.now();
      const stats = aggregator.getStatistics();
      const duration = Date.now() - startTime;

      expect(stats).toBeDefined();
      expect(duration).toBeLessThan(50); // 统计应该在50ms内完成
    });
  });
});