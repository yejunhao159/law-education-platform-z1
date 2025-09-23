import { BaseTokenizerStrategy } from './base'
import { Provider, ModelInfo } from '../../types'

/**
 * OpenAI Tokenizer Strategy - 简化版本
 * 避免外部依赖导致的模块解析问题
 * 使用启发式算法估算token数量
 */
export class OpenAITokenizer extends BaseTokenizerStrategy {
  constructor() {
    super(Provider.OPENAI)
  }

  protected initializeModels(): void {
    // GPT-4 系列
    this.modelConfig.set('gpt-4', {
      provider: Provider.OPENAI,
      modelName: 'gpt-4',
      maxTokens: 8192,
      pricing: {
        inputPrice: 0.03,   // $30 per 1M tokens
        outputPrice: 0.06,  // $60 per 1M tokens
        currency: 'USD'
      }
    })

    this.modelConfig.set('gpt-4-turbo', {
      provider: Provider.OPENAI,
      modelName: 'gpt-4-turbo',
      maxTokens: 128000,
      pricing: {
        inputPrice: 0.01,   // $10 per 1M tokens
        outputPrice: 0.03,  // $30 per 1M tokens
        currency: 'USD'
      }
    })

    // GPT-3.5 系列
    this.modelConfig.set('gpt-3.5-turbo', {
      provider: Provider.OPENAI,
      modelName: 'gpt-3.5-turbo',
      maxTokens: 4096,
      pricing: {
        inputPrice: 0.0015, // $1.5 per 1M tokens
        outputPrice: 0.002, // $2 per 1M tokens
        currency: 'USD'
      }
    })

    this.modelConfig.set('gpt-3.5-turbo-16k', {
      provider: Provider.OPENAI,
      modelName: 'gpt-3.5-turbo-16k',
      maxTokens: 16384,
      pricing: {
        inputPrice: 0.003,  // $3 per 1M tokens
        outputPrice: 0.004, // $4 per 1M tokens
        currency: 'USD'
      }
    })
  }

  count(text: string, model = 'gpt-3.5-turbo'): number {
    this.validateModel(model)
    const preprocessed = this.preprocessLegalText(text)

    // 使用GPT特定的估算算法
    return this.estimateGPTTokens(preprocessed, model)
  }

  // GPT系列token估算算法
  private estimateGPTTokens(text: string, model: string): number {
    if (!text || text.length === 0) {
      return 0
    }

    const analysis = this.analyzeTextForGPT(text)
    let tokenCount = 0

    // GPT对英文优化，中文相对效率较低
    // 中文字符：约2-2.5个字符per token
    tokenCount += Math.ceil(analysis.chineseChars / 2.2)

    // 英文：约4个字符per token (包括空格)
    tokenCount += Math.ceil(analysis.englishChars / 4)

    // 数字：通常每个数字串是1个token
    tokenCount += analysis.numberGroups

    // 标点符号：大多数是独立token
    tokenCount += analysis.punctuation

    // 空格：一般不单独计token，但连续空格可能
    tokenCount += Math.ceil(analysis.whitespaceGroups * 0.3)

    // 特殊字符
    tokenCount += analysis.specialChars

    // 法律符号 (GPT对这些处理相对标准)
    tokenCount += analysis.legalSymbols

    // 模型特定调整
    if (model.includes('gpt-4')) {
      // GPT-4的tokenizer可能略有不同
      tokenCount = Math.ceil(tokenCount * 1.05) // 轻微上调
    }

    return Math.max(1, tokenCount)
  }

  private analyzeTextForGPT(text: string) {
    return {
      chineseChars: (text.match(/[\u4e00-\u9fff]/g) || []).length,
      englishChars: (text.match(/[a-zA-Z]/g) || []).length,
      numberGroups: (text.match(/\d+/g) || []).length,
      punctuation: (text.match(/[.,!?;:'"()\[\]{}\-_]/g) || []).length,
      whitespaceGroups: (text.match(/\s+/g) || []).length,
      specialChars: (text.match(/[^\u4e00-\u9fffa-zA-Z\d\s.,!?;:'"()\[\]{}\-_]/g) || []).length,
      legalSymbols: (text.match(/[《》〈〉【】§]/g) || []).length
    }
  }

  // 便捷方法：直接计算GPT-4 tokens
  countGPT4(text: string): number {
    return this.count(text, 'gpt-4')
  }

  // 便捷方法：直接计算GPT-3.5 tokens
  countGPT35(text: string): number {
    return this.count(text, 'gpt-3.5-turbo')
  }

  // 比较不同GPT模型的token计算
  compareGPTModels(text: string) {
    const models = ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-4', 'gpt-4-turbo']

    return models.map(model => {
      const tokens = this.count(text, model)
      const modelInfo = this.getModelInfo(model)

      return {
        model,
        tokens,
        maxTokens: modelInfo?.maxTokens || 0,
        utilizationRate: modelInfo ? (tokens / modelInfo.maxTokens * 100).toFixed(2) + '%' : 'N/A',
        estimatedInputCost: modelInfo?.pricing ?
          ((tokens / 1000) * modelInfo.pricing.inputPrice).toFixed(6) : 'N/A'
      }
    })
  }

  // 为教学场景优化的成本计算
  calculateTeachingCost(text: string, expectedOutputTokens: number = 500, model = 'gpt-3.5-turbo') {
    const inputTokens = this.count(text, model)
    const modelInfo = this.getModelInfo(model)

    if (!modelInfo?.pricing) {
      throw new Error(`Pricing information not available for model: ${model}`)
    }

    const inputCost = (inputTokens / 1000) * modelInfo.pricing.inputPrice
    const outputCost = (expectedOutputTokens / 1000) * modelInfo.pricing.outputPrice
    const totalCost = inputCost + outputCost

    return {
      model,
      inputTokens,
      outputTokens: expectedOutputTokens,
      totalTokens: inputTokens + expectedOutputTokens,
      inputCost: Number(inputCost.toFixed(6)),
      outputCost: Number(outputCost.toFixed(6)),
      totalCost: Number(totalCost.toFixed(6)),
      currency: modelInfo.pricing.currency,
      // 教学特有指标
      costPer10Rounds: Number((totalCost * 10).toFixed(6)), // 10轮对话成本
      costPerStudent: Number(totalCost.toFixed(6)), // 单学生成本
      affordabilityLevel: this.assessAffordability(totalCost)
    }
  }

  private assessAffordability(cost: number): 'very-low' | 'low' | 'medium' | 'high' | 'very-high' {
    if (cost < 0.001) return 'very-low'
    if (cost < 0.01) return 'low'
    if (cost < 0.05) return 'medium'
    if (cost < 0.2) return 'high'
    return 'very-high'
  }

  // 健康检查
  healthCheck(): { available: boolean; error?: string } {
    try {
      const testResult = this.count('Test OpenAI tokenizer functionality with 测试中文')
      return {
        available: testResult > 0,
        error: testResult > 0 ? undefined : 'Token count returned 0 for test input'
      }
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}