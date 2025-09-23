/**
 * 智能缓存策略
 * @module agents/intelligent-cache-strategy
 * @description 基于相似度计算的智能缓存系统，用于优化Agent响应性能
 */

import { SimilarityCalculator, SimilarityResult } from './similarity-calculator'
import { CacheService, CachedItem, CacheOptions } from '@/lib/services/cache/cache.interface'
import { AgentResponse, AgentContext, CaseInfo, DialogueLevel } from '@/lib/types/socratic'

// ============== 智能缓存配置接口 ==============

/**
 * 智能缓存策略配置
 */
export interface IntelligentCacheConfig {
  /** 相似度阈值（0-1） */
  similarityThreshold: number
  /** 最大缓存条目数 */
  maxCacheEntries: number
  /** 默认TTL（毫秒） */
  defaultTTL: number
  /** 是否启用上下文敏感缓存 */
  enableContextSensitive: boolean
  /** 是否启用层级敏感缓存 */
  enableLevelSensitive: boolean
  /** 缓存预热策略 */
  preWarmingConfig?: {
    enabled: boolean
    commonQuestions: string[]
    commonCases: CaseInfo[]
  }
  /** 缓存淘汰策略 */
  evictionPolicy: 'lru' | 'lfu' | 'ttl' | 'intelligent'
  /** 性能优化配置 */
  performanceConfig?: {
    enableAsync: boolean
    batchSize: number
    maxSearchTime: number
  }
}

/**
 * 缓存项元数据
 */
interface CacheItemMetadata {
  /** 创建时间 */
  createdAt: number
  /** 最后访问时间 */
  lastAccessedAt: number
  /** 访问次数 */
  accessCount: number
  /** 质量分数（基于用户反馈） */
  qualityScore: number
  /** 关联的关键词 */
  keywords: string[]
  /** 对话层级 */
  level: DialogueLevel
  /** 案例类型 */
  caseType?: string
  /** 用户满意度 */
  userSatisfaction?: number
}

/**
 * 智能缓存项
 */
interface IntelligentCacheItem {
  /** 原始查询 */
  originalQuery: string
  /** 缓存的响应 */
  response: AgentResponse
  /** 上下文哈希 */
  contextHash: string
  /** 元数据 */
  metadata: CacheItemMetadata
}

/**
 * 缓存匹配结果
 */
export interface CacheMatchResult {
  /** 是否找到匹配 */
  found: boolean
  /** 匹配的响应 */
  response?: AgentResponse
  /** 相似度信息 */
  similarity?: SimilarityResult
  /** 匹配的原始查询 */
  originalQuery?: string
  /** 是否需要调整响应 */
  needsAdjustment: boolean
  /** 调整建议 */
  adjustmentSuggestions?: string[]
}

/**
 * 缓存统计信息
 */
export interface IntelligentCacheStats {
  /** 总缓存条目数 */
  totalEntries: number
  /** 命中次数 */
  hits: number
  /** 未命中次数 */
  misses: number
  /** 智能匹配次数 */
  intelligentMatches: number
  /** 命中率 */
  hitRate: number
  /** 智能匹配率 */
  intelligentMatchRate: number
  /** 平均相似度 */
  averageSimilarity: number
  /** 节省的计算时间（毫秒） */
  timeSaved: number
  /** 缓存效率分数 */
  efficiencyScore: number
}

// ============== 核心智能缓存策略实现 ==============

/**
 * 智能缓存策略
 * 
 * 基于相似度计算的智能缓存系统：
 * - 语义相似查询匹配
 * - 上下文敏感缓存
 * - 智能缓存预热
 * - 自适应TTL调整
 * - 质量驱动的缓存管理
 */
export class IntelligentCacheStrategy {
  private config: IntelligentCacheConfig
  private cacheService: CacheService
  private similarityCalculator: SimilarityCalculator
  private cacheIndex: Map<string, IntelligentCacheItem[]>
  private stats: IntelligentCacheStats
  private qualityFeedback: Map<string, number>
  
  constructor(
    cacheService: CacheService,
    similarityCalculator: SimilarityCalculator,
    config: Partial<IntelligentCacheConfig> = {}
  ) {
    this.config = {
      similarityThreshold: config.similarityThreshold || 0.75,
      maxCacheEntries: config.maxCacheEntries || 1000,
      defaultTTL: config.defaultTTL || 3600000, // 1小时
      enableContextSensitive: config.enableContextSensitive ?? true,
      enableLevelSensitive: config.enableLevelSensitive ?? true,
      evictionPolicy: config.evictionPolicy || 'intelligent',
      preWarmingConfig: config.preWarmingConfig,
      performanceConfig: {
        enableAsync: true,
        batchSize: 10,
        maxSearchTime: 500,
        ...config.performanceConfig
      }
    }

    this.cacheService = cacheService
    this.similarityCalculator = similarityCalculator
    this.cacheIndex = new Map()
    this.qualityFeedback = new Map()
    
    // 初始化统计信息
    this.stats = {
      totalEntries: 0,
      hits: 0,
      misses: 0,
      intelligentMatches: 0,
      hitRate: 0,
      intelligentMatchRate: 0,
      averageSimilarity: 0,
      timeSaved: 0,
      efficiencyScore: 0
    }

    this.initializePreWarming()
  }

  // ============== 核心缓存方法 ==============

  /**
   * 智能缓存查询
   */
  async get(
    query: string,
    context: AgentContext,
    options: CacheOptions = {}
  ): Promise<CacheMatchResult> {
    const startTime = Date.now()
    
    try {
      // 生成上下文相关的搜索键
      const searchKeys = this.generateSearchKeys(query, context)
      
      // 尝试精确匹配
      const exactMatch = await this.tryExactMatch(query, context, searchKeys)
      if (exactMatch.found) {
        this.updateStats(true, false, Date.now() - startTime, exactMatch.similarity?.score)
        return exactMatch
      }

      // 尝试智能相似匹配
      const similarMatch = await this.tryIntelligentMatch(query, context, searchKeys)
      if (similarMatch.found) {
        this.updateStats(true, true, Date.now() - startTime, similarMatch.similarity?.score)
        return similarMatch
      }

      // 未找到匹配
      this.updateStats(false, false, Date.now() - startTime)
      return { found: false, needsAdjustment: false }

    } catch (error) {
      console.error('Intelligent cache get error:', error)
      return { found: false, needsAdjustment: false }
    }
  }

  /**
   * 智能缓存存储
   */
  async set(
    query: string,
    response: AgentResponse,
    context: AgentContext,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      // 计算智能TTL
      const intelligentTTL = this.calculateIntelligentTTL(query, response, context)
      const finalOptions = { ...options, ttl: intelligentTTL }

      // 构建智能缓存项
      const cacheItem = this.buildCacheItem(query, response, context)
      
      // 生成缓存键
      const cacheKey = this.generateCacheKey(query, context)
      
      // 存储到底层缓存
      await this.cacheService.set(cacheKey, cacheItem, finalOptions)
      
      // 更新索引
      this.updateCacheIndex(query, context, cacheItem)
      
      // 更新统计
      this.stats.totalEntries++
      
      // 执行缓存维护
      await this.performCacheMaintenance()

    } catch (error) {
      console.error('Intelligent cache set error:', error)
    }
  }

  /**
   * 批量预热缓存
   */
  async preWarmCache(
    queries: Array<{ query: string; context: AgentContext; response: AgentResponse }>
  ): Promise<void> {
    if (!this.config.preWarmingConfig?.enabled) return

    const batchSize = this.config.performanceConfig?.batchSize || 10
    
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize)
      
      const batchPromises = batch.map(({ query, context, response }) =>
        this.set(query, response, context).catch(error =>
          console.error(`Pre-warming failed for query: ${query}`, error)
        )
      )
      
      await Promise.all(batchPromises)
    }
  }

  // ============== 精确匹配策略 ==============

  /**
   * 尝试精确匹配
   */
  private async tryExactMatch(
    query: string,
    context: AgentContext,
    searchKeys: string[]
  ): Promise<CacheMatchResult> {
    for (const key of searchKeys) {
      try {
        const cached = await this.cacheService.get(key)
        if (cached) {
          const cacheItem = cached.value as IntelligentCacheItem
          
          // 更新访问统计
          this.updateAccessMetadata(cacheItem)
          
          return {
            found: true,
            response: cacheItem.response,
            similarity: { score: 1.0 } as SimilarityResult,
            originalQuery: cacheItem.originalQuery,
            needsAdjustment: false
          }
        }
      } catch (error) {
        console.warn(`Exact match failed for key ${key}:`, error)
      }
    }

    return { found: false, needsAdjustment: false }
  }

  // ============== 智能相似匹配策略 ==============

  /**
   * 尝试智能匹配
   */
  private async tryIntelligentMatch(
    query: string,
    context: AgentContext,
    searchKeys: string[]
  ): Promise<CacheMatchResult> {
    const candidates = await this.findSimilarCandidates(query, context, searchKeys)
    
    if (candidates.length === 0) {
      return { found: false, needsAdjustment: false }
    }

    // 找到最佳匹配
    const bestMatch = candidates[0]
    
    if (bestMatch.similarity.score >= this.config.similarityThreshold) {
      // 判断是否需要调整响应
      const needsAdjustment = this.shouldAdjustResponse(bestMatch.similarity, context)
      const adjustmentSuggestions = needsAdjustment 
        ? this.generateAdjustmentSuggestions(bestMatch, query, context)
        : undefined

      return {
        found: true,
        response: bestMatch.item.response,
        similarity: bestMatch.similarity,
        originalQuery: bestMatch.item.originalQuery,
        needsAdjustment,
        adjustmentSuggestions
      }
    }

    return { found: false, needsAdjustment: false }
  }

  /**
   * 查找相似候选项
   */
  private async findSimilarCandidates(
    query: string,
    context: AgentContext,
    searchKeys: string[]
  ): Promise<Array<{ item: IntelligentCacheItem; similarity: SimilarityResult }>> {
    const candidates: Array<{ item: IntelligentCacheItem; similarity: SimilarityResult }> = []
    const maxSearchTime = this.config.performanceConfig?.maxSearchTime || 500
    const searchStartTime = Date.now()

    // 基于索引快速查找
    for (const [indexKey, items] of this.cacheIndex.entries()) {
      if (Date.now() - searchStartTime > maxSearchTime) break

      // 检查层级匹配
      if (this.config.enableLevelSensitive) {
        const levelMatch = items.filter(item => item.metadata.level === context.dialogue.level)
        if (levelMatch.length > 0) {
          await this.evaluateCandidates(query, context, levelMatch, candidates)
        }
      } else {
        await this.evaluateCandidates(query, context, items, candidates)
      }
    }

    // 按相似度排序
    return candidates.sort((a, b) => b.similarity.score - a.similarity.score)
  }

  /**
   * 评估候选项
   */
  private async evaluateCandidates(
    query: string,
    context: AgentContext,
    items: IntelligentCacheItem[],
    candidates: Array<{ item: IntelligentCacheItem; similarity: SimilarityResult }>
  ): Promise<void> {
    for (const item of items) {
      try {
        // 计算查询相似度
        const similarity = this.similarityCalculator.calculateTextSimilarity(
          query,
          item.originalQuery,
          context
        )

        // 应用上下文加权
        if (this.config.enableContextSensitive) {
          similarity.score = this.applyContextWeight(similarity.score, item, context)
        }

        // 应用质量加权
        similarity.score = this.applyQualityWeight(similarity.score, item)

        if (similarity.score >= this.config.similarityThreshold * 0.8) { // 放宽阈值用于候选
          candidates.push({ item, similarity })
        }
      } catch (error) {
        console.warn('Candidate evaluation error:', error)
      }
    }
  }

  // ============== 缓存维护和优化 ==============

  /**
   * 执行缓存维护
   */
  private async performCacheMaintenance(): Promise<void> {
    if (this.stats.totalEntries <= this.config.maxCacheEntries) return

    switch (this.config.evictionPolicy) {
      case 'intelligent':
        await this.performIntelligentEviction()
        break
      case 'lru':
        await this.performLRUEviction()
        break
      case 'lfu':
        await this.performLFUEviction()
        break
      case 'ttl':
        await this.performTTLEviction()
        break
    }
  }

  /**
   * 智能淘汰策略
   */
  private async performIntelligentEviction(): Promise<void> {
    const evictionCandidates: Array<{ key: string; score: number; item: IntelligentCacheItem }> = []

    // 收集所有缓存项的评分
    for (const [indexKey, items] of this.cacheIndex.entries()) {
      for (const item of items) {
        const score = this.calculateEvictionScore(item)
        evictionCandidates.push({
          key: this.generateCacheKey(item.originalQuery, { dialogue: { level: item.metadata.level } } as AgentContext),
          score,
          item
        })
      }
    }

    // 按评分排序，移除评分最低的项
    evictionCandidates.sort((a, b) => a.score - b.score)
    
    const toEvict = evictionCandidates.slice(0, Math.ceil(this.config.maxCacheEntries * 0.1)) // 淘汰10%
    
    for (const { key, item } of toEvict) {
      try {
        await this.cacheService.delete(key)
        this.removeFromIndex(item)
        this.stats.totalEntries--
      } catch (error) {
        console.warn(`Failed to evict cache item ${key}:`, error)
      }
    }
  }

  /**
   * 计算淘汰评分
   */
  private calculateEvictionScore(item: IntelligentCacheItem): number {
    const now = Date.now()
    const age = now - item.metadata.createdAt
    const lastAccess = now - item.metadata.lastAccessedAt
    
    // 综合评分：访问频率 + 质量分数 + 时效性
    const frequencyScore = item.metadata.accessCount / 10 // 归一化
    const qualityScore = item.metadata.qualityScore / 100
    const freshnessScore = Math.max(0, 1 - age / (7 * 24 * 60 * 60 * 1000)) // 7天衰减
    const recentAccessScore = Math.max(0, 1 - lastAccess / (24 * 60 * 60 * 1000)) // 24小时衰减

    return (frequencyScore * 0.3 + qualityScore * 0.3 + freshnessScore * 0.2 + recentAccessScore * 0.2)
  }

  /**
   * LRU淘汰策略
   */
  private async performLRUEviction(): Promise<void> {
    const items: Array<{ key: string; lastAccess: number; item: IntelligentCacheItem }> = []
    
    for (const [indexKey, cacheItems] of this.cacheIndex.entries()) {
      for (const item of cacheItems) {
        const key = this.generateCacheKey(item.originalQuery, { dialogue: { level: item.metadata.level } } as AgentContext)
        items.push({ key, lastAccess: item.metadata.lastAccessedAt, item })
      }
    }

    // 按最后访问时间排序
    items.sort((a, b) => a.lastAccess - b.lastAccess)
    
    const toEvict = items.slice(0, Math.ceil(this.config.maxCacheEntries * 0.1))
    
    for (const { key, item } of toEvict) {
      try {
        await this.cacheService.delete(key)
        this.removeFromIndex(item)
        this.stats.totalEntries--
      } catch (error) {
        console.warn(`Failed to evict LRU item ${key}:`, error)
      }
    }
  }

  /**
   * LFU淘汰策略
   */
  private async performLFUEviction(): Promise<void> {
    const items: Array<{ key: string; frequency: number; item: IntelligentCacheItem }> = []
    
    for (const [indexKey, cacheItems] of this.cacheIndex.entries()) {
      for (const item of cacheItems) {
        const key = this.generateCacheKey(item.originalQuery, { dialogue: { level: item.metadata.level } } as AgentContext)
        items.push({ key, frequency: item.metadata.accessCount, item })
      }
    }

    // 按访问频率排序
    items.sort((a, b) => a.frequency - b.frequency)
    
    const toEvict = items.slice(0, Math.ceil(this.config.maxCacheEntries * 0.1))
    
    for (const { key, item } of toEvict) {
      try {
        await this.cacheService.delete(key)
        this.removeFromIndex(item)
        this.stats.totalEntries--
      } catch (error) {
        console.warn(`Failed to evict LFU item ${key}:`, error)
      }
    }
  }

  /**
   * TTL淘汰策略
   */
  private async performTTLEviction(): Promise<void> {
    const now = Date.now()
    const expiredItems: Array<{ key: string; item: IntelligentCacheItem }> = []

    for (const [indexKey, cacheItems] of this.cacheIndex.entries()) {
      for (const item of cacheItems) {
        const age = now - item.metadata.createdAt
        if (age > this.config.defaultTTL) {
          const key = this.generateCacheKey(item.originalQuery, { dialogue: { level: item.metadata.level } } as AgentContext)
          expiredItems.push({ key, item })
        }
      }
    }

    for (const { key, item } of expiredItems) {
      try {
        await this.cacheService.delete(key)
        this.removeFromIndex(item)
        this.stats.totalEntries--
      } catch (error) {
        console.warn(`Failed to evict expired item ${key}:`, error)
      }
    }
  }

  // ============== 辅助工具方法 ==============

  /**
   * 生成搜索键
   */
  private generateSearchKeys(query: string, context: AgentContext): string[] {
    const keys: string[] = []
    
    // 基础键
    keys.push(this.generateCacheKey(query, context))
    
    // 层级特定键
    if (this.config.enableLevelSensitive) {
      keys.push(this.generateLevelSpecificKey(query, context.dialogue.level))
    }
    
    // 案例类型特定键
    if (context.case?.type) {
      keys.push(this.generateCaseTypeSpecificKey(query, context.case.type))
    }

    return keys
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(query: string, context: AgentContext): string {
    const components = [
      query,
      context.dialogue?.level || 'unknown',
      context.case?.type || 'generic'
    ]
    
    if (this.config.enableContextSensitive && context.case?.id) {
      components.push(context.case.id)
    }

    return this.hashComponents(components)
  }

  /**
   * 生成层级特定键
   */
  private generateLevelSpecificKey(query: string, level: DialogueLevel): string {
    return this.hashComponents(['level', level.toString(), query])
  }

  /**
   * 生成案例类型特定键
   */
  private generateCaseTypeSpecificKey(query: string, caseType: string): string {
    return this.hashComponents(['case-type', caseType, query])
  }

  /**
   * 哈希组件
   */
  private hashComponents(components: string[]): string {
    const combined = components.join('|')
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转为32位整数
    }
    return `intelligent-cache-${hash.toString(36)}`
  }

  /**
   * 构建缓存项
   */
  private buildCacheItem(
    query: string,
    response: AgentResponse,
    context: AgentContext
  ): IntelligentCacheItem {
    return {
      originalQuery: query,
      response,
      contextHash: this.generateContextHash(context),
      metadata: {
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 1,
        qualityScore: 80, // 默认质量分数
        keywords: response.concepts || [],
        level: context.dialogue.level,
        caseType: context.case?.type
      }
    }
  }

  /**
   * 生成上下文哈希
   */
  private generateContextHash(context: AgentContext): string {
    const contextData = {
      level: context.dialogue.level,
      caseType: context.case?.type,
      caseId: this.config.enableContextSensitive ? context.case?.id : undefined
    }
    return this.hashComponents([JSON.stringify(contextData)])
  }

  /**
   * 计算智能TTL
   */
  private calculateIntelligentTTL(
    query: string,
    response: AgentResponse,
    context: AgentContext
  ): number {
    let ttl = this.config.defaultTTL
    
    // 基于响应质量调整TTL
    if (response.evaluation?.understanding && response.evaluation.understanding > 80) {
      ttl *= 1.5 // 高质量响应保存更长时间
    }
    
    // 基于概念复杂度调整TTL
    if (response.concepts && response.concepts.length > 5) {
      ttl *= 1.2 // 复杂概念保存更长时间
    }
    
    return Math.min(ttl, this.config.defaultTTL * 2) // 最大不超过2倍默认TTL
  }

  /**
   * 更新缓存索引
   */
  private updateCacheIndex(
    query: string,
    context: AgentContext,
    cacheItem: IntelligentCacheItem
  ): void {
    const indexKey = `${context.dialogue.level}-${context.case?.type || 'generic'}`
    
    if (!this.cacheIndex.has(indexKey)) {
      this.cacheIndex.set(indexKey, [])
    }
    
    this.cacheIndex.get(indexKey)!.push(cacheItem)
  }

  /**
   * 从索引中移除
   */
  private removeFromIndex(itemToRemove: IntelligentCacheItem): void {
    for (const [indexKey, items] of this.cacheIndex.entries()) {
      const index = items.findIndex(item => 
        item.originalQuery === itemToRemove.originalQuery &&
        item.contextHash === itemToRemove.contextHash
      )
      
      if (index !== -1) {
        items.splice(index, 1)
        if (items.length === 0) {
          this.cacheIndex.delete(indexKey)
        }
        break
      }
    }
  }

  /**
   * 更新访问元数据
   */
  private updateAccessMetadata(cacheItem: IntelligentCacheItem): void {
    cacheItem.metadata.lastAccessedAt = Date.now()
    cacheItem.metadata.accessCount++
  }

  /**
   * 应用上下文权重
   */
  private applyContextWeight(
    baseScore: number,
    item: IntelligentCacheItem,
    context: AgentContext
  ): number {
    let weight = 1.0

    // 层级匹配加权
    if (item.metadata.level === context.dialogue.level) {
      weight += 0.1
    }

    // 案例类型匹配加权
    if (item.metadata.caseType === context.case?.type) {
      weight += 0.05
    }

    return Math.min(baseScore * weight, 1.0)
  }

  /**
   * 应用质量权重
   */
  private applyQualityWeight(baseScore: number, item: IntelligentCacheItem): number {
    const qualityMultiplier = item.metadata.qualityScore / 100
    return baseScore * (0.8 + 0.2 * qualityMultiplier) // 质量影响权重0.8-1.0
  }

  /**
   * 判断是否需要调整响应
   */
  private shouldAdjustResponse(similarity: SimilarityResult, context: AgentContext): boolean {
    // 相似度在阈值附近的响应可能需要调整
    return similarity.score < 0.9 && similarity.score >= this.config.similarityThreshold
  }

  /**
   * 生成调整建议
   */
  private generateAdjustmentSuggestions(
    match: { item: IntelligentCacheItem; similarity: SimilarityResult },
    query: string,
    context: AgentContext
  ): string[] {
    const suggestions: string[] = []

    if (match.similarity.score < 0.85) {
      suggestions.push('考虑根据当前具体情况调整表述')
    }

    if (match.item.metadata.level !== context.dialogue.level) {
      suggestions.push('调整内容以匹配当前对话层级')
    }

    if (match.item.metadata.caseType !== context.case?.type) {
      suggestions.push('调整案例引用以匹配当前案例类型')
    }

    return suggestions
  }

  /**
   * 更新统计信息
   */
  private updateStats(
    hit: boolean,
    intelligentMatch: boolean,
    responseTime: number,
    similarity?: number
  ): void {
    if (hit) {
      this.stats.hits++
      this.stats.timeSaved += responseTime
      
      if (intelligentMatch) {
        this.stats.intelligentMatches++
        
        if (similarity) {
          const currentAvg = this.stats.averageSimilarity
          const count = this.stats.intelligentMatches
          this.stats.averageSimilarity = (currentAvg * (count - 1) + similarity) / count
        }
      }
    } else {
      this.stats.misses++
    }

    const totalRequests = this.stats.hits + this.stats.misses
    this.stats.hitRate = this.stats.hits / totalRequests
    this.stats.intelligentMatchRate = this.stats.intelligentMatches / totalRequests
    
    // 计算效率分数
    this.stats.efficiencyScore = (
      this.stats.hitRate * 0.4 +
      this.stats.intelligentMatchRate * 0.3 +
      (this.stats.averageSimilarity || 0) * 0.3
    ) * 100
  }

  // ============== 公共接口方法 ==============

  /**
   * 提供用户反馈
   */
  async provideFeedback(
    query: string,
    context: AgentContext,
    satisfaction: number
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(query, context)
    this.qualityFeedback.set(cacheKey, satisfaction)
    
    // 更新对应缓存项的质量分数
    try {
      const cached = await this.cacheService.get(cacheKey)
      if (cached) {
        const cacheItem = cached.value as IntelligentCacheItem
        cacheItem.metadata.userSatisfaction = satisfaction
        cacheItem.metadata.qualityScore = (cacheItem.metadata.qualityScore + satisfaction * 20) / 2
        
        await this.cacheService.set(cacheKey, cacheItem)
      }
    } catch (error) {
      console.error('Failed to update cache item with feedback:', error)
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): IntelligentCacheStats {
    return { ...this.stats }
  }

  /**
   * 清除所有缓存
   */
  async clearAll(): Promise<void> {
    try {
      await this.cacheService.clear()
      this.cacheIndex.clear()
      this.qualityFeedback.clear()
      
      // 重置统计信息
      this.stats = {
        totalEntries: 0,
        hits: 0,
        misses: 0,
        intelligentMatches: 0,
        hitRate: 0,
        intelligentMatchRate: 0,
        averageSimilarity: 0,
        timeSaved: 0,
        efficiencyScore: 0
      }
    } catch (error) {
      console.error('Failed to clear intelligent cache:', error)
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<IntelligentCacheConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * 获取配置
   */
  getConfig(): IntelligentCacheConfig {
    return { ...this.config }
  }

  // ============== 初始化方法 ==============

  /**
   * 初始化预热
   */
  private async initializePreWarming(): Promise<void> {
    if (!this.config.preWarmingConfig?.enabled) return

    // 这里可以添加预热逻辑，比如加载常见问题的预设响应
    console.log('Intelligent cache pre-warming initialized')
  }
}