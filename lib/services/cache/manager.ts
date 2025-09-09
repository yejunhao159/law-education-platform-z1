/**
 * 缓存管理器
 * 统一管理不同类型的缓存服务
 */

import { ICache } from './cache.interface';
import { MemoryCacheService } from './memory-cache.service';
import { createLogger } from '@/lib/utils/socratic-logger';

const logger = createLogger('cache-manager');

export interface CacheStats {
  hitRate: number;
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

export class CacheManager {
  private static instance: CacheManager;
  private cache: ICache;
  private stats: CacheStats = {
    hitRate: 0,
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0
  };

  private constructor() {
    // 默认使用内存缓存
    this.cache = new MemoryCacheService();
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * 设置缓存
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.cache.set(key, value, ttl);
      this.stats.size++;
    } catch (error) {
      logger.error('缓存设置失败', error, { key });
      throw error;
    }
  }

  /**
   * 获取缓存
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.cache.get<T>(key);
      
      if (value !== null) {
        this.stats.hits++;
      } else {
        this.stats.misses++;
      }
      
      this.updateHitRate();
      return value;
    } catch (error) {
      logger.error('缓存获取失败', error, { key });
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.cache.delete(key);
      if (result) {
        this.stats.size--;
      }
      return result;
    } catch (error) {
      logger.error('缓存删除失败', error, { key });
      return false;
    }
  }

  /**
   * 清空缓存
   */
  async clear(): Promise<void> {
    try {
      await this.cache.clear();
      this.stats.size = 0;
      this.stats.evictions++;
    } catch (error) {
      logger.error('缓存清空失败', error);
      throw error;
    }
  }

  /**
   * 检查缓存是否存在
   */
  async has(key: string): Promise<boolean> {
    try {
      return await this.cache.has(key);
    } catch (error) {
      logger.error('缓存检查失败', error, { key });
      return false;
    }
  }

  /**
   * 获取缓存大小
   */
  async size(): Promise<number> {
    try {
      return await this.cache.size();
    } catch (error) {
      logger.error('获取缓存大小失败', error);
      return 0;
    }
  }

  /**
   * 获取所有缓存键
   */
  async keys(): Promise<string[]> {
    try {
      return await this.cache.keys();
    } catch (error) {
      logger.error('获取缓存键失败', error);
      return [];
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      hitRate: 0,
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0
    };
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    if (total > 0) {
      this.stats.hitRate = this.stats.hits / total;
    }
  }

  /**
   * 设置缓存实现
   */
  setCacheImplementation(cache: ICache): void {
    this.cache = cache;
    this.resetStats();
  }
}