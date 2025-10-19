import type { Facts, Evidence, Reasoning } from '@/types/legal-case';

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
}

export interface ValidationBundle {
  facts: ValidationResult;
  evidence: ValidationResult;
  reasoning: ValidationResult;
}

export function validateFacts(facts: Facts): ValidationResult {
  const warnings: string[] = [];

  if (!facts.summary || facts.summary.startsWith('提取失败')) {
    warnings.push('事实摘要缺失或标记为失败');
  }

  if (facts.timeline.length === 0) {
    warnings.push('时间线为空');
  } else {
    const missingDates = facts.timeline.filter(event => !event.date || event.date.trim().length === 0);
    if (missingDates.length > 0) {
      warnings.push(`时间线中有 ${missingDates.length} 条事件缺少日期`);
    }
  }

  if (facts.keyFacts.length === 0) {
    warnings.push('关键事实列表为空');
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

export function validateEvidence(evidence: Evidence): ValidationResult {
  const warnings: string[] = [];

  if (!evidence.summary || evidence.summary.startsWith('提取失败')) {
    warnings.push('证据摘要缺失或标记为失败');
  }

  if (evidence.items.length === 0) {
    warnings.push('证据列表为空');
  } else {
    const unnamed = evidence.items.filter(item => !item.name || item.name.trim().length === 0);
    if (unnamed.length > 0) {
      warnings.push(`存在 ${unnamed.length} 条证据缺少名称`);
    }
  }

  if (!evidence.chainAnalysis || !evidence.chainAnalysis.analysis) {
    warnings.push('证据链分析缺失或信息不足');
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

export function validateReasoning(reasoning: Reasoning): ValidationResult {
  const warnings: string[] = [];

  if (!reasoning.summary || reasoning.summary.startsWith('提取失败')) {
    warnings.push('裁判理由摘要缺失或标记为失败');
  }

  if (reasoning.legalBasis.length === 0) {
    warnings.push('缺少引用的法律依据');
  }

  if (!reasoning.judgment || reasoning.judgment.startsWith('提取失败')) {
    warnings.push('裁判主文缺失或标记为失败');
  }

  if (reasoning.logicChain.length === 0) {
    warnings.push('法律推理链为空');
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
