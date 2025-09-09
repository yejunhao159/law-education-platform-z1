/**
 * 缓存服务接口定义
 * @module services/cache/cache.interface
 * @description 定义缓存服务的标准接口和数据结构
 */

import { AgentResponse } from '@/lib/types/socratic'

/**
 * 缓存条目接口
 */
export interface CacheEntry {
  /** 缓存键 */
  key: string
  /** 缓存值（Agent响应） */
  value: AgentResponse
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
 * 缓存服务接口
 * @description 定义缓存服务必须实现的方法
 */
export interface ICacheService {
  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存条目或null
   */
  get(key: string): Promise<CacheEntry | null>
  
  /**
   * 设置缓存项
   * @param key 缓存键
   * @param value Agent响应
   * @param options 缓存选项
   */
  set(key: string, value: AgentResponse, options?: CacheOptions): Promise<void>
  
  /**
   * 查找相似的缓存项
   * @param query 查询字符串
   * @param threshold 相似度阈值（0-1）
   * @returns 相似的缓存条目列表（按相似度降序）
   */
  findSimilar(query: string, threshold?: number): Promise<CacheEntry[]>
  
  /**
   * 失效匹配模式的缓存
   * @param pattern 正则表达式模式
   * @returns 失效的条目数
   */
  invalidate(pattern: string): Promise<number>
  
  /**
   * 清空所有缓存
   */
  clear(): Promise<void>
  
  /**
   * 获取缓存大小
   * @returns 缓存条目数
   */
  size(): Promise<number>
  
  /**
   * 获取缓存统计信息
   * @returns 统计信息
   */
  stats(): Promise<CacheStats>
  
  /**
   * 批量获取缓存项（可选）
   * @param keys 缓存键列表
   * @returns 缓存条目Map
   */
  mget?(keys: string[]): Promise<Map<string, CacheEntry>>
  
  /**
   * 批量设置缓存项（可选）
   * @param entries 缓存项列表
   * @param options 统一的缓存选项
   */
  mset?(entries: Array<{ key: string; value: AgentResponse }>, options?: CacheOptions): Promise<void>
  
  /**
   * 检查键是否存在（可选）
   * @param key 缓存键
   * @returns 是否存在
   */
  has?(key: string): Promise<boolean>
  
  /**
   * 获取所有键（可选）
   * @param pattern 可选的过滤模式
   * @returns 键列表
   */
  keys?(pattern?: string): Promise<string[]>
  
  /**
   * 更新访问时间（可选）
   * @param key 缓存键
   */
  touch?(key: string): Promise<boolean>
  
  /**
   * 导出缓存数据（可选）
   * @returns 序列化的缓存数据
   */
  export?(): Promise<string>
  
  /**
   * 导入缓存数据（可选）
   * @param data 序列化的缓存数据
   */
  import?(data: string): Promise<void>
}

/**
 * 缓存键生成器
 */
export class CacheKeyGenerator {
  /**
   * 生成问题缓存键
   * @param sessionId 会话ID
   * @param level 对话层级
   * @param question 问题内容
   * @returns 缓存键
   */
  static forQuestion(sessionId: string, level: number, question: string): string {
    const normalizedQuestion = question.toLowerCase().replace(/\s+/g, '-').slice(0, 50)
    return `q:${sessionId}:L${level}:${normalizedQuestion}`
  }
  
  /**
   * 生成回答缓存键
   * @param sessionId 会话ID
   * @param level 对话层级
   * @param answer 回答内容
   * @returns 缓存键
   */
  static forAnswer(sessionId: string, level: number, answer: string): string {
    const normalizedAnswer = answer.toLowerCase().replace(/\s+/g, '-').slice(0, 50)
    return `a:${sessionId}:L${level}:${normalizedAnswer}`
  }
  
  /**
   * 生成会话缓存键
   * @param sessionId 会话ID
   * @returns 缓存键
   */
  static forSession(sessionId: string): string {
    return `session:${sessionId}`
  }
  
  /**
   * 生成案例缓存键
   * @param caseId 案例ID
   * @returns 缓存键
   */
  static forCase(caseId: string): string {
    return `case:${caseId}`
  }
  
  /**
   * 解析缓存键
   * @param key 缓存键
   * @returns 解析后的组件
   */
  static parse(key: string): {
    type: 'question' | 'answer' | 'session' | 'case' | 'unknown'
    sessionId?: string
    level?: number
    content?: string
    caseId?: string
  } {
    const parts = key.split(':')
    
    if (parts[0] === 'q' && parts.length >= 4) {
      return {
        type: 'question',
        sessionId: parts[1],
        level: parseInt(parts[2].replace('L', '')),
        content: parts[3]
      }
    }
    
    if (parts[0] === 'a' && parts.length >= 4) {
      return {
        type: 'answer',
        sessionId: parts[1],
        level: parseInt(parts[2].replace('L', '')),
        content: parts[3]
      }
    }
    
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
export type CacheServiceFactory = (config?: CacheConfig, events?: CacheEvents) => ICacheService