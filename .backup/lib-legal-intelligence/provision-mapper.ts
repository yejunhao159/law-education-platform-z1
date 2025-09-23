/**
 * Provision Mapper
 * 法律条款映射器 - 根据案件类型和事实匹配相关法律条款
 */

import {
  LegalProvision,
  Citation,
  ExtractedData,
  LegalClause
} from '@/types/legal-intelligence'
import provisionsData from '@/data/legal-provisions.json'

/**
 * 条款映射器类
 */
export class ProvisionMapper {
  private static provisions = provisionsData.provisions
  private static caseTypeMapping = provisionsData.caseTypeMapping
  
  /**
   * 根据案件类型映射条款
   */
  static mapCaseTypeToProvisions(caseType: string): LegalProvision[] {
    const mapping = this.caseTypeMapping[caseType as keyof typeof this.caseTypeMapping]
    
    if (!mapping) {
      // 尝试模糊匹配
      const fuzzyMatch = this.findSimilarCaseType(caseType)
      if (fuzzyMatch) {
        return this.mapCaseTypeToProvisions(fuzzyMatch)
      }
      return []
    }
    
    const provisions: LegalProvision[] = []
    
    // 获取主要法律
    for (const lawCode of mapping.primaryLaws) {
      const law = this.provisions.find(p => p.code === lawCode)
      if (!law) continue
      
      // 获取相关条款
      for (const articleNumber of mapping.relevantArticles) {
        const article = law.articles.find(a => a.article === articleNumber)
        if (!article) continue
        
        provisions.push({
          code: law.code,
          title: law.title,
          article: article.article,
          content: article.content,
          relevance: article.relevance,
          applicability: article.applicability,
          citations: this.generateCitations(law.title, article.article),
          tags: article.tags
        })
      }
    }
    
    // 按相关度排序
    return provisions.sort((a, b) => b.relevance - a.relevance)
  }
  
  /**
   * 根据事实查找相关法条
   */
  static findRelevantStatutes(facts: string[]): LegalProvision[] {
    const relevantProvisions: Map<string, LegalProvision> = new Map()
    const keywordScores: Map<string, number> = new Map()
    
    // 分析事实中的关键词
    for (const fact of facts) {
      const keywords = this.extractKeywords(fact)
      
      // 搜索匹配的条款
      for (const law of this.provisions) {
        for (const article of law.articles) {
          let score = 0
          
          // 计算关键词匹配分数
          for (const keyword of keywords) {
            if (article.tags.includes(keyword)) {
              score += 2 // 标签匹配权重高
            }
            if (article.content?.includes(keyword)) {
              score += 1 // 内容匹配
            }
          }
          
          // 如果有匹配，添加到结果
          if (score > 0) {
            const key = `${law.code}_${article.article}`
            const existingScore = keywordScores.get(key) || 0
            
            if (score > existingScore) {
              keywordScores.set(key, score)
              
              relevantProvisions.set(key, {
                code: law.code,
                title: law.title,
                article: article.article,
                content: article.content,
                relevance: Math.min(1, score / 10), // 归一化分数
                applicability: article.applicability,
                citations: this.generateCitations(law.title, article.article),
                tags: article.tags
              })
            }
          }
        }
      }
    }
    
    // 转换为数组并排序
    return Array.from(relevantProvisions.values())
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10) // 返回前10个最相关的
  }
  
  /**
   * 生成法律引用
   */
  static generateLegalReferences(elements: ExtractedData): string[] {
    const references: Set<string> = new Set()
    
    // 基于案件类型生成引用
    const caseType = this.detectCaseType(elements)
    const typeProvisions = this.mapCaseTypeToProvisions(caseType)
    
    for (const provision of typeProvisions) {
      references.add(`《${provision.title}》${provision.article}`)
    }
    
    // 基于提取的法律条款生成引用
    for (const clause of elements.legalClauses) {
      if (clause.source && clause.article) {
        references.add(`《${clause.source}》${clause.article}`)
      }
    }
    
    return Array.from(references)
  }
  
  /**
   * 增强法律条款信息
   */
  static enhanceLegalClauses(clauses: LegalClause[]): LegalClause[] {
    return clauses.map(clause => {
      // 查找完整的法律内容
      const law = this.provisions.find(p => 
        p.title.includes(clause.source) || clause.source.includes(p.title)
      )
      
      if (!law) return clause
      
      const article = law.articles.find(a => 
        a.article === clause.article || 
        (clause.article && a.article.includes(clause.article))
      )
      
      if (!article) return clause
      
      // 增强条款信息
      return {
        ...clause,
        text: article.content || clause.text,
        interpretation: this.generateInterpretation(article),
        importance: this.assessImportance(article.relevance),
        relatedFacts: this.findRelatedFacts(article.tags, clause)
      }
    })
  }
  
  /**
   * 评估条款适用性
   */
  static assessApplicability(
    provision: LegalProvision,
    extractedData: ExtractedData
  ): number {
    let score = provision.relevance
    
    // 检查日期相关性
    if (provision.tags?.includes('诉讼时效')) {
      const hasTimeIssue = extractedData.dates.some(d => 
        d.type === 'deadline' || d.importance === 'critical'
      )
      if (hasTimeIssue) score *= 1.2
    }
    
    // 检查金额相关性
    if (provision.tags?.includes('利率') || provision.tags?.includes('违约金')) {
      const hasAmountIssue = extractedData.amounts.some(a => 
        a.type === 'interest' || a.type === 'penalty'
      )
      if (hasAmountIssue) score *= 1.3
    }
    
    // 检查当事人相关性
    if (provision.tags?.includes('举证责任')) {
      const hasPartyDispute = extractedData.facts.some(f => 
        f.type === 'disputed'
      )
      if (hasPartyDispute) score *= 1.2
    }
    
    return Math.min(1, score)
  }
  
  /**
   * 生成条款解释建议
   */
  static generateProvisionSuggestions(
    provisions: LegalProvision[],
    context: ExtractedData
  ): string[] {
    const suggestions: string[] = []
    
    for (const provision of provisions.slice(0, 5)) {
      const applicability = this.assessApplicability(provision, context)
      
      if (applicability > 0.7) {
        suggestions.push(
          `建议重点关注${provision.article}：${this.summarizeProvision(provision)}`
        )
      } else if (applicability > 0.5) {
        suggestions.push(
          `可参考${provision.article}的相关规定`
        )
      }
    }
    
    return suggestions
  }
  
  // ========== 私有辅助方法 ==========
  
  /**
   * 查找相似案件类型
   */
  private static findSimilarCaseType(caseType: string): string | null {
    const caseTypes = Object.keys(this.caseTypeMapping)
    
    for (const type of caseTypes) {
      // 简单的包含匹配
      if (caseType.includes(type) || type.includes(caseType)) {
        return type
      }
      
      // 关键词匹配
      const keywords = ['借贷', '合同', '劳动', '买卖', '侵权']
      for (const keyword of keywords) {
        if (caseType.includes(keyword) && type.includes(keyword)) {
          return type
        }
      }
    }
    
    return null
  }
  
  /**
   * 生成引用
   */
  private static generateCitations(lawTitle: string, article: string): Citation[] {
    // 这里可以连接到案例数据库，现在返回示例
    return [
      {
        caseNumber: '(2023)京01民终1234号',
        court: '北京市第一中级人民法院',
        date: '2023-06-15',
        summary: `适用${lawTitle}${article}认定合同效力`
      }
    ]
  }
  
  /**
   * 提取关键词
   */
  private static extractKeywords(text: string): string[] {
    const keywords: string[] = []
    
    // 预定义的法律关键词
    const legalKeywords = [
      '合同', '违约', '赔偿', '责任', '借款', '利息', '利率',
      '期限', '还款', '证据', '举证', '诉讼', '时效', '权利',
      '义务', '履行', '解除', '终止', '效力', '无效', '撤销'
    ]
    
    for (const keyword of legalKeywords) {
      if (text.includes(keyword)) {
        keywords.push(keyword)
      }
    }
    
    return keywords
  }
  
  /**
   * 检测案件类型
   */
  private static detectCaseType(elements: ExtractedData): string {
    // 基于金额类型判断
    const hasLoan = elements.amounts.some(a => 
      a.type === 'principal' || a.description?.includes('借款')
    )
    if (hasLoan) return '民间借贷纠纷'
    
    // 基于事实判断
    const hasLabor = elements.facts.some(f => 
      f.content.includes('工资') || f.content.includes('劳动')
    )
    if (hasLabor) return '劳动争议'
    
    // 基于法律条款判断
    const hasContract = elements.legalClauses.some(c => 
      c.type === 'contract' || c.source?.includes('合同')
    )
    if (hasContract) return '合同纠纷'
    
    return '民事纠纷'
  }
  
  /**
   * 生成条款解释
   */
  private static generateInterpretation(article: any): string {
    const key = article.tags?.[0] || '相关规定'
    return `本条款规定了${key}的相关内容，适用于${article.applicability?.join('、') || '相关纠纷'}`
  }
  
  /**
   * 评估重要性
   */
  private static assessImportance(relevance: number): LegalClause['importance'] {
    if (relevance >= 0.9) return 'core'
    if (relevance >= 0.7) return 'supporting'
    return 'reference'
  }
  
  /**
   * 查找相关事实
   */
  private static findRelatedFacts(tags: string[], clause: LegalClause): string[] {
    // 这里应该与事实数据关联，现在返回空数组
    return []
  }
  
  /**
   * 总结条款
   */
  private static summarizeProvision(provision: LegalProvision): string {
    const firstTag = provision.tags?.[0] || '法律规定'
    return `该条款涉及${firstTag}，${provision.applicability?.[0] || '可能适用于本案'}`
  }
  
  /**
   * 批量映射条款
   */
  static batchMapProvisions(caseTypes: string[]): Map<string, LegalProvision[]> {
    const result = new Map<string, LegalProvision[]>()
    
    for (const caseType of caseTypes) {
      result.set(caseType, this.mapCaseTypeToProvisions(caseType))
    }
    
    return result
  }
  
  /**
   * 搜索条款
   */
  static searchProvisions(query: string): LegalProvision[] {
    const results: LegalProvision[] = []
    
    for (const law of this.provisions) {
      for (const article of law.articles) {
        if (
          article.content?.includes(query) ||
          article.tags.some(tag => tag.includes(query)) ||
          article.article.includes(query)
        ) {
          results.push({
            code: law.code,
            title: law.title,
            article: article.article,
            content: article.content,
            relevance: 0.5,
            applicability: article.applicability,
            citations: [],
            tags: article.tags
          })
        }
      }
    }
    
    return results
  }
  
  /**
   * 获取条款详情
   */
  static getProvisionDetail(lawCode: string, articleNumber: string): LegalProvision | null {
    const law = this.provisions.find(p => p.code === lawCode)
    if (!law) return null
    
    const article = law.articles.find(a => a.article === articleNumber)
    if (!article) return null
    
    return {
      code: law.code,
      title: law.title,
      article: article.article,
      content: article.content,
      relevance: article.relevance,
      applicability: article.applicability,
      citations: this.generateCitations(law.title, article.article),
      tags: article.tags
    }
  }
}

export default ProvisionMapper