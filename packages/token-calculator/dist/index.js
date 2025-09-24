// Token Calculator - Main entry point
// 基于策略模式的多厂商Token计算器
// 导出核心类
export { TokenCalculator } from './calculator';
export { CostCalculator } from './cost';
// 导出策略类
export { OpenAITokenizer } from './strategies/openai';
export { AnthropicTokenizer } from './strategies/anthropic';
export { GenericTokenizer } from './strategies/generic';
export { BaseTokenizerStrategy } from './strategies/base';
// 导出类型
export { Provider } from './types';
import { TokenCalculator } from './calculator';
import { CostCalculator } from './cost';
// 创建默认实例
const defaultCalculator = new TokenCalculator();
const defaultCostCalculator = new CostCalculator(defaultCalculator);
// 便捷函数 - 直接导出以便快速使用
export function countTokens(text, provider, model) {
    return defaultCalculator.count(text, provider, model);
}
export function countGPT4(text) {
    return defaultCalculator.countGPT4(text);
}
export function countGPT35(text) {
    return defaultCalculator.countGPT35(text);
}
export function countClaude(text, model) {
    return defaultCalculator.countClaude(text, model);
}
export function estimateCost(inputText, outputTokens = 0, model, provider) {
    return defaultCostCalculator.estimateCostFromText(inputText, outputTokens, model, provider);
}
export function compareProviders(text, model) {
    return defaultCalculator.compare(text, model);
}
export function batchCount(texts, provider, model) {
    return defaultCalculator.batchCount(texts, provider, model);
}
export function getMostEconomical(inputText, outputTokens = 0, models) {
    return defaultCostCalculator.getMostEconomical(inputText, outputTokens, models);
}
// 健康检查
export function healthCheck() {
    return defaultCalculator.healthCheck();
}
// 获取支持的模型
export function getSupportedModels(provider) {
    return defaultCalculator.getSupportedModels(provider);
}
// 获取可用的提供者
export function getAvailableProviders() {
    return defaultCalculator.getAvailableProviders();
}
// 默认导出主类
export default TokenCalculator;
//# sourceMappingURL=index.js.map