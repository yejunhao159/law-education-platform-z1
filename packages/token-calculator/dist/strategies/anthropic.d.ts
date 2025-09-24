import { BaseTokenizerStrategy } from './base';
export declare class AnthropicTokenizer extends BaseTokenizerStrategy {
    constructor();
    protected initializeModels(): void;
    count(text: string, model?: string): number;
    encode(text: string, model?: string): number[];
    decode(tokens: number[], model?: string): string;
    private fallbackCount;
    isClaude3Model(model: string): boolean;
    countWithAccuracyInfo(text: string, model?: string): {
        tokens: number;
        isApproximate: boolean;
        note?: string;
    };
}
