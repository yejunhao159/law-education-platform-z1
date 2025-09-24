/**
 * 苏格拉底提示词构建器模块统一导出
 * 提供便捷的构建器访问接口
 */

export {
  UnifiedPromptBuilder,
  buildUnifiedSocraticPrompt,
  buildAPICompatiblePrompt,
  type PromptBuildConfiguration
} from './UnifiedPromptBuilder';

// 兼容性导出：保持与原有接口的兼容
export {
  buildUnifiedSocraticPrompt as buildSocraticRolePrompt
} from './UnifiedPromptBuilder';