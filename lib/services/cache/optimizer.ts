/**
 * 缓存优化器
 * 负责提升缓存命中率和优化缓存策略
 */

import { ICacheService } from './cache.interface';
import { createLogger } from '../../utils/logger';
import { socraticPerformance } from '../socratic-performance';

const logger = createLogger('cache-optimizer');

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  avgAccessTime: number;
  hotKeys: Map<string, number>;
  coldKeys: Set<string>;
  evictionCount: number;
}

export interface OptimizationStrategy {
  preloadPatterns: string[];
  ttlAdjustments: Map<string, number>;
  priorityKeys: Set<string>;
  compressionEnabled: boolean;
}

export class CacheOptimizer {
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    avgAccessTime: 0,
    hotKeys: new Map(),
    coldKeys: new Set(),
    evictionCount: 0
  };

  private accessTimes: number[] = [];
  private readonly maxAccessTimeSamples = 1000;
  private preloadQueue: Set<string> = new Set();
  private optimizationInterval: NodeJS.Timeout | null = null;

  constructor(
    private cacheService: ICacheService,
    private config: {
      enablePreloading?: boolean;
      enableCompression?: boolean;
      optimizationIntervalMs?: number;
      hitRateThreshold?: number;
      preloadThreshold?: number;
    } = {}
  ) {
    this.config = {
      enablePreloading: true,
      enableCompression: true,
      optimizationIntervalMs: 60000, // 1分钟
      hitRateThreshold: 0.7, // 70%命中率
      preloadThreshold: 5, // 访问5次以上预加载
      ...config
    };

    this.startOptimization();
  }

  /**
   * 开始优化循环
   */
  private startOptimization() {
    if (this.config.optimizationIntervalMs) {
      this.optimizationInterval = setInterval(() => {
        this.runOptimization();
      }, this.config.optimizationIntervalMs);
    }
  }

  /**
   * 记录缓存访问
   */
  public async recordAccess(
    key: string,
    hit: boolean,
    accessTime: number
  ): Promise<void> {
    // 更新统计
    if (hit) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }

    // 计算命中率
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;

    // 记录访问时间
    this.accessTimes.push(accessTime);
    if (this.accessTimes.length > this.maxAccessTimeSamples) {
      this.accessTimes.shift();
    }
    this.stats.avgAccessTime = this.calculateAverage(this.accessTimes);

    // 更新热键统计
    const accessCount = this.stats.hotKeys.get(key) || 0;
    this.stats.hotKeys.set(key, accessCount + 1);

    // 标记冷键
    if (!hit && accessCount === 0) {
      this.stats.coldKeys.add(key);
    } else if (hit && this.stats.coldKeys.has(key)) {
      this.stats.coldKeys.delete(key);
    }

    // 记录到性能监控
    await socraticPerformance.recordCacheMetrics({
      hits: hit ? 1 : 0,
      misses: hit ? 0 : 1,
      hitRate: this.stats.hitRate * 100,
      size: this.stats.hotKeys.size,
      evictions: 0,
      timestamp: new Date()
    });

    // 检查是否需要预加载
    if (this.config.enablePreloading && 
        accessCount >= (this.config.preloadThreshold || 5)) {
      this.preloadQueue.add(key);
    }
  }

  /**
   * 运行优化
   */
  private async runOptimization() {
    logger.info('运行缓存优化', {
      hitRate: this.stats.hitRate,
      hotKeys: this.stats.hotKeys.size,
      coldKeys: this.stats.coldKeys.size
    });

    // 1. 预加载热键相关数据
    await this.preloadRelatedData();

    // 2. 调整TTL
    await this.adjustTTL();

    // 3. 清理冷数据
    await this.evictColdData();

    // 4. 压缩大对象
    if (this.config.enableCompression) {
      await this.compressLargeObjects();
    }

    // 5. 生成优化建议
    const suggestions = this.generateOptimizationSuggestions();
    if (suggestions.length > 0) {
      logger.info('缓存优化建议', { suggestions });
    }
  }

  /**
   * 预加载相关数据
   */
  private async preloadRelatedData() {
    if (!this.config.enablePreloading || this.preloadQueue.size === 0) {
      return;
    }

    const keysToPreload = Array.from(this.preloadQueue).slice(0, 10);
    this.preloadQueue.clear();

    for (const key of keysToPreload) {
      try {
        // 分析访问模式，预加载相关数据
        const relatedKeys = this.predictRelatedKeys(key);
        
        for (const relatedKey of relatedKeys) {
          const cached = await this.cacheService.get(relatedKey);
          if (!cached) {
            // 这里应该调用实际的数据获取逻辑
            // 为了演示，我们只记录日志
            logger.debug('预加载相关数据', { 
              originalKey: key, 
              relatedKey 
            });
          }
        }
      } catch (error) {
        logger.error('预加载失败', { key, error });
      }
    }
  }

  /**
   * 预测相关键
   */
  private predictRelatedKeys(key: string): string[] {
    const related: string[] = [];
    
    // 基于键的模式预测相关数据
    if (key.includes('question')) {
      // 问题相关的答案和分析
      related.push(key.replace('question', 'answer'));
      related.push(key.replace('question', 'analysis'));
    } else if (key.includes('level_')) {
      // 相邻层级的数据
      const match = key.match(/level_(\d+)/);
      if (match) {
        const level = parseInt(match[1]);
        if (level > 1) {
          related.push(key.replace(`level_${level}`, `level_${level - 1}`));
        }
        if (level < 5) {
          related.push(key.replace(`level_${level}`, `level_${level + 1}`));
        }
      }
    } else if (key.includes('session_')) {
      // 会话相关的用户和消息
      related.push(key.replace('session_', 'user_'));
      related.push(key.replace('session_', 'messages_'));
    }

    return related;
  }

  /**
   * 调整TTL
   */
  private async adjustTTL() {
    const ttlAdjustments = new Map<string, number>();

    // 根据访问频率调整TTL
    for (const [key, count] of this.stats.hotKeys.entries()) {
      if (count > 20) {
        // 热键延长TTL
        ttlAdjustments.set(key, 3600000); // 1小时
      } else if (count > 10) {
        ttlAdjustments.set(key, 1800000); // 30分钟
      } else if (count < 2) {
        // 冷键缩短TTL
        ttlAdjustments.set(key, 300000); // 5分钟
      }
    }

    // 应用TTL调整
    for (const [key, ttl] of ttlAdjustments.entries()) {
      try {
        const value = await this.cacheService.get(key);
        if (value) {
          await this.cacheService.set(key, value, ttl);
        }
      } catch (error) {
        logger.error('TTL调整失败', { key, error });
      }
    }

    logger.debug('TTL调整完成', { 
      adjustedCount: ttlAdjustments.size 
    });
  }

  /**
   * 清理冷数据
   */
  private async evictColdData() {
    const coldThreshold = 2; // 访问次数少于2次的视为冷数据
    const keysToEvict: string[] = [];

    for (const [key, count] of this.stats.hotKeys.entries()) {
      if (count < coldThreshold) {
        keysToEvict.push(key);
      }
    }

    // 保留至少50%的缓存空间
    const maxEvictions = Math.floor(keysToEvict.length * 0.5);
    const actualEvictions = keysToEvict.slice(0, maxEvictions);

    for (const key of actualEvictions) {
      try {
        await this.cacheService.invalidate(key);
        this.stats.hotKeys.delete(key);
        this.stats.evictionCount++;
      } catch (error) {
        logger.error('清理冷数据失败', { key, error });
      }
    }

    if (actualEvictions.length > 0) {
      logger.info('冷数据清理完成', { 
        evicted: actualEvictions.length,
        totalEvictions: this.stats.evictionCount
      });
    }
  }

  /**
   * 压缩大对象
   */
  private async compressLargeObjects() {
    // 这里应该实现实际的压缩逻辑
    // 为了演示，我们只记录日志
    logger.debug('压缩大对象检查');
    
    // 可以使用 zlib 或其他压缩库
    // 对于大于某个阈值的对象进行压缩
  }

  /**
   * 生成优化建议
   */
  private generateOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];

    // 命中率建议
    if (this.stats.hitRate < (this.config.hitRateThreshold || 0.7)) {
      suggestions.push(
        `缓存命中率较低 (${(this.stats.hitRate * 100).toFixed(2)}%)，建议：` +
        `1) 增加缓存容量 2) 优化缓存键设计 3) 调整过期策略`
      );
    }

    // 访问时间建议
    if (this.stats.avgAccessTime > 10) {
      suggestions.push(
        `平均访问时间较高 (${this.stats.avgAccessTime.toFixed(2)}ms)，建议：` +
        `1) 使用内存缓存 2) 优化序列化 3) 考虑分片存储`
      );
    }

    // 热键建议
    const hotKeyThreshold = 50;
    const veryHotKeys = Array.from(this.stats.hotKeys.entries())
      .filter(([_, count]) => count > hotKeyThreshold);
    
    if (veryHotKeys.length > 0) {
      suggestions.push(
        `发现 ${veryHotKeys.length} 个超热键，建议：` +
        `1) 实施多级缓存 2) 考虑CDN缓存 3) 数据预加载`
      );
    }

    // 冷键建议
    if (this.stats.coldKeys.size > this.stats.hotKeys.size * 0.5) {
      suggestions.push(
        `冷键过多 (${this.stats.coldKeys.size})，建议：` +
        `1) 缩短冷数据TTL 2) 实施LRU淘汰 3) 定期清理`
      );
    }

    return suggestions;
  }

  /**
   * 获取优化策略
   */
  public getOptimizationStrategy(): OptimizationStrategy {
    const strategy: OptimizationStrategy = {
      preloadPatterns: [],
      ttlAdjustments: new Map(),
      priorityKeys: new Set(),
      compressionEnabled: this.config.enableCompression || false
    };

    // 生成预加载模式
    for (const [key, count] of this.stats.hotKeys.entries()) {
      if (count > (this.config.preloadThreshold || 5)) {
        // 提取模式
        const pattern = key.replace(/\d+/g, '*').replace(/_[a-z0-9]+$/i, '_*');
        if (!strategy.preloadPatterns.includes(pattern)) {
          strategy.preloadPatterns.push(pattern);
        }
        strategy.priorityKeys.add(key);
      }
    }

    // TTL调整建议
    for (const [key, count] of this.stats.hotKeys.entries()) {
      if (count > 20) {
        strategy.ttlAdjustments.set(key, 3600000); // 1小时
      } else if (count < 2) {
        strategy.ttlAdjustments.set(key, 300000); // 5分钟
      }
    }

    return strategy;
  }

  /**
   * 获取缓存统计
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 重置统计
   */
  public resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      avgAccessTime: 0,
      hotKeys: new Map(),
      coldKeys: new Set(),
      evictionCount: 0
    };
    this.accessTimes = [];
    this.preloadQueue.clear();
    
    logger.info('缓存统计已重置');
  }

  /**
   * 计算平均值
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  /**
   * 停止优化器
   */
  public stop() {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }
    
    logger.info('缓存优化器已停止');
  }
}