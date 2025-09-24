/**
 * Smart Merger
 * 智能合并器 - 融合规则提取和AI提取的结果
 */

import {
  ExtractedData,
  MergedData,
  Conflict,
  Resolution,
  DateElement,
  Party,
  Amount,
  LegalClause,
  FactElement
} from '@/types/legal-intelligence'

/**
 * 合并配置
 */
interface MergeConfig {
  strategy: 'rule-priority' | 'ai-priority' | 'confidence-based'
  confidenceThreshold: number
  aiWeight: number
  ruleWeight: number
}

/**
 * 智能合并器类
 */
export class SmartMerger {
  private static defaultConfig: MergeConfig = {
    strategy: 'confidence-based',
    confidenceThreshold: 0.7,
    aiWeight: 0.6,
    ruleWeight: 0.4
  }
  
  /**
   * 合并规则和AI结果
   */
  static merge(
    ruleData: ExtractedData,
    aiData: ExtractedData,
    config: Partial<MergeConfig> = {}
  ): MergedData {
    const mergeConfig = { ...this.defaultConfig, ...config }
    
    // 记录冲突和解决方案
    const conflicts: Conflict[] = []
    const resolutions: Resolution[] = []
    
    // 合并各个字段
    const mergedDates = this.mergeDates(
      ruleData.dates, 
      aiData.dates, 
      mergeConfig,
      conflicts,
      resolutions
    )
    
    const mergedParties = this.mergeParties(
      ruleData.parties,
      aiData.parties,
      mergeConfig,
      conflicts,
      resolutions
    )
    
    const mergedAmounts = this.mergeAmounts(
      ruleData.amounts,
      aiData.amounts,
      mergeConfig,
      conflicts,
      resolutions
    )
    
    const mergedClauses = this.mergeLegalClauses(
      ruleData.legalClauses,
      aiData.legalClauses,
      mergeConfig,
      conflicts,
      resolutions
    )
    
    const mergedFacts = this.mergeFacts(
      ruleData.facts,
      aiData.facts,
      mergeConfig,
      conflicts,
      resolutions
    )
    
    // 计算综合置信度
    const overallConfidence = this.calculateOverallConfidence(
      ruleData.confidence,
      aiData.confidence,
      mergeConfig
    )
    
    return {
      dates: mergedDates,
      parties: mergedParties,
      amounts: mergedAmounts,
      legalClauses: mergedClauses,
      facts: mergedFacts,
      metadata: ruleData.metadata, // 使用规则提取的元数据
      confidence: overallConfidence,
      source: 'merged',
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      resolutions: resolutions.length > 0 ? resolutions : undefined,
      mergeStrategy: mergeConfig.strategy
    }
  }
  
  /**
   * 合并日期
   */
  private static mergeDates(
    ruleDates: DateElement[],
    aiDates: DateElement[],
    config: MergeConfig,
    conflicts: Conflict[],
    resolutions: Resolution[]
  ): DateElement[] {
    const merged: DateElement[] = []
    const processed = new Set<string>()

    // 确保输入数组不为undefined
    const safeRuleDates = ruleDates || []
    const safeAiDates = aiDates || []

    // 先处理规则提取的日期
    for (const ruleDate of safeRuleDates) {
      const key = `${ruleDate.date}_${ruleDate.type}`
      processed.add(key)

      // 查找AI中的对应日期
      const aiMatch = safeAiDates.find(
        d => d.date === ruleDate.date && d.type === ruleDate.type
      )
      
      if (aiMatch) {
        // 有匹配，需要合并
        const mergedDate = this.mergeDate(
          ruleDate, 
          aiMatch, 
          config,
          conflicts,
          resolutions
        )
        merged.push(mergedDate)
      } else {
        // 仅规则提取到
        merged.push({
          ...ruleDate,
          confidence: ruleDate.confidence! * config.ruleWeight
        })
      }
    }
    
    // 处理仅AI提取到的日期
    for (const aiDate of safeAiDates) {
      const key = `${aiDate.date}_${aiDate.type}`
      if (!processed.has(key)) {
        // 检查置信度
        if ((aiDate.confidence || 0) >= config.confidenceThreshold) {
          merged.push({
            ...aiDate,
            confidence: (aiDate.confidence || 0.7) * config.aiWeight
          })
        }
      }
    }
    
    // 按日期排序
    return merged.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }
  
  /**
   * 合并单个日期
   */
  private static mergeDate(
    ruleDate: DateElement,
    aiDate: DateElement,
    config: MergeConfig,
    conflicts: Conflict[],
    resolutions: Resolution[]
  ): DateElement {
    const conflictId = `date_${ruleDate.date}_${ruleDate.type}`
    
    // 检查描述冲突
    if (ruleDate.description !== aiDate.description) {
      conflicts.push({
        field: 'date.description',
        ruleValue: ruleDate.description,
        aiValue: aiDate.description,
        reason: '日期描述不一致'
      })
      
      // 根据策略选择
      const chosen = this.chooseValue(
        ruleDate.description,
        aiDate.description,
        ruleDate.confidence || 0.85,
        aiDate.confidence || 0.75,
        config
      )
      
      resolutions.push({
        conflictId,
        chosenValue: chosen,
        source: chosen === ruleDate.description ? 'rule' : 'ai',
        confidence: Math.max(ruleDate.confidence || 0, aiDate.confidence || 0),
        reason: `根据${config.strategy}策略选择`
      })
    }
    
    // 合并置信度
    const mergedConfidence = this.mergeConfidence(
      ruleDate.confidence || 0.85,
      aiDate.confidence || 0.75,
      config
    )
    
    return {
      ...ruleDate,
      description: resolutions.find(r => r.conflictId === conflictId)?.chosenValue as string 
        || ruleDate.description,
      importance: aiDate.importance || ruleDate.importance,
      relatedParties: this.mergeArrays(
        ruleDate.relatedParties || [],
        aiDate.relatedParties || []
      ),
      confidence: mergedConfidence
    }
  }
  
  /**
   * 合并当事人
   */
  private static mergeParties(
    ruleParties: Party[],
    aiParties: Party[],
    config: MergeConfig,
    conflicts: Conflict[],
    resolutions: Resolution[]
  ): Party[] {
    const merged: Party[] = []
    const partyMap = new Map<string, Party>()

    // 确保输入数组不为undefined
    const safeRuleParties = ruleParties || []
    const safeAiParties = aiParties || []

    // 处理规则提取的当事人
    for (const party of safeRuleParties) {
      const existing = partyMap.get(party.name)
      if (existing) {
        // 合并信息
        partyMap.set(party.name, {
          ...existing,
          aliases: this.mergeArrays(existing.aliases || [], party.aliases || []),
          confidence: Math.max(existing.confidence || 0, party.confidence || 0)
        })
      } else {
        partyMap.set(party.name, party)
      }
    }
    
    // 处理AI提取的当事人
    for (const party of safeAiParties) {
      const existing = partyMap.get(party.name)
      if (existing) {
        // 检查类型冲突
        if (existing.type !== party.type) {
          conflicts.push({
            field: 'party.type',
            ruleValue: existing.type,
            aiValue: party.type,
            reason: `当事人${party.name}的类型不一致`
          })
          
          // 选择更高置信度的
          if ((party.confidence || 0) > (existing.confidence || 0)) {
            existing.type = party.type
          }
        }
        
        // 合并其他信息
        partyMap.set(party.name, {
          ...existing,
          role: party.role || existing.role,
          legalRepresentative: party.legalRepresentative || existing.legalRepresentative,
          confidence: this.mergeConfidence(
            existing.confidence || 0.85,
            party.confidence || 0.75,
            config
          )
        })
      } else if (party.confidence! >= config.confidenceThreshold) {
        partyMap.set(party.name, party)
      }
    }
    
    // 转换为数组
    return Array.from(partyMap.values())
  }
  
  /**
   * 合并金额
   */
  private static mergeAmounts(
    ruleAmounts: Amount[],
    aiAmounts: Amount[],
    config: MergeConfig,
    conflicts: Conflict[],
    resolutions: Resolution[]
  ): Amount[] {
    const merged: Amount[] = []
    const processed = new Set<string>()

    // 确保输入数组不为undefined
    const safeRuleAmounts = ruleAmounts || []
    const safeAiAmounts = aiAmounts || []

    // 处理规则提取的金额
    for (const ruleAmount of safeRuleAmounts) {
      const key = `${ruleAmount.value}_${ruleAmount.type}`
      processed.add(key)
      
      // 查找相近的AI金额
      const aiMatch = safeAiAmounts.find(
        a => Math.abs(a.value - ruleAmount.value) < 0.01 && a.type === ruleAmount.type
      )

      if (aiMatch) {
        // 合并描述和其他信息
        merged.push({
          ...ruleAmount,
          description: aiMatch.description || ruleAmount.description,
          calculation: aiMatch.calculation || ruleAmount.calculation,
          relatedDate: aiMatch.relatedDate || ruleAmount.relatedDate,
          confidence: this.mergeConfidence(
            ruleAmount.confidence || 0.9,
            aiMatch.confidence || 0.8,
            config
          )
        })
      } else {
        merged.push(ruleAmount)
      }
    }

    // 处理仅AI提取的金额
    for (const aiAmount of safeAiAmounts) {
      const key = `${aiAmount.value}_${aiAmount.type}`
      if (!processed.has(key) && (aiAmount.confidence || 0) >= config.confidenceThreshold) {
        merged.push(aiAmount)
      }
    }
    
    // 按金额大小排序
    return merged.sort((a, b) => b.value - a.value)
  }
  
  /**
   * 合并法律条款
   */
  private static mergeLegalClauses(
    ruleClauses: LegalClause[],
    aiClauses: LegalClause[],
    config: MergeConfig,
    conflicts: Conflict[],
    resolutions: Resolution[]
  ): LegalClause[] {
    const merged: LegalClause[] = []
    const clauseMap = new Map<string, LegalClause>()

    // 确保输入数组不为undefined
    const safeRuleClauses = ruleClauses || []
    const safeAiClauses = aiClauses || []

    // 处理规则提取的条款
    for (const clause of safeRuleClauses) {
      const key = `${clause.source}_${clause.article || 'general'}`
      clauseMap.set(key, clause)
    }
    
    // 处理AI提取的条款
    for (const clause of safeAiClauses) {
      const key = `${clause.source}_${clause.article || 'general'}`
      const existing = clauseMap.get(key)
      
      if (existing) {
        // 合并解释和重要性
        clauseMap.set(key, {
          ...existing,
          interpretation: clause.interpretation || existing.interpretation,
          importance: this.chooseImportance(
            existing.importance,
            clause.importance,
            existing.confidence || 0.85,
            clause.confidence || 0.75,
            config
          ),
          relatedFacts: this.mergeArrays(
            existing.relatedFacts || [],
            clause.relatedFacts || []
          ),
          confidence: this.mergeConfidence(
            existing.confidence || 0.85,
            clause.confidence || 0.75,
            config
          )
        })
      } else if (clause.confidence! >= config.confidenceThreshold) {
        clauseMap.set(key, clause)
      }
    }
    
    return Array.from(clauseMap.values())
  }
  
  /**
   * 合并事实
   */
  private static mergeFacts(
    ruleFacts: FactElement[],
    aiFacts: FactElement[],
    config: MergeConfig,
    conflicts: Conflict[],
    resolutions: Resolution[]
  ): FactElement[] {
    const merged: FactElement[] = []
    const factMap = new Map<string, FactElement>()

    // 确保输入数组不为undefined
    const safeRuleFacts = ruleFacts || []
    const safeAiFacts = aiFacts || []

    // 使用内容相似度匹配事实
    for (const ruleFact of safeRuleFacts) {
      const similarAiFact = this.findSimilarFact(ruleFact, safeAiFacts)
      
      if (similarAiFact) {
        // 合并相似事实
        const mergedFact: FactElement = {
          ...ruleFact,
          type: similarAiFact.type || ruleFact.type,
          party: similarAiFact.party || ruleFact.party,
          evidence: this.mergeArrays(
            ruleFact.evidence || [],
            similarAiFact.evidence || []
          ),
          legalSignificance: similarAiFact.legalSignificance || ruleFact.legalSignificance,
          confidence: this.mergeConfidence(
            ruleFact.confidence || 0.75,
            similarAiFact.confidence || 0.7,
            config
          )
        }
        factMap.set(ruleFact.id, mergedFact)
      } else {
        factMap.set(ruleFact.id, ruleFact)
      }
    }
    
    // 添加仅AI提取的事实
    let factIdCounter = factMap.size + 1
    for (const aiFact of safeAiFacts) {
      if (!this.isFactProcessed(aiFact, Array.from(factMap.values()))) {
        if ((aiFact.confidence || 0) >= config.confidenceThreshold) {
          factMap.set(`fact_ai_${factIdCounter++}`, aiFact)
        }
      }
    }
    
    return Array.from(factMap.values())
  }
  
  // ========== 辅助方法 ==========
  
  /**
   * 根据策略选择值
   */
  private static chooseValue<T>(
    ruleValue: T,
    aiValue: T,
    ruleConfidence: number,
    aiConfidence: number,
    config: MergeConfig
  ): T {
    switch (config.strategy) {
      case 'rule-priority':
        return ruleValue
      case 'ai-priority':
        return aiValue
      case 'confidence-based':
        const ruleScore = ruleConfidence * (1 + config.ruleWeight)
        const aiScore = aiConfidence * (1 + config.aiWeight)
        return ruleScore >= aiScore ? ruleValue : aiValue
      default:
        return ruleValue
    }
  }
  
  /**
   * 选择重要性
   */
  private static chooseImportance(
    ruleImportance: LegalClause['importance'],
    aiImportance: LegalClause['importance'],
    ruleConfidence: number,
    aiConfidence: number,
    config: MergeConfig
  ): LegalClause['importance'] {
    // 重要性权重映射
    const importanceWeight = {
      'core': 3,
      'supporting': 2,
      'reference': 1
    }
    
    const ruleScore = importanceWeight[ruleImportance] * ruleConfidence
    const aiScore = importanceWeight[aiImportance] * aiConfidence
    
    return ruleScore >= aiScore ? ruleImportance : aiImportance
  }
  
  /**
   * 合并置信度
   */
  private static mergeConfidence(
    ruleConfidence: number,
    aiConfidence: number,
    config: MergeConfig
  ): number {
    // 加权平均
    const weighted = (ruleConfidence * config.ruleWeight + aiConfidence * config.aiWeight) / 
                     (config.ruleWeight + config.aiWeight)
    
    // 如果两者都高，给予奖励
    if (ruleConfidence > 0.8 && aiConfidence > 0.8) {
      return Math.min(0.95, weighted * 1.1)
    }
    
    return weighted
  }
  
  /**
   * 计算总体置信度
   */
  private static calculateOverallConfidence(
    ruleConfidence: number,
    aiConfidence: number,
    config: MergeConfig
  ): number {
    return this.mergeConfidence(ruleConfidence, aiConfidence, config)
  }
  
  /**
   * 合并数组（去重）
   */
  private static mergeArrays<T>(arr1: T[], arr2: T[]): T[] {
    const combined = [...arr1, ...arr2]
    return Array.from(new Set(combined.map(item => JSON.stringify(item))))
      .map(item => JSON.parse(item))
  }
  
  /**
   * 查找相似事实
   */
  private static findSimilarFact(
    ruleFact: FactElement,
    aiFacts: FactElement[]
  ): FactElement | undefined {
    for (const aiFact of aiFacts) {
      const similarity = this.calculateTextSimilarity(
        ruleFact.content,
        aiFact.content
      )
      
      if (similarity > 0.7) {
        return aiFact
      }
    }
    return undefined
  }
  
  /**
   * 检查事实是否已处理
   */
  private static isFactProcessed(
    fact: FactElement,
    processedFacts: FactElement[]
  ): boolean {
    for (const processed of processedFacts) {
      const similarity = this.calculateTextSimilarity(
        fact.content,
        processed.content
      )
      
      if (similarity > 0.7) {
        return true
      }
    }
    return false
  }
  
  /**
   * 计算文本相似度（简单实现）
   */
  private static calculateTextSimilarity(text1: string, text2: string): number {
    // 简单的基于共同字符的相似度计算
    const set1 = new Set(text1.split(''))
    const set2 = new Set(text2.split(''))
    
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    
    return intersection.size / union.size
  }
  
  /**
   * 解决冲突
   */
  static resolveConflicts(conflicts: Conflict[]): Resolution[] {
    const resolutions: Resolution[] = []
    
    for (const conflict of conflicts) {
      // 基于置信度或其他逻辑解决冲突
      resolutions.push({
        conflictId: `conflict_${Date.now()}_${Math.random()}`,
        chosenValue: conflict.aiValue, // 默认选择AI值
        source: 'ai',
        confidence: 0.7,
        reason: '基于AI分析结果'
      })
    }
    
    return resolutions
  }
}

export default SmartMerger