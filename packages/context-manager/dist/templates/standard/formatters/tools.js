/**
 * 工具层格式化器实体
 */
export class ToolsFormatter {
    content;
    messages;
    tools;
    constructor(tools) {
        this.tools = tools
            .filter(tool => tool.trim().length > 0)
            .map(tool => tool.trim());
        this.content = this.tools.join('\n');
        // 工具列表通常作为系统消息的一部分
        this.messages = [{
                role: "system",
                content: `可用工具：\n${this.content}`
            }];
    }
    toXML() {
        return `<tools>\n${this.content}\n</tools>`;
    }
    toMessages() {
        return this.messages;
    }
}
// 兼容函数接口
export function formatTools(tools) {
    return new ToolsFormatter(tools);
}
//# sourceMappingURL=tools.js.map