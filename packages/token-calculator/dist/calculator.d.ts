import { Provider, BatchTokenResult } from './types';
export declare class TokenCalculator {
    private strategies;
    private currentStrategy;
    constructor();
    private initializeStrategies;
    count(text: string, provider?: Provider | string, model?: string): number;
    batchCount(texts: string[], provider?: Provider | string, model?: string): BatchTokenResult[];
    countGPT4(text: string): number;
    countGPT35(text: string): number;
    countClaude(text: string, model?: string): number;
    encode(text: string, provider?: Provider | string, model?: string): number[];
    decode(tokens: number[], provider?: Provider | string, model?: string): string;
    getSupportedModels(provider?: Provider | string): string[];
    getAvailableProviders(): Provider[];
    isProviderAvailable(provider: Provider | string): boolean;
    autoDetectProvider(model: string): Provider;
    smartCount(text: string, model: string): number;
    compare(text: string, model?: string): {
        [key in Provider]?: number;
    };
    private getStrategy;
    private normalizeProvider;
    setDefaultProvider(provider: Provider | string): void;
    healthCheck(): {
        [key in Provider]?: {
            available: boolean;
            error?: string;
        };
    };
}
