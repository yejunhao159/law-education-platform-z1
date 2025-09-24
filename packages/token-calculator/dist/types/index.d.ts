export declare enum Provider {
    OPENAI = "openai",
    ANTHROPIC = "anthropic",
    GENERIC = "generic"
}
export interface TokenUsage {
    inputTokens: number;
    outputTokens?: number;
    totalTokens: number;
}
export interface CostEstimate {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    currency: string;
}
export interface ModelPricing {
    inputPrice: number;
    outputPrice: number;
    currency: string;
}
export interface TokenizeOptions {
    includeSpecialTokens?: boolean;
    truncate?: boolean;
    maxTokens?: number;
}
export interface BatchTokenResult {
    text: string;
    tokens: number;
    index: number;
    error?: string;
}
export interface ModelInfo {
    provider: Provider;
    modelName: string;
    maxTokens: number;
    pricing?: ModelPricing;
}
export interface TokenizerStrategy {
    count(text: string, model?: string): number;
    encode?(text: string, model?: string): number[];
    decode?(tokens: number[], model?: string): string;
    getSupportedModels(): string[];
    getProviderName(): Provider;
}
