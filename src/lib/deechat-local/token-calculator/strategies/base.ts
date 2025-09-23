import { Provider, TokenizerStrategy, ModelInfo } from '../../types'

// 抽象基类 - 提供通用实现
export abstract class BaseTokenizerStrategy implements TokenizerStrategy {
  protected provider: Provider
  protected modelConfig: Map<string, ModelInfo> = new Map()

  constructor(provider: Provider) {
    this.provider = provider
    this.initializeModels()
  }

  // 子类必须实现的核心方法
  abstract count(text: string, model?: string): number

  // 可选的编码/解码方法（默认抛出错误）
  encode(text: string, model?: string): number[] {
    throw new Error(`Encode not implemented for ${this.provider} provider`)
  }

  decode(tokens: number[], model?: string): string {
    throw new Error(`Decode not implemented for ${this.provider} provider`)
  }

  // 获取支持的模型列表
  getSupportedModels(): string[] {
    return Array.from(this.modelConfig.keys())
  }

  // 获取厂商名称
  getProviderName(): Provider {
    return this.provider
  }

  // 获取模型信息
  getModelInfo(model: string): ModelInfo | undefined {
    return this.modelConfig.get(model)
  }

  // 子类实现：初始化支持的模型
  protected abstract initializeModels(): void

  // 工具方法：验证模型是否支持
  protected validateModel(model: string): void {
    if (!this.modelConfig.has(model)) {
      console.warn(`Model ${model} not explicitly supported by ${this.provider}, using default settings`)
    }
  }

  // 工具方法：文本预处理
  protected preprocessText(text: string): string {
    // 移除多余空格，统一换行符
    return text.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  }

  // 法学教育平台特有：法律文档预处理
  protected preprocessLegalText(text: string): string {
    const processed = this.preprocessText(text)

    // 法律文档特殊处理
    return processed
      // 标准化法条引用
      .replace(/第([零一二三四五六七八九十百千万\d]+)条/g, '第$1条')
      // 标准化案号格式
      .replace(/\((\d{4})\)(.+?)(\d+)号/g, '($1)$2第$3号')
      // 移除多余的标点符号
      .replace(/[，。；！？]{2,}/g, '，')
  }
}