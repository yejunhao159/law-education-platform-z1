/**
 * Agent错误处理和重试机制
 * @module agents/error-handling-retry
 * @description 为Agent系统提供智能错误处理、重试策略和故障恢复机制
 */

import {
  AgentError,
  AgentErrorType,
  AgentContext
} from './legal-agent.interface'

// ============== 错误处理配置接口 ==============

/**
 * 重试策略配置
 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number
  /** 基础延迟时间（毫秒） */
  baseDelay: number
  /** 最大延迟时间（毫秒） */
  maxDelay: number
  /** 延迟增长策略 */
  backoffStrategy: 'linear' | 'exponential' | 'fibonacci' | 'custom'
  /** 延迟倍数（指数策略） */
  backoffMultiplier: number
  /** 抖动因子（0-1） */
  jitterFactor: number
  /** 可重试的错误类型 */
  retryableErrors: AgentErrorType[]
  /** 自定义重试条件 */
  customRetryCondition?: (error: AgentError, attempt: number) => boolean
}

/**
 * 断路器配置
 */
export interface CircuitBreakerConfig {
  /** 是否启用断路器 */
  enabled: boolean
  /** 失败阈值 */
  failureThreshold: number
  /** 成功阈值（半开状态） */
  successThreshold: number
  /** 超时时间（毫秒） */
  timeout: number
  /** 监控窗口大小 */
  monitoringWindow: number
  /** 半开状态的最大请求数 */
  halfOpenMaxRequests: number
}

/**
 * 降级策略配置
 */
export interface FallbackConfig {
  /** 是否启用降级 */
  enabled: boolean
  /** 降级响应生成器 */
  responseGenerator: (context: AgentContext, error: AgentError) => Promise<any>
  /** 降级触发条件 */
  triggerConditions: {
    /** 错误类型触发 */
    errorTypes: AgentErrorType[]
    /** 超时触发 */
    timeoutThreshold: number
    /** 连续失败次数触发 */
    consecutiveFailures: number
  }
  /** 降级质量指标 */
  qualityMetrics?: {
    /** 最低可接受质量分数 */
    minQualityScore: number
    /** 质量检查器 */
    qualityChecker: (response: any) => number
  }
}

/**
 * 错误监控配置
 */
export interface ErrorMonitoringConfig {
  /** 是否启用监控 */
  enabled: boolean
  /** 错误报告器 */
  errorReporter?: (error: AgentError, context: ErrorContext) => void
  /** 指标收集器 */
  metricsCollector?: (metrics: ErrorMetrics) => void
  /** 告警配置 */
  alerting?: {
    /** 错误率阈值 */
    errorRateThreshold: number
    /** 告警间隔（毫秒） */
    alertInterval: number
    /** 告警接收器 */
    alertReceiver: (alert: ErrorAlert) => void
  }
}

// ============== 错误处理状态接口 ==============

/**
 * 重试状态
 */
interface RetryState {
  /** 重试次数 */
  attemptCount: number
  /** 首次错误时间 */
  firstErrorTime: number
  /** 最后错误时间 */
  lastErrorTime: number
  /** 错误历史 */
  errorHistory: AgentError[]
  /** 下次重试时间 */
  nextRetryTime: number
}

/**
 * 断路器状态
 */
enum CircuitState {
  CLOSED = 'closed',       // 正常状态
  OPEN = 'open',           // 断路状态
  HALF_OPEN = 'half_open'  // 半开状态
}

/**
 * 断路器状态信息
 */
interface CircuitBreakerState {
  /** 当前状态 */
  state: CircuitState
  /** 失败计数 */
  failureCount: number
  /** 成功计数（半开状态） */
  successCount: number
  /** 最后状态变更时间 */
  lastStateChangeTime: number
  /** 请求统计窗口 */
  requestWindow: Array<{ time: number; success: boolean }>
  /** 半开状态的请求计数 */
  halfOpenRequests: number
}

/**
 * 错误上下文
 */
interface ErrorContext {
  /** 操作ID */
  operationId: string
  /** Agent ID */
  agentId: string
  /** 用户上下文 */
  userContext: AgentContext
  /** 请求参数 */
  requestParams: any
  /** 开始时间 */
  startTime: number
  /** 重试状态 */
  retryState?: RetryState
}

/**
 * 错误指标
 */
interface ErrorMetrics {
  /** 总请求数 */
  totalRequests: number
  /** 总错误数 */
  totalErrors: number
  /** 错误率 */
  errorRate: number
  /** 各类型错误数量 */
  errorsByType: Record<AgentErrorType, number>
  /** 平均重试次数 */
  avgRetryCount: number
  /** 成功恢复次数 */
  successfulRecoveries: number
  /** 降级触发次数 */
  fallbackTriggers: number
}

/**
 * 错误告警
 */
interface ErrorAlert {
  /** 告警类型 */
  type: 'high_error_rate' | 'circuit_breaker_open' | 'fallback_activated'
  /** 告警消息 */
  message: string
  /** 严重级别 */
  severity: 'low' | 'medium' | 'high' | 'critical'
  /** 相关指标 */
  metrics: any
  /** 时间戳 */
  timestamp: number
}

// ============== 核心错误处理类 ==============

/**
 * Agent错误处理和重试管理器
 */
export class AgentErrorHandler {
  private retryConfig: RetryConfig
  private circuitBreakerConfig: CircuitBreakerConfig
  private fallbackConfig: FallbackConfig
  private monitoringConfig: ErrorMonitoringConfig

  private retryStates: Map<string, RetryState>
  private circuitBreakerState: CircuitBreakerState
  private errorMetrics: ErrorMetrics
  private lastAlertTime: Map<string, number>

  constructor(
    retryConfig: Partial<RetryConfig> = {},
    circuitBreakerConfig: Partial<CircuitBreakerConfig> = {},
    fallbackConfig: Partial<FallbackConfig> = {},
    monitoringConfig: Partial<ErrorMonitoringConfig> = {}
  ) {
    // 初始化重试配置
    this.retryConfig = {
      maxRetries: retryConfig.maxRetries || 3,
      baseDelay: retryConfig.baseDelay || 1000,
      maxDelay: retryConfig.maxDelay || 30000,
      backoffStrategy: retryConfig.backoffStrategy || 'exponential',
      backoffMultiplier: retryConfig.backoffMultiplier || 2,
      jitterFactor: retryConfig.jitterFactor || 0.1,
      retryableErrors: retryConfig.retryableErrors || [
        AgentErrorType.NETWORK_ERROR,
        AgentErrorType.QUOTA_ERROR,
        AgentErrorType.UNKNOWN_ERROR
      ],
      customRetryCondition: retryConfig.customRetryCondition
    }

    // 初始化断路器配置
    this.circuitBreakerConfig = {
      enabled: circuitBreakerConfig.enabled ?? true,
      failureThreshold: circuitBreakerConfig.failureThreshold || 5,
      successThreshold: circuitBreakerConfig.successThreshold || 3,
      timeout: circuitBreakerConfig.timeout || 60000,
      monitoringWindow: circuitBreakerConfig.monitoringWindow || 300000, // 5分钟
      halfOpenMaxRequests: circuitBreakerConfig.halfOpenMaxRequests || 3
    }

    // 初始化降级配置
    this.fallbackConfig = {
      enabled: fallbackConfig.enabled ?? true,
      responseGenerator: fallbackConfig.responseGenerator || this.defaultFallbackResponse,
      triggerConditions: {
        errorTypes: [AgentErrorType.NETWORK_ERROR, AgentErrorType.QUOTA_ERROR],
        timeoutThreshold: 10000,
        consecutiveFailures: 3,
        ...fallbackConfig.triggerConditions
      },
      qualityMetrics: fallbackConfig.qualityMetrics
    }

    // 初始化监控配置
    this.monitoringConfig = {
      enabled: monitoringConfig.enabled ?? true,
      errorReporter: monitoringConfig.errorReporter,
      metricsCollector: monitoringConfig.metricsCollector,
      alerting: monitoringConfig.alerting
    }

    // 初始化状态
    this.retryStates = new Map()
    this.circuitBreakerState = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastStateChangeTime: Date.now(),
      requestWindow: [],
      halfOpenRequests: 0
    }

    this.errorMetrics = {
      totalRequests: 0,
      totalErrors: 0,
      errorRate: 0,
      errorsByType: {} as Record<AgentErrorType, number>,
      avgRetryCount: 0,
      successfulRecoveries: 0,
      fallbackTriggers: 0
    }

    this.lastAlertTime = new Map()

    this.startBackgroundTasks()
  }

  // ============== 核心错误处理方法 ==============

  /**
   * 执行带错误处理的操作
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: AgentContext,
    operationId: string,
    agentId: string
  ): Promise<T> {
    const errorContext: ErrorContext = {
      operationId,
      agentId,
      userContext: context,
      requestParams: {},
      startTime: Date.now()
    }

    // 检查断路器状态
    if (this.circuitBreakerConfig.enabled && !this.canExecuteRequest()) {
      const circuitOpenError = new AgentError(
        AgentErrorType.NETWORK_ERROR,
        'Circuit breaker is open',
        undefined,
        context
      )
      
      if (this.fallbackConfig.enabled) {
        return this.executeFallback(context, circuitOpenError) as T
      } else {
        throw circuitOpenError
      }
    }

    let lastError: AgentError | null = null
    const retryKey = `${agentId}-${operationId}`
    
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries + 1; attempt++) {
      try {
        this.errorMetrics.totalRequests++
        
        // 执行操作
        const result = await this.executeWithTimeout(operation, context)
        
        // 记录成功
        this.recordSuccess(retryKey, attempt > 1)
        this.updateCircuitBreakerOnSuccess()
        
        return result

      } catch (error) {
        const agentError = this.normalizeError(error, context)
        lastError = agentError
        
        // 记录错误
        this.recordError(agentError, errorContext, attempt)
        this.updateCircuitBreakerOnFailure()

        // 判断是否应该重试
        if (attempt <= this.retryConfig.maxRetries && this.shouldRetry(agentError, attempt)) {
          const delay = this.calculateRetryDelay(attempt)
          await this.delay(delay)
          continue
        }

        // 重试次数耗尽，尝试降级
        if (this.shouldTriggerFallback(agentError, attempt)) {
          return this.executeFallback(context, agentError) as T
        }

        // 无法恢复，抛出错误
        throw agentError
      }
    }

    // 理论上不应该到达这里
    throw lastError!
  }

  /**
   * 带超时的执行
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    context: AgentContext
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new AgentError(
          AgentErrorType.NETWORK_ERROR,
          'Operation timeout',
          undefined,
          context
        ))
      }, this.circuitBreakerConfig.timeout)
    })

    return Promise.race([operation(), timeoutPromise])
  }

  // ============== 重试逻辑 ==============

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: AgentError, attempt: number): boolean {
    // 检查自定义重试条件
    if (this.retryConfig.customRetryCondition) {
      return this.retryConfig.customRetryCondition(error, attempt)
    }

    // 检查错误类型是否可重试
    if (!this.retryConfig.retryableErrors.includes(error.type)) {
      return false
    }

    // 特殊错误类型的处理
    switch (error.type) {
      case AgentErrorType.QUOTA_ERROR:
        // 配额错误需要更长的延迟
        return attempt <= 2
      case AgentErrorType.CONTENT_FILTER:
      case AgentErrorType.PARSING_ERROR:
        // 这些错误通常不需要重试
        return false
      case AgentErrorType.CONTEXT_TOO_LONG:
        // 上下文太长，重试无意义
        return false
      default:
        return true
    }
  }

  /**
   * 计算重试延迟
   */
  private calculateRetryDelay(attempt: number): number {
    let delay: number

    switch (this.retryConfig.backoffStrategy) {
      case 'linear':
        delay = this.retryConfig.baseDelay * attempt
        break
      case 'exponential':
        delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1)
        break
      case 'fibonacci':
        delay = this.retryConfig.baseDelay * this.fibonacci(attempt)
        break
      default:
        delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1)
    }

    // 添加抖动
    const jitter = delay * this.retryConfig.jitterFactor * Math.random()
    delay += jitter

    // 限制最大延迟
    return Math.min(delay, this.retryConfig.maxDelay)
  }

  /**
   * 斐波那契数列
   */
  private fibonacci(n: number): number {
    if (n <= 1) return 1
    let a = 1, b = 1
    for (let i = 2; i < n; i++) {
      [a, b] = [b, a + b]
    }
    return b
  }

  // ============== 断路器逻辑 ==============

  /**
   * 检查是否可以执行请求
   */
  private canExecuteRequest(): boolean {
    if (!this.circuitBreakerConfig.enabled) return true

    this.updateCircuitBreakerState()

    switch (this.circuitBreakerState.state) {
      case CircuitState.CLOSED:
        return true
      case CircuitState.OPEN:
        return false
      case CircuitState.HALF_OPEN:
        return this.circuitBreakerState.halfOpenRequests < this.circuitBreakerConfig.halfOpenMaxRequests
    }
  }

  /**
   * 更新断路器状态
   */
  private updateCircuitBreakerState(): void {
    const now = Date.now()
    const timeSinceLastChange = now - this.circuitBreakerState.lastStateChangeTime

    switch (this.circuitBreakerState.state) {
      case CircuitState.OPEN:
        // 检查是否应该转为半开状态
        if (timeSinceLastChange >= this.circuitBreakerConfig.timeout) {
          this.circuitBreakerState.state = CircuitState.HALF_OPEN
          this.circuitBreakerState.halfOpenRequests = 0
          this.circuitBreakerState.successCount = 0
          this.circuitBreakerState.lastStateChangeTime = now
        }
        break
      
      case CircuitState.HALF_OPEN:
        // 半开状态下根据成功/失败情况转换状态
        if (this.circuitBreakerState.successCount >= this.circuitBreakerConfig.successThreshold) {
          this.circuitBreakerState.state = CircuitState.CLOSED
          this.circuitBreakerState.failureCount = 0
          this.circuitBreakerState.lastStateChangeTime = now
        } else if (this.circuitBreakerState.failureCount > 0) {
          this.circuitBreakerState.state = CircuitState.OPEN
          this.circuitBreakerState.lastStateChangeTime = now
        }
        break
    }

    // 清理过期的请求窗口
    this.cleanupRequestWindow(now)
  }

  /**
   * 记录成功请求到断路器
   */
  private updateCircuitBreakerOnSuccess(): void {
    const now = Date.now()
    this.circuitBreakerState.requestWindow.push({ time: now, success: true })

    if (this.circuitBreakerState.state === CircuitState.HALF_OPEN) {
      this.circuitBreakerState.successCount++
    } else if (this.circuitBreakerState.state === CircuitState.CLOSED) {
      // 成功请求可以减少失败计数
      this.circuitBreakerState.failureCount = Math.max(0, this.circuitBreakerState.failureCount - 1)
    }
  }

  /**
   * 记录失败请求到断路器
   */
  private updateCircuitBreakerOnFailure(): void {
    const now = Date.now()
    this.circuitBreakerState.requestWindow.push({ time: now, success: false })
    this.circuitBreakerState.failureCount++

    // 检查是否应该打开断路器
    if (this.circuitBreakerState.state === CircuitState.CLOSED) {
      if (this.circuitBreakerState.failureCount >= this.circuitBreakerConfig.failureThreshold) {
        this.circuitBreakerState.state = CircuitState.OPEN
        this.circuitBreakerState.lastStateChangeTime = now
        
        // 触发告警
        this.triggerAlert('circuit_breaker_open', 'Circuit breaker opened due to high failure rate', 'high')
      }
    } else if (this.circuitBreakerState.state === CircuitState.HALF_OPEN) {
      // 半开状态下的失败会立即打开断路器
      this.circuitBreakerState.state = CircuitState.OPEN
      this.circuitBreakerState.lastStateChangeTime = now
    }
  }

  /**
   * 清理请求窗口
   */
  private cleanupRequestWindow(currentTime: number): void {
    const windowStart = currentTime - this.circuitBreakerConfig.monitoringWindow
    this.circuitBreakerState.requestWindow = this.circuitBreakerState.requestWindow.filter(
      request => request.time > windowStart
    )
  }

  // ============== 降级逻辑 ==============

  /**
   * 判断是否应该触发降级
   */
  private shouldTriggerFallback(error: AgentError, attempt: number): boolean {
    if (!this.fallbackConfig.enabled) return false

    const conditions = this.fallbackConfig.triggerConditions

    // 检查错误类型
    if (conditions.errorTypes.includes(error.type)) return true

    // 检查连续失败次数
    if (attempt > conditions.consecutiveFailures) return true

    return false
  }

  /**
   * 执行降级策略
   */
  private async executeFallback<T>(context: AgentContext, error: AgentError): Promise<T> {
    try {
      this.errorMetrics.fallbackTriggers++
      
      const fallbackResponse = await this.fallbackConfig.responseGenerator(context, error)
      
      // 检查降级响应质量
      if (this.fallbackConfig.qualityMetrics) {
        const qualityScore = this.fallbackConfig.qualityMetrics.qualityChecker(fallbackResponse)
        if (qualityScore < this.fallbackConfig.qualityMetrics.minQualityScore) {
          throw new AgentError(
            AgentErrorType.UNKNOWN_ERROR,
            'Fallback response quality too low',
            error,
            context
          )
        }
      }

      // 触发告警
      this.triggerAlert('fallback_activated', 'Fallback mechanism activated', 'medium')

      return fallbackResponse
    } catch (fallbackError) {
      // 降级也失败了，抛出原始错误
      throw error
    }
  }

  /**
   * 默认降级响应生成器
   */
  private async defaultFallbackResponse(context: AgentContext, error: AgentError): Promise<any> {
    return {
      content: '抱歉，系统暂时遇到了一些问题。我会尽力为您提供帮助，但可能无法提供完整的分析。请稍后再试，或者换一个问题。',
      suggestedLevel: context.dialogue.level,
      concepts: [],
      evaluation: {
        understanding: 50,
        canProgress: false,
        weakPoints: ['系统暂时不可用']
      },
      cached: false,
      responseTime: 100
    }
  }

  // ============== 状态记录和监控 ==============

  /**
   * 记录错误
   */
  private recordError(error: AgentError, context: ErrorContext, attempt: number): void {
    this.errorMetrics.totalErrors++
    this.errorMetrics.errorsByType[error.type] = (this.errorMetrics.errorsByType[error.type] || 0) + 1
    this.errorMetrics.errorRate = this.errorMetrics.totalErrors / this.errorMetrics.totalRequests

    // 更新重试状态
    const retryKey = `${context.agentId}-${context.operationId}`
    if (!this.retryStates.has(retryKey)) {
      this.retryStates.set(retryKey, {
        attemptCount: 0,
        firstErrorTime: Date.now(),
        lastErrorTime: Date.now(),
        errorHistory: [],
        nextRetryTime: 0
      })
    }

    const retryState = this.retryStates.get(retryKey)!
    retryState.attemptCount = attempt
    retryState.lastErrorTime = Date.now()
    retryState.errorHistory.push(error)
    retryState.nextRetryTime = Date.now() + this.calculateRetryDelay(attempt)

    // 监控报告
    if (this.monitoringConfig.enabled && this.monitoringConfig.errorReporter) {
      this.monitoringConfig.errorReporter(error, context)
    }

    // 检查错误率告警
    this.checkErrorRateAlert()
  }

  /**
   * 记录成功
   */
  private recordSuccess(retryKey: string, wasRetry: boolean): void {
    if (wasRetry) {
      this.errorMetrics.successfulRecoveries++
      
      // 更新平均重试次数
      const retryState = this.retryStates.get(retryKey)
      if (retryState) {
        const totalRetries = this.errorMetrics.successfulRecoveries * this.errorMetrics.avgRetryCount + retryState.attemptCount
        this.errorMetrics.avgRetryCount = totalRetries / (this.errorMetrics.successfulRecoveries + 1)
      }
    }

    // 清理重试状态
    this.retryStates.delete(retryKey)

    // 收集指标
    if (this.monitoringConfig.enabled && this.monitoringConfig.metricsCollector) {
      this.monitoringConfig.metricsCollector(this.errorMetrics)
    }
  }

  /**
   * 检查错误率告警
   */
  private checkErrorRateAlert(): void {
    if (!this.monitoringConfig.alerting) return

    const { errorRateThreshold, alertInterval, alertReceiver } = this.monitoringConfig.alerting
    
    if (this.errorMetrics.errorRate > errorRateThreshold) {
      const lastAlert = this.lastAlertTime.get('high_error_rate') || 0
      const now = Date.now()
      
      if (now - lastAlert > alertInterval) {
        alertReceiver({
          type: 'high_error_rate',
          message: `Error rate exceeded threshold: ${(this.errorMetrics.errorRate * 100).toFixed(2)}%`,
          severity: 'high',
          metrics: this.errorMetrics,
          timestamp: now
        })
        
        this.lastAlertTime.set('high_error_rate', now)
      }
    }
  }

  /**
   * 触发告警
   */
  private triggerAlert(
    type: 'high_error_rate' | 'circuit_breaker_open' | 'fallback_activated',
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): void {
    if (!this.monitoringConfig.alerting) return

    const { alertReceiver } = this.monitoringConfig.alerting
    
    alertReceiver({
      type,
      message,
      severity,
      metrics: this.getMetrics(),
      timestamp: Date.now()
    })
  }

  // ============== 辅助工具方法 ==============

  /**
   * 标准化错误
   */
  private normalizeError(error: any, context: AgentContext): AgentError {
    if (error instanceof AgentError) {
      return error
    }

    // 根据错误特征判断类型
    let errorType = AgentErrorType.UNKNOWN_ERROR
    
    if (error.message?.includes('timeout')) {
      errorType = AgentErrorType.NETWORK_ERROR
    } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      errorType = AgentErrorType.QUOTA_ERROR
    } else if (error.message?.includes('parse') || error.message?.includes('JSON')) {
      errorType = AgentErrorType.PARSING_ERROR
    } else if (error.message?.includes('context') || error.message?.includes('length')) {
      errorType = AgentErrorType.CONTEXT_TOO_LONG
    } else if (error.message?.includes('filter') || error.message?.includes('content')) {
      errorType = AgentErrorType.CONTENT_FILTER
    }

    return new AgentError(
      errorType,
      error.message || 'Unknown error occurred',
      error,
      context
    )
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 启动后台任务
   */
  private startBackgroundTasks(): void {
    // 定期清理过期的重试状态
    setInterval(() => {
      this.cleanupExpiredRetryStates()
    }, 60000) // 每分钟清理一次

    // 定期更新断路器状态
    setInterval(() => {
      this.updateCircuitBreakerState()
    }, 10000) // 每10秒更新一次
  }

  /**
   * 清理过期的重试状态
   */
  private cleanupExpiredRetryStates(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, state] of this.retryStates.entries()) {
      if (now - state.lastErrorTime > 300000) { // 5分钟无活动
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach(key => this.retryStates.delete(key))
  }

  // ============== 公共接口方法 ==============

  /**
   * 获取错误指标
   */
  getMetrics(): ErrorMetrics {
    return { ...this.errorMetrics }
  }

  /**
   * 获取断路器状态
   */
  getCircuitBreakerState(): { state: CircuitState; failureCount: number; successCount: number } {
    return {
      state: this.circuitBreakerState.state,
      failureCount: this.circuitBreakerState.failureCount,
      successCount: this.circuitBreakerState.successCount
    }
  }

  /**
   * 获取重试统计
   */
  getRetryStats(): { activeRetries: number; totalRetryStates: number } {
    return {
      activeRetries: this.retryStates.size,
      totalRetryStates: this.retryStates.size
    }
  }

  /**
   * 重置断路器
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerState = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastStateChangeTime: Date.now(),
      requestWindow: [],
      halfOpenRequests: 0
    }
  }

  /**
   * 重置错误指标
   */
  resetMetrics(): void {
    this.errorMetrics = {
      totalRequests: 0,
      totalErrors: 0,
      errorRate: 0,
      errorsByType: {} as Record<AgentErrorType, number>,
      avgRetryCount: 0,
      successfulRecoveries: 0,
      fallbackTriggers: 0
    }
  }

  /**
   * 更新配置
   */
  updateConfig(
    retryConfig?: Partial<RetryConfig>,
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>,
    fallbackConfig?: Partial<FallbackConfig>,
    monitoringConfig?: Partial<ErrorMonitoringConfig>
  ): void {
    if (retryConfig) {
      this.retryConfig = { ...this.retryConfig, ...retryConfig }
    }
    if (circuitBreakerConfig) {
      this.circuitBreakerConfig = { ...this.circuitBreakerConfig, ...circuitBreakerConfig }
    }
    if (fallbackConfig) {
      this.fallbackConfig = { ...this.fallbackConfig, ...fallbackConfig }
    }
    if (monitoringConfig) {
      this.monitoringConfig = { ...this.monitoringConfig, ...monitoringConfig }
    }
  }
}