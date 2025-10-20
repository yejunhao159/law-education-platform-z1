/**
 * 苏格拉底教学提示词模块 - v3.0价值前置架构
 *
 * 架构升级说明:
 * - v3.0采用价值层(65%) + 方法论(30%) + 硬性边界(5%)架构
 * - 融合ISSUE三阶段流程: 开场识别矛盾 → 深入锋利追问 → 收尾巩固记忆
 * - 所有旧的模块化组件已被整合进新架构
 *
 * 使用方式:
 * ```typescript
 * import { FullPromptBuilder } from '../services/FullPromptBuilder';
 *
 * const prompt = FullPromptBuilder.buildFullSystemPrompt({
 *   mode: 'exploration',
 *   difficulty: 'intermediate',
 *   issuePhase: 'initiate'
 * });
 * ```
 */

// 内部导入(用于本文件内的函数实现)
import { getSocraticMasterPrompt as _getSocraticMasterPrompt } from './SocraticMasterPrompt-v3';

// ============================================
// v3.0 新架构导出（推荐使用）
// ============================================

export {
  getSocraticMasterPrompt,
  getDefaultSocraticPrompt,
  getCompactSocraticPrompt,
  getSocraticPromptWithISSUEOpening,
  CHINESE_LEGAL_CONTEXT,
  WEB_SEARCH_USAGE
} from './SocraticMasterPrompt-v3';

export {
  getSocraticCorePrompt,
  getCompactSocraticCorePrompt,
  EXISTENCE_PURPOSE,
  TEACHING_BELIEFS,
  SUCCESS_CRITERIA,
  SOCRATIC_WEAPONS,
  HARD_BOUNDARIES
} from './core/SocraticCore-v3';

export {
  getISSUEOpeningPrompt,
  getSocraticISSUEFusionPrompt, // 保留向后兼容
  OPENING_PHASE
} from './core/SocraticISSUE-Fusion';

// ============================================
// 类型定义（保持向后兼容）
// ============================================

export type ModernTeachingMode = 'exploration' | 'analysis' | 'synthesis' | 'evaluation';
export type ModernDifficultyLevel = 'basic' | 'intermediate' | 'advanced';
export type ModernQuestionType = 'clarification' | 'assumption' | 'evidence' | 'implication';
export type ISSUEPhase = 'initiate' | 'structure' | 'socratic' | 'unify' | 'execute';

// 对话上下文类型
export interface DialogueContext {
  currentLayer: number;
  studentResponse: string;
  concept?: string;
  claim?: string;
  topic?: string;
  issuePhase?: ISSUEPhase;
}

// ============================================
// 提示词配置常量
// ============================================

export const PROMPT_CONSTANTS = {
  DEFAULT_MAX_QUESTION_LENGTH: 1000,
  MAX_CONVERSATION_HISTORY: 6,
  DEFAULT_TEMPERATURE: 0.7,
  MAX_CONTEXT_LENGTH: 128000, // DeepSeek 128K

  // v3.0 Token预算
  TOKEN_BUDGET: {
    VALUE_LAYER: 0.65,      // 价值层占65%
    METHODOLOGY: 0.30,       // 方法论占30%
    HARD_BOUNDARY: 0.05     // 硬性边界占5%
  }
} as const;

// ============================================
// 快速工具函数
// ============================================

/**
 * 快速创建标准苏格拉底提示词
 * @param options - 配置选项
 * @returns 完整的系统提示词
 */
export function createSocraticPrompt(options?: {
  mode?: 'full' | 'compact';
  includeWebSearch?: boolean;
}): string {
  const { mode = 'full', includeWebSearch = false } = options || {};

  return _getSocraticMasterPrompt(mode, includeWebSearch);
}

/**
 * 根据ISSUE阶段推荐提问策略
 * @param phase - 当前ISSUE阶段
 * @returns 推荐的提问策略描述
 */
export function recommendQuestionStrategy(phase: ISSUEPhase): string {
  const strategies: Record<ISSUEPhase, string> = {
    initiate: '使用选项式问题降低认知负荷，快速建立对话框架',
    structure: '继续选项式引导，帮助学生梳理案件结构和法律关系',
    socratic: '切换到锋利追问，使用助产术、反诘法、归谬法暴露矛盾',
    unify: '整合认知，建立法条-案件-法理的深层连接',
    execute: '巩固记忆锚点，通过变式练习固化学习成果'
  };

  return strategies[phase];
}

/**
 * 评估问题质量（基于v3.0价值层标准）
 * @param question - 要评估的问题
 * @returns 质量评分和建议
 */
export function evaluateQuestionQuality(question: string): {
  score: number;
  strengths: string[];
  improvements: string[];
} {
  const strengths: string[] = [];
  const improvements: string[] = [];
  let score = 0;

  // 检查是否锚定案件事实
  if (/案件|事实|判决|法院/.test(question)) {
    strengths.push('✅ 锚定案件事实');
    score += 25;
  } else {
    improvements.push('❌ 缺少案件锚定，可能过于抽象');
  }

  // 检查是否引用法条
  if (/第\d+条|民法典|合同法/.test(question)) {
    strengths.push('✅ 引用具体法条');
    score += 25;
  } else {
    improvements.push('建议: 引用具体法条增强专业性');
  }

  // 检查是否使用苏格拉底武器
  if (/为什么|怎么|如果.*会不会|按.*说法/.test(question)) {
    strengths.push('✅ 使用苏格拉底提问技巧');
    score += 25;
  } else {
    improvements.push('建议: 使用"为什么"、"怎么推导"等追问');
  }

  // 检查是否制造认知冲突
  if (/矛盾|冲突|既.*又|一方面.*另一方面/.test(question)) {
    strengths.push('✅ 制造认知冲突');
    score += 25;
  } else {
    improvements.push('建议: 制造矛盾，激发深度思考');
  }

  return { score, strengths, improvements };
}

// ============================================
// 废弃警告（保持向后兼容）
// ============================================

/**
 * @deprecated v3.0已废弃，请使用 FullPromptBuilder.buildFullSystemPrompt()
 */
export function buildSocraticRolePrompt(): string {
  console.warn('[已废弃] buildSocraticRolePrompt 已废弃，请使用 FullPromptBuilder.buildFullSystemPrompt()');
  return getDefaultSocraticPrompt();
}

/**
 * @deprecated v3.0已废弃，请使用 createSocraticPrompt()
 */
export function createStandardSocraticPrompt(): string {
  console.warn('[已废弃] createStandardSocraticPrompt 已废弃，请使用 createSocraticPrompt()');
  return getDefaultSocraticPrompt();
}

// ============================================
// 导出说明
// ============================================

/**
 * v3.0 架构优势:
 *
 * 1. **价值层前置(65%)**
 *    - 明确存在意义: 精神助产士，而非知识搬运工
 *    - 教学信念: 认知冲突 > 温柔引导
 *    - 成功标准: 学生自己顿悟 > 被动接受
 *
 * 2. **方法论灵活(30%)**
 *    - 三大武器: 助产术、反诘法、归谬法
 *    - 提供工具箱，不强制套用
 *    - 根据情境灵活选择
 *
 * 3. **硬性边界清晰(5%)**
 *    - 只保留安全合规要求
 *    - 不用❌✅规则束缚AI思考
 *
 * 4. **三阶段流程**
 *    - 开场(ISSUE I+S): 识别核心矛盾
 *    - 深入(Socratic): 锋利追问暴露矛盾
 *    - 收尾(ISSUE U+E): 巩固记忆锚点
 *
 * 5. **Token优化**
 *    - 从95,800 tokens压缩至34,500 tokens
 *    - 压缩率64%，留出更多对话空间
 */
