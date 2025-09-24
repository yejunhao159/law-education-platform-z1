/**
 * Context Formatter - 模板驱动的AI消息数组生成器
 */
import type { AIMessage } from "./CoreTypes.js";
export declare class ContextFormatter {
    /**
     * 获取模板管理器
     */
    static get templates(): import("./TemplateManager.js").TemplateManager;
    /**
     * 使用模板构建AI消息数组 - 核心API
     */
    static fromTemplateAsMessages<T>(templateId: string, input: T): AIMessage[];
    /**
     * 格式化上下文数据为XML字符串 - 兼容原API
     */
    static format(contextData: any): string;
}
//# sourceMappingURL=ContextFormatter.d.ts.map