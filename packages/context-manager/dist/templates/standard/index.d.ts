/**
 * 标准四层模板 - 基于现有 formatters 架构的标准模板
 */
import type { ContextData, AIMessage } from "../../core/CoreTypes";
import type { ContextTemplate } from "../types";
import type { StandardInput } from './types';
export type { StandardInput };
export declare class StandardTemplate implements ContextTemplate<StandardInput> {
    readonly id = "standard";
    readonly name = "\u6807\u51C6\u56DB\u5C42\u6A21\u677F";
    readonly description = "\u57FA\u4E8E\u73B0\u6709\u56DB\u5C42\u7ED3\u6784\u7684\u6807\u51C6\u6A21\u677F\uFF1A\u89D2\u8272\u3001\u5DE5\u5177\u3001\u5BF9\u8BDD\u3001\u5F53\u524D\u6D88\u606F";
    build(input: StandardInput): ContextData;
    /**
     * 构建格式化的XML字符串
     * @param input 标准输入
     * @returns 格式化的XML上下文字符串
     */
    format(input: StandardInput): string;
    /**
     * 构建 AI 消息数组
     * @param input 标准输入
     * @returns AIMessage 数组
     */
    buildMessages(input: StandardInput): AIMessage[];
}
//# sourceMappingURL=index.d.ts.map