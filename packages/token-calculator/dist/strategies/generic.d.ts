import { BaseTokenizerStrategy } from './base';
export declare class GenericTokenizer extends BaseTokenizerStrategy {
    constructor();
    protected initializeModels(): void;
    count(text: string, model?: string): number;
    encode(text: string, model?: string): number[];
    decode(tokens: number[], model?: string): string;
    private estimateTokens;
    private analyzeText;
    getDetailedEstimate(text: string): DetailedEstimate;
    private calculateConfidence;
}
interface TextAnalysis {
    chineseChars: number;
    cjkChars: number;
    englishWords: number;
    numbers: number;
    punctuation: number;
    specialChars: number;
    emojis: number;
    whitespaceGroups: number;
}
interface DetailedEstimate {
    totalTokens: number;
    analysis: TextAnalysis;
    confidence: number;
    note: string;
}
export {};
