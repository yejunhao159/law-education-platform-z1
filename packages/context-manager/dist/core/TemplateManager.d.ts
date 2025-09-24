/**
 * 模板管理器 - 管理所有模板的注册和使用
 */
import type { ContextTemplate } from "../templates/types.js";
export declare class TemplateManager {
    private templates;
    /**
     * 注册模板
     */
    register<T>(template: ContextTemplate<T>): void;
    /**
     * 获取模板
     */
    get<T>(id: string): ContextTemplate<T> | undefined;
    /**
     * 列出所有模板
     */
    list(): Array<{
        id: string;
        name: string;
        description: string;
    }>;
    /**
     * 检查模板是否存在
     */
    has(id: string): boolean;
    /**
     * 移除模板
     */
    unregister(id: string): boolean;
    /**
     * 清空所有模板
     */
    clear(): void;
}
/**
 * 全局模板管理器实例
 */
export declare const templateManager: TemplateManager;
//# sourceMappingURL=TemplateManager.d.ts.map