// DeeChat Token Calculator - 本地集成版本
// 专为法学教育平台优化，避免外部依赖问题

// 导出核心类
export { TokenCalculator } from './calculator'
export { CostCalculator } from './cost'

// 导出策略类
export { OpenAITokenizer } from './strategies/openai'
export { DeepSeekTokenizer } from './strategies/deepseek'
export { GenericTokenizer } from './strategies/generic'
export { BaseTokenizerStrategy } from './strategies/base'

// 导出类型（从统一类型文件导入）
export type {
  Provider,
  TokenUsage,
  CostEstimate,
  ModelPricing,
  TokenizeOptions,
  BatchTokenResult,
  ModelInfo,
  TokenizerStrategy,
  LegalAnalysisTokenUsage,
  TeachingCostEstimate
} from '../types'

import { TokenCalculator } from './calculator'
import { CostCalculator } from './cost'

// 创建默认实例（单例模式）
const defaultCalculator = new TokenCalculator()
const defaultCostCalculator = new CostCalculator(defaultCalculator)

// 便捷函数 - 直接导出以便快速使用
export function countTokens(text: string, provider?: string, model?: string): number {
  return defaultCalculator.count(text, provider, model)
}

// 法学教育平台主要使用的DeepSeek
export function countDeepSeek(text: string, model = 'deepseek-chat'): number {
  return defaultCalculator.countDeepSeek(text, model)
}

export function countGPT4(text: string): number {
  return defaultCalculator.countGPT4(text)
}

export function countGPT35(text: string): number {
  return defaultCalculator.countGPT35(text)
}

export function countClaude(text: string, model?: string): number {
  return defaultCalculator.countClaude(text, model)
}

// 成本估算便捷函数
export function estimateCost(
  inputText: string,
  outputTokens: number = 0,
  model: string = 'deepseek-chat',
  provider?: string
) {
  return defaultCostCalculator.estimateCostFromText(inputText, outputTokens, model, provider)
}

// 教学成本估算（法学教育特有）
export function estimateTeachingCost(
  inputText: string,
  sessionType: 'socratic' | 'analysis' | 'extraction' | 'timeline',
  studentLevel: 'undergraduate' | 'graduate' | 'professional',
  studentsCount: number = 1,
  model: string = 'deepseek-chat'
) {
  return defaultCostCalculator.estimateTeachingCost(inputText, sessionType, studentLevel, studentsCount, model)
}

// 比较不同模型（针对法学教育优化）
export function compareLegalEducationModels(
  inputText: string,
  sessionType: 'socratic' | 'analysis' | 'extraction' | 'timeline',
  studentLevel: 'undergraduate' | 'graduate' | 'professional'
) {
  return defaultCostCalculator.compareLegalEducationModels(inputText, sessionType, studentLevel)
}

// 获取最经济的教学模型
export function getMostEconomicalForEducation(
  inputText: string,
  sessionType: 'socratic' | 'analysis' | 'extraction' | 'timeline',
  studentLevel: 'undergraduate' | 'graduate' | 'professional',
  prioritizeChinese: boolean = true
) {
  return defaultCostCalculator.getMostEconomicalForEducation(inputText, sessionType, studentLevel, prioritizeChinese)
}

// 学期预算估算
export function estimateSemesterBudget(
  averageDocumentTokens: number,
  sessionsPerWeek: number,
  weeksPerSemester: number = 16,
  studentsCount: number = 30,
  model: string = 'deepseek-chat'
) {
  return defaultCostCalculator.estimateSemesterBudget(
    averageDocumentTokens,
    sessionsPerWeek,
    weeksPerSemester,
    studentsCount,
    model
  )
}

export function compareProviders(text: string, model?: string) {
  return defaultCalculator.compare(text, model)
}

export function batchCount(texts: string[], provider?: string, model?: string) {
  return defaultCalculator.batchCount(texts, provider, model)
}

// 教学材料分析（法学教育特有）
export function analyzeTeachingMaterials(materials: Array<{ text: string; type: string }>) {
  return defaultCalculator.analyzeTeachingMaterials(materials)
}

// 健康检查
export function healthCheck() {
  return defaultCalculator.healthCheck()
}

// 获取支持的模型
export function getSupportedModels(provider?: string) {
  return defaultCalculator.getSupportedModels(provider)
}

// 获取可用的提供者
export function getAvailableProviders() {
  return defaultCalculator.getAvailableProviders()
}

// 获取推荐配置
export function getRecommendedConfiguration() {
  return defaultCalculator.getRecommendedConfiguration()
}

// 预算检查
export function checkEducationBudget(
  inputText: string,
  sessionType: 'socratic' | 'analysis' | 'extraction' | 'timeline',
  studentLevel: 'undergraduate' | 'graduate' | 'professional',
  budget: number,
  model: string = 'deepseek-chat'
) {
  return defaultCostCalculator.checkEducationBudget(inputText, sessionType, studentLevel, budget, model)
}

// 获取计算器实例（用于高级用法）
export function getTokenCalculator(): TokenCalculator {
  return defaultCalculator
}

export function getCostCalculator(): CostCalculator {
  return defaultCostCalculator
}

// 默认导出主类
export default TokenCalculator

// 版本信息
export const VERSION = '1.0.0-legal-education'
export const DESCRIPTION = 'Token calculator optimized for legal education platform'

// 快速开始指南
export const QUICK_START = {
  basic: 'countDeepSeek("你的法律文档内容")',
  cost: 'estimateTeachingCost("文档内容", "socratic", "undergraduate")',
  compare: 'compareLegalEducationModels("文档", "analysis", "graduate")',
  budget: 'estimateSemesterBudget(1000, 2, 16, 30)'
}