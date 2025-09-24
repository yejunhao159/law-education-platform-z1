/**
 * 当前消息层格式化器实体
 */
export class CurrentFormatter {
    content;
    messages;
    constructor(current) {
        this.content = current.trim();
        this.messages = [{ role: "user", content: this.content }];
    }
    toXML() {
        return `<current>${this.content}</current>`;
    }
    toMessages() {
        return this.messages;
    }
}
// 兼容函数接口
export function formatCurrent(current) {
    return new CurrentFormatter(current);
}
//# sourceMappingURL=current.js.map