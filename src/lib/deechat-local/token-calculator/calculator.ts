import { Provider, TokenizerStrategy, BatchTokenResult } from '../types'
import { OpenAITokenizer } from './strategies/openai'
import { DeepSeekTokenizer } from './strategies/deepseek'
import { GenericTokenizer } from './strategies/generic'

/**
 * 法学教育平台Token计算器 - 本地集成版本
 * 避免外部依赖问题，提供稳定的token计算服务
 */
export class TokenCalculator {
  private strategies: Map<Provider, TokenizerStrategy> = new Map()
  private currentStrategy: TokenizerStrategy

  constructor() {
    this.initializeStrategies()
    // 默认使用DeepSeek策略（项目主要使用的AI服务）
    this.currentStrategy = this.strategies.get(Provider.DEEPSEEK) ||
                          this.strategies.get(Provider.GENERIC)!
  }

  private initializeStrategies(): void {
    try {
      // 优先初始化DeepSeek（项目主要使用）
      this.strategies.set(Provider.DEEPSEEK, new DeepSeekTokenizer())
    } catch (error) {
      console.warn('Failed to initialize DeepSeek tokenizer:', error)
    }

    try {
      this.strategies.set(Provider.OPENAI, new OpenAITokenizer())
    } catch (error) {
      console.warn('Failed to initialize OpenAI tokenizer:', error)
    }

    // 通用策略总是可用（fallback）
    this.strategies.set(Provider.GENERIC, new GenericTokenizer())
  }

  // 核心API：计算token数量
  count(text: string, provider?: Provider | string, model?: string): number {
    const strategy = this.getStrategy(provider)
    return strategy.count(text, model)
  }

  // 批量计算 - 针对教学场景优化
  batchCount(texts: string[], provider?: Provider | string, model?: string): BatchTokenResult[] {
    const strategy = this.getStrategy(provider)

    return texts.map((text, index) => {
      try {
        const tokens = strategy.count(text, model)
        return {
          text,
          tokens,
          index
        }
      } catch (error) {
        return {
          text,
          tokens: 0,
          index,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  }

  // 便捷方法：DeepSeek（项目主要使用）
  countDeepSeek(text: string, model = 'deepseek-chat'): number {
    return this.count(text, Provider.DEEPSEEK, model)
  }

  // 便捷方法：GPT-4
  countGPT4(text: string): number {
    return this.count(text, Provider.OPENAI, 'gpt-4')
  }

  // 便捷方法：GPT-3.5
  countGPT35(text: string): number {
    return this.count(text, Provider.OPENAI, 'gpt-3.5-turbo')
  }

  // 便捷方法：Claude（暂时使用通用策略）
  countClaude(text: string, model = 'claude-3-sonnet'): number {
    console.warn('Claude tokenizer not implemented, using generic estimation')
    return this.count(text, Provider.GENERIC, model)
  }

  // 高级API：编码（如果支持）
  encode(text: string, provider?: Provider | string, model?: string): number[] {
    const strategy = this.getStrategy(provider)

    if (!strategy.encode) {
      throw new Error(`Provider ${strategy.getProviderName()} does not support token encoding`)
    }

    return strategy.encode(text, model)
  }

  // 高级API：解码（如果支持）
  decode(tokens: number[], provider?: Provider | string, model?: string): string {
    const strategy = this.getStrategy(provider)

    if (!strategy.decode) {
      throw new Error(`Provider ${strategy.getProviderName()} does not support token decoding`)
    }

    return strategy.decode(tokens, model)
  }

  // 获取支持的模型列表
  getSupportedModels(provider?: Provider | string): string[] {
    const strategy = this.getStrategy(provider)
    return strategy.getSupportedModels()
  }

  // 获取所有可用的提供者
  getAvailableProviders(): Provider[] {
    return Array.from(this.strategies.keys())
  }

  // 检查提供者是否可用
  isProviderAvailable(provider: Provider | string): boolean {
    const providerEnum = this.normalizeProvider(provider)
    return this.strategies.has(providerEnum)
  }

  // 自动检测最佳策略（基于模型名）
  autoDetectProvider(model: string): Provider {
    if (model.startsWith('deepseek') || model.includes('deepseek')) {
      return Provider.DEEPSEEK
    }
    if (model.startsWith('gpt') || model.includes('davinci') || model.includes('openai')) {
      return Provider.OPENAI
    }
    if (model.startsWith('claude') || model.includes('anthropic')) {
      // 暂时使用通用策略
      return Provider.GENERIC
    }

    // 默认使用DeepSeek（项目主要使用）
    return Provider.DEEPSEEK
  }

  // 智能计算：自动选择提供者
  smartCount(text: string, model: string): number {
    const provider = this.autoDetectProvider(model)
    return this.count(text, provider, model)
  }

  // 比较不同提供者的结果
  compare(text: string, model?: string): { [key in Provider]?: number } {
    const results: { [key in Provider]?: number } = {}

    for (const [provider, strategy] of Array.from(this.strategies.entries())) {
      try {
        results[provider] = strategy.count(text, model)
      } catch (error) {
        console.warn(`Failed to count tokens with ${provider}:`, error)
      }
    }

    return results
  }

  // 法学教育特有：教学场景批量分析
  analyzeTeachingMaterials(materials: Array<{ text: string; type: string }>) {
    return materials.map(material => {
      const tokens = this.countDeepSeek(material.text) // 使用主要AI服务
      const comparison = this.compare(material.text)

      return {
        ...material,
        tokenAnalysis: {
          deepseek: tokens,
          comparison,
          complexity: this.assessComplexity(tokens),
          costEstimate: this.estimateTeachingCost(tokens),
          suitableForLevel: this.recommendStudentLevel(tokens, material.type)
        }
      }
    })
  }

  // 评估内容复杂度
  private assessComplexity(tokenCount: number): 'basic' | 'intermediate' | 'advanced' {
    if (tokenCount > 3000) return 'advanced'   // 高级：长篇判决书、复杂案例
    if (tokenCount > 1000) return 'intermediate' // 中级：中等案例、合同
    return 'basic' // 基础：简单案例、法条
  }

  // 估算教学成本
  private estimateTeachingCost(tokenCount: number) {
    // 基于DeepSeek定价
    const inputCost = (tokenCount / 1000) * 0.0014 // $0.14 per 1M tokens
    const outputCost = (500 / 1000) * 0.0028 // 假设500 tokens输出

    return {
      inputCost: Number(inputCost.toFixed(6)),
      outputCost: Number(outputCost.toFixed(6)),
      totalCost: Number((inputCost + outputCost).toFixed(6)),
      costPer10Students: Number(((inputCost + outputCost) * 10).toFixed(6))
    }
  }

  // 推荐学生水平
  private recommendStudentLevel(tokenCount: number, materialType: string): string[] {
    const levels: string[] = []

    if (tokenCount < 500) {
      levels.push('undergraduate')
    }
    if (tokenCount >= 500 && tokenCount <= 2000) {
      levels.push('graduate')
    }
    if (tokenCount > 1500) {
      levels.push('professional')
    }

    // 根据材料类型调整
    if (materialType === 'judgment' && tokenCount > 1000) {
      levels.push('advanced-graduate')
    }

    return levels.length > 0 ? levels : ['undergraduate']
  }

  // 获取策略实例
  private getStrategy(provider?: Provider | string): TokenizerStrategy {
    if (!provider) {
      return this.currentStrategy
    }

    const providerEnum = this.normalizeProvider(provider)
    const strategy = this.strategies.get(providerEnum)

    if (!strategy) {
      console.warn(`Provider ${provider} not available, falling back to generic`)
      return this.strategies.get(Provider.GENERIC)!
    }

    return strategy
  }

  // 标准化提供者名称
  private normalizeProvider(provider: Provider | string): Provider {
    if (typeof provider === 'string') {
      const normalized = provider.toLowerCase()
      switch (normalized) {
        case 'deepseek':
          return Provider.DEEPSEEK
        case 'openai':
        case 'gpt':
          return Provider.OPENAI
        case 'anthropic':
        case 'claude':
          return Provider.ANTHROPIC
        case 'generic':
        case 'fallback':
          return Provider.GENERIC
        default:
          console.warn(`Unknown provider: ${provider}, using deepseek`)
          return Provider.DEEPSEEK // 默认使用项目主要AI服务
      }
    }
    return provider
  }

  // 设置默认策略
  setDefaultProvider(provider: Provider | string): void {
    const strategy = this.getStrategy(provider)
    this.currentStrategy = strategy
  }

  // 健康检查
  healthCheck(): { [key in Provider]?: { available: boolean; error?: string } } {
    const health: { [key in Provider]?: { available: boolean; error?: string } } = {}

    for (const [provider, strategy] of Array.from(this.strategies.entries())) {
      try {
        // 使用法律文档测试
        const testText = '根据《民法典》第577条，当事人一方不履行合同义务。'
        const result = strategy.count(testText)
        health[provider] = { available: result > 0 }
      } catch (error) {
        health[provider] = {
          available: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    return health
  }

  // 获取推荐配置
  getRecommendedConfiguration(): {
    primaryProvider: Provider
    fallbackProvider: Provider
    recommendedModels: { [key in Provider]?: string }
  } {
    return {
      primaryProvider: Provider.DEEPSEEK, // 项目主要使用
      fallbackProvider: Provider.GENERIC, // 始终可用
      recommendedModels: {
        [Provider.DEEPSEEK]: 'deepseek-chat',
        [Provider.OPENAI]: 'gpt-3.5-turbo',
        [Provider.GENERIC]: 'legal-basic'
      }
    }
  }
}