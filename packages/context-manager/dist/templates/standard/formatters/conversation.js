/**
 * 对话层格式化器实体
 */
export class ConversationFormatter {
    content;
    messages;
    constructor(conversation) {
        this.messages = [];
        if (typeof conversation === 'string') {
            this.content = conversation.trim();
            // 简单处理单个字符串，假设为用户消息
            if (this.content) {
                this.messages.push({ role: "user", content: this.content });
            }
        }
        else {
            this.content = conversation
                .filter(msg => msg.trim().length > 0)
                .map(msg => msg.trim())
                .join('\n');
            // 处理对话数组，交替分配 user/assistant
            conversation
                .filter(msg => msg.trim().length > 0)
                .forEach((msg, index) => {
                const role = index % 2 === 0 ? "user" : "assistant";
                this.messages.push({ role, content: msg.trim() });
            });
        }
    }
    toXML() {
        return `<conversation>\n${this.content}\n</conversation>`;
    }
    toMessages() {
        return this.messages;
    }
}
// 兼容函数接口
export function formatConversation(conversation) {
    return new ConversationFormatter(conversation);
}
//# sourceMappingURL=conversation.js.map