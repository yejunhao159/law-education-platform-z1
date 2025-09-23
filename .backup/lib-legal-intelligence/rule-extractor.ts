/**
 * Rule-Based Extractor
 * 规则提取器 - 基于模式匹配的核心提取引擎
 */

import {
  DateElement,
  Party,
  Amount,
  LegalClause,
  FactElement,
  ExtractedData,
  ProcessedDocument
} from '@/types/legal-intelligence'

import {
  DATE_PATTERNS,
  PARTY_PATTERNS,
  AMOUNT_PATTERNS,
  LEGAL_CLAUSE_PATTERNS,
  COURT_PATTERNS,
  EVIDENCE_PATTERNS,
  CLAIM_PATTERNS,
  PatternHelper
} from './patterns'

/**
 * 规则提取器类
 */
export class RuleExtractor {
  /**
   * 执行完整提取
   */
  static extract(document: ProcessedDocument): ExtractedData {
    const text = document.cleanedText
    
    return {
      dates: this.extractDates(text),
      parties: this.extractParties(text),
      amounts: this.extractAmounts(text),
      legalClauses: this.extractLegalClauses(text),
      facts: this.extractFacts(text),
      metadata: document.metadata,
      confidence: 0.85, // 规则提取基础置信度
      source: 'rule'
    }
  }
  
  /**
   * 提取日期元素
   */
  static extractDates(text: string): DateElement[] {
    const dates: DateElement[] = []
    const processedDates = new Set<string>() // 避免重复
    
    // 标准日期提取
    const standardMatches = [...text.matchAll(DATE_PATTERNS.STANDARD_DATE)]
    for (const match of standardMatches) {
      const [fullMatch, year, month, day] = match
      const isoDate = PatternHelper.formatDateToISO(year, month, day)
      
      if (!processedDates.has(isoDate)) {
        processedDates.add(isoDate)
        
        // 分析日期类型和重要性 - 扩大上下文范围
        const context = this.getContext(text, match.index!, 100)
        const type = this.classifyDateType(context)
        const importance = this.assessDateImportance(type, context)
        
        dates.push({
          date: isoDate,
          type,
          description: this.generateDateDescription(type, context),
          importance,
          context: fullMatch,
          confidence: 0.9
        })
      }
    }
    
    // 期限提取
    const deadlineMatches = [...text.matchAll(DATE_PATTERNS.LIMITATION)]
    for (const match of deadlineMatches) {
      const [fullMatch, number, unit] = match
      const context = this.getContext(text, match.index!, 30)
      
      dates.push({
        date: this.calculateDeadlineDate(number, unit),
        type: 'deadline',
        description: `期限：${fullMatch}`,
        importance: 'important',
        context,
        confidence: 0.8
      })
    }
    
    // 按日期排序
    return dates.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }
  
  /**
   * 提取当事人信息
   */
  static extractParties(text: string): Party[] {
    const parties: Party[] = []
    const partyMap = new Map<string, Party>()
    let partyIdCounter = 1
    
    // 提取原告
    const plaintiffMatches = [...text.matchAll(PARTY_PATTERNS.PLAINTIFF)]
    for (const match of plaintiffMatches) {
      if (!match[1]) continue
      const name = PatternHelper.cleanExtractedText(match[1])
      if (name && !partyMap.has(name)) {
        const party: Party = {
          id: `party_${partyIdCounter++}`,
          name,
          type: 'plaintiff',
          role: '原告',
          confidence: 0.95
        }
        
        // 查找法定代表人
        const legalRepContext = this.getContext(text, match.index!, 100)
        const legalRepMatch = legalRepContext.match(PARTY_PATTERNS.LEGAL_REP)
        if (legalRepMatch && legalRepMatch[1]) {
          const legalRep = PatternHelper.cleanExtractedText(legalRepMatch[1])
          if (legalRep) {
            party.legalRepresentative = legalRep
          }
        }
        
        partyMap.set(name, party)
        parties.push(party)
      }
    }
    
    // 提取被告
    const defendantMatches = [...text.matchAll(PARTY_PATTERNS.DEFENDANT)]
    for (const match of defendantMatches) {
      if (!match[1]) continue
      const name = PatternHelper.cleanExtractedText(match[1])
      if (name && !partyMap.has(name)) {
        const party: Party = {
          id: `party_${partyIdCounter++}`,
          name,
          type: 'defendant',
          role: '被告',
          confidence: 0.95
        }
        
        partyMap.set(name, party)
        parties.push(party)
      }
    }
    
    // 提取公司
    const companyMatches = [...text.matchAll(PARTY_PATTERNS.COMPANY)]
    for (const match of companyMatches) {
      const name = match[1]
      if (!partyMap.has(name)) {
        // 判断是原告还是被告
        const context = this.getContext(text, match.index!, 50)
        let type: Party['type'] = 'third-party'
        let role = '相关方'
        
        if (context.includes('原告')) {
          type = 'plaintiff'
          role = '原告（公司）'
        } else if (context.includes('被告')) {
          type = 'defendant'
          role = '被告（公司）'
        }
        
        const party: Party = {
          id: `party_${partyIdCounter++}`,
          name,
          type,
          role,
          confidence: 0.85
        }
        
        partyMap.set(name, party)
        parties.push(party)
      }
    }
    
    // 提取律师和律所
    const lawFirmMatches = [...text.matchAll(PARTY_PATTERNS.LAW_FIRM)]
    for (const match of lawFirmMatches) {
      const name = match[1]
      if (!partyMap.has(name)) {
        parties.push({
          id: `party_${partyIdCounter++}`,
          name,
          type: 'lawyer',
          role: '律师事务所',
          confidence: 0.9
        })
      }
    }
    
    return parties
  }
  
  /**
   * 提取金额信息
   */
  static extractAmounts(text: string): Amount[] {
    const amounts: Amount[] = []
    const processedAmounts = new Set<string>()
    
    // 提取数字金额
    const numericMatches = [...text.matchAll(AMOUNT_PATTERNS.NUMERIC)]
    for (const match of numericMatches) {
      const [fullMatch, numberStr] = match
      const key = `${numberStr}_${match.index}`
      
      if (!processedAmounts.has(key)) {
        processedAmounts.add(key)
        
        const value = PatternHelper.extractAmountValue(fullMatch)
        const context = this.getContext(text, match.index!, 50)
        const type = this.classifyAmountType(context)
        
        amounts.push({
          value,
          currency: 'CNY',
          type,
          description: this.generateAmountDescription(type, context, fullMatch),
          confidence: 0.9
        })
      }
    }
    
    // 提取利率
    const interestMatches = [...text.matchAll(AMOUNT_PATTERNS.INTEREST_RATE)]
    for (const match of interestMatches) {
      const [fullMatch, rate] = match
      const value = parseFloat(rate)
      
      amounts.push({
        value,
        currency: 'CNY',
        type: 'interest',
        description: `${fullMatch.includes('年') ? '年' : '月'}利率${value}%`,
        calculation: fullMatch,
        confidence: 0.85
      })
    }
    
    // 按金额大小排序
    return amounts.sort((a, b) => b.value - a.value)
  }
  
  /**
   * 提取法律条款
   */
  static extractLegalClauses(text: string): LegalClause[] {
    const clauses: LegalClause[] = []
    const clauseMap = new Map<string, LegalClause>()
    let clauseIdCounter = 1
    
    // 提取法律引用
    const lawMatches = [...text.matchAll(LEGAL_CLAUSE_PATTERNS.LAW_REFERENCE)]
    for (const match of lawMatches) {
      const lawName = match[1]
      const context = this.getContext(text, match.index!, 100)
      
      // 查找具体条款
      const articleMatch = context.match(LEGAL_CLAUSE_PATTERNS.ARTICLE)
      const article = articleMatch ? articleMatch[1] : undefined
      
      const key = `${lawName}_${article || 'general'}`
      
      if (!clauseMap.has(key)) {
        const clause: LegalClause = {
          id: `clause_${clauseIdCounter++}`,
          text: context,
          type: this.classifyClauseType(lawName),
          source: lawName,
          article,
          importance: this.assessClauseImportance(lawName, context),
          confidence: 0.85
        }
        
        clauseMap.set(key, clause)
        clauses.push(clause)
      }
    }
    
    // 提取合同条款
    const contractMatches = [...text.matchAll(LEGAL_CLAUSE_PATTERNS.CONTRACT_CLAUSE)]
    for (const match of contractMatches) {
      const [fullMatch, article] = match
      const context = this.getContext(text, match.index!, 150)
      
      clauses.push({
        id: `clause_${clauseIdCounter++}`,
        text: context,
        type: 'contract',
        source: '合同',
        article: `第${article}条`,
        importance: 'supporting',
        confidence: 0.8
      })
    }
    
    return clauses
  }
  
  /**
   * 提取事实元素
   */
  static extractFacts(text: string): FactElement[] {
    const facts: FactElement[] = []
    let factIdCounter = 1
    
    // 按段落分析事实
    const paragraphs = text.split(/\n\n+/)
    
    for (const paragraph of paragraphs) {
      // 跳过太短的段落
      if (paragraph.length < 20) continue
      
      // 判断事实类型
      let type: FactElement['type'] = 'claimed'
      let party: string | undefined
      
      if (paragraph.includes('原告') && paragraph.includes('诉称')) {
        type = 'claimed'
        party = '原告'
      } else if (paragraph.includes('被告') && paragraph.includes('辩称')) {
        type = 'disputed'
        party = '被告'
      } else if (paragraph.includes('本院') && paragraph.includes('查明')) {
        type = 'proven'
        party = '法院'
      } else if (paragraph.includes('双方') && (paragraph.includes('确认') || paragraph.includes('认可'))) {
        type = 'agreed'
      }
      
      // 如果是重要段落，提取为事实
      if (this.isImportantParagraph(paragraph)) {
        facts.push({
          id: `fact_${factIdCounter++}`,
          content: paragraph.substring(0, 200), // 限制长度
          type,
          party,
          legalSignificance: this.assessLegalSignificance(paragraph),
          confidence: 0.75
        })
      }
    }
    
    // 提取诉讼请求作为事实
    const claimMatches = [...text.matchAll(CLAIM_PATTERNS.LITIGATION_CLAIM)]
    for (const match of claimMatches) {
      const content = match[1].trim()
      if (content) {
        facts.push({
          id: `fact_${factIdCounter++}`,
          content: content.substring(0, 300),
          type: 'claimed',
          party: '原告',
          legalSignificance: '诉讼请求',
          confidence: 0.9
        })
      }
    }
    
    return facts
  }
  
  // ========== 辅助方法 ==========
  
  /**
   * 获取上下文
   */
  private static getContext(text: string, index: number, radius: number): string {
    const start = Math.max(0, index - radius)
    const end = Math.min(text.length, index + radius)
    return text.substring(start, end)
  }
  
  /**
   * 分类日期类型
   */
  private static classifyDateType(context: string): DateElement['type'] {
    if (context.includes('立案') || context.includes('起诉') || context.includes('受理')) {
      return 'filing'
    }
    if (context.includes('判决') || context.includes('宣判') || context.includes('审判') || 
        context.includes('判决日期') || context.includes('作出') || context.includes('裁定')) {
      return 'judgment'
    }
    if (context.includes('签订') || context.includes('合同')) {
      return 'contract'
    }
    if (context.includes('支付') || context.includes('还款') || context.includes('付款')) {
      return 'payment'
    }
    if (context.includes('发生') || context.includes('事故') || context.includes('纠纷')) {
      return 'incident'
    }
    if (context.includes('期限') || context.includes('到期') || context.includes('届满')) {
      return 'deadline'
    }
    // 如果日期在文档末尾附近，可能是判决日期
    if (context.length < 100 && context.includes('年') && context.includes('月') && context.includes('日')) {
      return 'judgment'
    }
    return 'incident'
  }
  
  /**
   * 评估日期重要性
   */
  private static assessDateImportance(
    type: DateElement['type'], 
    context: string
  ): DateElement['importance'] {
    // 关键日期类型
    if (['filing', 'judgment', 'deadline'].includes(type)) {
      return 'critical'
    }
    
    // 包含关键词的重要日期
    if (context.includes('到期') || context.includes('违约') || context.includes('起诉')) {
      return 'important'
    }
    
    return 'reference'
  }
  
  /**
   * 生成日期描述
   */
  private static generateDateDescription(type: DateElement['type'], context: string): string {
    const keyEvent = context.match(/([^，。,\s]{2,20})/)?.[1] || type
    
    const descriptions: Record<DateElement['type'], string> = {
      filing: '立案日期',
      incident: '事件发生',
      judgment: '判决日期',
      deadline: '期限届满',
      contract: '合同签订',
      payment: '付款日期'
    }
    
    return descriptions[type] + (keyEvent ? `：${keyEvent}` : '')
  }
  
  /**
   * 计算期限日期
   */
  private static calculateDeadlineDate(number: string, unit: string): string {
    const now = new Date()
    const num = parseInt(number)
    
    switch (unit) {
      case '日':
      case '天':
        now.setDate(now.getDate() + num)
        break
      case '周':
        now.setDate(now.getDate() + num * 7)
        break
      case '月':
        now.setMonth(now.getMonth() + num)
        break
      case '年':
        now.setFullYear(now.getFullYear() + num)
        break
    }
    
    return now.toISOString().split('T')[0]
  }
  
  /**
   * 分类金额类型
   */
  private static classifyAmountType(context: string): Amount['type'] {
    if (context.includes('本金') || context.includes('借款')) {
      return 'principal'
    }
    if (context.includes('利息') || context.includes('利率')) {
      return 'interest'
    }
    if (context.includes('违约金')) {
      return 'penalty'
    }
    if (context.includes('赔偿')) {
      return 'compensation'
    }
    if (context.includes('费用') || context.includes('诉讼费')) {
      return 'fee'
    }
    if (context.includes('押金') || context.includes('保证金')) {
      return 'deposit'
    }
    return 'principal'
  }
  
  /**
   * 生成金额描述
   */
  private static generateAmountDescription(
    type: Amount['type'], 
    context: string,
    fullMatch: string
  ): string {
    const typeMap: Record<Amount['type'], string> = {
      principal: '本金',
      interest: '利息',
      penalty: '违约金',
      compensation: '赔偿金',
      fee: '费用',
      deposit: '押金'
    }
    
    return `${typeMap[type]}：${fullMatch}`
  }
  
  /**
   * 分类条款类型
   */
  private static classifyClauseType(lawName: string): LegalClause['type'] {
    if (lawName.includes('合同') || lawName.includes('协议')) {
      return 'contract'
    }
    if (lawName.includes('解释') || lawName.includes('批复')) {
      return 'judicial-interpretation'
    }
    if (lawName.includes('条例') || lawName.includes('办法') || lawName.includes('规定')) {
      return 'regulation'
    }
    return 'statute'
  }
  
  /**
   * 评估条款重要性
   */
  private static assessClauseImportance(
    lawName: string, 
    context: string
  ): LegalClause['importance'] {
    // 核心法律
    if (lawName.includes('民法典') || lawName.includes('刑法') || lawName.includes('民事诉讼法')) {
      return 'core'
    }
    
    // 司法解释
    if (lawName.includes('司法解释') || lawName.includes('最高')) {
      return 'supporting'
    }
    
    return 'reference'
  }
  
  /**
   * 判断是否为重要段落
   */
  private static isImportantParagraph(paragraph: string): boolean {
    const importantIndicators = [
      '原告', '被告', '诉称', '辩称', '查明',
      '认为', '判决', '请求', '证据', '事实',
      '违约', '赔偿', '责任', '合同', '协议'
    ]
    
    const matchCount = importantIndicators.filter(indicator => 
      paragraph.includes(indicator)
    ).length
    
    return matchCount >= 2 || paragraph.length > 100
  }
  
  /**
   * 评估法律意义
   */
  private static assessLegalSignificance(text: string): string {
    if (text.includes('违约')) return '违约事实'
    if (text.includes('损害') || text.includes('损失')) return '损害结果'
    if (text.includes('过错') || text.includes('故意')) return '主观过错'
    if (text.includes('因果')) return '因果关系'
    if (text.includes('证据') || text.includes('证明')) return '证据事实'
    if (text.includes('合同') || text.includes('约定')) return '合同事实'
    return '相关事实'
  }
}

export default RuleExtractor