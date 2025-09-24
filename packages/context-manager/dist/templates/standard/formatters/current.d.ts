/**
 * 当前消息层格式化器实体
 */
import type { AIMessage } from "../../../core/CoreTypes.js";
export declare class CurrentFormatter {
    content: string;
    messages: AIMessage[];
    constructor(current: string);
    toXML(): string;
    toMessages(): AIMessage[];
}
export declare function formatCurrent(current: string): CurrentFormatter;
//# sourceMappingURL=current.d.ts.map