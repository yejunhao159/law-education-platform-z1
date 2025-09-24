import { Provider, TokenizerStrategy, ModelInfo } from '../types';
export declare abstract class BaseTokenizerStrategy implements TokenizerStrategy {
    protected provider: Provider;
    protected modelConfig: Map<string, ModelInfo>;
    constructor(provider: Provider);
    abstract count(text: string, model?: string): number;
    encode(text: string, model?: string): number[];
    decode(tokens: number[], model?: string): string;
    getSupportedModels(): string[];
    getProviderName(): Provider;
    getModelInfo(model: string): ModelInfo | undefined;
    protected abstract initializeModels(): void;
    protected validateModel(model: string): void;
    protected preprocessText(text: string): string;
}
