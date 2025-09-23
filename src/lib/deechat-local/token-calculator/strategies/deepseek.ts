import { BaseTokenizerStrategy } from './base'
import { Provider, ModelInfo } from '../../types'

/**
 * DeepSeek Tokenizer Strategy
 * 专为法学教育平台和DeepSeek API优化的Token计算器
 */
export class DeepSeekTokenizer extends BaseTokenizerStrategy {
  constructor() {
    super(Provider.DEEPSEEK)
  }

  protected initializeModels(): void {
    // DeepSeek Chat模型配置
    this.modelConfig.set('deepseek-chat', {
      provider: Provider.DEEPSEEK,
      modelName: 'deepseek-chat',
      maxTokens: 32768, // DeepSeek支持32K上下文
      pricing: {
        inputPrice: 0.0014,  // $0.14 per 1M tokens
        outputPrice: 0.0028, // $0.28 per 1M tokens
        currency: 'USD'
      }
    })

    this.modelConfig.set('deepseek-coder', {
      provider: Provider.DEEPSEEK,
      modelName: 'deepseek-coder',
      maxTokens: 16384,
      pricing: {
        inputPrice: 0.0014,
        outputPrice: 0.0028,
        currency: 'USD'
      }
    })

    // 法学教育定制模型配置
    this.modelConfig.set('deepseek-legal', {
      provider: Provider.DEEPSEEK,
      modelName: 'deepseek-chat', // 使用chat模型但针对法律优化
      maxTokens: 32768,
      pricing: {
        inputPrice: 0.0014,
        outputPrice: 0.0028,
        currency: 'USD'
      }
    })
  }

  count(text: string, model = 'deepseek-chat'): number {
    this.validateModel(model)
    const preprocessed = this.preprocessLegalText(text)

    // DeepSeek使用类似GPT的tokenization，但对中文优化更好
    return this.estimateDeepSeekTokens(preprocessed)
  }

  // DeepSeek特殊的token估算算法
  private estimateDeepSeekTokens(text: string): number {
    if (!text || text.length === 0) {
      return 0
    }

    const analysis = this.analyzeTextForDeepSeek(text)
    let tokenCount = 0

    // DeepSeek对中文优化，token分割效率更高
    tokenCount += Math.ceil(analysis.chineseChars / 1.5) // DeepSeek中文编码更高效

    // 英文处理类似GPT
    tokenCount += Math.ceil(analysis.englishChars / 4)

    // 数字和标点
    tokenCount += analysis.numberGroups
    tokenCount += Math.ceil(analysis.punctuation * 0.7)

    // 法律特殊符号
    tokenCount += analysis.legalSymbols

    // 空格处理
    tokenCount += Math.ceil(analysis.whitespaceGroups * 0.5)

    // 特殊字符
    tokenCount += analysis.specialChars

    return Math.max(1, tokenCount)
  }

  private analyzeTextForDeepSeek(text: string) {
    return {
      chineseChars: (text.match(/[\u4e00-\u9fff]/g) || []).length,
      englishChars: (text.match(/[a-zA-Z]/g) || []).length,
      numberGroups: (text.match(/\d+/g) || []).length,
      punctuation: (text.match(/[.,!?;:'"()\[\]{}\-_]/g) || []).length,
      legalSymbols: (text.match(/[《》〈〉【】§第条]/g) || []).length,
      whitespaceGroups: (text.match(/\s+/g) || []).length,
      specialChars: (text.match(/[^\u4e00-\u9fffa-zA-Z\d\s.,!?;:'"()\[\]{}\-_《》〈〉【】§]/g) || []).length
    }
  }

  // 针对法学教育的成本估算
  estimateEducationalCost(text: string, outputTokens: number = 0, model = 'deepseek-chat') {
    const inputTokens = this.count(text, model)
    const modelInfo = this.getModelInfo(model)

    if (!modelInfo?.pricing) {
      throw new Error(`Pricing information not available for model: ${model}`)
    }

    const inputCost = (inputTokens / 1000) * modelInfo.pricing.inputPrice
    const outputCost = (outputTokens / 1000) * modelInfo.pricing.outputPrice
    const totalCost = inputCost + outputCost

    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      inputCost,
      outputCost,
      totalCost,
      currency: modelInfo.pricing.currency,
      // 教学场景特有信息
      costPerStudent: totalCost, // 单个学生成本
      estimatedSessionCost: totalCost * 10, // 假设10轮对话
      model: model
    }
  }

  // 批量教学场景优化
  batchEducationalEstimate(texts: string[], model = 'deepseek-chat') {
    return texts.map((text, index) => {
      const tokenCount = this.count(text, model)
      const costEstimate = this.estimateEducationalCost(text, 0, model)

      return {
        index,
        text: text.substring(0, 50) + '...', // 预览
        tokenCount,
        costEstimate,
        documentType: this.detectLegalDocumentType(text),
        complexity: this.assessComplexity(tokenCount)
      }
    })
  }

  private detectLegalDocumentType(text: string): string {
    if (text.includes('判决书') || text.match(/\(\d{4}\).+?第?\d+号/)) {
      return 'judgment'
    }
    if (text.includes('合同') || text.includes('协议')) {
      return 'contract'
    }
    if (text.match(/第[零一二三四五六七八九十百千万\d]+条/)) {
      return 'statute'
    }
    return 'general-legal'
  }

  private assessComplexity(tokenCount: number): 'basic' | 'intermediate' | 'advanced' {
    if (tokenCount > 2000) return 'advanced'
    if (tokenCount > 500) return 'intermediate'
    return 'basic'
  }

  // 健康检查 - 验证DeepSeek tokenizer可用性
  healthCheck(): { available: boolean; error?: string } {
    try {
      // 简单测试
      const testResult = this.count('测试DeepSeek tokenizer functionality')
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