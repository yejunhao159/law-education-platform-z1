/**
 * 工具层格式化器实体
 */
import type { AIMessage } from "../../../core/CoreTypes.js";
export declare class ToolsFormatter {
    content: string;
    messages: AIMessage[];
    tools: string[];
    constructor(tools: string[]);
    toXML(): string;
    toMessages(): AIMessage[];
}
export declare function formatTools(tools: string[]): ToolsFormatter;
//# sourceMappingURL=tools.d.ts.map