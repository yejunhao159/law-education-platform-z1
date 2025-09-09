/**
 * 法学Agent工厂实现
 * @module agents/legal-agent-factory
 * @description 实现Agent工厂模式，提供统一的Agent创建、管理和配置接口
 */

import {
  ILegalAgent,
  ILegalAgentFactory,
  AgentFactoryConfig,
  AgentCapabilities,
  AgentError,
  AgentErrorType
} from './legal-agent.interface'

import { LegalAgentCore, LegalAgentConfig } from './legal-agent-core'
import { PromptTemplateManager } from './prompt-templates'
import { SimilarityCalculator } from './similarity-calculator'
import { CacheService } from '@/lib/services/cache/cache.interface'
import { LocalStorageCacheService } from '@/lib/services/cache/local-storage-cache.service'

// ============== 工厂配置接口 ==============

/**
 * 工厂全局配置
 */
export interface FactoryGlobalConfig {
  /** 默认Agent类型 */
  defaultAgentType: 'openai' | 'claude' | 'local' | 'fallback'
  /** 全局缓存配置 */
  globalCacheConfig?: {
    enabled: boolean
    defaultTTL: number
    maxEntries: number
  }
  /** 性能监控配置 */
  monitoringConfig?: {
    enableMetrics: boolean
    metricsInterval: number
    logLevel: 'debug' | 'info' | 'warn' | 'error'
  }
  /** 限流配置 */
  rateLimitConfig?: {
    globalRequestsPerMinute: number
    perAgentRequestsPerMinute: number
  }
}

/**
 * Agent实例状态
 */
interface AgentInstanceState {
  /** Agent实例 */
  instance: ILegalAgent
  /** 创建时间 */
  createdAt: number
  /** 最后使用时间 */
  lastUsedAt: number
  /** 使用次数 */
  usageCount: number
  /** 是否健康 */
  isHealthy: boolean
  /** Agent配置 */
  config: AgentFactoryConfig
}

/**
 * 工厂统计信息
 */
export interface FactoryStats {
  /** 总创建的Agent数量 */
  totalAgentsCreated: number
  /** 当前活跃Agent数量 */
  activeAgentCount: number
  /** 各类型Agent数量 */
  agentTypeDistribution: Record<string, number>
  /** 平均Agent存活时间 */
  averageAgentLifetime: number
  /** 工厂运行时间 */
  factoryUptime: number
  /** 错误统计 */
  errorStats: Record<AgentErrorType, number>
}

// ============== 核心工厂实现 ==============

/**
 * 法学Agent工厂实现
 */
export class LegalAgentFactory implements ILegalAgentFactory {
  private globalConfig: FactoryGlobalConfig
  private agents: Map<string, AgentInstanceState>
  private templateManager: PromptTemplateManager
  private similarityCalculator: SimilarityCalculator
  private cacheService?: CacheService
  private stats: FactoryStats
  private cleanupTimer?: NodeJS.Timeout
  private monitoringTimer?: NodeJS.Timeout
  private createdAt: number

  constructor(
    globalConfig: Partial<FactoryGlobalConfig> = {},
    templateManager?: PromptTemplateManager,
    similarityCalculator?: SimilarityCalculator,
    cacheService?: CacheService
  ) {
    this.globalConfig = {
      defaultAgentType: globalConfig.defaultAgentType || 'fallback',
      globalCacheConfig: {
        enabled: true,
        defaultTTL: 3600000, // 1小时
        maxEntries: 1000,
        ...globalConfig.globalCacheConfig
      },
      monitoringConfig: {
        enableMetrics: true,
        metricsInterval: 60000, // 1分钟
        logLevel: 'info',
        ...globalConfig.monitoringConfig
      },
      rateLimitConfig: {
        globalRequestsPerMinute: 1000,
        perAgentRequestsPerMinute: 60,
        ...globalConfig.rateLimitConfig
      }
    }

    this.agents = new Map()
    this.templateManager = templateManager || new PromptTemplateManager()
    this.similarityCalculator = similarityCalculator || new SimilarityCalculator()
    this.cacheService = cacheService
    this.createdAt = Date.now()

    // 初始化统计信息
    this.stats = {
      totalAgentsCreated: 0,
      activeAgentCount: 0,
      agentTypeDistribution: {},
      averageAgentLifetime: 0,
      factoryUptime: 0,
      errorStats: {} as Record<AgentErrorType, number>
    }

    this.initializeCleanupService()
    this.initializeMonitoring()
  }

  // ============== 核心工厂方法 ==============

  /**
   * 创建法学Agent实例
   */
  async createAgent(config: AgentFactoryConfig): Promise<ILegalAgent> {
    try {
      // 验证配置
      this.validateAgentConfig(config)

      // 生成Agent ID
      const agentId = this.generateAgentId(config.type)

      // 构建具体的Agent配置
      const agentConfig = this.buildAgentConfig(agentId, config)

      // 根据类型创建不同的Agent实例
      const agent = await this.createAgentByType(config.type, agentConfig)

      // 注册Agent实例
      this.registerAgent(agentId, agent, config)

      // 更新统计信息
      this.updateCreationStats(config.type)

      return agent

    } catch (error) {
      this.recordError(AgentErrorType.UNKNOWN_ERROR, error)
      throw this.wrapError(error, 'Failed to create agent')
    }
  }

  /**
   * 获取支持的Agent类型列表
   */
  getSupportedTypes(): string[] {
    return ['openai', 'claude', 'local', 'fallback']
  }

  /**
   * 销毁Agent实例
   */
  async destroyAgent(agentId: string): Promise<void> {
    const agentState = this.agents.get(agentId)
    if (!agentState) {
      throw new AgentError(
        AgentErrorType.UNKNOWN_ERROR,
        `Agent with id ${agentId} not found`
      )
    }

    try {
      // 重置Agent状态
      await agentState.instance.reset()

      // 从注册表中移除
      this.agents.delete(agentId)

      // 更新统计信息
      this.updateDestructionStats(agentState)

    } catch (error) {
      this.recordError(AgentErrorType.UNKNOWN_ERROR, error)
      throw this.wrapError(error, `Failed to destroy agent ${agentId}`)
    }
  }

  // ============== Agent类型特化创建方法 ==============

  /**
   * 根据类型创建Agent
   */
  private async createAgentByType(
    type: 'openai' | 'claude' | 'local' | 'fallback',
    config: LegalAgentConfig
  ): Promise<ILegalAgent> {
    switch (type) {
      case 'openai':
        return this.createOpenAIAgent(config)
      case 'claude':
        return this.createClaudeAgent(config)
      case 'local':
        return this.createLocalAgent(config)
      case 'fallback':
        return this.createFallbackAgent(config)
      default:
        throw new AgentError(
          AgentErrorType.UNKNOWN_ERROR,
          `Unsupported agent type: ${type}`
        )
    }
  }

  /**
   * 创建OpenAI Agent
   */
  private async createOpenAIAgent(config: LegalAgentConfig): Promise<ILegalAgent> {
    // OpenAI特化配置
    const openaiConfig = {
      ...config,
      apiConfig: {
        ...config.apiConfig,
        endpoint: config.apiConfig.endpoint || 'https://api.openai.com/v1/chat/completions',
        model: config.apiConfig.model || 'gpt-4'
      }
    }

    return new LegalAgentCore(
      openaiConfig,
      this.templateManager,
      this.getCacheServiceForAgent(config)
    )
  }

  /**
   * 创建Claude Agent
   */
  private async createClaudeAgent(config: LegalAgentConfig): Promise<ILegalAgent> {
    // Claude特化配置
    const claudeConfig = {
      ...config,
      apiConfig: {
        ...config.apiConfig,
        endpoint: config.apiConfig.endpoint || 'https://api.anthropic.com/v1/messages',
        model: config.apiConfig.model || 'claude-3-sonnet-20240229'
      }
    }

    return new LegalAgentCore(
      claudeConfig,
      this.templateManager,
      this.getCacheServiceForAgent(config)
    )
  }

  /**
   * 创建本地Agent
   */
  private async createLocalAgent(config: LegalAgentConfig): Promise<ILegalAgent> {
    // 本地模型配置
    const localConfig = {
      ...config,
      apiConfig: {
        ...config.apiConfig,
        endpoint: config.apiConfig.endpoint || 'http://localhost:8080/v1/chat/completions',
        model: config.apiConfig.model || 'local-legal-model'
      }
    }

    return new LegalAgentCore(
      localConfig,
      this.templateManager,
      this.getCacheServiceForAgent(config)
    )
  }

  /**
   * 创建回退Agent（模拟Agent）
   */
  private async createFallbackAgent(config: LegalAgentConfig): Promise<ILegalAgent> {
    // 回退配置（使用模拟API）
    const fallbackConfig = {
      ...config,
      apiConfig: {
        ...config.apiConfig,
        endpoint: 'mock://fallback',
        model: 'fallback-mock-model'
      }
    }

    return new LegalAgentCore(
      fallbackConfig,
      this.templateManager,
      this.getCacheServiceForAgent(config)
    )
  }

  // ============== Agent管理方法 ==============

  /**
   * 获取所有活跃的Agent
   */
  getActiveAgents(): string[] {
    return Array.from(this.agents.keys())
  }

  /**
   * 获取Agent实例
   */
  getAgent(agentId: string): ILegalAgent | null {
    const agentState = this.agents.get(agentId)
    if (agentState) {
      agentState.lastUsedAt = Date.now()
      agentState.usageCount++
      return agentState.instance
    }
    return null
  }

  /**
   * 检查Agent健康状态
   */
  async checkAgentHealth(agentId: string): Promise<boolean> {
    const agentState = this.agents.get(agentId)
    if (!agentState) return false

    try {
      const isHealthy = await agentState.instance.healthCheck()
      agentState.isHealthy = isHealthy
      return isHealthy
    } catch (error) {
      agentState.isHealthy = false
      return false
    }
  }

  /**
   * 批量健康检查
   */
  async performHealthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {}
    
    const healthCheckPromises = Array.from(this.agents.entries()).map(
      async ([agentId, agentState]) => {
        try {
          const isHealthy = await agentState.instance.healthCheck()
          agentState.isHealthy = isHealthy
          results[agentId] = isHealthy
        } catch (error) {
          agentState.isHealthy = false
          results[agentId] = false
        }
      }
    )

    await Promise.all(healthCheckPromises)
    return results
  }

  // ============== 统计和监控 ==============

  /**
   * 获取工厂统计信息
   */
  getStats(): FactoryStats {
    this.updateRuntimeStats()
    return { ...this.stats }
  }

  /**
   * 获取详细的Agent信息
   */
  getAgentInfo(agentId: string): any {
    const agentState = this.agents.get(agentId)
    if (!agentState) return null

    return {
      id: agentId,
      type: agentState.config.type,
      createdAt: agentState.createdAt,
      lastUsedAt: agentState.lastUsedAt,
      usageCount: agentState.usageCount,
      isHealthy: agentState.isHealthy,
      lifetime: Date.now() - agentState.createdAt,
      config: {
        // 返回安全的配置信息（隐藏敏感信息）
        type: agentState.config.type,
        enableCache: agentState.config.enableCache,
        // 不返回API密钥等敏感信息
      }
    }
  }

  /**
   * 获取所有Agent的概览信息
   */
  getAgentsOverview(): any[] {
    return Array.from(this.agents.keys()).map(agentId => this.getAgentInfo(agentId))
  }

  // ============== 配置管理 ==============

  /**
   * 更新全局配置
   */
  updateGlobalConfig(config: Partial<FactoryGlobalConfig>): void {
    this.globalConfig = { ...this.globalConfig, ...config }
    
    // 重新初始化相关服务
    if (config.monitoringConfig) {
      this.reinitializeMonitoring()
    }
  }

  /**
   * 获取全局配置
   */
  getGlobalConfig(): FactoryGlobalConfig {
    return { ...this.globalConfig }
  }

  // ============== 清理和维护 ==============

  /**
   * 清理闲置的Agent
   */
  async cleanupIdleAgents(maxIdleTime: number = 3600000): Promise<string[]> {
    const now = Date.now()
    const idleAgents: string[] = []

    for (const [agentId, agentState] of this.agents.entries()) {
      if (now - agentState.lastUsedAt > maxIdleTime) {
        idleAgents.push(agentId)
      }
    }

    // 销毁闲置的Agent
    for (const agentId of idleAgents) {
      try {
        await this.destroyAgent(agentId)
      } catch (error) {
        console.error(`Failed to cleanup idle agent ${agentId}:`, error)
      }
    }

    return idleAgents
  }

  /**
   * 重启不健康的Agent
   */
  async restartUnhealthyAgents(): Promise<string[]> {
    const restartedAgents: string[] = []

    for (const [agentId, agentState] of this.agents.entries()) {
      if (!agentState.isHealthy) {
        try {
          // 保存原配置
          const originalConfig = { ...agentState.config }
          
          // 销毁旧Agent
          await this.destroyAgent(agentId)
          
          // 创建新Agent
          const newAgent = await this.createAgent(originalConfig)
          
          restartedAgents.push(agentId)
        } catch (error) {
          console.error(`Failed to restart unhealthy agent ${agentId}:`, error)
        }
      }
    }

    return restartedAgents
  }

  /**
   * 销毁工厂
   */
  async destroy(): Promise<void> {
    // 停止定时器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer)
    }

    // 销毁所有Agent
    const destroyPromises = Array.from(this.agents.keys()).map(agentId => 
      this.destroyAgent(agentId).catch(error => 
        console.error(`Failed to destroy agent ${agentId}:`, error)
      )
    )

    await Promise.all(destroyPromises)

    // 清理缓存
    if (this.cacheService && 'clear' in this.cacheService) {
      await (this.cacheService as any).clear()
    }
  }

  // ============== 私有辅助方法 ==============

  /**
   * 验证Agent配置
   */
  private validateAgentConfig(config: AgentFactoryConfig): void {
    if (!config.type) {
      throw new AgentError(AgentErrorType.INVALID_INPUT, 'Agent type is required')
    }

    if (!this.getSupportedTypes().includes(config.type)) {
      throw new AgentError(
        AgentErrorType.INVALID_INPUT,
        `Unsupported agent type: ${config.type}`
      )
    }

    if (!config.config) {
      throw new AgentError(AgentErrorType.INVALID_INPUT, 'Agent config is required')
    }
  }

  /**
   * 生成Agent ID
   */
  private generateAgentId(type: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `${type}-agent-${timestamp}-${random}`
  }

  /**
   * 构建Agent配置
   */
  private buildAgentConfig(agentId: string, config: AgentFactoryConfig): LegalAgentConfig {
    const baseConfig = config.config as any

    return {
      id: agentId,
      name: baseConfig.name || `Legal Agent ${agentId}`,
      version: baseConfig.version || '1.0.0',
      apiConfig: {
        endpoint: baseConfig.endpoint || '',
        apiKey: baseConfig.apiKey || '',
        model: baseConfig.model || 'default',
        maxTokens: baseConfig.maxTokens,
        temperature: baseConfig.temperature,
        timeout: baseConfig.timeout
      },
      cacheConfig: {
        enabled: config.enableCache ?? this.globalConfig.globalCacheConfig?.enabled ?? true,
        ttl: config.cacheConfig?.ttl ?? this.globalConfig.globalCacheConfig?.defaultTTL,
        maxEntries: config.cacheConfig?.maxSize ?? this.globalConfig.globalCacheConfig?.maxEntries
      },
      performanceConfig: {
        enableTracking: true,
        maxRetries: baseConfig.maxRetries || 3,
        rateLimit: {
          requestsPerMinute: this.globalConfig.rateLimitConfig?.perAgentRequestsPerMinute || 60,
          concurrentRequests: baseConfig.concurrentRequests || 5
        }
      }
    }
  }

  /**
   * 获取Agent专用的缓存服务
   */
  private getCacheServiceForAgent(config: AgentFactoryConfig): CacheService | undefined {
    if (!config.enableCache && !this.globalConfig.globalCacheConfig?.enabled) {
      return undefined
    }

    if (this.cacheService) {
      return this.cacheService
    }

    // 创建默认的localStorage缓存服务
    try {
      return new LocalStorageCacheService({
        maxEntries: config.cacheConfig?.maxSize || 100,
        defaultTTL: config.cacheConfig?.ttl || 3600000,
        enableStats: true
      })
    } catch (error) {
      console.warn('Failed to create cache service:', error)
      return undefined
    }
  }

  /**
   * 注册Agent实例
   */
  private registerAgent(agentId: string, agent: ILegalAgent, config: AgentFactoryConfig): void {
    const now = Date.now()
    
    this.agents.set(agentId, {
      instance: agent,
      createdAt: now,
      lastUsedAt: now,
      usageCount: 0,
      isHealthy: true,
      config
    })
  }

  /**
   * 更新创建统计
   */
  private updateCreationStats(type: string): void {
    this.stats.totalAgentsCreated++
    this.stats.activeAgentCount = this.agents.size
    this.stats.agentTypeDistribution[type] = (this.stats.agentTypeDistribution[type] || 0) + 1
  }

  /**
   * 更新销毁统计
   */
  private updateDestructionStats(agentState: AgentInstanceState): void {
    this.stats.activeAgentCount = this.agents.size
    
    // 更新平均存活时间
    const lifetime = Date.now() - agentState.createdAt
    const totalLifetime = this.stats.averageAgentLifetime * (this.stats.totalAgentsCreated - this.stats.activeAgentCount - 1)
    this.stats.averageAgentLifetime = (totalLifetime + lifetime) / (this.stats.totalAgentsCreated - this.stats.activeAgentCount)
  }

  /**
   * 更新运行时统计
   */
  private updateRuntimeStats(): void {
    this.stats.factoryUptime = Date.now() - this.createdAt
  }

  /**
   * 记录错误统计
   */
  private recordError(errorType: AgentErrorType, error: any): void {
    this.stats.errorStats[errorType] = (this.stats.errorStats[errorType] || 0) + 1
  }

  /**
   * 包装错误
   */
  private wrapError(error: any, message: string): AgentError {
    if (error instanceof AgentError) {
      return error
    }

    return new AgentError(
      AgentErrorType.UNKNOWN_ERROR,
      `${message}: ${error.message || error}`,
      error
    )
  }

  /**
   * 初始化清理服务
   */
  private initializeCleanupService(): void {
    // 每30分钟清理一次闲置Agent
    this.cleanupTimer = setInterval(async () => {
      try {
        const cleaned = await this.cleanupIdleAgents()
        if (cleaned.length > 0 && this.globalConfig.monitoringConfig?.logLevel === 'debug') {
          console.log(`Cleaned up ${cleaned.length} idle agents:`, cleaned)
        }
      } catch (error) {
        console.error('Cleanup service error:', error)
      }
    }, 30 * 60 * 1000)
  }

  /**
   * 初始化监控服务
   */
  private initializeMonitoring(): void {
    if (!this.globalConfig.monitoringConfig?.enableMetrics) return

    const interval = this.globalConfig.monitoringConfig.metricsInterval
    
    this.monitoringTimer = setInterval(async () => {
      try {
        // 执行健康检查
        await this.performHealthCheck()
        
        // 重启不健康的Agent
        const restarted = await this.restartUnhealthyAgents()
        if (restarted.length > 0) {
          console.log(`Restarted ${restarted.length} unhealthy agents:`, restarted)
        }
        
        // 记录统计信息
        if (this.globalConfig.monitoringConfig?.logLevel === 'debug') {
          console.log('Factory stats:', this.getStats())
        }
      } catch (error) {
        console.error('Monitoring service error:', error)
      }
    }, interval)
  }

  /**
   * 重新初始化监控
   */
  private reinitializeMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer)
    }
    this.initializeMonitoring()
  }
}