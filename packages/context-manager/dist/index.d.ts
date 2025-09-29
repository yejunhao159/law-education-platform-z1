/**
 * @deepracticex/context-manager
 * Context management utility for AI conversation formatting
 * Provides structured XML and JSON formatting for AI prompts
 */
export interface ContextData {
    role?: string | string[];
    tools?: string | string[];
    conversation?: string | string[];
    current?: string;
    context?: string | Record<string, any>;
    systemPrompt?: string;
    examples?: Array<{
        input: string;
        output: string;
    }>;
    constraints?: string[];
    metadata?: Record<string, any>;
    [key: string]: any;
}
export interface FormatterOptions {
    format?: 'xml' | 'json' | 'markdown';
    escapeSpecialChars?: boolean;
    indentSize?: number;
    maxDepth?: number;
    preserveWhitespace?: boolean;
}
export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp?: string;
    metadata?: Record<string, any>;
}
/**
 * Context formatter for AI conversations
 * Supports XML, JSON, and Markdown formatting
 */
export declare class ContextFormatter {
    private static readonly DEFAULT_OPTIONS;
    /**
     * Format context data based on specified options
     */
    static format(data: ContextData, options?: FormatterOptions): string;
    /**
     * Format context as XML
     */
    private static formatAsXML;
    /**
     * Format a section as XML
     */
    private static formatXMLSection;
    /**
     * Format an object as XML
     */
    private static formatXMLObject;
    /**
     * Format context as JSON
     */
    private static formatAsJSON;
    /**
     * Format context as Markdown
     */
    private static formatAsMarkdown;
    /**
     * Escape XML special characters
     */
    private static escapeXml;
    /**
     * Clean data for JSON output
     */
    private static cleanData;
    /**
     * Create message array for chat APIs
     */
    static createMessages(data: ContextData, options?: FormatterOptions): Message[];
    /**
     * Parse formatted context back to data object
     */
    static parse(formattedContent: string, format?: 'xml' | 'json' | 'markdown'): ContextData;
    /**
     * Parse XML formatted content
     */
    private static parseXML;
    /**
     * Parse Markdown formatted content
     */
    private static parseMarkdown;
    /**
     * Unescape XML special characters
     */
    private static unescapeXml;
    /**
     * Validate context data structure
     */
    static validate(data: ContextData): {
        valid: boolean;
        errors: string[];
    };
}
export { ContextFormatter as default };
export type { Message as ContextMessage };
