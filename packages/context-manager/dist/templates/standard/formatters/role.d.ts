/**
 * 角色层格式化器实体
 */
import type { AIMessage } from "../../../core/CoreTypes.js";
export declare class RoleFormatter {
    content: string;
    messages: AIMessage[];
    constructor(role: string);
    toXML(): string;
    toMessages(): AIMessage[];
}
export declare function formatRole(role: string): RoleFormatter;
//# sourceMappingURL=role.d.ts.map