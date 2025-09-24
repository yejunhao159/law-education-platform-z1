export { TokenCalculator } from './calculator';
export { CostCalculator } from './cost';
export { OpenAITokenizer } from './strategies/openai';
export { AnthropicTokenizer } from './strategies/anthropic';
export { GenericTokenizer } from './strategies/generic';
export { BaseTokenizerStrategy } from './strategies/base';
export { Provider, TokenUsage, CostEstimate, ModelPricing, TokenizeOptions, BatchTokenResult, ModelInfo, TokenizerStrategy } from './types';
import { TokenCalculator } from './calculator';
export declare function countTokens(text: string, provider?: string, model?: string): number;
export declare function countGPT4(text: string): number;
export declare function countGPT35(text: string): number;
export declare function countClaude(text: string, model?: string): number;
export declare function estimateCost(inputText: string, outputTokens: number | undefined, model: string, provider?: string): import("./types").CostEstimate;
export declare function compareProviders(text: string, model?: string): {
    openai?: number | undefined;
    anthropic?: number | undefined;
    generic?: number | undefined;
};
export declare function batchCount(texts: string[], provider?: string, model?: string): import("./types").BatchTokenResult[];
export declare function getMostEconomical(inputText: string, outputTokens?: number, models?: string[]): {
    model: string;
    cost: import("./types").CostEstimate;
    savings?: number;
};
export declare function healthCheck(): {
    openai?: {
        available: boolean;
        error?: string;
    } | undefined;
    anthropic?: {
        available: boolean;
        error?: string;
    } | undefined;
    generic?: {
        available: boolean;
        error?: string;
    } | undefined;
};
export declare function getSupportedModels(provider?: string): string[];
export declare function getAvailableProviders(): import("./types").Provider[];
export default TokenCalculator;
