import { TokenUsage, CostEstimate, ModelPricing, Provider } from './types';
import { TokenCalculator } from './calculator';
export declare class CostCalculator {
    private calculator;
    private pricingData;
    constructor(calculator: TokenCalculator);
    private initializePricing;
    estimateCost(usage: TokenUsage, model: string): CostEstimate;
    estimateCostFromText(inputText: string, outputTokens: number | undefined, model: string, provider?: Provider | string): CostEstimate;
    compareCosts(inputText: string, outputTokens: number | undefined, models: string[]): {
        model: string;
        cost: CostEstimate;
        tokens: number;
    }[];
    getMostEconomical(inputText: string, outputTokens?: number, models?: string[]): {
        model: string;
        cost: CostEstimate;
        savings?: number;
    };
    estimateMonthlyCost(dailyInputTokens: number, dailyOutputTokens: number, model: string, daysPerMonth?: number): CostEstimate;
    getPricing(model: string): ModelPricing;
    updatePricing(model: string, pricing: ModelPricing): void;
    getSupportedModels(): string[];
    batchEstimateCost(texts: string[], outputTokensPerText: number | undefined, model: string, provider?: Provider | string): {
        text: string;
        cost: CostEstimate;
        index: number;
    }[];
    checkBudget(inputText: string, outputTokens: number, model: string, budget: number, provider?: Provider | string): {
        withinBudget: boolean;
        cost: CostEstimate;
        remaining?: number;
        overage?: number;
    };
    private roundCost;
}
