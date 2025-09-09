/**
 * 苏格拉底式对话上下文管理器
 * @module agents/dialogue-context-manager
 * @description 管理对话状态、消息历史、层级进度和学习评估等核心上下文信息
 */

import {
  DialogueState,
  DialogueLevel,
  Message,
  MessageRole,
  Performance,
  CaseInfo,
  ControlMode,
  AgentContext,
  AgentSettings,
  DEFAULT_AGENT_SETTINGS
} from '@/lib/types/socratic'

// ============== 上下文管理接口 ==============

/**
 * 对话上下文管理器配置
 */
export interface DialogueContextConfig {
  /** 最大消息历史长度 */
  maxHistoryLength?: number
  /** 性能统计窗口大小 */
  performanceWindowSize?: number
  /** 自动保存间隔（毫秒） */
  autoSaveInterval?: number
  /** 是否启用性能追踪 */
  enablePerformanceTracking?: boolean
  /** 上下文过期时间（毫秒） */
  contextExpiryTime?: number
}

/**
 * 层级进度信息
 */
export interface LevelProgress {
  /** 当前层级 */
  level: DialogueLevel
  /** 该层级的问题数量 */
  questionCount: number
  /** 该层级的回答数量 */
  answerCount: number
  /** 该层级的平均质量分数 */
  averageQuality: number
  /** 开始时间 */
  startTime: number
  /** 结束时间（如果已完成） */
  endTime?: number
  /** 是否可以进入下一层级 */
  canProgress: boolean
  /** 关键概念掌握情况 */
  conceptMastery: Map<string, number>
}

/**
 * 上下文状态快照
 */
export interface ContextSnapshot {
  /** 快照时间 */
  timestamp: number
  /** 会话ID */
  sessionId: string
  /** 对话状态 */
  dialogueState: DialogueState
  /** 层级进度 */
  levelProgress: Map<DialogueLevel, LevelProgress>
  /** 元数据 */
  metadata: {
    /** 快照版本 */
    version: string
    /** 创建原因 */
    reason: 'auto' | 'manual' | 'checkpoint'
    /** 数据完整性哈希 */
    checksum?: string
  }
}

// ============== 核心上下文管理器类 ==============

/**
 * 对话上下文管理器
 * 
 * 负责管理苏格拉底式对话的完整上下文，包括：
 * - 对话状态追踪
 * - 消息历史管理
 * - 层级进度监控
 * - 性能统计分析
 * - 上下文持久化
 */
export class DialogueContextManager {
  private config: Required<DialogueContextConfig>
  private dialogueState: DialogueState
  private levelProgress: Map<DialogueLevel, LevelProgress>
  private agentSettings: AgentSettings
  private autoSaveTimer?: NodeJS.Timeout
  private contextSnapshots: ContextSnapshot[]
  
  constructor(
    initialState: DialogueState,
    config: DialogueContextConfig = {},
    agentSettings: AgentSettings = DEFAULT_AGENT_SETTINGS
  ) {
    this.config = {
      maxHistoryLength: config.maxHistoryLength ?? 100,
      performanceWindowSize: config.performanceWindowSize ?? 10,
      autoSaveInterval: config.autoSaveInterval ?? 30000, // 30秒
      enablePerformanceTracking: config.enablePerformanceTracking ?? true,
      contextExpiryTime: config.contextExpiryTime ?? 3600000 // 1小时
    }
    
    this.dialogueState = { ...initialState }
    this.agentSettings = { ...agentSettings }
    this.levelProgress = new Map()
    this.contextSnapshots = []
    
    this.initializeLevelProgress()
    this.startAutoSave()
  }

  // ============== 对话状态管理 ==============

  /**
   * 获取当前对话状态
   */
  getDialogueState(): DialogueState {
    return { ...this.dialogueState }
  }

  /**
   * 更新对话状态
   */
  updateDialogueState(updates: Partial<DialogueState>): void {
    this.dialogueState = {
      ...this.dialogueState,
      ...updates,
      lastActivityAt: Date.now()
    }
    
    this.validateStateConsistency()
  }

  /**
   * 获取当前层级
   */
  getCurrentLevel(): DialogueLevel {
    return this.dialogueState.currentLevel
  }

  /**
   * 设置当前层级
   */
  setCurrentLevel(level: DialogueLevel): boolean {
    const currentProgress = this.levelProgress.get(this.dialogueState.currentLevel)
    
    // 检查是否可以进入下一层级
    if (level > this.dialogueState.currentLevel && currentProgress && !currentProgress.canProgress) {
      return false
    }
    
    // 结束当前层级
    if (currentProgress && !currentProgress.endTime) {
      currentProgress.endTime = Date.now()
    }
    
    // 开始新层级
    if (!this.levelProgress.has(level)) {
      this.initializeLevelProgress(level)
    }
    
    this.dialogueState.currentLevel = level
    this.dialogueState.lastActivityAt = Date.now()
    
    return true
  }

  // ============== 消息历史管理 ==============

  /**
   * 添加消息到历史记录
   */
  addMessage(message: Omit<Message, 'id' | 'timestamp'>): Message {
    const fullMessage: Message = {
      ...message,
      id: this.generateMessageId(),
      timestamp: Date.now()
    }
    
    this.dialogueState.messages.push(fullMessage)
    this.updateLevelProgress(fullMessage)
    this.updatePerformance(fullMessage)
    this.trimHistory()
    
    this.dialogueState.lastActivityAt = Date.now()
    
    return fullMessage
  }

  /**
   * 获取消息历史
   */
  getMessageHistory(limit?: number): Message[] {
    const messages = [...this.dialogueState.messages]
    return limit ? messages.slice(-limit) : messages
  }

  /**
   * 获取当前层级的消息
   */
  getCurrentLevelMessages(): Message[] {
    const currentLevel = this.dialogueState.currentLevel
    return this.dialogueState.messages.filter(msg => msg.level === currentLevel)
  }

  /**
   * 获取最近的对话上下文
   */
  getRecentContext(windowSize?: number): Message[] {
    const size = windowSize ?? this.config.performanceWindowSize
    return this.dialogueState.messages.slice(-size)
  }

  // ============== 层级进度管理 ==============

  /**
   * 获取层级进度
   */
  getLevelProgress(level?: DialogueLevel): LevelProgress | Map<DialogueLevel, LevelProgress> {
    if (level !== undefined) {
      return this.levelProgress.get(level) || this.createDefaultLevelProgress(level)
    }
    return new Map(this.levelProgress)
  }

  /**
   * 评估是否可以进入下一层级
   */
  canProgressToNextLevel(): boolean {
    const currentProgress = this.levelProgress.get(this.dialogueState.currentLevel)
    if (!currentProgress) return false
    
    // 基础条件检查
    const hasMinQuestions = currentProgress.questionCount >= 2
    const hasMinAnswers = currentProgress.answerCount >= 2
    const hasGoodQuality = currentProgress.averageQuality >= 60
    const hasSpentTime = (Date.now() - currentProgress.startTime) >= 60000 // 至少1分钟
    
    const canProgress = hasMinQuestions && hasMinAnswers && hasGoodQuality && hasSpentTime
    
    currentProgress.canProgress = canProgress
    return canProgress
  }

  /**
   * 获取下一个层级
   */
  getNextLevel(): DialogueLevel | null {
    const currentLevel = this.dialogueState.currentLevel
    const levels = [
      DialogueLevel.OBSERVATION,
      DialogueLevel.FACTS,
      DialogueLevel.ANALYSIS,
      DialogueLevel.APPLICATION,
      DialogueLevel.VALUES
    ]
    
    const currentIndex = levels.indexOf(currentLevel)
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null
  }

  // ============== 性能统计管理 ==============

  /**
   * 获取性能统计
   */
  getPerformance(): Performance {
    return { ...this.dialogueState.performance }
  }

  /**
   * 更新性能统计
   */
  private updatePerformance(message: Message): void {
    if (!this.config.enablePerformanceTracking) return
    
    const performance = this.dialogueState.performance
    
    if (message.role === MessageRole.STUDENT) {
      // 更新学生回答相关的统计
      if (message.metadata?.quality !== undefined) {
        performance.questionCount++
        
        // 计算正确率（基于质量分数）
        const isCorrect = message.metadata.quality >= 70
        const totalAnswers = performance.questionCount
        const correctAnswers = Math.round(performance.correctRate * (totalAnswers - 1) / 100)
        const newCorrectAnswers = correctAnswers + (isCorrect ? 1 : 0)
        performance.correctRate = (newCorrectAnswers / totalAnswers) * 100
        
        // 更新思考时间
        if (message.metadata.thinkingTime) {
          performance.thinkingTime.push(message.metadata.thinkingTime)
          performance.avgResponseTime = performance.thinkingTime.reduce((a, b) => a + b, 0) / performance.thinkingTime.length
        }
        
        // 更新层级停留时间
        if (!performance.levelDuration) {
          performance.levelDuration = {} as Record<DialogueLevel, number>
        }
        
        const levelProgress = this.levelProgress.get(message.level)
        if (levelProgress) {
          const duration = Date.now() - levelProgress.startTime
          performance.levelDuration[message.level] = duration
        }
      }
    }
  }

  // ============== Agent上下文构建 ==============

  /**
   * 构建Agent上下文
   */
  buildAgentContext(caseInfo: CaseInfo): AgentContext {
    return {
      case: caseInfo,
      dialogue: {
        level: this.dialogueState.currentLevel,
        history: this.getRecentContext(),
        performance: this.getPerformance()
      },
      settings: this.agentSettings,
      metadata: {
        teacherId: this.dialogueState.sessionId.startsWith('teacher-') 
          ? this.dialogueState.sessionId.split('-')[1] 
          : undefined,
        className: this.extractClassNameFromContext(),
        tags: this.generateContextTags()
      }
    }
  }

  // ============== 上下文持久化 ==============

  /**
   * 创建上下文快照
   */
  createSnapshot(reason: 'auto' | 'manual' | 'checkpoint' = 'manual'): ContextSnapshot {
    const snapshot: ContextSnapshot = {
      timestamp: Date.now(),
      sessionId: this.dialogueState.sessionId,
      dialogueState: { ...this.dialogueState },
      levelProgress: new Map(this.levelProgress),
      metadata: {
        version: '1.0.0',
        reason,
        checksum: this.calculateChecksum()
      }
    }
    
    this.contextSnapshots.push(snapshot)
    
    // 保持最多10个快照
    if (this.contextSnapshots.length > 10) {
      this.contextSnapshots.shift()
    }
    
    return snapshot
  }

  /**
   * 从快照恢复上下文
   */
  restoreFromSnapshot(snapshot: ContextSnapshot): boolean {
    try {
      // 验证快照完整性
      if (snapshot.metadata.checksum && !this.verifyChecksum(snapshot)) {
        return false
      }
      
      this.dialogueState = { ...snapshot.dialogueState }
      this.levelProgress = new Map(snapshot.levelProgress)
      
      return true
    } catch (error) {
      console.error('Failed to restore from snapshot:', error)
      return false
    }
  }

  /**
   * 导出上下文数据
   */
  exportContext(): string {
    const exportData = {
      version: '1.0.0',
      exportedAt: Date.now(),
      dialogueState: this.dialogueState,
      levelProgress: Array.from(this.levelProgress.entries()),
      agentSettings: this.agentSettings,
      config: this.config,
      snapshots: this.contextSnapshots.slice(-3) // 只导出最近3个快照
    }
    
    return JSON.stringify(exportData, null, 2)
  }

  /**
   * 导入上下文数据
   */
  importContext(data: string): boolean {
    try {
      const importData = JSON.parse(data)
      
      if (importData.dialogueState) {
        this.dialogueState = importData.dialogueState
      }
      
      if (importData.levelProgress) {
        this.levelProgress = new Map(importData.levelProgress)
      }
      
      if (importData.agentSettings) {
        this.agentSettings = importData.agentSettings
      }
      
      if (importData.snapshots) {
        this.contextSnapshots = importData.snapshots
      }
      
      return true
    } catch (error) {
      console.error('Failed to import context:', error)
      return false
    }
  }

  // ============== 清理和销毁 ==============

  /**
   * 清理过期数据
   */
  cleanup(): void {
    const now = Date.now()
    const expiryTime = this.config.contextExpiryTime
    
    // 清理过期的消息
    this.dialogueState.messages = this.dialogueState.messages.filter(
      msg => now - msg.timestamp < expiryTime
    )
    
    // 清理过期的快照
    this.contextSnapshots = this.contextSnapshots.filter(
      snapshot => now - snapshot.timestamp < expiryTime
    )
    
    // 清理性能数据中的过期时间记录
    if (this.dialogueState.performance.thinkingTime.length > this.config.performanceWindowSize * 2) {
      this.dialogueState.performance.thinkingTime = this.dialogueState.performance.thinkingTime.slice(-this.config.performanceWindowSize)
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = undefined
    }
    
    // 创建最终快照
    this.createSnapshot('auto')
    
    // 清理引用
    this.levelProgress.clear()
    this.contextSnapshots = []
  }

  // ============== 私有辅助方法 ==============

  /**
   * 初始化层级进度
   */
  private initializeLevelProgress(level?: DialogueLevel): void {
    const levels = level ? [level] : [
      DialogueLevel.OBSERVATION,
      DialogueLevel.FACTS,
      DialogueLevel.ANALYSIS,
      DialogueLevel.APPLICATION,
      DialogueLevel.VALUES
    ]
    
    levels.forEach(lvl => {
      if (!this.levelProgress.has(lvl)) {
        this.levelProgress.set(lvl, this.createDefaultLevelProgress(lvl))
      }
    })
  }

  /**
   * 创建默认层级进度
   */
  private createDefaultLevelProgress(level: DialogueLevel): LevelProgress {
    return {
      level,
      questionCount: 0,
      answerCount: 0,
      averageQuality: 0,
      startTime: Date.now(),
      canProgress: false,
      conceptMastery: new Map()
    }
  }

  /**
   * 更新层级进度
   */
  private updateLevelProgress(message: Message): void {
    const progress = this.levelProgress.get(message.level)
    if (!progress) return
    
    if (message.role === MessageRole.AGENT) {
      progress.questionCount++
    } else if (message.role === MessageRole.STUDENT) {
      progress.answerCount++
      
      if (message.metadata?.quality !== undefined) {
        const totalAnswers = progress.answerCount
        const oldTotal = progress.averageQuality * (totalAnswers - 1)
        progress.averageQuality = (oldTotal + message.metadata.quality) / totalAnswers
      }
      
      // 更新概念掌握度
      if (message.metadata?.keywords) {
        message.metadata.keywords.forEach(keyword => {
          const currentMastery = progress.conceptMastery.get(keyword) || 0
          const qualityScore = message.metadata?.quality || 50
          const newMastery = (currentMastery + qualityScore) / 2
          progress.conceptMastery.set(keyword, newMastery)
        })
      }
    }
    
    // 重新评估进度状态
    this.canProgressToNextLevel()
  }

  /**
   * 修剪消息历史
   */
  private trimHistory(): void {
    if (this.dialogueState.messages.length > this.config.maxHistoryLength) {
      // 保留最近的消息，但确保每个层级至少有一些消息
      const messagesToKeep = this.config.maxHistoryLength
      const excessMessages = this.dialogueState.messages.length - messagesToKeep
      
      if (excessMessages > 0) {
        // 保持层级分布的均衡删除
        this.dialogueState.messages = this.dialogueState.messages.slice(excessMessages)
      }
    }
  }

  /**
   * 验证状态一致性
   */
  private validateStateConsistency(): void {
    // 验证当前层级是否存在于消息中
    const hasMessagesForCurrentLevel = this.dialogueState.messages.some(
      msg => msg.level === this.dialogueState.currentLevel
    )
    
    if (!hasMessagesForCurrentLevel && this.dialogueState.messages.length > 0) {
      console.warn('State inconsistency: no messages for current level')
    }
    
    // 验证性能统计的一致性
    const studentMessages = this.dialogueState.messages.filter(
      msg => msg.role === MessageRole.STUDENT
    ).length
    
    if (Math.abs(this.dialogueState.performance.questionCount - studentMessages) > 5) {
      console.warn('State inconsistency: performance count mismatch')
    }
  }

  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 启动自动保存
   */
  private startAutoSave(): void {
    if (this.config.autoSaveInterval > 0) {
      this.autoSaveTimer = setInterval(() => {
        this.createSnapshot('auto')
        this.cleanup()
      }, this.config.autoSaveInterval)
    }
  }

  /**
   * 提取课堂名称
   */
  private extractClassNameFromContext(): string | undefined {
    // 从会话ID或其他上下文信息中提取课堂名称的逻辑
    if (this.dialogueState.sessionId.includes('-')) {
      const parts = this.dialogueState.sessionId.split('-')
      return parts.length > 2 ? parts[2] : undefined
    }
    return undefined
  }

  /**
   * 生成上下文标签
   */
  private generateContextTags(): string[] {
    const tags: string[] = []
    
    // 基于当前层级添加标签
    tags.push(`level-${this.dialogueState.currentLevel}`)
    
    // 基于消息数量添加标签
    if (this.dialogueState.messages.length > 50) {
      tags.push('long-conversation')
    }
    
    // 基于性能添加标签
    if (this.dialogueState.performance.correctRate > 80) {
      tags.push('high-performance')
    }
    
    return tags
  }

  /**
   * 计算校验和
   */
  private calculateChecksum(): string {
    const data = JSON.stringify({
      sessionId: this.dialogueState.sessionId,
      messageCount: this.dialogueState.messages.length,
      currentLevel: this.dialogueState.currentLevel,
      performance: this.dialogueState.performance
    })
    
    // 简单的哈希函数（实际应用中应使用更强的哈希）
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转为32位整数
    }
    
    return hash.toString(36)
  }

  /**
   * 验证校验和
   */
  private verifyChecksum(snapshot: ContextSnapshot): boolean {
    if (!snapshot.metadata.checksum) return true
    
    const currentChecksum = this.calculateChecksum()
    return currentChecksum === snapshot.metadata.checksum
  }
}