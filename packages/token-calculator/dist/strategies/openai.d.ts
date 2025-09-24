import { BaseTokenizerStrategy } from './base';
export declare class OpenAITokenizer extends BaseTokenizerStrategy {
    constructor();
    protected initializeModels(): void;
    count(text: string, model?: string): number;
    encode(text: string, model?: string): number[];
    decode(tokens: number[], model?: string): string;
    private fallbackCount;
    supportsEncoding(model: string): boolean;
}
