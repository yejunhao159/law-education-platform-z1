/**
 * 法学苏格拉底Agent核心实现
 * @module agents/legal-agent-core
 * @description 实现ILegalAgent接口，提供完整的苏格拉底式法学教学AI功能
 */

import {
  ILegalAgent,
  QuestionGenerationOptions,
  AnswerAnalysisOptions,
  ProgressEvaluationOptions,
  AgentCapabilities,
  AgentStats,
  AgentError,
  AgentErrorType,
  AGENT_DEFAULTS
} from './legal-agent.interface'

import {
  AgentContext,
  AgentResponse,
  DialogueLevel,
  CaseInfo,
  Difficulty,
  Message,
  MessageRole
} from '@/lib/types/socratic'

import { PromptTemplateManager } from './prompt-templates'
import { DialogueContextManager } from './dialogue-context-manager'
import { CacheService } from '@/lib/services/cache/cache.interface'

// ============== Agent配置接口 ==============

/**
 * Agent核心配置
 */
export interface LegalAgentConfig {
  /** Agent ID */
  id: string
  /** Agent名称 */
  name: string
  /** Agent版本 */
  version: string
  /** API配置 */
  apiConfig: {
    /** API端点 */
    endpoint: string
    /** API密钥 */
    apiKey: string
    /** 模型名称 */
    model: string
    /** 最大token数 */
    maxTokens?: number
    /** 温度参数 */
    temperature?: number
    /** 超时时间（毫秒） */
    timeout?: number
  }
  /** 缓存配置 */
  cacheConfig?: {
    /** 是否启用缓存 */
    enabled: boolean
    /** 缓存TTL（毫秒） */
    ttl?: number
    /** 最大缓存条目数 */
    maxEntries?: number
  }
  /** 性能配置 */
  performanceConfig?: {
    /** 是否启用性能追踪 */
    enableTracking: boolean
    /** 最大重试次数 */
    maxRetries?: number
    /** 请求限流配置 */
    rateLimit?: {
      /** 每分钟最大请求数 */
      requestsPerMinute: number
      /** 并发请求数 */
      concurrentRequests: number
    }
  }
}

/**
 * API响应接口
 */
interface APIResponse {
  /** 生成的内容 */
  content: string
  /** 响应时间（毫秒） */
  responseTime: number
  /** 使用的token数 */
  tokensUsed: number
  /** 是否被限流 */
  rateLimited?: boolean
  /** 模型信息 */
  model: string
}

// ============== 核心Agent实现 ==============

/**
 * 法学苏格拉底Agent核心实现
 */
export class LegalAgentCore implements ILegalAgent {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly capabilities: AgentCapabilities
  
  private config: LegalAgentConfig
  private templateManager: PromptTemplateManager
  private cacheService?: CacheService
  private stats: AgentStats
  private isHealthy: boolean
  
  constructor(
    config: LegalAgentConfig,
    templateManager?: PromptTemplateManager,
    cacheService?: CacheService
  ) {
    this.config = config
    this.id = config.id
    this.name = config.name
    this.version = config.version
    
    // 初始化组件
    this.templateManager = templateManager || new PromptTemplateManager()
    this.cacheService = cacheService
    
    // 初始化能力描述
    this.capabilities = {
      supportedAreas: [
        '合同法', '侵权法', '公司法', '刑法', '行政法',
        '民法', '商法', '知识产权法', '劳动法', '环境法'
      ],
      supportedLanguages: ['zh-CN'],
      maxContextLength: config.apiConfig.maxTokens || AGENT_DEFAULTS.MAX_TOKENS,
      supportsStreaming: true,
      supportsBatch: false
    }
    
    // 初始化统计信息
    this.stats = {
      totalQuestions: 0,
      totalAnswers: 0,
      avgResponseTime: 0,
      cacheHitRate: 0,
      successRate: 100,
      recentCalls: 0
    }
    
    this.isHealthy = true
    this.initializeHealthCheck()
  }

  // ============== 核心Agent方法实现 ==============

  /**
   * 生成苏格拉底式问题
   */
  async generateQuestion(
    context: AgentContext,
    options: QuestionGenerationOptions
  ): Promise<AgentResponse> {
    const startTime = Date.now()
    
    try {
      // 验证输入
      this.validateQuestionGenerationInput(context, options)
      
      // 检查缓存
      const cacheKey = this.generateCacheKey('question', context, options)
      const cachedResponse = await this.getCachedResponse(cacheKey)
      if (cachedResponse) {
        this.updateStats('question', Date.now() - startTime, true, true)
        return cachedResponse
      }
      
      // 获取模板
      const template = this.templateManager.getTemplate(
        options.targetLevel,
        'questionGeneration'
      )
      
      // 构建模板变量
      const templateVariables = this.buildTemplateVariables(context, options)
      
      // 渲染模板
      const renderedTemplate = this.templateManager.renderTemplate(template, templateVariables)
      
      // 调用API生成问题
      const apiResponse = await this.callAPI(
        renderedTemplate.system,
        renderedTemplate.user
      )
      
      // 构建Agent响应
      const agentResponse = this.buildQuestionResponse(
        apiResponse,
        context,
        options,
        Date.now() - startTime
      )
      
      // 缓存结果
      await this.cacheResponse(cacheKey, agentResponse)
      
      // 更新统计
      this.updateStats('question', Date.now() - startTime, true, false)
      
      return agentResponse
      
    } catch (error) {
      this.updateStats('question', Date.now() - startTime, false, false)
      throw this.handleError(error, context)
    }
  }

  /**
   * 分析学生答案
   */
  async analyzeAnswer(
    context: AgentContext,
    studentAnswer: string,
    options: AnswerAnalysisOptions
  ): Promise<AgentResponse> {
    const startTime = Date.now()
    
    try {
      // 验证输入
      this.validateAnswerAnalysisInput(context, studentAnswer, options)
      
      // 检查缓存
      const cacheKey = this.generateCacheKey('analysis', { context, studentAnswer, options })
      const cachedResponse = await this.getCachedResponse(cacheKey)
      if (cachedResponse) {
        this.updateStats('answer', Date.now() - startTime, true, true)
        return cachedResponse
      }
      
      // 使用专门的分析模板（如果有的话）
      let template
      try {
        template = this.templateManager.getTemplate(
          context.dialogue.level,
          'answerEvaluation'
        )
      } catch {
        // 回退到问题生成模板
        template = this.templateManager.getTemplate(
          context.dialogue.level,
          'questionGeneration'
        )
      }
      
      // 构建模板变量（包含学生答案）
      const templateVariables = this.buildAnalysisTemplateVariables(
        context,
        studentAnswer,
        options
      )
      
      // 渲染模板
      const renderedTemplate = this.templateManager.renderTemplate(template, templateVariables)
      
      // 调用API分析答案
      const apiResponse = await this.callAPI(
        renderedTemplate.system + '\n\n请分析学生的回答质量和准确性。',
        renderedTemplate.user + `\n\n学生回答："${studentAnswer}"`
      )
      
      // 构建分析响应
      const agentResponse = this.buildAnalysisResponse(
        apiResponse,
        context,
        studentAnswer,
        options,
        Date.now() - startTime
      )
      
      // 缓存结果
      await this.cacheResponse(cacheKey, agentResponse)
      
      // 更新统计
      this.updateStats('answer', Date.now() - startTime, true, false)
      
      return agentResponse
      
    } catch (error) {
      this.updateStats('answer', Date.now() - startTime, false, false)
      throw this.handleError(error, context)
    }
  }

  /**
   * 评估学习进度
   */
  async evaluateProgress(
    context: AgentContext,
    options: ProgressEvaluationOptions = {}
  ): Promise<AgentResponse> {
    const startTime = Date.now()
    
    try {
      // 分析对话历史
      const recentHistory = this.getRecentHistory(context, options.windowSize || 10)
      
      // 计算理解程度指标
      const understanding = this.calculateUnderstanding(recentHistory, context)
      
      // 评估是否可以进入下一层级
      const canProgress = this.evaluateCanProgress(understanding, context)
      
      // 识别薄弱点
      const weakPoints = this.identifyWeakPoints(recentHistory, context)
      
      // 生成建议（如果需要）
      const suggestions = options.includeSuggestions 
        ? await this.generateSuggestions(context, understanding, weakPoints)
        : undefined
      
      // 构建进度评估响应
      const agentResponse: AgentResponse = {
        content: this.formatProgressEvaluation(understanding, canProgress, weakPoints, suggestions),
        evaluation: {
          understanding,
          canProgress,
          weakPoints
        },
        suggestedLevel: canProgress ? this.getNextLevel(context.dialogue.level) : undefined,
        responseTime: Date.now() - startTime,
        cached: false
      }
      
      // 更新统计
      this.updateStats('progress', Date.now() - startTime, true, false)
      
      return agentResponse
      
    } catch (error) {
      this.updateStats('progress', Date.now() - startTime, false, false)
      throw this.handleError(error, context)
    }
  }

  // ============== 辅助方法实现 ==============

  /**
   * 获取Agent统计信息
   */
  async getStats(): Promise<AgentStats> {
    // 如果有缓存服务，也计算缓存统计
    if (this.cacheService && 'stats' in this.cacheService) {
      const cacheStats = await (this.cacheService as any).stats()
      this.stats.cacheHitRate = cacheStats.hitRate || 0
    }
    
    return { ...this.stats }
  }

  /**
   * 重置Agent状态
   */
  async reset(): Promise<void> {
    // 重置统计信息
    this.stats = {
      totalQuestions: 0,
      totalAnswers: 0,
      avgResponseTime: 0,
      cacheHitRate: 0,
      successRate: 100,
      recentCalls: 0
    }
    
    // 清理缓存（如果有）
    if (this.cacheService && 'clear' in this.cacheService) {
      await (this.cacheService as any).clear()
    }
    
    this.isHealthy = true
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      // 检查API连接
      const testResponse = await this.callAPI(
        'You are a test system.',
        'Please respond with "OK" to confirm connectivity.',
        { timeout: 5000 }
      )
      
      const isAPIHealthy = testResponse.content.includes('OK') || testResponse.content.includes('ok')
      
      // 检查关键组件
      const isTemplateManagerHealthy = this.templateManager !== null
      const isCacheHealthy = !this.cacheService || await this.testCache()
      
      this.isHealthy = isAPIHealthy && isTemplateManagerHealthy && isCacheHealthy
      
      return this.isHealthy
    } catch (error) {
      this.isHealthy = false
      console.error('Health check failed:', error)
      return false
    }
  }

  // ============== 私有辅助方法 ==============

  /**
   * 调用外部API
   */
  private async callAPI(
    systemPrompt: string,
    userPrompt: string,
    options: { timeout?: number } = {}
  ): Promise<APIResponse> {
    const startTime = Date.now()
    const timeout = options.timeout || this.config.apiConfig.timeout || AGENT_DEFAULTS.TIMEOUT
    
    try {
      // 模拟API调用（实际应用中应该调用真实的AI API）
      const mockResponse = await this.mockAPICall(systemPrompt, userPrompt, timeout)
      
      return {
        content: mockResponse,
        responseTime: Date.now() - startTime,
        tokensUsed: Math.floor(mockResponse.length / 4), // 粗略估算
        model: this.config.apiConfig.model
      }
    } catch (error) {
      throw new AgentError(
        AgentErrorType.NETWORK_ERROR,
        `API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * 模拟API调用（用于演示）
   */
  private async mockAPICall(systemPrompt: string, userPrompt: string, timeout: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('API call timeout'))
      }, timeout)
      
      // 模拟异步响应
      setTimeout(() => {
        clearTimeout(timer)
        
        // 根据提示内容生成相应的模拟回应
        if (userPrompt.includes('观察')) {
          resolve('基于案例观察，我想引导你思考：这个案例中最显眼的是什么事实？当事人双方的身份和关系如何？')
        } else if (userPrompt.includes('事实')) {
          resolve('让我们梳理一下时间线：首先发生了什么？接下来呢？这些事件之间有什么因果关系？')
        } else if (userPrompt.includes('分析')) {
          resolve('现在我们分析法律关系：双方的权利义务关系是什么？争议的焦点在哪里？')
        } else if (userPrompt.includes('应用')) {
          resolve('让我们看看法律如何适用：这种情况下应该适用哪些法条？为什么？')
        } else if (userPrompt.includes('价值')) {
          resolve('最后思考价值层面的问题：这个判决体现了什么价值取向？对社会有什么影响？')
        } else if (userPrompt.includes('学生回答')) {
          resolve('学生的回答显示了对基本概念的理解，但在法律适用方面还可以更深入。建议加强对具体法条的分析。')
        } else {
          resolve('这是一个很好的法学问题，让我们通过苏格拉底式的引导来深入探讨。')
        }
      }, Math.random() * 1000 + 500) // 500-1500ms的随机延迟
    })
  }

  /**
   * 构建模板变量
   */
  private buildTemplateVariables(context: AgentContext, options: QuestionGenerationOptions): any {
    return {
      case: context.case,
      difficulty: options.difficulty || context.settings.difficulty,
      currentLevel: this.getLevelName(options.targetLevel),
      messageHistory: context.dialogue.history,
      performance: context.dialogue.performance,
      maxQuestions: options.maxQuestions || 3,
      includeHints: options.includeHints || false
    }
  }

  /**
   * 构建分析模板变量
   */
  private buildAnalysisTemplateVariables(
    context: AgentContext,
    studentAnswer: string,
    options: AnswerAnalysisOptions
  ): any {
    return {
      case: context.case,
      studentAnswer,
      expectedKeywords: options.expectedKeywords || [],
      strictness: options.strictness,
      detailedFeedback: options.detailedFeedback || true,
      minPassingScore: options.minPassingScore || 60,
      messageHistory: context.dialogue.history
    }
  }

  /**
   * 构建问题生成响应
   */
  private buildQuestionResponse(
    apiResponse: APIResponse,
    context: AgentContext,
    options: QuestionGenerationOptions,
    responseTime: number
  ): AgentResponse {
    // 从响应中提取概念（简化版）
    const concepts = this.extractConcepts(apiResponse.content, context.case)
    
    return {
      content: apiResponse.content,
      suggestedLevel: options.targetLevel,
      concepts,
      responseTime,
      cached: false
    }
  }

  /**
   * 构建分析响应
   */
  private buildAnalysisResponse(
    apiResponse: APIResponse,
    context: AgentContext,
    studentAnswer: string,
    options: AnswerAnalysisOptions,
    responseTime: number
  ): AgentResponse {
    // 计算理解程度（基于关键词匹配等）
    const understanding = this.calculateAnswerUnderstanding(
      studentAnswer,
      options.expectedKeywords || [],
      context
    )
    
    // 判断是否可以进步
    const canProgress = understanding >= (options.minPassingScore || 60)
    
    // 识别薄弱点
    const weakPoints = this.identifyAnswerWeakPoints(studentAnswer, options.expectedKeywords || [])
    
    return {
      content: apiResponse.content,
      evaluation: {
        understanding,
        canProgress,
        weakPoints
      },
      responseTime,
      cached: false
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(type: string, ...args: any[]): string {
    const data = JSON.stringify({ type, args })
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 32位整数
    }
    return `${type}-${hash.toString(36)}`
  }

  /**
   * 获取缓存响应
   */
  private async getCachedResponse(key: string): Promise<AgentResponse | null> {
    if (!this.cacheService) return null
    
    try {
      const cached = await this.cacheService.get(key)
      if (cached) {
        return { ...cached.value, cached: true }
      }
    } catch (error) {
      console.warn('Cache get error:', error)
    }
    
    return null
  }

  /**
   * 缓存响应
   */
  private async cacheResponse(key: string, response: AgentResponse): Promise<void> {
    if (!this.cacheService || !this.config.cacheConfig?.enabled) return
    
    try {
      await this.cacheService.set(key, response, {
        ttl: this.config.cacheConfig.ttl || AGENT_DEFAULTS.CACHE_TTL
      })
    } catch (error) {
      console.warn('Cache set error:', error)
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(type: 'question' | 'answer' | 'progress', duration: number, success: boolean, cached: boolean): void {
    if (type === 'question') {
      this.stats.totalQuestions++
    } else if (type === 'answer') {
      this.stats.totalAnswers++
    }
    
    // 更新平均响应时间
    const totalCalls = this.stats.totalQuestions + this.stats.totalAnswers
    this.stats.avgResponseTime = (this.stats.avgResponseTime * (totalCalls - 1) + duration) / totalCalls
    
    // 更新成功率
    const currentSuccessRate = this.stats.successRate / 100
    const newSuccessRate = (currentSuccessRate * (totalCalls - 1) + (success ? 1 : 0)) / totalCalls
    this.stats.successRate = newSuccessRate * 100
    
    // 更新最近调用计数
    this.stats.recentCalls++
  }

  /**
   * 处理错误
   */
  private handleError(error: any, context?: AgentContext): AgentError {
    if (error instanceof AgentError) {
      return error
    }
    
    // 分类错误类型
    let errorType = AgentErrorType.UNKNOWN_ERROR
    
    if (error.message?.includes('timeout')) {
      errorType = AgentErrorType.NETWORK_ERROR
    } else if (error.message?.includes('quota')) {
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
   * 获取层级名称
   */
  private getLevelName(level: DialogueLevel): string {
    const levelNames = {
      [DialogueLevel.OBSERVATION]: '观察层',
      [DialogueLevel.FACTS]: '事实层',
      [DialogueLevel.ANALYSIS]: '分析层',
      [DialogueLevel.APPLICATION]: '应用层',
      [DialogueLevel.VALUES]: '价值层'
    }
    return levelNames[level] || '未知层级'
  }

  /**
   * 提取概念关键词
   */
  private extractConcepts(content: string, caseInfo: CaseInfo): string[] {
    const concepts: string[] = []
    
    // 从内容中提取法律概念（简化版）
    const legalTerms = [
      '合同', '违约', '赔偿', '责任', '权利', '义务',
      '法条', '法律', '判决', '证据', '事实', '争议'
    ]
    
    legalTerms.forEach(term => {
      if (content.includes(term)) {
        concepts.push(term)
      }
    })
    
    // 添加案例相关概念
    if (caseInfo.laws) {
      concepts.push(...caseInfo.laws)
    }
    
    return [...new Set(concepts)] // 去重
  }

  /**
   * 计算理解程度
   */
  private calculateUnderstanding(history: Message[], context: AgentContext): number {
    if (history.length === 0) return 0
    
    let totalQuality = 0
    let validAnswers = 0
    
    history
      .filter(msg => msg.role === MessageRole.STUDENT && msg.metadata?.quality !== undefined)
      .forEach(msg => {
        totalQuality += msg.metadata!.quality!
        validAnswers++
      })
    
    return validAnswers > 0 ? totalQuality / validAnswers : 50
  }

  /**
   * 计算答案理解程度
   */
  private calculateAnswerUnderstanding(answer: string, expectedKeywords: string[], context: AgentContext): number {
    let score = 50 // 基础分数
    
    // 基于关键词匹配
    const matchedKeywords = expectedKeywords.filter(keyword => 
      answer.toLowerCase().includes(keyword.toLowerCase())
    )
    
    if (expectedKeywords.length > 0) {
      const keywordScore = (matchedKeywords.length / expectedKeywords.length) * 30
      score += keywordScore
    }
    
    // 基于答案长度和复杂度
    const lengthScore = Math.min(answer.length / 50, 20) // 最多20分
    score += lengthScore
    
    return Math.min(score, 100)
  }

  /**
   * 评估是否可以进步
   */
  private evaluateCanProgress(understanding: number, context: AgentContext): boolean {
    // 基础条件：理解程度达标
    if (understanding < 60) return false
    
    // 检查是否有足够的互动
    const levelMessages = context.dialogue.history.filter(
      msg => msg.level === context.dialogue.level
    )
    
    const studentAnswers = levelMessages.filter(msg => msg.role === MessageRole.STUDENT)
    const agentQuestions = levelMessages.filter(msg => msg.role === MessageRole.AGENT)
    
    // 至少需要2轮问答
    return studentAnswers.length >= 2 && agentQuestions.length >= 2
  }

  /**
   * 识别薄弱点
   */
  private identifyWeakPoints(history: Message[], context: AgentContext): string[] {
    const weakPoints: string[] = []
    
    // 分析最近的回答质量
    const recentAnswers = history
      .filter(msg => msg.role === MessageRole.STUDENT && msg.metadata?.quality !== undefined)
      .slice(-3)
    
    const avgQuality = recentAnswers.reduce((sum, msg) => sum + msg.metadata!.quality!, 0) / recentAnswers.length
    
    if (avgQuality < 50) {
      weakPoints.push('基础概念理解不够深入')
    } else if (avgQuality < 70) {
      weakPoints.push('法律适用需要加强')
    }
    
    // 基于回答长度判断
    const avgLength = recentAnswers.reduce((sum, msg) => sum + msg.content.length, 0) / recentAnswers.length
    if (avgLength < 30) {
      weakPoints.push('回答过于简单，需要更详细的论述')
    }
    
    return weakPoints
  }

  /**
   * 识别答案薄弱点
   */
  private identifyAnswerWeakPoints(answer: string, expectedKeywords: string[]): string[] {
    const weakPoints: string[] = []
    
    if (answer.length < 20) {
      weakPoints.push('回答过于简短')
    }
    
    const missedKeywords = expectedKeywords.filter(keyword => 
      !answer.toLowerCase().includes(keyword.toLowerCase())
    )
    
    if (missedKeywords.length > 0) {
      weakPoints.push(`缺少关键概念：${missedKeywords.join('、')}`)
    }
    
    return weakPoints
  }

  /**
   * 获取下一个层级
   */
  private getNextLevel(currentLevel: DialogueLevel): DialogueLevel | undefined {
    const levels = [
      DialogueLevel.OBSERVATION,
      DialogueLevel.FACTS,
      DialogueLevel.ANALYSIS,
      DialogueLevel.APPLICATION,
      DialogueLevel.VALUES
    ]
    
    const currentIndex = levels.indexOf(currentLevel)
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : undefined
  }

  /**
   * 获取最近历史记录
   */
  private getRecentHistory(context: AgentContext, windowSize: number): Message[] {
    return context.dialogue.history.slice(-windowSize)
  }

  /**
   * 生成改进建议
   */
  private async generateSuggestions(
    context: AgentContext,
    understanding: number,
    weakPoints: string[]
  ): Promise<string[]> {
    const suggestions: string[] = []
    
    if (understanding < 60) {
      suggestions.push('建议回顾基础法律概念')
    }
    
    if (weakPoints.includes('基础概念理解不够深入')) {
      suggestions.push('建议加强对法律条文的学习')
    }
    
    if (weakPoints.includes('法律适用需要加强')) {
      suggestions.push('建议多练习案例分析')
    }
    
    return suggestions
  }

  /**
   * 格式化进度评估
   */
  private formatProgressEvaluation(
    understanding: number,
    canProgress: boolean,
    weakPoints: string[],
    suggestions?: string[]
  ): string {
    let result = `当前理解程度：${understanding.toFixed(1)}%\n`
    
    if (canProgress) {
      result += '✅ 已达到进入下一层级的条件\n'
    } else {
      result += '⏳ 还需要继续在当前层级深入学习\n'
    }
    
    if (weakPoints.length > 0) {
      result += '\n需要改进的方面：\n'
      weakPoints.forEach(point => {
        result += `• ${point}\n`
      })
    }
    
    if (suggestions && suggestions.length > 0) {
      result += '\n学习建议：\n'
      suggestions.forEach(suggestion => {
        result += `• ${suggestion}\n`
      })
    }
    
    return result.trim()
  }

  /**
   * 验证问题生成输入
   */
  private validateQuestionGenerationInput(context: AgentContext, options: QuestionGenerationOptions): void {
    if (!context.case) {
      throw new AgentError(AgentErrorType.INVALID_INPUT, 'Case information is required')
    }
    
    if (!context.dialogue) {
      throw new AgentError(AgentErrorType.INVALID_INPUT, 'Dialogue context is required')
    }
    
    if (options.maxQuestions && options.maxQuestions > 10) {
      throw new AgentError(AgentErrorType.INVALID_INPUT, 'Maximum questions exceeded limit (10)')
    }
  }

  /**
   * 验证答案分析输入
   */
  private validateAnswerAnalysisInput(
    context: AgentContext,
    studentAnswer: string,
    options: AnswerAnalysisOptions
  ): void {
    if (!context.case) {
      throw new AgentError(AgentErrorType.INVALID_INPUT, 'Case information is required')
    }
    
    if (!studentAnswer || studentAnswer.trim().length === 0) {
      throw new AgentError(AgentErrorType.INVALID_INPUT, 'Student answer cannot be empty')
    }
    
    if (studentAnswer.length > 5000) {
      throw new AgentError(AgentErrorType.CONTEXT_TOO_LONG, 'Student answer too long (max 5000 characters)')
    }
  }

  /**
   * 测试缓存健康状态
   */
  private async testCache(): Promise<boolean> {
    if (!this.cacheService) return true
    
    try {
      const testKey = 'health-check'
      const testValue = { test: 'data' }
      
      await this.cacheService.set(testKey, testValue)
      const retrieved = await this.cacheService.get(testKey)
      
      return retrieved !== null
    } catch (error) {
      return false
    }
  }

  /**
   * 初始化健康检查
   */
  private initializeHealthCheck(): void {
    // 每5分钟进行一次健康检查
    setInterval(async () => {
      try {
        await this.healthCheck()
      } catch (error) {
        console.error('Periodic health check failed:', error)
      }
    }, 5 * 60 * 1000)
  }
}