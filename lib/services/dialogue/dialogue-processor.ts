/**
 * 问答数据处理服务
 * @module services/dialogue/dialogue-processor
 * @description 提供问答数据的预处理、格式化、验证和关键词提取功能
 */

import {
  Message,
  MessageRole,
  DialogueLevel,
  AgentResponse,
  MessageMetadata,
  CaseInfo,
  ErrorCode,
  SocraticError
} from '@/src/domains/socratic-dialogue/types'

// ============== 数据处理接口 ==============

/**
 * 文本清理选项
 */
export interface TextCleaningOptions {
  /** 移除多余空格 */
  removeExtraSpaces?: boolean
  /** 移除特殊字符 */
  removeSpecialChars?: boolean
  /** 转换为小写 */
  toLowerCase?: boolean
  /** 移除HTML标签 */
  removeHtmlTags?: boolean
  /** 最大长度限制 */
  maxLength?: number
}

/**
 * 关键词提取选项
 */
export interface KeywordExtractionOptions {
  /** 最大关键词数量 */
  maxKeywords?: number
  /** 最小关键词长度 */
  minLength?: number
  /** 是否包含法律术语 */
  includeLegalTerms?: boolean
  /** 自定义停用词 */
  customStopWords?: string[]
}

/**
 * 消息验证规则
 */
export interface MessageValidationRules {
  /** 最大内容长度 */
  maxContentLength?: number
  /** 最小内容长度 */
  minContentLength?: number
  /** 禁用词列表 */
  bannedWords?: string[]
  /** 是否检查恶意内容 */
  checkMaliciousContent?: boolean
  /** 是否检查敏感内容 */
  checkSensitiveContent?: boolean
}

/**
 * 数据处理结果
 */
export interface ProcessingResult<T> {
  /** 是否成功 */
  success: boolean
  /** 处理后的数据 */
  data?: T
  /** 错误信息 */
  error?: SocraticError
  /** 处理元数据 */
  metadata?: {
    /** 处理耗时 */
    processingTime: number
    /** 原始数据大小 */
    originalSize: number
    /** 处理后数据大小 */
    processedSize: number
    /** 应用的处理步骤 */
    appliedSteps: string[]
  }
}

// ============== 核心处理类 ==============

/**
 * 问答数据处理器
 */
export class DialogueProcessor {
  private readonly legalTerms: Set<string>
  private readonly stopWords: Set<string>
  private readonly bannedWords: Set<string>
  private readonly sensitivePatterns: RegExp[]

  constructor() {
    // 初始化法律术语词库
    this.legalTerms = new Set([
      '合同', '协议', '违约', '赔偿', '责任', '义务', '权利', '法律', '法规', '条款',
      '诉讼', '仲裁', '调解', '判决', '裁决', '执行', '证据', '证明', '举证',
      '民事', '刑事', '行政', '商事', '经济', '劳动', '婚姻', '继承', '物权',
      '债权', '侵权', '担保', '抵押', '质押', '留置', '定金', '违约金',
      '损害赔偿', '精神损害', '财产损失', '人身损害', '过错', '故意', '过失',
      '因果关系', '免责', '减责', '限责', '连带责任', '按份责任'
    ])

    // 初始化停用词
    this.stopWords = new Set([
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
      '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看',
      '好', '自己', '这', '那', '里', '就是', '可以', '什么', '怎么', '为什么'
    ])

    // 初始化禁用词
    this.bannedWords = new Set([
      '政治敏感词示例' // 实际部署时需要完善
    ])

    // 初始化敏感内容模式
    this.sensitivePatterns = [
      /政治敏感内容模式/gi, // 实际部署时需要完善
      /个人信息模式/gi,
      /恶意代码模式/gi
    ]
  }

  // ============== 文本清理方法 ==============

  /**
   * 清理文本内容
   */
  public cleanText(text: string, options: TextCleaningOptions = {}): ProcessingResult<string> {
    const startTime = Date.now()
    
    // 输入验证
    if (text === null || text === undefined) {
      return {
        success: false,
        error: {
          code: ErrorCode.INVALID_INPUT,
          message: '输入文本不能为null或undefined',
          timestamp: Date.now()
        }
      }
    }
    
    const originalSize = text.length
    const appliedSteps: string[] = []

    try {
      let cleaned = text

      // 移除HTML标签
      if (options.removeHtmlTags !== false) {
        cleaned = cleaned.replace(/<[^>]*>/g, '')
        appliedSteps.push('removeHtmlTags')
      }

      // 移除多余空格
      if (options.removeExtraSpaces !== false) {
        cleaned = cleaned.replace(/\s+/g, ' ').trim()
        appliedSteps.push('removeExtraSpaces')
      }

      // 移除特殊字符
      if (options.removeSpecialChars) {
        cleaned = cleaned.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s，。！？；：""''（）【】]/g, '')
        // 也移除多个连续的标点符号
        cleaned = cleaned.replace(/[！？]{2,}/g, '')
        appliedSteps.push('removeSpecialChars')
      }

      // 转换为小写（仅对英文）
      if (options.toLowerCase) {
        cleaned = cleaned.replace(/[a-zA-Z]/g, char => char.toLowerCase())
        appliedSteps.push('toLowerCase')
      }

      // 长度限制
      if (options.maxLength && cleaned.length > options.maxLength) {
        cleaned = cleaned.substring(0, options.maxLength)
        appliedSteps.push('truncate')
      }

      const processingTime = Date.now() - startTime

      return {
        success: true,
        data: cleaned,
        metadata: {
          processingTime,
          originalSize,
          processedSize: cleaned.length,
          appliedSteps
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: `文本清理失败: ${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: Date.now()
        }
      }
    }
  }

  // ============== 关键词提取方法 ==============

  /**
   * 提取关键词
   */
  public extractKeywords(text: string, options: KeywordExtractionOptions = {}): ProcessingResult<string[]> {
    const startTime = Date.now()
    const appliedSteps: string[] = []

    try {
      const {
        maxKeywords = 10,
        minLength = 2,
        includeLegalTerms = true,
        customStopWords = []
      } = options

      // 合并停用词
      const allStopWords = new Set([...this.stopWords, ...customStopWords])

      // 分词和筛选
      const words = this.tokenize(text)
      appliedSteps.push('tokenize')

      // 过滤停用词和短词
      const filteredWords = words.filter(word => 
        word.length >= minLength && 
        !allStopWords.has(word) &&
        /[\u4e00-\u9fa5a-zA-Z]/.test(word)
      )
      appliedSteps.push('filter')

      // 计算词频
      const wordFreq = new Map<string, number>()
      filteredWords.forEach(word => {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
      })
      appliedSteps.push('frequency')

      // 法律术语加权
      if (includeLegalTerms) {
        for (const [word, freq] of wordFreq.entries()) {
          if (this.legalTerms.has(word)) {
            wordFreq.set(word, freq * 2) // 法律术语权重翻倍
          }
        }
        appliedSteps.push('legalWeighting')
      }

      // 按频率排序并取前N个
      const keywords = Array.from(wordFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxKeywords)
        .map(([word]) => word)

      appliedSteps.push('sort')

      const processingTime = Date.now() - startTime

      return {
        success: true,
        data: keywords,
        metadata: {
          processingTime,
          originalSize: text.length,
          processedSize: keywords.length,
          appliedSteps
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: `关键词提取失败: ${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: Date.now()
        }
      }
    }
  }

  // ============== 消息验证方法 ==============

  /**
   * 验证消息内容
   */
  public validateMessage(message: Partial<Message>, rules: MessageValidationRules = {}): ProcessingResult<boolean> {
    const startTime = Date.now()
    const appliedSteps: string[] = []

    try {
      const {
        maxContentLength = 5000,
        minContentLength = 1,
        bannedWords = [],
        checkMaliciousContent = true,
        checkSensitiveContent = true
      } = rules

      // 基础字段验证
      if (!message.content) {
        return {
          success: false,
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: '消息内容不能为空',
            timestamp: Date.now()
          }
        }
      }
      appliedSteps.push('basicValidation')

      // 长度验证
      const content = message.content.trim()
      if (content.length < minContentLength) {
        return {
          success: false,
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: `消息内容太短，最少需要${minContentLength}个字符`,
            timestamp: Date.now()
          }
        }
      }

      if (content.length > maxContentLength) {
        return {
          success: false,
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: `消息内容太长，最多允许${maxContentLength}个字符`,
            timestamp: Date.now()
          }
        }
      }
      appliedSteps.push('lengthValidation')

      // 禁用词检查
      const allBannedWords = [...this.bannedWords, ...bannedWords]
      for (const bannedWord of allBannedWords) {
        if (content.includes(bannedWord)) {
          return {
            success: false,
            error: {
              code: ErrorCode.INVALID_INPUT,
              message: '消息内容包含禁用词汇',
              timestamp: Date.now()
            }
          }
        }
      }
      appliedSteps.push('bannedWordsCheck')

      // 恶意内容检查
      if (checkMaliciousContent) {
        if (this.containsMaliciousContent(content)) {
          return {
            success: false,
            error: {
              code: ErrorCode.PROMPT_INJECTION,
              message: '检测到潜在的恶意内容',
              timestamp: Date.now()
            }
          }
        }
        appliedSteps.push('maliciousContentCheck')
      }

      // 敏感内容检查
      if (checkSensitiveContent) {
        for (const pattern of this.sensitivePatterns) {
          if (pattern.test(content)) {
            return {
              success: false,
              error: {
                code: ErrorCode.INVALID_INPUT,
                message: '消息内容包含敏感信息',
                timestamp: Date.now()
              }
            }
          }
        }
        appliedSteps.push('sensitiveContentCheck')
      }

      const processingTime = Date.now() - startTime

      return {
        success: true,
        data: true,
        metadata: {
          processingTime,
          originalSize: content.length,
          processedSize: 1, // 验证结果
          appliedSteps
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: `消息验证失败: ${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: Date.now()
        }
      }
    }
  }

  // ============== 数据格式化方法 ==============

  /**
   * 格式化消息数据
   */
  public formatMessage(rawMessage: any): ProcessingResult<Message> {
    const startTime = Date.now()
    const appliedSteps: string[] = []

    try {
      // 数据清理
      const cleanResult = this.cleanText(rawMessage.content || '')
      if (!cleanResult.success) {
        return cleanResult as ProcessingResult<Message>
      }

      appliedSteps.push('clean')

      // 关键词提取
      const keywordResult = this.extractKeywords(cleanResult.data!)
      if (!keywordResult.success) {
        return keywordResult as ProcessingResult<Message>
      }

      appliedSteps.push('keywords')

      // 构建格式化的消息
      const formattedMessage: Message = {
        id: rawMessage.id || this.generateMessageId(),
        role: rawMessage.role || MessageRole.STUDENT,
        content: cleanResult.data!,
        level: rawMessage.level || DialogueLevel.OBSERVATION,
        timestamp: rawMessage.timestamp || Date.now(),
        metadata: {
          keywords: keywordResult.data,
          quality: this.calculateContentQuality(cleanResult.data!),
          thinkingTime: rawMessage.thinkingTime,
          ...rawMessage.metadata
        }
      }

      appliedSteps.push('format')

      const processingTime = Date.now() - startTime

      return {
        success: true,
        data: formattedMessage,
        metadata: {
          processingTime,
          originalSize: JSON.stringify(rawMessage).length,
          processedSize: JSON.stringify(formattedMessage).length,
          appliedSteps
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: `消息格式化失败: ${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: Date.now()
        }
      }
    }
  }

  /**
   * 格式化Agent响应数据
   */
  public formatAgentResponse(rawResponse: any, context?: { caseInfo?: CaseInfo }): ProcessingResult<AgentResponse> {
    const startTime = Date.now()
    const appliedSteps: string[] = []

    try {
      // 清理响应内容
      const cleanResult = this.cleanText(rawResponse.content || '')
      if (!cleanResult.success) {
        return cleanResult as ProcessingResult<AgentResponse>
      }

      appliedSteps.push('clean')

      // 提取概念关键词
      const conceptResult = this.extractKeywords(cleanResult.data!, {
        maxKeywords: 5,
        includeLegalTerms: true
      })
      
      appliedSteps.push('concepts')

      // 构建格式化的响应
      const formattedResponse: AgentResponse = {
        content: cleanResult.data!,
        suggestedLevel: rawResponse.suggestedLevel,
        concepts: conceptResult.success ? conceptResult.data : [],
        evaluation: rawResponse.evaluation || {
          understanding: this.calculateUnderstandingScore(cleanResult.data!),
          canProgress: true
        },
        cached: rawResponse.cached || false,
        responseTime: rawResponse.responseTime || (Date.now() - startTime)
      }

      appliedSteps.push('format')

      const processingTime = Date.now() - startTime

      return {
        success: true,
        data: formattedResponse,
        metadata: {
          processingTime,
          originalSize: JSON.stringify(rawResponse).length,
          processedSize: JSON.stringify(formattedResponse).length,
          appliedSteps
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: `Agent响应格式化失败: ${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: Date.now()
        }
      }
    }
  }

  // ============== 工具方法 ==============

  /**
   * 简单分词（中文按字符，英文按空格）
   */
  private tokenize(text: string): string[] {
    const tokens: string[] = []
    
    // 提取单个法律术语
    for (const term of this.legalTerms) {
      if (text.includes(term)) {
        tokens.push(term)
      }
    }
    
    // 提取中文词汇（2-4个字符的组合）
    const chineseMatches = text.match(/[\u4e00-\u9fa5]{2,4}/g) || []
    tokens.push(...chineseMatches)
    
    // 提取英文单词
    const englishMatches = text.match(/[a-zA-Z]{2,}/g) || []
    tokens.push(...englishMatches)
    
    return tokens
  }

  /**
   * 检查恶意内容
   */
  private containsMaliciousContent(content: string): boolean {
    const maliciousPatterns = [
      /忽略.*指令/i,
      /forget.*instructions/i,
      /system.*prompt/i,
      /jailbreak/i,
      /prompt.*injection/i
    ]

    return maliciousPatterns.some(pattern => pattern.test(content))
  }

  /**
   * 计算内容质量分数
   */
  private calculateContentQuality(content: string): number {
    let score = 50 // 基础分数

    // 长度评分
    if (content.length > 100) score += 10
    if (content.length > 200) score += 10

    // 法律术语评分
    const legalTermCount = Array.from(this.legalTerms).filter(term => 
      content.includes(term)
    ).length
    score += Math.min(legalTermCount * 5, 20)

    // 结构评分（包含标点符号表示结构良好）
    if (/[。！？；：]/.test(content)) score += 10

    return Math.min(score, 100)
  }

  /**
   * 计算理解程度分数
   */
  private calculateUnderstandingScore(content: string): number {
    // 简单的理解度评估算法
    let score = 60 // 基础分数

    // 关键词密度
    const keywords = this.extractKeywords(content)
    if (keywords.success && keywords.data!.length > 3) {
      score += 20
    }

    // 法律术语使用
    const legalTerms = Array.from(this.legalTerms).filter(term => 
      content.includes(term)
    ).length
    score += Math.min(legalTerms * 3, 20)

    return Math.min(score, 100)
  }

  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  }

  // ============== 批量处理方法 ==============

  /**
   * 批量处理消息
   */
  public async batchProcessMessages(
    messages: any[],
    options: {
      cleaningOptions?: TextCleaningOptions
      validationRules?: MessageValidationRules
      concurrency?: number
    } = {}
  ): Promise<ProcessingResult<Message[]>> {
    const startTime = Date.now()
    const { concurrency = 10 } = options
    const appliedSteps: string[] = ['batchProcess']

    try {
      const processedMessages: Message[] = []
      const errors: SocraticError[] = []

      // 分批处理
      for (let i = 0; i < messages.length; i += concurrency) {
        const batch = messages.slice(i, i + concurrency)
        
        const batchPromises = batch.map(async (message) => {
          const result = this.formatMessage(message)
          if (result.success) {
            return result.data!
          } else {
            errors.push(result.error!)
            return null
          }
        })

        const batchResults = await Promise.all(batchPromises)
        const validResults = batchResults.filter(result => result !== null)
        processedMessages.push(...validResults as Message[])
      }

      appliedSteps.push('concurrent')

      const processingTime = Date.now() - startTime

      if (errors.length > 0 && processedMessages.length === 0) {
        return {
          success: false,
          error: {
            code: ErrorCode.INTERNAL_ERROR,
            message: `批量处理失败，共${errors.length}个错误`,
            details: errors,
            timestamp: Date.now()
          }
        }
      }

      return {
        success: true,
        data: processedMessages,
        metadata: {
          processingTime,
          originalSize: messages.length,
          processedSize: processedMessages.length,
          appliedSteps
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: `批量处理失败: ${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: Date.now()
        }
      }
    }
  }

  // ============== 工具类方法 ==============

  /**
   * 获取处理器统计信息
   */
  public getStats(): {
    legalTermsCount: number
    stopWordsCount: number
    supportedOperations: string[]
  } {
    return {
      legalTermsCount: this.legalTerms.size,
      stopWordsCount: this.stopWords.size,
      supportedOperations: [
        'cleanText',
        'extractKeywords', 
        'validateMessage',
        'formatMessage',
        'formatAgentResponse',
        'batchProcessMessages'
      ]
    }
  }
}