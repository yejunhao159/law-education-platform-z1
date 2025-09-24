/**
 * 对话层格式化器实体
 */
import type { AIMessage } from "../../../core/CoreTypes.js";
export declare class ConversationFormatter {
    content: string;
    messages: AIMessage[];
    constructor(conversation: string | string[]);
    toXML(): string;
    toMessages(): AIMessage[];
}
export declare function formatConversation(conversation: string | string[]): ConversationFormatter;
//# sourceMappingURL=conversation.d.ts.map