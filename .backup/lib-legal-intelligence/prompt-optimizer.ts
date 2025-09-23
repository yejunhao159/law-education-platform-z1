/**
 * AI Prompt Optimizer
 * AI提示优化器 - 生成优化的提示词以获得结构化输出
 */

import {
  ElementType,
  AIPromptTemplate,
  ExtractedData,
  DateElement,
  Party,
  Amount,
  LegalClause,
  FactElement
} from '@/types/legal-intelligence'

/**
 * AI提示优化器类
 */
export class AIPromptOptimizer {
  /**
   * 提示模板库
   */
  private static templates: Map<ElementType, AIPromptTemplate> = new Map([
    ['date', {
      id: 'date_extraction_v1',
      elementType: 'date',
      template: `分析以下法律文本，提取所有重要日期信息。

文本内容：
{text}

请识别并提取：
1. 案件相关日期（立案、开庭、判决等）
2. 合同签订和履行日期
3. 事件发生日期
4. 支付和还款日期
5. 期限和时效日期

对每个日期，请提供：
- date: ISO格式日期(YYYY-MM-DD)
- type: 类型(filing/incident/judgment/deadline/contract/payment)
- description: 简要描述（20字以内）
- importance: 重要性(critical/important/reference)
- relatedParties: 相关当事人
- confidence: 置信度(0-1)

返回JSON格式的日期数组。`,
      systemPrompt: '你是专业的法律文书分析专家，擅长识别和提取法律文档中的时间要素。请严格按照JSON格式返回结果。',
      responseSchema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string', format: 'date' },
            type: { type: 'string', enum: ['filing', 'incident', 'judgment', 'deadline', 'contract', 'payment'] },
            description: { type: 'string', maxLength: 20 },
            importance: { type: 'string', enum: ['critical', 'important', 'reference'] },
            relatedParties: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'number', minimum: 0, maximum: 1 }
          },
          required: ['date', 'type', 'description', 'importance', 'confidence']
        }
      },
      examples: [{
        input: '原告于2024年3月15日向本院提起诉讼',
        output: [{
          date: '2024-03-15',
          type: 'filing',
          description: '原告起诉',
          importance: 'critical',
          relatedParties: ['原告'],
          confidence: 0.95
        }]
      }],
      version: '1.0.0',
      effectiveness: 0.85
    }],
    
    ['party', {
      id: 'party_extraction_v1',
      elementType: 'party',
      template: `分析以下法律文本，识别所有当事人信息。

文本内容：
{text}

请识别并提取：
1. 原告和被告
2. 第三人
3. 法定代表人
4. 委托代理人和律师
5. 相关公司和组织

对每个当事人，请提供：
- name: 姓名或名称
- type: 类型(plaintiff/defendant/third-party/witness/lawyer/judge)
- role: 具体角色描述
- legalRepresentative: 法定代表人（如适用）
- aliases: 别名或其他称呼
- confidence: 置信度(0-1)

返回JSON格式的当事人数组。`,
      systemPrompt: '你是专业的法律文书分析专家，擅长识别法律文档中的当事人关系。请准确提取所有当事人信息，并严格按照JSON格式返回。',
      responseSchema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['plaintiff', 'defendant', 'third-party', 'witness', 'lawyer', 'judge'] },
            role: { type: 'string' },
            legalRepresentative: { type: 'string' },
            aliases: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'number', minimum: 0, maximum: 1 }
          },
          required: ['name', 'type', 'role', 'confidence']
        }
      },
      examples: [{
        input: '原告张三，被告李四贸易有限公司，法定代表人王五',
        output: [
          {
            name: '张三',
            type: 'plaintiff',
            role: '原告',
            confidence: 0.95
          },
          {
            name: '李四贸易有限公司',
            type: 'defendant',
            role: '被告（公司）',
            legalRepresentative: '王五',
            confidence: 0.95
          }
        ]
      }],
      version: '1.0.0',
      effectiveness: 0.88
    }],
    
    ['amount', {
      id: 'amount_extraction_v1',
      elementType: 'amount',
      template: `分析以下法律文本，提取所有金额和数值信息。

文本内容：
{text}

请识别并提取：
1. 借款本金
2. 利息和利率
3. 违约金和赔偿金
4. 诉讼费用
5. 其他金额

对每个金额，请提供：
- value: 数值（转换为数字）
- currency: 货币类型(CNY/USD/EUR)
- type: 类型(principal/interest/penalty/compensation/fee/deposit)
- description: 描述说明
- calculation: 计算方式（如适用）
- relatedDate: 相关日期
- confidence: 置信度(0-1)

注意：
- 将"万元"转换为实际数值（如100万元→1000000）
- 百分比保留原值（如8%→8）

返回JSON格式的金额数组。`,
      systemPrompt: '你是专业的法律文书分析专家，擅长识别和计算法律文档中的金额信息。请准确提取所有金额，注意单位转换，并严格按照JSON格式返回。',
      responseSchema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            value: { type: 'number' },
            currency: { type: 'string', enum: ['CNY', 'USD', 'EUR'] },
            type: { type: 'string', enum: ['principal', 'interest', 'penalty', 'compensation', 'fee', 'deposit'] },
            description: { type: 'string' },
            calculation: { type: 'string' },
            relatedDate: { type: 'string', format: 'date' },
            confidence: { type: 'number', minimum: 0, maximum: 1 }
          },
          required: ['value', 'currency', 'type', 'description', 'confidence']
        }
      },
      examples: [{
        input: '借款本金100万元，年利率8%',
        output: [
          {
            value: 1000000,
            currency: 'CNY',
            type: 'principal',
            description: '借款本金',
            confidence: 0.95
          },
          {
            value: 8,
            currency: 'CNY',
            type: 'interest',
            description: '年利率8%',
            calculation: '年利率',
            confidence: 0.95
          }
        ]
      }],
      version: '1.0.0',
      effectiveness: 0.9
    }],
    
    ['all', {
      id: 'comprehensive_extraction_v1',
      elementType: 'all',
      template: `作为法律文书分析专家，请全面分析以下文本，提取所有重要法律要素。

文本内容：
{text}

请提取以下信息：

1. 日期信息(dates)：
   - 所有重要日期和期限
   - 包括立案、判决、合同签订、事件发生等日期

2. 当事人信息(parties)：
   - 原告、被告、第三人
   - 法定代表人、代理人、律师

3. 金额信息(amounts)：
   - 本金、利息、违约金、赔偿金
   - 注意单位转换（万元→实际数值）

4. 法律条款(legalClauses)：
   - 引用的法律法规
   - 合同条款
   - 司法解释

5. 关键事实(facts)：
   - 争议事实
   - 认定事实
   - 诉讼请求

返回完整的JSON结构，包含上述所有类别的数组。每个元素都应包含confidence字段表示置信度。`,
      systemPrompt: `你是资深的法律文书分析专家，精通中国法律体系。请：
1. 准确识别法律文档中的所有重要要素
2. 理解法律术语的准确含义
3. 保持客观中立的分析立场
4. 严格按照JSON格式输出，确保数据结构正确
5. 对不确定的内容降低置信度而非忽略`,
      responseSchema: {
        type: 'object',
        properties: {
          dates: { type: 'array' },
          parties: { type: 'array' },
          amounts: { type: 'array' },
          legalClauses: { type: 'array' },
          facts: { type: 'array' }
        },
        required: ['dates', 'parties', 'amounts', 'legalClauses', 'facts']
      },
      examples: [],
      version: '1.0.0',
      effectiveness: 0.92
    }]
  ])
  
  /**
   * 生成提取提示词
   */
  static generateExtractionPrompt(
    elementType: ElementType, 
    text: string,
    context?: string
  ): string {
    const template = this.templates.get(elementType)
    if (!template) {
      throw new Error(`未找到元素类型 ${elementType} 的提示模板`)
    }
    
    let prompt = template.template.replace('{text}', text)
    
    // 添加上下文信息
    if (context) {
      prompt = `背景信息：${context}\n\n` + prompt
    }
    
    // 添加格式要求
    prompt += '\n\n重要：请直接返回JSON格式的结果，不要包含任何解释或其他文字。'
    
    return prompt
  }
  
  /**
   * 生成分析提示词
   */
  static generateAnalysisPrompt(data: ExtractedData): string {
    const summary = this.summarizeExtractedData(data)
    
    return `基于以下提取的法律要素，请提供深度法律分析：

${summary}

请分析：
1. 法律关系性质和特征
2. 关键争议焦点
3. 适用的法律规定
4. 证据要求和举证责任
5. 可能的判决结果和风险

返回JSON格式的分析结果，包含：
- legalRelation: 法律关系分析
- keyDisputes: 争议焦点数组
- applicableLaws: 适用法律数组
- evidenceRequirements: 证据要求
- riskAssessment: 风险评估
- recommendations: 建议数组`
  }
  
  /**
   * 获取系统提示词
   */
  static getSystemPrompt(elementType: ElementType): string {
    const template = this.templates.get(elementType)
    return template?.systemPrompt || '你是专业的法律文书分析专家。'
  }
  
  /**
   * 获取响应模式
   */
  static getResponseSchema(elementType: ElementType): any {
    const template = this.templates.get(elementType)
    return template?.responseSchema || {}
  }
  
  /**
   * 优化提示词质量
   */
  static optimizePrompt(prompt: string, previousResults?: any[]): string {
    let optimized = prompt
    
    // 基于之前的结果添加改进建议
    if (previousResults && previousResults.length > 0) {
      const issues = this.analyzeResultIssues(previousResults)
      if (issues.length > 0) {
        optimized += '\n\n请特别注意：\n' + issues.map(i => `- ${i}`).join('\n')
      }
    }
    
    // 添加质量控制要求
    optimized += `

质量要求：
- 确保所有日期格式为YYYY-MM-DD
- 金额必须转换为数字（如100万→1000000）
- 当事人名称要完整准确
- 置信度应反映信息的确定性（0.9以上为高确定性）`
    
    return optimized
  }
  
  /**
   * 生成少样本学习提示
   */
  static generateFewShotPrompt(
    elementType: ElementType,
    examples: Array<{ input: string; output: any }>
  ): string {
    const template = this.templates.get(elementType)
    if (!template) return ''
    
    let prompt = '以下是一些示例：\n\n'
    
    for (const example of examples) {
      prompt += `输入：${example.input}\n`
      prompt += `输出：${JSON.stringify(example.output, null, 2)}\n\n`
    }
    
    prompt += '现在请分析以下内容：\n'
    
    return prompt
  }
  
  /**
   * 创建链式提示
   */
  static createChainPrompt(tasks: string[]): string {
    return `请按以下步骤逐一完成任务：

${tasks.map((task, i) => `${i + 1}. ${task}`).join('\n')}

请按顺序完成每个步骤，并在每个步骤后总结结果。最后提供完整的JSON输出。`
  }
  
  /**
   * 验证输出格式
   */
  static validateOutput(output: any, elementType: ElementType): boolean {
    const schema = this.getResponseSchema(elementType)
    
    // 简单的类型检查
    if (schema.type === 'array') {
      return Array.isArray(output)
    }
    
    if (schema.type === 'object') {
      return typeof output === 'object' && output !== null
    }
    
    return true
  }
  
  /**
   * 修复常见输出问题
   */
  static fixCommonIssues(output: string): any {
    let fixed = output
    
    // 移除可能的markdown代码块标记
    fixed = fixed.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    
    // 移除前后的解释文字
    const jsonMatch = fixed.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (jsonMatch) {
      fixed = jsonMatch[0]
    }
    
    // 修复常见的JSON错误
    fixed = fixed
      .replace(/，/g, ',') // 中文逗号
      .replace(/：/g, ':') // 中文冒号
      .replace(/'/g, '"') // 单引号
      .replace(/\n/g, ' ') // 移除换行
      .replace(/,\s*}/g, '}') // 尾随逗号
      .replace(/,\s*]/g, ']') // 尾随逗号
    
    try {
      return JSON.parse(fixed)
    } catch (e) {
      console.error('无法修复JSON输出:', e)
      return null
    }
  }
  
  // ========== 私有辅助方法 ==========
  
  /**
   * 总结提取的数据
   */
  private static summarizeExtractedData(data: ExtractedData): string {
    const parts: string[] = []
    
    if (data.dates.length > 0) {
      parts.push(`日期要素（${data.dates.length}个）：`)
      data.dates.slice(0, 3).forEach(d => {
        parts.push(`  - ${d.date}: ${d.description}`)
      })
    }
    
    if (data.parties.length > 0) {
      parts.push(`\n当事人（${data.parties.length}个）：`)
      data.parties.slice(0, 5).forEach(p => {
        parts.push(`  - ${p.name} (${p.role})`)
      })
    }
    
    if (data.amounts.length > 0) {
      parts.push(`\n金额信息（${data.amounts.length}个）：`)
      data.amounts.slice(0, 3).forEach(a => {
        parts.push(`  - ${a.description}: ${a.value}${a.currency}`)
      })
    }
    
    if (data.legalClauses.length > 0) {
      parts.push(`\n法律条款（${data.legalClauses.length}个）：`)
      data.legalClauses.slice(0, 3).forEach(c => {
        parts.push(`  - ${c.source} ${c.article || ''}`)
      })
    }
    
    return parts.join('\n')
  }
  
  /**
   * 分析结果问题
   */
  private static analyzeResultIssues(results: any[]): string[] {
    const issues: string[] = []
    
    for (const result of results) {
      // 检查日期格式
      if (result.date && !result.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        issues.push('日期格式不正确，应为YYYY-MM-DD')
      }
      
      // 检查金额
      if (result.value !== undefined && typeof result.value !== 'number') {
        issues.push('金额应为数字类型')
      }
      
      // 检查置信度
      if (result.confidence !== undefined && 
          (result.confidence < 0 || result.confidence > 1)) {
        issues.push('置信度应在0-1之间')
      }
    }
    
    return [...new Set(issues)] // 去重
  }
}

export default AIPromptOptimizer