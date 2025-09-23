// 核心类型定义 - DeeChat Token Calculator Local
// 基于原始DeeChat包但优化用于法学教育平台

// 支持的AI厂商
export enum Provider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  DEEPSEEK = 'deepseek', // 添加法学项目使用的DeepSeek
  GENERIC = 'generic'
}

// Token使用统计
export interface TokenUsage {
  inputTokens: number
  outputTokens?: number
  totalTokens: number
}

// 成本估算结果
export interface CostEstimate {
  inputCost: number
  outputCost: number
  totalCost: number
  currency: string
}

// 模型定价信息
export interface ModelPricing {
  inputPrice: number  // 每1K tokens价格
  outputPrice: number // 每1K tokens价格
  currency: string
}

// Token计算选项
export interface TokenizeOptions {
  includeSpecialTokens?: boolean
  truncate?: boolean
  maxTokens?: number
}

// 批处理结果
export interface BatchTokenResult {
  text: string
  tokens: number
  index: number
  error?: string
}

// 模型信息
export interface ModelInfo {
  provider: Provider
  modelName: string
  maxTokens: number
  pricing?: ModelPricing
}

// 策略接口 - 所有tokenizer必须实现
export interface TokenizerStrategy {
  // 核心功能
  count(text: string, model?: string): number

  // 高级功能（可选实现）
  encode?(text: string, model?: string): number[]
  decode?(tokens: number[], model?: string): string

  // 元信息
  getSupportedModels(): string[]
  getProviderName(): Provider
}

// 法学教育平台特有类型扩展
export interface LegalAnalysisTokenUsage extends TokenUsage {
  documentType?: 'judgment' | 'contract' | 'statute' | 'case-brief'
  complexityLevel?: 'basic' | 'intermediate' | 'advanced'
  legalDomain?: string[] // 民法、刑法、商法等
}

// 教学成本分析
export interface TeachingCostEstimate extends CostEstimate {
  sessionType: 'socratic' | 'analysis' | 'extraction' | 'timeline'
  studentLevel: 'undergraduate' | 'graduate' | 'professional'
  costPerStudent?: number
  estimatedOutputTokens?: number
  sessionComplexity?: string
  recommendation?: string
}