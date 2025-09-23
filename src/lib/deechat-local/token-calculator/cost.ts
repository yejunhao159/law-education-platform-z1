import { TokenUsage, CostEstimate, ModelPricing, Provider, LegalAnalysisTokenUsage, TeachingCostEstimate } from '../types'
import { TokenCalculator } from './calculator'

/**
 * 法学教育平台成本计算器
 * 针对教学场景和DeepSeek API优化的成本估算
 */
export class CostCalculator {
  private calculator: TokenCalculator
  private pricingData: Map<string, ModelPricing> = new Map()

  constructor(calculator: TokenCalculator) {
    this.calculator = calculator
    this.initializePricing()
  }

  private initializePricing(): void {
    // DeepSeek模型定价 (主要使用，单位：USD per 1K tokens)
    this.pricingData.set('deepseek-chat', {
      inputPrice: 0.0014, // $1.4 per 1M tokens
      outputPrice: 0.0028, // $2.8 per 1M tokens
      currency: 'USD'
    })

    this.pricingData.set('deepseek-coder', {
      inputPrice: 0.0014,
      outputPrice: 0.0028,
      currency: 'USD'
    })

    // OpenAI模型定价 (2024年价格)
    this.pricingData.set('gpt-4', {
      inputPrice: 0.03,
      outputPrice: 0.06,
      currency: 'USD'
    })

    this.pricingData.set('gpt-4-turbo', {
      inputPrice: 0.01,
      outputPrice: 0.03,
      currency: 'USD'
    })

    this.pricingData.set('gpt-4o', {
      inputPrice: 0.005,
      outputPrice: 0.015,
      currency: 'USD'
    })

    this.pricingData.set('gpt-3.5-turbo', {
      inputPrice: 0.0015, // 更新的价格
      outputPrice: 0.002,
      currency: 'USD'
    })

    // Anthropic模型定价
    this.pricingData.set('claude-3-opus', {
      inputPrice: 0.015,
      outputPrice: 0.075,
      currency: 'USD'
    })

    this.pricingData.set('claude-3-sonnet', {
      inputPrice: 0.003,
      outputPrice: 0.015,
      currency: 'USD'
    })

    this.pricingData.set('claude-3-haiku', {
      inputPrice: 0.00025,
      outputPrice: 0.00125,
      currency: 'USD'
    })

    this.pricingData.set('claude-3-5-sonnet', {
      inputPrice: 0.003,
      outputPrice: 0.015,
      currency: 'USD'
    })

    // 通用模型（fallback）
    this.pricingData.set('generic', {
      inputPrice: 0.01,
      outputPrice: 0.02,
      currency: 'USD'
    })
  }

  // 基于token使用量估算成本
  estimateCost(usage: TokenUsage, model: string): CostEstimate {
    const pricing = this.getPricing(model)

    const inputCost = (usage.inputTokens / 1000) * pricing.inputPrice
    const outputCost = ((usage.outputTokens || 0) / 1000) * pricing.outputPrice
    const totalCost = inputCost + outputCost

    return {
      inputCost: this.roundCost(inputCost),
      outputCost: this.roundCost(outputCost),
      totalCost: this.roundCost(totalCost),
      currency: pricing.currency
    }
  }

  // 基于文本直接估算成本
  estimateCostFromText(
    inputText: string,
    outputTokens: number = 0,
    model: string,
    provider?: Provider | string
  ): CostEstimate {
    const inputTokens = this.calculator.count(inputText, provider, model)
    const usage: TokenUsage = {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens
    }

    return this.estimateCost(usage, model)
  }

  // 法学教育特有：教学成本估算
  estimateTeachingCost(
    inputText: string,
    sessionType: 'socratic' | 'analysis' | 'extraction' | 'timeline',
    studentLevel: 'undergraduate' | 'graduate' | 'professional',
    studentsCount: number = 1,
    model: string = 'deepseek-chat'
  ): TeachingCostEstimate {
    // 根据教学类型估算输出token数量
    const outputTokens = this.estimateOutputTokensBySession(sessionType, studentLevel)
    const baseCost = this.estimateCostFromText(inputText, outputTokens, model)

    return {
      ...baseCost,
      sessionType,
      studentLevel,
      costPerStudent: this.roundCost(baseCost.totalCost / studentsCount),
      estimatedOutputTokens: outputTokens,
      sessionComplexity: this.assessSessionComplexity(inputText, sessionType),
      recommendation: this.generateCostRecommendation(baseCost.totalCost, studentsCount)
    }
  }

  // 根据教学类型估算输出token数量
  private estimateOutputTokensBySession(
    sessionType: 'socratic' | 'analysis' | 'extraction' | 'timeline',
    studentLevel: 'undergraduate' | 'graduate' | 'professional'
  ): number {
    const baseTokens = {
      socratic: 800,    // 苏格拉底对话较长
      analysis: 600,    // 分析报告中等
      extraction: 400,  // 提取结果较短
      timeline: 500     // 时间轴分析中等
    }

    const levelMultiplier = {
      undergraduate: 1.0,   // 基础水平
      graduate: 1.3,       // 研究生更详细
      professional: 1.5    // 专业级最详细
    }

    return Math.round(baseTokens[sessionType] * levelMultiplier[studentLevel])
  }

  // 评估会话复杂度
  private assessSessionComplexity(inputText: string, sessionType: string): 'low' | 'medium' | 'high' {
    const tokenCount = this.calculator.countDeepSeek(inputText)

    if (sessionType === 'socratic') {
      if (tokenCount > 2000) return 'high'
      if (tokenCount > 800) return 'medium'
      return 'low'
    }

    if (tokenCount > 1500) return 'high'
    if (tokenCount > 500) return 'medium'
    return 'low'
  }

  // 生成成本建议
  private generateCostRecommendation(totalCost: number, studentsCount: number): string {
    const costPerStudent = totalCost / studentsCount

    if (costPerStudent < 0.001) {
      return '成本极低，适合大规模教学使用'
    } else if (costPerStudent < 0.01) {
      return '成本较低，适合常规教学'
    } else if (costPerStudent < 0.05) {
      return '成本中等，建议优化使用频率'
    } else {
      return '成本较高，建议考虑替代方案或减少token使用'
    }
  }

  // 比较不同模型的成本（针对法学教育）
  compareLegalEducationModels(
    inputText: string,
    sessionType: 'socratic' | 'analysis' | 'extraction' | 'timeline',
    studentLevel: 'undergraduate' | 'graduate' | 'professional'
  ) {
    const models = ['deepseek-chat', 'gpt-3.5-turbo', 'gpt-4', 'claude-3-haiku', 'claude-3-sonnet']

    return models.map(model => {
      try {
        const cost = this.estimateTeachingCost(inputText, sessionType, studentLevel, 1, model)
        const capability = this.assessModelCapability(model)

        return {
          model,
          cost,
          capability,
          recommendation: this.getModelRecommendation(model, cost.totalCost, capability)
        }
      } catch (error) {
        return {
          model,
          cost: null,
          capability: 'unknown',
          recommendation: '模型不可用',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  }

  // 评估模型能力
  private assessModelCapability(model: string): 'high' | 'medium' | 'low' {
    const capabilities: { [key: string]: 'high' | 'medium' | 'low' } = {
      'deepseek-chat': 'high',     // 主要使用，中文法律优秀
      'gpt-4': 'high',             // 综合能力强
      'gpt-4-turbo': 'high',       // 综合能力强
      'gpt-3.5-turbo': 'medium',   // 性价比高
      'claude-3-opus': 'high',     // 最强模型
      'claude-3-sonnet': 'medium', // 平衡型
      'claude-3-haiku': 'medium'   // 快速响应
    }

    return capabilities[model] || 'low'
  }

  // 获取模型推荐
  private getModelRecommendation(model: string, cost: number, capability: string): string {
    if (model === 'deepseek-chat') {
      return '推荐：项目主要使用，成本低，中文法律表现优秀'
    }

    if (cost < 0.001 && capability === 'medium') {
      return '推荐：成本极低，能力适中，适合大规模使用'
    }

    if (cost < 0.01 && capability === 'high') {
      return '推荐：成本合理，能力强，适合重要教学场景'
    }

    if (cost > 0.05) {
      return '谨慎：成本较高，建议仅用于特殊场景'
    }

    return '可选：成本和能力平衡'
  }

  // 获取最经济的模型建议（法学教育版本）
  getMostEconomicalForEducation(
    inputText: string,
    sessionType: 'socratic' | 'analysis' | 'extraction' | 'timeline',
    studentLevel: 'undergraduate' | 'graduate' | 'professional',
    prioritizeChinese: boolean = true
  ) {
    let models = ['deepseek-chat', 'gpt-3.5-turbo', 'claude-3-haiku']

    // 如果优先中文，DeepSeek排第一
    if (prioritizeChinese) {
      models = ['deepseek-chat', 'gpt-3.5-turbo', 'claude-3-haiku']
    }

    const comparisons = this.compareLegalEducationModels(inputText, sessionType, studentLevel)
    const validComparisons = comparisons.filter(c => c.cost?.totalCost && c.cost.totalCost > 0)

    if (validComparisons.length === 0) {
      throw new Error('No valid cost comparisons available')
    }

    // 综合考虑成本和能力
    const scored = validComparisons.map(comp => {
      const costScore = 1 / (comp.cost!.totalCost + 0.001) // 成本越低分数越高
      const capabilityScore = comp.capability === 'high' ? 3 : comp.capability === 'medium' ? 2 : 1
      const chineseBonus = (comp.model === 'deepseek-chat' && prioritizeChinese) ? 1.5 : 1

      return {
        ...comp,
        score: costScore * capabilityScore * chineseBonus
      }
    })

    const best = scored.reduce((max, current) => current.score > max.score ? current : max)

    return {
      model: best.model,
      cost: best.cost!,
      capability: best.capability,
      recommendation: best.recommendation,
      score: best.score,
      reasoning: `选择${best.model}：${best.recommendation}`
    }
  }

  // 计算学期成本预算
  estimateSemesterBudget(
    averageDocumentTokens: number,
    sessionsPerWeek: number,
    weeksPerSemester: number = 16,
    studentsCount: number = 30,
    model: string = 'deepseek-chat'
  ) {
    const outputTokensPerSession = 500 // 平均每次会话输出
    const totalSessions = sessionsPerWeek * weeksPerSemester * studentsCount

    const usage: TokenUsage = {
      inputTokens: averageDocumentTokens * totalSessions,
      outputTokens: outputTokensPerSession * totalSessions,
      totalTokens: (averageDocumentTokens + outputTokensPerSession) * totalSessions
    }

    const semesterCost = this.estimateCost(usage, model)

    return {
      semesterCost,
      perSessionCost: this.roundCost(semesterCost.totalCost / totalSessions),
      perStudentCost: this.roundCost(semesterCost.totalCost / studentsCount),
      perWeekCost: this.roundCost(semesterCost.totalCost / weeksPerSemester),
      sessions: {
        total: totalSessions,
        perWeek: sessionsPerWeek,
        weeks: weeksPerSemester,
        students: studentsCount
      },
      usage,
      model,
      budgetRecommendation: this.generateBudgetRecommendation(semesterCost.totalCost, studentsCount)
    }
  }

  private generateBudgetRecommendation(totalCost: number, studentsCount: number): string {
    const costPerStudent = totalCost / studentsCount

    if (costPerStudent < 1) {
      return `预算充足：每学生成本$${costPerStudent.toFixed(3)}，建议正常使用`
    } else if (costPerStudent < 5) {
      return `预算合理：每学生成本$${costPerStudent.toFixed(2)}，建议适度使用`
    } else {
      return `预算紧张：每学生成本$${costPerStudent.toFixed(2)}，建议优化使用策略`
    }
  }

  // 获取定价信息
  getPricing(model: string): ModelPricing {
    const pricing = this.pricingData.get(model)
    if (!pricing) {
      console.warn(`No pricing data for model: ${model}, using default`)
      return {
        inputPrice: 0.01,
        outputPrice: 0.02,
        currency: 'USD'
      }
    }
    return pricing
  }

  // 更新定价数据
  updatePricing(model: string, pricing: ModelPricing): void {
    this.pricingData.set(model, pricing)
  }

  // 获取所有支持定价的模型
  getSupportedModels(): string[] {
    return Array.from(this.pricingData.keys())
  }

  // 成本预算检查
  checkEducationBudget(
    inputText: string,
    sessionType: 'socratic' | 'analysis' | 'extraction' | 'timeline',
    studentLevel: 'undergraduate' | 'graduate' | 'professional',
    budget: number,
    model: string = 'deepseek-chat'
  ) {
    const cost = this.estimateTeachingCost(inputText, sessionType, studentLevel, 1, model)
    const withinBudget = cost.totalCost <= budget

    return {
      withinBudget,
      cost,
      remaining: withinBudget ? this.roundCost(budget - cost.totalCost) : undefined,
      overage: !withinBudget ? this.roundCost(cost.totalCost - budget) : undefined,
      maxStudents: Math.floor(budget / cost.totalCost),
      recommendation: withinBudget ?
        '预算充足，可以正常使用' :
        `超出预算，建议使用更经济的模型或减少token使用`
    }
  }

  // 辅助方法：四舍五入成本到4位小数
  private roundCost(cost: number): number {
    return Math.round(cost * 10000) / 10000
  }
}