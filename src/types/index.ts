/**
 * 统一类型定义导出
 * DeepPractice Standards Compliant
 *
 * ⚠️ 本文件仅导出实际被使用的类型
 * 未使用的导出已被清理，详见 unused-exports.md
 */

// ========== 共享基础类型 ==========
export * from './shared/base';

// ========== 主要法律案件类型（使用旧版本以保持兼容） ==========
// 注意：优先导出旧版LegalCase，因为整个代码库都在使用threeElements字段
export type {
  LegalCase,
  ThreeElements,
  Facts,
  Evidence,
  Reasoning,
  TimelineEvent,
  EvidenceItem,
  Party,
  BasicInfo,
  LawReference,
  TimelineAnalysis
} from '../../types/legal-case';

// ========== 域类型（排除LegalCase以避免冲突） ==========
// case-management导出的LegalCase会被旧版本覆盖
export * from './domains/legal-analysis';
export * from './domains/socratic-dialogue';
export * from './domains/teaching-acts';

// ========== 向后兼容说明 ==========
// 当前使用types/legal-case.ts中的LegalCase定义（包含threeElements）
// 未来迁移到domains/case-management.ts的新版本时需要全局重构
