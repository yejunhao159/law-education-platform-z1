/**
 * 苏格拉底教学提示词模块 - 模块化重构版本
 * 统一导出所有模块化组件和工具函数
 */

// 核心模块导出
export {
  UNIFIED_SOCRATIC_IDENTITY,
  getSocraticIdentityPrompt,
  getAdaptiveSocraticIdentity,
  type SocraticIdentityConfig
} from './core/SocraticIdentity';

export {
  MANDATORY_CONSTRAINTS,
  EXECUTION_GUIDELINES,
  PHILOSOPHICAL_PRINCIPLES,
  getCognitiveConstraintsPrompt,
  validateQuestionAgainstConstraints,
  generateConstraintViolationWarning
} from './core/CognitiveConstraints';

export {
  ISSUE_COLLABORATION_PRINCIPLES,
  ADVICE_SOCRATIC_STANDARDS,
  FIVE_LAYER_PROGRESSION,
  getTeachingPrinciplesPrompt,
  recommendNextTeachingStrategy,
  generateLayerSpecificQuestion,
  type TeachingPrinciple
} from './core/TeachingPrinciples';

// 协议模块导出
export {
  ISSUE_PROTOCOL_PHASES,
  ISSUEProtocolExecutor,
  getISSUEProtocolPrompt,
  recommendISSUEStrategy,
  type ISSUEPhase
} from './protocols/ISSUEProtocol';

export {
  SOCRATIC_QUESTION_TYPES,
  QUALITY_DIMENSIONS,
  QuestionQualityAssessor,
  IntelligentQuestionGenerator,
  getQuestionQualityProtocolPrompt,
  quickQualityCheck,
  type QuestionType
} from './protocols/QuestionQualityProtocol';

// 策略模块导出
export {
  DIFFICULTY_STRATEGIES,
  ADAPTIVE_ADJUSTMENT_RULES,
  DifficultyStrategyExecutor,
  getDifficultyStrategiesPrompt,
  quickDifficultyAssessment,
  type DifficultyLevel
} from './strategies/DifficultyStrategies';

export {
  TEACHING_MODE_STRATEGIES,
  API_MODE_MAPPING,
  TeachingModeExecutor,
  getTeachingModeStrategiesPrompt,
  recommendTeachingMode,
  type TeachingMode
} from './strategies/ModeStrategies';

// 构建器模块导出
export {
  UnifiedPromptBuilder,
  buildUnifiedSocraticPrompt,
  buildAPICompatiblePrompt,
  buildSocraticRolePrompt, // 兼容性导出
  type PromptBuildConfiguration
} from './builders';

// 兼容性导出：保留原有接口
export {
  SOCRATIC_QUESTION_TYPES as SOCRATIC_QUESTION_TYPES_LEGACY,
  TEACHING_MODE_STRATEGIES as TEACHING_MODE_STRATEGIES_LEGACY,
  DIFFICULTY_STRATEGIES as DIFFICULTY_STRATEGIES_LEGACY
} from './socratic-role';

// 提示词相关的常量
export const PROMPT_CONSTANTS = {
  DEFAULT_MAX_QUESTION_LENGTH: 1000,
  MAX_CONVERSATION_HISTORY: 6,
  DEFAULT_TEMPERATURE: 0.7,
  MAX_CONTEXT_LENGTH: 8000
} as const;

// 更新的类型定义
export type ModernTeachingMode = 'exploration' | 'analysis' | 'synthesis' | 'evaluation';
export type ModernDifficultyLevel = 'basic' | 'intermediate' | 'advanced';
export type ModernQuestionType = 'clarification' | 'assumption' | 'evidence' | 'implication';

// 兼容性类型定义
export type TeachingMode = 'EXPLORATION' | 'ANALYSIS' | 'SYNTHESIS' | 'EVALUATION';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';
export type QuestionType = 'CLARIFICATION' | 'ASSUMPTION' | 'EVIDENCE' | 'IMPLICATION';

// 对话上下文类型
export interface DialogueContext {
  currentLayer: number;
  studentResponse: string;
  concept?: string;
  claim?: string;
  topic?: string;
}

/**
 * 快速创建标准苏格拉底提示词的工具函数
 */
export function createStandardSocraticPrompt(options?: {
  mode?: TeachingMode;
  difficulty?: DifficultyLevel;
  maxLength?: number;
}): string {
  return buildSocraticRolePrompt(
    options?.mode || 'EXPLORATION',
    options?.difficulty || 'MEDIUM',
    options?.maxLength || PROMPT_CONSTANTS.DEFAULT_MAX_QUESTION_LENGTH
  );
}

/**
 * 智能问题生成器：结合上下文和学生回答特征生成合适的问题
 */
export function generateIntelligentQuestion(context: DialogueContext): string {
  const questionType = selectQuestionType(context.studentResponse, context.currentLayer);
  return generateQuestionTemplate(questionType, {
    concept: context.concept,
    claim: context.claim,
    topic: context.topic
  });
}

/**
 * 对话层级管理器：根据对话进度推荐下一层级
 */
export function suggestNextLayer(currentLayer: number, studentProgress: {
  conceptClarity: boolean;
  evidenceProvided: boolean;
  assumptionsRevealed: boolean;
}): number {
  // 简化的层级推进逻辑
  if (currentLayer === 1 && !studentProgress.conceptClarity) return 1; // 停留在概念澄清
  if (currentLayer === 2 && !studentProgress.assumptionsRevealed) return 2; // 停留在前提识别
  if (currentLayer === 3 && !studentProgress.evidenceProvided) return 3; // 停留在证据检验

  return Math.min(currentLayer + 1, 5); // 最多推进到第五层
}

/**
 * 教学效果评估器：评估当前对话的教学效果
 */
export function evaluateTeachingEffectiveness(dialogueHistory: {
  layer: number;
  studentResponse: string;
  questionAsked: string;
}[]): {
  overallScore: number;
  recommendations: string[];
} {
  const totalQuestions = dialogueHistory.length;
  let effectiveQuestions = 0;
  const recommendations: string[] = [];

  dialogueHistory.forEach(dialogue => {
    // 简化的效果评估逻辑
    if (dialogue.studentResponse.length > 50) effectiveQuestions++; // 学生回答详细
    if (/思考|理解|意识到/.test(dialogue.studentResponse)) effectiveQuestions++; // 学生显示思考
  });

  const overallScore = totalQuestions > 0 ? effectiveQuestions / totalQuestions : 0;

  if (overallScore < 0.5) {
    recommendations.push("问题可能过于复杂，建议降低难度");
    recommendations.push("增加澄清型问题，帮助学生理解");
  }
  if (overallScore < 0.3) {
    recommendations.push("考虑切换到探索模式，激发学生兴趣");
  }

  return { overallScore, recommendations };
}