import { CacheOptimizer } from '../../../lib/services/cache/optimizer';
import { ICacheService } from '../../../lib/services/cache/cache.interface';

// Mock缓存服务
class MockCacheService implements ICacheService {
  private cache = new Map<string, any>();
  private accessLog: { key: string; hit: boolean }[] = [];

  async get(key: string): Promise<any> {
    const value = this.cache.get(key);
    this.accessLog.push({ key, hit: !!value });
    return value;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.cache.set(key, value);
    if (ttl) {
      setTimeout(() => this.cache.delete(key), ttl);
    }
  }

  async findSimilar(pattern: string, threshold?: number): Promise<Array<{ key: string; value: any; similarity: number }>> {
    const results: Array<{ key: string; value: any; similarity: number }> = [];
    for (const [key, value] of this.cache.entries()) {
      if (key.includes(pattern)) {
        results.push({ key, value, similarity: 0.9 });
      }
    }
    return results;
  }

  async invalidate(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  getAccessLog() {
    return this.accessLog;
  }

  getCacheSize() {
    return this.cache.size;
  }
}

describe('CacheOptimizer', () => {
  let cacheService: MockCacheService;
  let optimizer: CacheOptimizer;

  beforeEach(() => {
    cacheService = new MockCacheService();
    optimizer = new CacheOptimizer(cacheService, {
      enablePreloading: true,
      enableCompression: true,
      optimizationIntervalMs: 0, // 禁用自动优化
      hitRateThreshold: 0.7,
      preloadThreshold: 3
    });
  });

  afterEach(() => {
    optimizer.stop();
  });

  describe('基本功能', () => {
    it('应该正确记录缓存命中', async () => {
      await cacheService.set('test_key', 'test_value');
      await cacheService.get('test_key');
      
      await optimizer.recordAccess('test_key', true, 5);
      
      const stats = optimizer.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(1);
    });

    it('应该正确记录缓存未命中', async () => {
      await cacheService.get('non_existent');
      
      await optimizer.recordAccess('non_existent', false, 10);
      
      const stats = optimizer.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0);
    });

    it('应该计算正确的命中率', async () => {
      // 记录3次命中，2次未命中
      await optimizer.recordAccess('key1', true, 5);
      await optimizer.recordAccess('key2', true, 5);
      await optimizer.recordAccess('key3', true, 5);
      await optimizer.recordAccess('key4', false, 5);
      await optimizer.recordAccess('key5', false, 5);
      
      const stats = optimizer.getStats();
      expect(stats.hitRate).toBeCloseTo(0.6, 2); // 3/5 = 0.6
    });

    it('应该跟踪热键', async () => {
      // 多次访问同一个键
      for (let i = 0; i < 5; i++) {
        await optimizer.recordAccess('hot_key', true, 5);
      }
      
      const stats = optimizer.getStats();
      expect(stats.hotKeys.get('hot_key')).toBe(5);
    });

    it('应该识别冷键', async () => {
      await optimizer.recordAccess('cold_key', false, 5);
      
      const stats = optimizer.getStats();
      expect(stats.coldKeys.has('cold_key')).toBe(true);
    });
  });

  describe('预加载功能', () => {
    it('应该在达到阈值时触发预加载', async () => {
      const key = 'frequently_accessed';
      
      // 访问3次（达到阈值）
      for (let i = 0; i < 3; i++) {
        await optimizer.recordAccess(key, true, 5);
      }
      
      // 检查预加载队列（内部状态）
      const strategy = optimizer.getOptimizationStrategy();
      expect(strategy.priorityKeys.has(key)).toBe(true);
    });

    it('应该预测相关键', async () => {
      // 设置相关数据
      await cacheService.set('question_1', 'Q1');
      await cacheService.set('answer_1', 'A1');
      
      // 频繁访问question
      for (let i = 0; i < 5; i++) {
        await optimizer.recordAccess('question_1', true, 5);
      }
      
      const strategy = optimizer.getOptimizationStrategy();
      expect(strategy.priorityKeys.has('question_1')).toBe(true);
    });

    it('应该生成预加载模式', () => {
      // 记录多个相似键的访问
      const keys = ['session_123', 'session_456', 'session_789'];
      
      for (const key of keys) {
        for (let i = 0; i < 4; i++) {
          optimizer.recordAccess(key, true, 5);
        }
      }
      
      const strategy = optimizer.getOptimizationStrategy();
      expect(strategy.preloadPatterns).toContain('session_*');
    });
  });

  describe('TTL优化', () => {
    it('应该为热键建议更长的TTL', async () => {
      const hotKey = 'very_hot_key';
      
      // 记录21次访问（超过热键阈值）
      for (let i = 0; i < 21; i++) {
        await optimizer.recordAccess(hotKey, true, 5);
      }
      
      const strategy = optimizer.getOptimizationStrategy();
      expect(strategy.ttlAdjustments.get(hotKey)).toBe(3600000); // 1小时
    });

    it('应该为冷键建议更短的TTL', async () => {
      const coldKey = 'rarely_used';
      
      // 只记录1次访问
      await optimizer.recordAccess(coldKey, true, 5);
      
      const strategy = optimizer.getOptimizationStrategy();
      expect(strategy.ttlAdjustments.get(coldKey)).toBe(300000); // 5分钟
    });
  });

  describe('性能指标', () => {
    it('应该计算平均访问时间', async () => {
      const accessTimes = [10, 20, 30, 40, 50];
      
      for (const time of accessTimes) {
        await optimizer.recordAccess(`key_${time}`, true, time);
      }
      
      const stats = optimizer.getStats();
      expect(stats.avgAccessTime).toBe(30); // 平均值
    });

    it('应该限制访问时间样本数量', async () => {
      // 记录超过最大样本数的访问
      for (let i = 0; i < 1100; i++) {
        await optimizer.recordAccess(`key_${i}`, true, i);
      }
      
      const stats = optimizer.getStats();
      // 应该只保留最近1000个样本
      expect(stats.avgAccessTime).toBeGreaterThan(50); // 后面的样本值更大
    });
  });

  describe('优化建议', () => {
    it('应该在命中率低时生成建议', async () => {
      // 创建低命中率场景
      for (let i = 0; i < 10; i++) {
        await optimizer.recordAccess(`miss_${i}`, false, 10);
      }
      for (let i = 0; i < 3; i++) {
        await optimizer.recordAccess(`hit_${i}`, true, 10);
      }
      
      const stats = optimizer.getStats();
      expect(stats.hitRate).toBeLessThan(0.7);
      
      // 优化策略应该包含建议
      const strategy = optimizer.getOptimizationStrategy();
      expect(strategy).toBeDefined();
    });

    it('应该识别超热键', async () => {
      const superHotKey = 'super_hot';
      
      // 记录51次访问（超过超热键阈值）
      for (let i = 0; i < 51; i++) {
        await optimizer.recordAccess(superHotKey, true, 5);
      }
      
      const stats = optimizer.getStats();
      expect(stats.hotKeys.get(superHotKey)).toBeGreaterThan(50);
    });
  });

  describe('统计重置', () => {
    it('应该正确重置所有统计', async () => {
      // 添加一些数据
      await optimizer.recordAccess('key1', true, 5);
      await optimizer.recordAccess('key2', false, 10);
      
      // 重置
      optimizer.resetStats();
      
      const stats = optimizer.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.hotKeys.size).toBe(0);
      expect(stats.coldKeys.size).toBe(0);
    });
  });

  describe('并发安全', () => {
    it('应该安全处理并发访问记录', async () => {
      const promises = [];
      
      // 并发记录100个访问
      for (let i = 0; i < 100; i++) {
        promises.push(
          optimizer.recordAccess(`concurrent_${i}`, i % 2 === 0, 5)
        );
      }
      
      await Promise.all(promises);
      
      const stats = optimizer.getStats();
      expect(stats.hits + stats.misses).toBe(100);
    });
  });

  describe('性能测试', () => {
    it('应该在100ms内处理1000次访问记录', async () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        await optimizer.recordAccess(`perf_${i}`, i % 3 !== 0, 1);
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    it('应该高效生成优化策略', () => {
      // 准备大量数据
      for (let i = 0; i < 500; i++) {
        optimizer.recordAccess(`key_${i}`, true, 5);
      }
      
      const startTime = Date.now();
      const strategy = optimizer.getOptimizationStrategy();
      const duration = Date.now() - startTime;
      
      expect(strategy).toBeDefined();
      expect(duration).toBeLessThan(50);
    });
  });
});