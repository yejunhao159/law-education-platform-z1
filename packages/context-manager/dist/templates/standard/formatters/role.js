/**
 * 角色层格式化器实体
 */
export class RoleFormatter {
    content;
    messages;
    constructor(role) {
        this.content = role.trim();
        this.messages = [{ role: "system", content: this.content }];
    }
    toXML() {
        return `<role>${this.content}</role>`;
    }
    toMessages() {
        return this.messages;
    }
}
// 兼容函数接口
export function formatRole(role) {
    return new RoleFormatter(role);
}
//# sourceMappingURL=role.js.map