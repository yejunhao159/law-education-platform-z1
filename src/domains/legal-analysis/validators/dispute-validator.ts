/**
 * 争议分析数据验证器
 * 负责验证和规范化AI返回的争议分析数据
 */

import type {
  DisputeFocus,
  DisputeAnalysisResponse,
  ClaimBasisMapping
} from '@/types/dispute-evidence';

/**
 * 验证并规范化单个争议数据
 */
export function validateDispute(dispute: any, index: number): DisputeFocus {
  // 调试日志：查看原始数据
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DisputeValidator] 验证争议 #${index + 1}:`, {
      hasRelatedEvents: !!dispute?.relatedEvents,
      hasRelatedEvidence: !!dispute?.relatedEvidence,
      relatedEventsValue: dispute?.relatedEvents,
      relatedEvidenceValue: dispute?.relatedEvidence
    });
  }

  return {
    id: dispute?.id || `dispute-${index + 1}`,
    title: dispute?.title || '未命名争议',
    description: dispute?.description || '',
    severity: validateSeverity(dispute?.severity),
    category: validateCategory(dispute?.category),
    // 兼容旧字段名 relatedEvidence
    relatedEvents: validateRelatedEvents(dispute?.relatedEvents || dispute?.relatedEvidence),
    keyPoints: Array.isArray(dispute?.keyPoints) ? dispute.keyPoints : [],
    difficulty: validateDifficulty(dispute?.difficulty),
    teachingNotes: dispute?.teachingNotes || '',
    confidence: validateConfidence(dispute?.confidence),
    // 补充可能缺失的字段
    isResolved: dispute?.isResolved || false,
    resolutionPath: dispute?.resolutionPath || '',
    legalBasis: dispute?.legalBasis || [],
    precedents: dispute?.precedents || []
  };
}

/**
 * 验证严重程度枚举值
 */
function validateSeverity(severity: any): 'critical' | 'major' | 'minor' | 'informational' {
  const validValues: Array<DisputeFocus['severity']> = ['critical', 'major', 'minor', 'informational'];
  return validValues.includes(severity) ? severity : 'minor';
}

/**
 * 验证争议类别枚举值
 */
function validateCategory(category: any): 'fact' | 'law' | 'procedure' | 'evidence' | 'other' {
  const validValues: Array<DisputeFocus['category']> = ['fact', 'law', 'procedure', 'evidence', 'other'];
  return validValues.includes(category) ? category : 'fact';
}

/**
 * 验证难度级别枚举值
 */
function validateDifficulty(difficulty: any): 'easy' | 'medium' | 'hard' | 'expert' {
  const validValues: Array<DisputeFocus['difficulty']> = ['easy', 'medium', 'hard', 'expert'];
  return validValues.includes(difficulty) ? difficulty : 'medium';
}

/**
 * 验证置信度值（0-1之间）
 */
function validateConfidence(confidence: any): number {
  const num = Number(confidence);
  if (isNaN(num)) return 0.5;
  return Math.max(0, Math.min(1, num));
}

/**
 * 验证关联事件数组
 */
function validateRelatedEvents(events: any): string[] {
  if (!events) return [];
  if (Array.isArray(events)) {
    return events.filter(e => typeof e === 'string' || typeof e === 'number').map(String);
  }
  if (typeof events === 'string') {
    // 尝试分割字符串
    return events.split(/[,，;；]/).map(e => e.trim()).filter(Boolean);
  }
  return [];
}

/**
 * 验证请求权基础映射
 */
function validateClaimBasisMapping(mapping: any, index: number): ClaimBasisMapping {
  return {
    disputeId: mapping?.disputeId || `dispute-${index + 1}`,
    claimBasisId: mapping?.claimBasisId || `claim-${index + 1}`,
    relevance: validateConfidence(mapping?.relevance || 0.5),
    explanation: mapping?.explanation || '未提供说明',
    isAutoMapped: mapping?.isAutoMapped !== false,
    confidence: validateConfidence(mapping?.confidence || 0.5)
  };
}

/**
 * 验证完整的争议分析响应
 */
export function validateDisputeResponse(data: any): DisputeAnalysisResponse {
  try {
    // 确保基本结构
    const validated: DisputeAnalysisResponse = {
      success: data?.success === true,
      disputes: [],
      claimBasisMappings: [],
      metadata: {
        analysisTime: data?.metadata?.analysisTime || 0,
        modelVersion: data?.metadata?.modelVersion || 'unknown',
        confidence: validateConfidence(data?.metadata?.confidence || 0.5),
        timestamp: data?.metadata?.timestamp || new Date().toISOString(),
        disputeCount: 0,
        cacheHit: data?.metadata?.cacheHit || false
      }
    };

    // 验证并修复disputes数组
    if (Array.isArray(data?.disputes)) {
      validated.disputes = data.disputes.map((d: any, i: number) => validateDispute(d, i));
      validated.metadata.disputeCount = validated.disputes.length;
    }

    // 验证并修复claimBasisMappings数组
    if (Array.isArray(data?.claimBasisMappings)) {
      validated.claimBasisMappings = data.claimBasisMappings.map(
        (m: any, i: number) => validateClaimBasisMapping(m, i)
      );
    }

    // 如果有错误信息，添加到响应中
    if (data?.error) {
      validated.error = {
        code: data.error.code || 'UNKNOWN_ERROR',
        message: data.error.message || '未知错误',
        details: data.error.details,
        timestamp: data.error.timestamp || Date.now(),
        retryable: data.error.retryable !== false
      };
    }

    // 添加警告信息
    if (Array.isArray(data?.warnings)) {
      validated.warnings = data.warnings.filter((w: any) => typeof w === 'string');
    }

    return validated;

  } catch (error) {
    console.error('验证争议响应时出错:', error);

    // 返回错误响应
    return {
      success: false,
      disputes: [],
      claimBasisMappings: [],
      error: {
        code: 'VALIDATION_ERROR',
        message: '数据验证失败',
        details: error instanceof Error ? error.message : '未知验证错误',
        timestamp: Date.now(),
        retryable: false
      },
      metadata: {
        analysisTime: 0,
        modelVersion: 'unknown',
        confidence: 0,
        timestamp: new Date().toISOString(),
        disputeCount: 0
      }
    };
  }
}

/**
 * 检查响应是否有效（包含有意义的数据）
 */
export function isValidDisputeResponse(response: DisputeAnalysisResponse): boolean {
  return (
    response.success &&
    response.disputes.length > 0 &&
    response.metadata.confidence > 0.3
  );
}

/**
 * 合并多个争议分析响应（用于混合分析模式）
 */
export function mergeDisputeResponses(
  responses: DisputeAnalysisResponse[]
): DisputeAnalysisResponse {
  if (responses.length === 0) {
    return {
      success: false,
      disputes: [],
      claimBasisMappings: [],
      metadata: {
        analysisTime: 0,
        modelVersion: 'unknown',
        confidence: 0,
        timestamp: new Date().toISOString()
      }
    };
  }

  // 找出最成功的响应作为基础
  const validResponses = responses.filter(r => r.success);
  if (validResponses.length === 0) {
    return responses[0]; // 返回第一个失败的响应
  }

  // 合并所有争议，去重
  const allDisputes = new Map<string, DisputeFocus>();
  const allMappings = new Map<string, ClaimBasisMapping>();

  validResponses.forEach(response => {
    response.disputes.forEach(dispute => {
      const existing = allDisputes.get(dispute.id);
      if (!existing || dispute.confidence > existing.confidence) {
        allDisputes.set(dispute.id, dispute);
      }
    });

    response.claimBasisMappings.forEach(mapping => {
      const key = `${mapping.disputeId}-${mapping.claimBasisId}`;
      const existing = allMappings.get(key);
      if (!existing || mapping.relevance > existing.relevance) {
        allMappings.set(key, mapping);
      }
    });
  });

  // 计算平均置信度和总分析时间
  const avgConfidence = validResponses.reduce(
    (sum, r) => sum + r.metadata.confidence, 0
  ) / validResponses.length;

  const totalTime = validResponses.reduce(
    (sum, r) => sum + r.metadata.analysisTime, 0
  );

  return {
    success: true,
    disputes: Array.from(allDisputes.values()),
    claimBasisMappings: Array.from(allMappings.values()),
    metadata: {
      analysisTime: totalTime,
      modelVersion: 'merged',
      confidence: avgConfidence,
      timestamp: new Date().toISOString(),
      disputeCount: allDisputes.size,
      cacheHit: validResponses.some(r => r.metadata.cacheHit)
    },
    warnings: validResponses.flatMap(r => r.warnings || [])
  };
}