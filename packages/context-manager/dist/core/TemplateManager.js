/**
 * 模板管理器 - 管理所有模板的注册和使用
 */
export class TemplateManager {
    templates = new Map();
    /**
     * 注册模板
     */
    register(template) {
        this.templates.set(template.id, template);
    }
    /**
     * 获取模板
     */
    get(id) {
        return this.templates.get(id);
    }
    /**
     * 列出所有模板
     */
    list() {
        return Array.from(this.templates.values()).map((template) => ({
            id: template.id,
            name: template.name,
            description: template.description,
        }));
    }
    /**
     * 检查模板是否存在
     */
    has(id) {
        return this.templates.has(id);
    }
    /**
     * 移除模板
     */
    unregister(id) {
        return this.templates.delete(id);
    }
    /**
     * 清空所有模板
     */
    clear() {
        this.templates.clear();
    }
}
/**
 * 全局模板管理器实例
 */
export const templateManager = new TemplateManager();
//# sourceMappingURL=TemplateManager.js.map