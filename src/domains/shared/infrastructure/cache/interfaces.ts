/**
 * 缓存服务接口定义
 * 迁移自 lib/services/cache/cache.interface.ts
 * 定义缓存服务的标准接口和数据结构
 */

/**
 * 通用缓存条目接口
 */
export interface CacheEntry<T = any> {
  /** 缓存键 */
  key: string
  /** 缓存值 */
  value: T
  /** 创建时间戳 */
  createdAt: number
  /** 最后访问时间戳 */
  lastAccessed: number
  /** 访问次数 */
  accessCount: number
  /** 过期时间戳（可选） */
  expiresAt?: number
  /** 标签列表（用于分类和检索） */
  tags?: string[]
  /** 相似度得分（查询时计算） */
  similarity?: number
  /** 元数据（扩展信息） */
  metadata?: Record<string, any>
}

/**
 * 缓存选项接口
 */
export interface CacheOptions {
  /** 生存时间（毫秒） */
  ttl?: number
  /** 标签列表 */
  tags?: string[]
  /** 优先级（用于LRU淘汰） */
  priority?: number
  /** 是否压缩存储 */
  compress?: boolean
  /** 自定义元数据 */
  metadata?: Record<string, any>
}

/**
 * 缓存统计接口
 */
export interface CacheStats {
  /** 总条目数 */
  totalEntries: number
  /** 总命中次数 */
  totalHits: number
  /** 总未命中次数 */
  totalMisses: number
  /** 命中率 */
  hitRate: number
  /** 平均访问时间（毫秒） */
  avgAccessTime?: number
  /** 内存使用量（字节） */
  memoryUsage?: number
  /** 最热门的键 */
  hottestKeys?: Array<{ key: string; count: number }>
  /** 最近访问的键 */
  recentKeys?: string[]
}

/**
 * 通用缓存服务接口
 */
export interface ICacheService<T = any> {
  /**
   * 获取缓存项
   */
  get(key: string): Promise<CacheEntry<T> | null>

  /**
   * 设置缓存项
   */
  set(key: string, value: T, options?: CacheOptions): Promise<void>

  /**
   * 查找相似的缓存项
   */
  findSimilar(query: string, threshold?: number): Promise<CacheEntry<T>[]>

  /**
   * 失效匹配模式的缓存
   */
  invalidate(pattern: string): Promise<number>

  /**
   * 清空所有缓存
   */
  clear(): Promise<void>

  /**
   * 获取缓存大小
   */
  size(): Promise<number>

  /**
   * 获取缓存统计信息
   */
  stats(): Promise<CacheStats>

  /**
   * 批量获取缓存项（可选）
   */
  mget?(keys: string[]): Promise<Map<string, CacheEntry<T>>>

  /**
   * 批量设置缓存项（可选）
   */
  mset?(entries: Array<{ key: string; value: T }>, options?: CacheOptions): Promise<void>

  /**
   * 检查键是否存在（可选）
   */
  has?(key: string): Promise<boolean>

  /**
   * 获取所有键（可选）
   */
  keys?(pattern?: string): Promise<string[]>

  /**
   * 更新访问时间（可选）
   */
  touch?(key: string): Promise<boolean>

  /**
   * 导出缓存数据（可选）
   */
  export?(): Promise<string>

  /**
   * 导入缓存数据（可选）
   */
  import?(data: string): Promise<void>
}

/**
 * 抽象缓存键生成器
 */
export abstract class BaseCacheKeyGenerator {
  /**
   * 生成会话缓存键
   */
  static forSession(sessionId: string): string {
    return `session:${sessionId}`
  }

  /**
   * 生成案例缓存键
   */
  static forCase(caseId: string): string {
    return `case:${caseId}`
  }

  /**
   * 解析缓存键
   */
  static parse(key: string): {
    type: 'session' | 'case' | 'unknown'
    sessionId?: string
    caseId?: string
    [key: string]: any
  } {
    const parts = key.split(':')

    if (parts[0] === 'session' && parts.length >= 2) {
      return {
        type: 'session',
        sessionId: parts[1]
      }
    }

    if (parts[0] === 'case' && parts.length >= 2) {
      return {
        type: 'case',
        caseId: parts[1]
      }
    }

    return { type: 'unknown' }
  }
}

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  /** 最大缓存条目数 */
  maxEntries?: number
  /** 默认TTL（毫秒） */
  defaultTTL?: number
  /** 是否启用压缩 */
  enableCompression?: boolean
  /** 是否启用统计 */
  enableStats?: boolean
  /** 清理间隔（毫秒） */
  cleanupInterval?: number
  /** 跳过初始清理（测试用） */
  skipInitialCleanup?: boolean
  /** 相似度算法 */
  similarityAlgorithm?: 'jaccard' | 'cosine' | 'levenshtein'
  /** 存储后端 */
  backend?: 'memory' | 'localStorage' | 'redis'
}

/**
 * 缓存事件接口
 */
export interface CacheEvents {
  /** 缓存命中事件 */
  onHit?: (key: string, entry: CacheEntry) => void
  /** 缓存未命中事件 */
  onMiss?: (key: string) => void
  /** 缓存设置事件 */
  onSet?: (key: string, entry: CacheEntry) => void
  /** 缓存失效事件 */
  onEvict?: (key: string, reason: 'expired' | 'lru' | 'manual') => void
  /** 缓存清空事件 */
  onClear?: () => void
}

/**
 * 创建缓存服务的工厂函数类型
 */
export type CacheServiceFactory<T = any> = (config?: CacheConfig, events?: CacheEvents) => ICacheService<T>