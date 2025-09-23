/**
 * 相似度计算工具
 * @module agents/similarity-calculator
 * @description 提供多种相似度计算算法，用于问题匹配、内容推荐和智能缓存
 */

import { Message, CaseInfo, AgentContext } from '@/lib/types/socratic'

// ============== 相似度配置接口 ==============

/**
 * 相似度计算配置
 */
export interface SimilarityConfig {
  /** 文本相似度权重 */
  textWeight: number
  /** 语义相似度权重 */
  semanticWeight: number
  /** 上下文相似度权重 */
  contextWeight: number
  /** 最小相似度阈值 */
  minThreshold: number
  /** 是否启用缓存 */
  enableCache: boolean
}

/**
 * 相似度结果接口
 */
export interface SimilarityResult {
  /** 总体相似度分数 (0-1) */
  score: number
  /** 详细分数分解 */
  breakdown: {
    /** 文本相似度 */
    textSimilarity: number
    /** 语义相似度 */
    semanticSimilarity: number
    /** 上下文相似度 */
    contextSimilarity: number
  }
  /** 匹配的关键词 */
  matchedKeywords: string[]
  /** 计算时间（毫秒） */
  computeTime: number
  /** 是否使用了缓存 */
  cached: boolean
}

/**
 * 文本特征向量
 */
interface TextFeatures {
  /** 词频向量 */
  termFreq: Map<string, number>
  /** 关键词列表 */
  keywords: string[]
  /** 文本长度 */
  length: number
  /** 语言特征 */
  linguisticFeatures: {
    /** 法律术语数量 */
    legalTermCount: number
    /** 句子数量 */
    sentenceCount: number
    /** 复杂度分数 */
    complexity: number
  }
}

// ============== 核心相似度计算器 ==============

/**
 * 相似度计算器
 * 
 * 提供多种相似度计算算法：
 * - 余弦相似度（文本向量）
 * - Jaccard相似度（集合相似度）
 * - 编辑距离相似度
 * - 语义相似度（基于关键词）
 * - 上下文相似度（基于对话历史）
 */
export class SimilarityCalculator {
  private config: SimilarityConfig
  private cache: Map<string, number>
  private legalTerms: Set<string>
  private stopWords: Set<string>

  constructor(config: Partial<SimilarityConfig> = {}) {
    this.config = {
      textWeight: config.textWeight ?? 0.4,
      semanticWeight: config.semanticWeight ?? 0.4,
      contextWeight: config.contextWeight ?? 0.2,
      minThreshold: config.minThreshold ?? 0.1,
      enableCache: config.enableCache ?? true
    }

    this.cache = new Map()
    this.initializeLegalTerms()
    this.initializeStopWords()
  }

  // ============== 主要相似度计算方法 ==============

  /**
   * 计算两个文本的综合相似度
   */
  calculateTextSimilarity(text1: string, text2: string, context?: any): SimilarityResult {
    const startTime = Date.now()
    
    // 检查缓存
    const cacheKey = this.generateCacheKey(text1, text2)
    if (this.config.enableCache && this.cache.has(cacheKey)) {
      return {
        score: this.cache.get(cacheKey)!,
        breakdown: { textSimilarity: 0, semanticSimilarity: 0, contextSimilarity: 0 },
        matchedKeywords: [],
        computeTime: Date.now() - startTime,
        cached: true
      }
    }

    // 预处理文本
    const features1 = this.extractFeatures(text1)
    const features2 = this.extractFeatures(text2)

    // 计算各维度相似度
    const textSimilarity = this.calculateCosineSimilarity(features1, features2)
    const semanticSimilarity = this.calculateSemanticSimilarity(features1, features2)
    const contextSimilarity = context ? this.calculateContextSimilarity(context, features1, features2) : 0

    // 加权合并
    const score = (
      textSimilarity * this.config.textWeight +
      semanticSimilarity * this.config.semanticWeight +
      contextSimilarity * this.config.contextWeight
    )

    // 找到匹配的关键词
    const matchedKeywords = this.findMatchedKeywords(features1, features2)

    const result: SimilarityResult = {
      score: Math.max(0, Math.min(1, score)),
      breakdown: {
        textSimilarity,
        semanticSimilarity,
        contextSimilarity
      },
      matchedKeywords,
      computeTime: Date.now() - startTime,
      cached: false
    }

    // 缓存结果
    if (this.config.enableCache) {
      this.cache.set(cacheKey, result.score)
    }

    return result
  }

  /**
   * 计算问题相似度（专门用于问题匹配）
   */
  calculateQuestionSimilarity(question1: string, question2: string, context?: AgentContext): SimilarityResult {
    // 为问题计算添加特殊的权重调整
    const originalConfig = { ...this.config }
    
    // 问题匹配更重视语义和上下文
    this.config.semanticWeight = 0.5
    this.config.contextWeight = 0.3
    this.config.textWeight = 0.2

    const result = this.calculateTextSimilarity(question1, question2, context)
    
    // 恢复原配置
    this.config = originalConfig
    
    return result
  }

  /**
   * 计算案例相似度
   */
  calculateCaseSimilarity(case1: CaseInfo, case2: CaseInfo): SimilarityResult {
    const startTime = Date.now()

    // 构建案例文本表示
    const caseText1 = this.buildCaseText(case1)
    const caseText2 = this.buildCaseText(case2)

    // 计算基础文本相似度
    const baseResult = this.calculateTextSimilarity(caseText1, caseText2)

    // 计算案例特有的相似度因子
    const typeSimilarity = case1.type === case2.type ? 1 : 0
    const lawSimilarity = this.calculateLawSimilarity(case1.laws || [], case2.laws || [])
    const disputeSimilarity = this.calculateArraySimilarity(case1.disputes, case2.disputes)

    // 案例相似度的特殊加权
    const caseScore = (
      baseResult.score * 0.5 +
      typeSimilarity * 0.2 +
      lawSimilarity * 0.2 +
      disputeSimilarity * 0.1
    )

    return {
      ...baseResult,
      score: caseScore,
      breakdown: {
        ...baseResult.breakdown,
        contextSimilarity: (typeSimilarity + lawSimilarity + disputeSimilarity) / 3
      },
      computeTime: Date.now() - startTime
    }
  }

  /**
   * 计算对话相似度（用于上下文匹配）
   */
  calculateDialogueSimilarity(messages1: Message[], messages2: Message[]): SimilarityResult {
    const startTime = Date.now()

    // 构建对话文本
    const dialogue1 = this.buildDialogueText(messages1)
    const dialogue2 = this.buildDialogueText(messages2)

    // 计算对话特征相似度
    const lengthSimilarity = this.calculateLengthSimilarity(messages1.length, messages2.length)
    const roleSimilarity = this.calculateRoleDistributionSimilarity(messages1, messages2)
    const contentSimilarity = this.calculateTextSimilarity(dialogue1, dialogue2).score

    // 对话相似度综合计算
    const score = (contentSimilarity * 0.6 + lengthSimilarity * 0.2 + roleSimilarity * 0.2)

    return {
      score,
      breakdown: {
        textSimilarity: contentSimilarity,
        semanticSimilarity: roleSimilarity,
        contextSimilarity: lengthSimilarity
      },
      matchedKeywords: this.findDialogueKeywords(messages1, messages2),
      computeTime: Date.now() - startTime,
      cached: false
    }
  }

  // ============== 批量相似度计算 ==============

  /**
   * 查找最相似的文本
   */
  findMostSimilar(target: string, candidates: string[], threshold?: number): Array<{text: string, similarity: SimilarityResult}> {
    const minThreshold = threshold ?? this.config.minThreshold
    const results: Array<{text: string, similarity: SimilarityResult}> = []

    for (const candidate of candidates) {
      const similarity = this.calculateTextSimilarity(target, candidate)
      if (similarity.score >= minThreshold) {
        results.push({ text: candidate, similarity })
      }
    }

    // 按相似度降序排序
    return results.sort((a, b) => b.similarity.score - a.similarity.score)
  }

  /**
   * 批量计算相似度矩阵
   */
  calculateSimilarityMatrix(texts: string[]): number[][] {
    const matrix: number[][] = []

    for (let i = 0; i < texts.length; i++) {
      matrix[i] = []
      for (let j = 0; j < texts.length; j++) {
        if (i === j) {
          matrix[i][j] = 1.0
        } else if (i > j) {
          // 利用对称性
          matrix[i][j] = matrix[j][i]
        } else {
          matrix[i][j] = this.calculateTextSimilarity(texts[i], texts[j]).score
        }
      }
    }

    return matrix
  }

  // ============== 专门的相似度算法实现 ==============

  /**
   * 余弦相似度计算
   */
  private calculateCosineSimilarity(features1: TextFeatures, features2: TextFeatures): number {
    const vocab = new Set([...features1.termFreq.keys(), ...features2.termFreq.keys()])
    
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (const term of vocab) {
      const freq1 = features1.termFreq.get(term) || 0
      const freq2 = features2.termFreq.get(term) || 0
      
      dotProduct += freq1 * freq2
      norm1 += freq1 * freq1
      norm2 += freq2 * freq2
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2)
    return magnitude === 0 ? 0 : dotProduct / magnitude
  }

  /**
   * Jaccard相似度计算
   */
  private calculateJaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    
    return union.size === 0 ? 0 : intersection.size / union.size
  }

  /**
   * 编辑距离相似度
   */
  private calculateEditDistanceSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length)
    if (maxLength === 0) return 1

    const distance = this.levenshteinDistance(str1, str2)
    return 1 - distance / maxLength
  }

  /**
   * 语义相似度计算
   */
  private calculateSemanticSimilarity(features1: TextFeatures, features2: TextFeatures): number {
    // 基于关键词的语义相似度
    const keywords1 = new Set(features1.keywords)
    const keywords2 = new Set(features2.keywords)
    const keywordSimilarity = this.calculateJaccardSimilarity(keywords1, keywords2)

    // 法律术语相似度
    const legalTermSimilarity = this.calculateLegalTermSimilarity(features1, features2)

    // 语言复杂度相似度
    const complexitySimilarity = this.calculateComplexitySimilarity(features1, features2)

    return (keywordSimilarity * 0.5 + legalTermSimilarity * 0.3 + complexitySimilarity * 0.2)
  }

  /**
   * 上下文相似度计算
   */
  private calculateContextSimilarity(context: any, features1: TextFeatures, features2: TextFeatures): number {
    if (!context) return 0

    // 基于上下文的特征匹配
    let contextScore = 0

    // 如果有案例信息，考虑案例相关性
    if (context.case) {
      const caseKeywords = this.extractCaseKeywords(context.case)
      const relevance1 = this.calculateRelevanceToCase(features1, caseKeywords)
      const relevance2 = this.calculateRelevanceToCase(features2, caseKeywords)
      contextScore += Math.abs(relevance1 - relevance2) > 0.5 ? 0 : 0.8
    }

    // 如果有对话层级信息，考虑层级一致性
    if (context.dialogue?.level) {
      // 简化的层级相关性计算
      contextScore += 0.2
    }

    return Math.min(contextScore, 1)
  }

  // ============== 特征提取和预处理 ==============

  /**
   * 提取文本特征
   */
  private extractFeatures(text: string): TextFeatures {
    const cleanText = this.preprocessText(text)
    const words = cleanText.split(/\s+/).filter(word => word.length > 0)
    
    // 计算词频
    const termFreq = new Map<string, number>()
    for (const word of words) {
      termFreq.set(word, (termFreq.get(word) || 0) + 1)
    }

    // 提取关键词（去除停用词）
    const keywords = words.filter(word => !this.stopWords.has(word) && word.length > 2)

    // 计算语言特征
    const legalTermCount = words.filter(word => this.legalTerms.has(word)).length
    const sentenceCount = text.split(/[。！？.!?]/).length
    const complexity = this.calculateTextComplexity(text)

    return {
      termFreq,
      keywords: [...new Set(keywords)], // 去重
      length: text.length,
      linguisticFeatures: {
        legalTermCount,
        sentenceCount,
        complexity
      }
    }
  }

  /**
   * 文本预处理
   */
  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ') // 保留中文、英文、数字
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * 计算文本复杂度
   */
  private calculateTextComplexity(text: string): number {
    const words = text.split(/\s+/)
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length
    const uniqueWords = new Set(words).size
    const lexicalDiversity = uniqueWords / words.length
    
    return (avgWordLength / 10 + lexicalDiversity) / 2
  }

  // ============== 辅助计算方法 ==============

  /**
   * Levenshtein距离计算
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * 计算法律术语相似度
   */
  private calculateLegalTermSimilarity(features1: TextFeatures, features2: TextFeatures): number {
    if (features1.linguisticFeatures.legalTermCount === 0 && features2.linguisticFeatures.legalTermCount === 0) {
      return 1 // 都没有法律术语，认为相似
    }

    const termDiff = Math.abs(features1.linguisticFeatures.legalTermCount - features2.linguisticFeatures.legalTermCount)
    const maxTerms = Math.max(features1.linguisticFeatures.legalTermCount, features2.linguisticFeatures.legalTermCount)
    
    return maxTerms === 0 ? 1 : 1 - (termDiff / maxTerms)
  }

  /**
   * 计算复杂度相似度
   */
  private calculateComplexitySimilarity(features1: TextFeatures, features2: TextFeatures): number {
    const complexityDiff = Math.abs(features1.linguisticFeatures.complexity - features2.linguisticFeatures.complexity)
    return 1 - Math.min(complexityDiff, 1)
  }

  /**
   * 计算长度相似度
   */
  private calculateLengthSimilarity(length1: number, length2: number): number {
    if (length1 === 0 && length2 === 0) return 1
    const maxLength = Math.max(length1, length2)
    const lengthDiff = Math.abs(length1 - length2)
    return 1 - (lengthDiff / maxLength)
  }

  /**
   * 计算数组相似度
   */
  private calculateArraySimilarity(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 && arr2.length === 0) return 1
    
    const set1 = new Set(arr1)
    const set2 = new Set(arr2)
    
    return this.calculateJaccardSimilarity(set1, set2)
  }

  /**
   * 计算法条相似度
   */
  private calculateLawSimilarity(laws1: string[], laws2: string[]): number {
    return this.calculateArraySimilarity(laws1, laws2)
  }

  /**
   * 计算角色分布相似度
   */
  private calculateRoleDistributionSimilarity(messages1: Message[], messages2: Message[]): number {
    const getRoleDistribution = (messages: Message[]) => {
      const distribution: Record<string, number> = {}
      messages.forEach(msg => {
        distribution[msg.role] = (distribution[msg.role] || 0) + 1
      })
      return distribution
    }

    const dist1 = getRoleDistribution(messages1)
    const dist2 = getRoleDistribution(messages2)

    const allRoles = new Set([...Object.keys(dist1), ...Object.keys(dist2)])
    let similarity = 0

    for (const role of allRoles) {
      const ratio1 = (dist1[role] || 0) / messages1.length
      const ratio2 = (dist2[role] || 0) / messages2.length
      similarity += 1 - Math.abs(ratio1 - ratio2)
    }

    return similarity / allRoles.size
  }

  // ============== 工具方法 ==============

  /**
   * 生成缓存键
   */
  private generateCacheKey(text1: string, text2: string): string {
    const combined = [text1, text2].sort().join('|')
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString(36)
  }

  /**
   * 查找匹配的关键词
   */
  private findMatchedKeywords(features1: TextFeatures, features2: TextFeatures): string[] {
    const keywords1 = new Set(features1.keywords)
    const keywords2 = new Set(features2.keywords)
    
    return [...keywords1].filter(keyword => keywords2.has(keyword))
  }

  /**
   * 查找对话关键词
   */
  private findDialogueKeywords(messages1: Message[], messages2: Message[]): string[] {
    const extractKeywords = (messages: Message[]) => {
      return messages
        .map(msg => msg.metadata?.keywords || [])
        .flat()
    }

    const keywords1 = new Set(extractKeywords(messages1))
    const keywords2 = new Set(extractKeywords(messages2))
    
    return [...keywords1].filter(keyword => keywords2.has(keyword))
  }

  /**
   * 构建案例文本表示
   */
  private buildCaseText(caseInfo: CaseInfo): string {
    const parts = [
      `案例类型：${caseInfo.type}`,
      `案例事实：${caseInfo.facts.join('；')}`,
      `争议焦点：${caseInfo.disputes.join('；')}`,
    ]

    if (caseInfo.laws) {
      parts.push(`相关法条：${caseInfo.laws.join('；')}`)
    }

    if (caseInfo.judgment) {
      parts.push(`判决结果：${caseInfo.judgment}`)
    }

    return parts.join('\n')
  }

  /**
   * 构建对话文本表示
   */
  private buildDialogueText(messages: Message[]): string {
    return messages
      .map(msg => `${msg.role}：${msg.content}`)
      .join('\n')
  }

  /**
   * 提取案例关键词
   */
  private extractCaseKeywords(caseInfo: CaseInfo): string[] {
    const keywords = [
      ...caseInfo.facts.flatMap(fact => fact.split(/[，。；]/).filter(word => word.length > 2)),
      ...caseInfo.disputes,
      ...(caseInfo.laws || [])
    ]

    return [...new Set(keywords)]
  }

  /**
   * 计算与案例的相关性
   */
  private calculateRelevanceToCase(features: TextFeatures, caseKeywords: string[]): number {
    const matchedCount = features.keywords.filter(keyword => 
      caseKeywords.some(caseKeyword => caseKeyword.includes(keyword) || keyword.includes(caseKeyword))
    ).length

    return features.keywords.length === 0 ? 0 : matchedCount / features.keywords.length
  }

  /**
   * 初始化法律术语
   */
  private initializeLegalTerms(): void {
    this.legalTerms = new Set([
      // 基本法律概念
      '合同', '协议', '违约', '履行', '责任', '义务', '权利', '损害', '赔偿',
      '诉讼', '仲裁', '调解', '判决', '裁定', '执行', '上诉', '抗诉',
      
      // 民法相关
      '民事', '债权', '债务', '物权', '人身权', '侵权', '继承', '婚姻',
      '家庭', '收养', '监护', '宣告', '失踪', '死亡',
      
      // 合同法相关
      '要约', '承诺', '格式条款', '免责', '定金', '违约金', '解除', '撤销',
      
      // 侵权法相关
      '过错', '无过错', '严格责任', '共同侵权', '替代责任',
      
      // 刑法相关
      '犯罪', '刑罚', '故意', '过失', '未遂', '中止', '自首', '立功',
      '从犯', '主犯', '胁从犯', '教唆犯',
      
      // 行政法相关
      '行政', '执法', '许可', '处罚', '复议', '国家赔偿',
      
      // 程序法相关
      '起诉', '应诉', '举证', '质证', '认证', '开庭', '宣判', '送达'
    ])
  }

  /**
   * 初始化停用词
   */
  private initializeStopWords(): void {
    this.stopWords = new Set([
      // 中文停用词
      '的', '了', '在', '是', '我', '你', '他', '她', '它', '们',
      '这', '那', '些', '个', '一', '二', '三', '四', '五',
      '和', '或', '但', '而', '又', '及', '以', '对', '为',
      '从', '到', '由', '被', '将', '把', '让', '使',
      '有', '无', '不', '非', '否', '可', '能', '会', '要',
      '还', '就', '都', '也', '只', '才', '又', '再', '更',
      
      // 英文停用词
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
      'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were',
      'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'should', 'could', 'can', 'may', 'might'
    ])
  }

  // ============== 缓存管理 ==============

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // 简化实现，实际应用中应该追踪命中率
    }
  }

  /**
   * 设置配置
   */
  updateConfig(newConfig: Partial<SimilarityConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * 获取当前配置
   */
  getConfig(): SimilarityConfig {
    return { ...this.config }
  }
}