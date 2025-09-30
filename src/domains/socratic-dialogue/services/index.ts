/**
 * 苏格拉底对话服务 - 统一导出
 * DeepPractice Standards Compliant
 */

// ========== 主服务导出 ==========
export {
  SocraticDialogueService,
  type SocraticDialogueConfig
} from './SocraticDialogueService';

// ========== 向后兼容导出 ==========
// 旧代码可能使用这个名字
export { SocraticDialogueService as EnhancedSocraticService } from './SocraticDialogueService';

// ========== 内部实现（按需导出） ==========
export {
  DeeChatAIClient,
  createDeeChatConfig,
  type DeeChatConfig
} from './DeeChatAIClient';

// ========== 默认实例导出 ==========
import { SocraticDialogueService } from './SocraticDialogueService';

/**
 * 默认的苏格拉底对话服务实例
 * 可以直接使用，无需手动创建实例
 *
 * @example
 * ```typescript
 * import { socraticService } from '@/src/domains/socratic-dialogue/services';
 *
 * const response = await socraticService.generateQuestion({
 *   currentTopic: "合同效力",
 *   level: "intermediate"
 * });
 * ```
 */
export const socraticService = new SocraticDialogueService();

/**
 * 创建新的服务实例（支持自定义配置）
 *
 * @example
 * ```typescript
 * const customService = createSocraticService({
 *   temperature: 0.9,
 *   maxTokens: 2000
 * });
 * ```
 */
export function createSocraticService(config?: Partial<import('./SocraticDialogueService').SocraticDialogueConfig>) {
  return new SocraticDialogueService(config);
}