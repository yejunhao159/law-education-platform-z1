/**
 * 争议分析数据验证器
 * 负责验证和规范化AI返回的争议分析数据
 */

// Local type definitions for dispute validation
export interface DisputeFocus {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'informational';
  category: 'fact' | 'law' | 'procedure' | 'evidence' | 'other';
  relatedEvents: string[];
  keyPoints: unknown[];
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  teachingNotes: string;
  confidence: number;
  isResolved: boolean;
  resolutionPath: string;
  legalBasis: unknown[];
  precedents: unknown[];
}

export interface ClaimBasisMapping {
  disputeId: string;
  claimBasisId: string;
  relevance: number;
  explanation: string;
  isAutoMapped: boolean;
  confidence: number;
}

export interface DisputeAnalysisResponse {
  success: boolean;
  disputes: DisputeFocus[];
  claimBasisMappings: ClaimBasisMapping[];
  metadata: {
    analysisTime: number;
    modelVersion: string;
    confidence: number;
    timestamp: string;
    disputeCount: number;
    cacheHit?: boolean;
  };
  error?: {
    code: string;
    message: string;
    details: unknown;
    timestamp: number;
    retryable: boolean;
  };
  warnings?: string[];
}

/**
 * 验证并规范化单个争议数据
 */
export function validateDispute(dispute: unknown, index: number): DisputeFocus {
  // Type guard to ensure dispute is an object
  const disputeObj = (dispute && typeof dispute === 'object') ? dispute as Record<string, unknown> : {};

  // 调试日志：查看原始数据
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DisputeValidator] 验证争议 #${index + 1}:`, {
      hasRelatedEvents: !!disputeObj.relatedEvents,
      hasRelatedEvidence: !!disputeObj.relatedEvidence,
      relatedEventsValue: disputeObj.relatedEvents,
      relatedEvidenceValue: disputeObj.relatedEvidence
    });
  }

  return {
    id: (typeof disputeObj.id === 'string' ? disputeObj.id : undefined) || `dispute-${index + 1}`,
    title: (typeof disputeObj.title === 'string' ? disputeObj.title : undefined) || '未命名争议',
    description: (typeof disputeObj.description === 'string' ? disputeObj.description : undefined) || '',
    severity: validateSeverity(disputeObj.severity),
    category: validateCategory(disputeObj.category),
    // 兼容旧字段名 relatedEvidence
    relatedEvents: validateRelatedEvents(disputeObj.relatedEvents || disputeObj.relatedEvidence),
    keyPoints: Array.isArray(disputeObj.keyPoints) ? disputeObj.keyPoints : [],
    difficulty: validateDifficulty(disputeObj.difficulty),
    teachingNotes: (typeof disputeObj.teachingNotes === 'string' ? disputeObj.teachingNotes : undefined) || '',
    confidence: validateConfidence(disputeObj.confidence),
    // 补充可能缺失的字段
    isResolved: disputeObj.isResolved === true,
    resolutionPath: (typeof disputeObj.resolutionPath === 'string' ? disputeObj.resolutionPath : undefined) || '',
    legalBasis: Array.isArray(disputeObj.legalBasis) ? disputeObj.legalBasis : [],
    precedents: Array.isArray(disputeObj.precedents) ? disputeObj.precedents : []
  };
}

/**
 * 验证严重程度枚举值
 */
function validateSeverity(severity: unknown): 'critical' | 'major' | 'minor' | 'informational' {
  const validValues: Array<DisputeFocus['severity']> = ['critical', 'major', 'minor', 'informational'];
  return validValues.includes(severity as DisputeFocus['severity']) ? severity as DisputeFocus['severity'] : 'minor';
}

/**
 * 验证争议类别枚举值
 */
function validateCategory(category: unknown): 'fact' | 'law' | 'procedure' | 'evidence' | 'other' {
  const validValues: Array<DisputeFocus['category']> = ['fact', 'law', 'procedure', 'evidence', 'other'];
  return validValues.includes(category as DisputeFocus['category']) ? category as DisputeFocus['category'] : 'fact';
}

/**
 * 验证难度级别枚举值
 */
function validateDifficulty(difficulty: unknown): 'easy' | 'medium' | 'hard' | 'expert' {
  const validValues: Array<DisputeFocus['difficulty']> = ['easy', 'medium', 'hard', 'expert'];
  return validValues.includes(difficulty as DisputeFocus['difficulty']) ? difficulty as DisputeFocus['difficulty'] : 'medium';
}

/**
 * 验证置信度值（0-1之间）
 */
function validateConfidence(confidence: unknown): number {
  const num = Number(confidence);
  if (isNaN(num)) return 0.5;
  return Math.max(0, Math.min(1, num));
}

/**
 * 验证关联事件数组
 */
function validateRelatedEvents(events: unknown): string[] {
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
function validateClaimBasisMapping(mapping: unknown, index: number): ClaimBasisMapping {
  const mappingObj = (mapping && typeof mapping === 'object') ? mapping as Record<string, unknown> : {};

  return {
    disputeId: (typeof mappingObj.disputeId === 'string' ? mappingObj.disputeId : undefined) || `dispute-${index + 1}`,
    claimBasisId: (typeof mappingObj.claimBasisId === 'string' ? mappingObj.claimBasisId : undefined) || `claim-${index + 1}`,
    relevance: validateConfidence(mappingObj.relevance ?? 0.5),
    explanation: (typeof mappingObj.explanation === 'string' ? mappingObj.explanation : undefined) || '未提供说明',
    isAutoMapped: mappingObj.isAutoMapped !== false,
    confidence: validateConfidence(mappingObj.confidence ?? 0.5)
  };
}

/**
 * 验证完整的争议分析响应
 */
export function validateDisputeResponse(data: unknown): DisputeAnalysisResponse {
  try {
    const dataObj = (data && typeof data === 'object') ? data as Record<string, unknown> : {};
    const metadataObj = (dataObj.metadata && typeof dataObj.metadata === 'object') ? dataObj.metadata as Record<string, unknown> : {};

    // 确保基本结构
    const validated: DisputeAnalysisResponse = {
      success: dataObj.success === true,
      disputes: [],
      claimBasisMappings: [],
      metadata: {
        analysisTime: typeof metadataObj.analysisTime === 'number' ? metadataObj.analysisTime : 0,
        modelVersion: typeof metadataObj.modelVersion === 'string' ? metadataObj.modelVersion : 'unknown',
        confidence: validateConfidence(metadataObj.confidence ?? 0.5),
        timestamp: typeof metadataObj.timestamp === 'string' ? metadataObj.timestamp : new Date().toISOString(),
        disputeCount: 0,
        cacheHit: metadataObj.cacheHit === true
      }
    };

    // 验证并修复disputes数组
    if (Array.isArray(dataObj.disputes)) {
      validated.disputes = dataObj.disputes.map((d: unknown, i: number) => validateDispute(d, i));
      validated.metadata.disputeCount = validated.disputes.length;
    }

    // 验证并修复claimBasisMappings数组
    if (Array.isArray(dataObj.claimBasisMappings)) {
      validated.claimBasisMappings = dataObj.claimBasisMappings.map(
        (m: unknown, i: number) => validateClaimBasisMapping(m, i)
      );
    }

    // 如果有错误信息，添加到响应中
    if (dataObj.error && typeof dataObj.error === 'object') {
      const errorObj = dataObj.error as Record<string, unknown>;
      validated.error = {
        code: typeof errorObj.code === 'string' ? errorObj.code : 'UNKNOWN_ERROR',
        message: typeof errorObj.message === 'string' ? errorObj.message : '未知错误',
        details: errorObj.details,
        timestamp: typeof errorObj.timestamp === 'number' ? errorObj.timestamp : Date.now(),
        retryable: errorObj.retryable !== false
      };
    }

    // 添加警告信息
    if (Array.isArray(dataObj.warnings)) {
      validated.warnings = dataObj.warnings.filter((w: unknown) => typeof w === 'string');
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
        timestamp: new Date().toISOString(),
        disputeCount: 0
      }
    };
  }

  // 找出最成功的响应作为基础
  const validResponses = responses.filter(r => r.success);
  if (validResponses.length === 0) {
    // 返回第一个失败的响应，如果不存在则返回空响应
    return responses[0] || {
      success: false,
      disputes: [],
      claimBasisMappings: [],
      metadata: {
        analysisTime: 0,
        modelVersion: 'unknown',
        confidence: 0,
        timestamp: new Date().toISOString(),
        disputeCount: 0
      }
    };
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