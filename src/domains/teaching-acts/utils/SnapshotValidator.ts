/**
 * 快照Schema一致性检查
 * T050: 渲染前验证快照数据完整性
 */

import {
  validateSnapshotEnvelope,
  type SnapshotEnvelope,
} from '../schemas/SnapshotSchemas';

/**
 * 验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  errors: string[];
  warnings: string[];
}

/**
 * 验证快照完整性
 */
export function validateSnapshotIntegrity(
  snapshot: SnapshotEnvelope | null
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    missingFields: [],
    errors: [],
    warnings: [],
  };

  if (!snapshot) {
    result.isValid = false;
    result.errors.push('快照数据为空');
    return result;
  }

  // 使用Zod验证
  const zodResult = validateSnapshotEnvelope(snapshot);
  if (!zodResult.success) {
    result.isValid = false;
    result.errors.push('Schema验证失败');
    zodResult.error?.issues.forEach((issue) => {
      result.errors.push(`${issue.path.join('.')}: ${issue.message}`);
    });
  }

  // 检查必需字段
  const requiredFields: (keyof SnapshotEnvelope)[] = [
    'versionId',
    'sessionId',
    'userId',
    'status',
    'classroomReady',
  ];

  requiredFields.forEach((field) => {
    if (!snapshot[field]) {
      result.missingFields.push(field);
      result.isValid = false;
    }
  });

  // 检查至少有一个Act数据
  const hasAnyActData =
    snapshot.act1CaseSnapshot ||
    snapshot.act2AnalysisSnapshot ||
    snapshot.act3DialogueSnapshot ||
    snapshot.act4SummarySnapshot;

  if (!hasAnyActData) {
    result.warnings.push('快照中没有任何Act数据');
  }

  // 检查审计字段
  if (!snapshot.sourceService) {
    result.warnings.push('缺少sourceService字段');
  }
  if (!snapshot.requestId) {
    result.warnings.push('缺少requestId字段');
  }

  return result;
}

/**
 * 记录验证警告
 */
export function logValidationWarnings(
  result: ValidationResult,
  context: string
) {
  if (!result.isValid) {
    console.error(`[SnapshotValidator] ${context} 验证失败:`, {
      missingFields: result.missingFields,
      errors: result.errors,
    });
  }

  if (result.warnings.length > 0) {
    console.warn(`[SnapshotValidator] ${context} 警告:`, result.warnings);
  }
}
