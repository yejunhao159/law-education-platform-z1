/**
 * 模板系统导出
 */
export { StandardTemplate } from './standard/index';
// 自动注册标准模板
import { templateManager } from '../core/TemplateManager';
import { StandardTemplate } from './standard/index';
// 注册标准模板到全局管理器
templateManager.register(new StandardTemplate());
//# sourceMappingURL=index.js.map