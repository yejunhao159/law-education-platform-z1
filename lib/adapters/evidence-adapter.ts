/**
 * 证据数据适配器
 * 用于处理不同版本Evidence类型的兼容性问题
 */

import type {
  Evidence,
  EvidenceType,
  SimpleEvidence,
  EvidenceQuality,
  EvidenceMetadata,
  EvidenceAIAnalysis,
  EvidenceRelations
} from '@/types/evidence';

/**
 * 生成证据ID
 */
function generateEvidenceId(): string {
  return `ev_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 验证并规范化证据类型
 */
export function validateEvidenceType(type: any): EvidenceType {
  // 类型映射表（处理各种可能的输入）
  const typeMap: Record<string, EvidenceType> = {
    // 英文映射
    'documentary': 'documentary',
    'testimonial': 'testimonial',
    'physical': 'physical',
    'expert': 'expert',
    'audio_visual': 'audio_visual',
    'electronic': 'electronic',
    'party_statement': 'party_statement',
    'inspection': 'inspection',

    // 中文映射
    '书证': 'documentary',
    '证人证言': 'testimonial',
    '物证': 'physical',
    '鉴定意见': 'expert',
    '视听资料': 'audio_visual',
    '电子数据': 'electronic',
    '当事人陈述': 'party_statement',
    '勘验笔录': 'inspection',

    // 兼容旧版本
    'document': 'documentary',
    'testimony': 'testimonial',
    'material': 'physical',
    'expertise': 'expert',
    'audiovisual': 'audio_visual',
    'digital': 'electronic'
  };

  const normalizedType = String(type).toLowerCase().replace(/[\s-]/g, '_');
  return typeMap[normalizedType] || 'documentary';
}

/**
 * 从简化版转换为完整版Evidence
 */
export function fromSimpleEvidence(simple: SimpleEvidence): Evidence {
  return {
    id: simple.id,
    title: `证据-${simple.id}`,
    content: simple.content,
    type: validateEvidenceType(simple.type),
    description: simple.content.substring(0, 200),
    relatedEvents: []  // 简化版没有关联事件，返回空数组
  };
}

/**
 * 规范化证据数据
 * 将各种格式的输入转换为标准的Evidence类型
 */
export function normalizeEvidence(input: any): Evidence {
  if (!input) {
    throw new Error('输入数据不能为空');
  }

  // 基础字段处理
  const id = input.id || generateEvidenceId();
  const title = input.title || input.name || `证据-${id}`;
  const content = input.content || input.description || '';
  const type = validateEvidenceType(input.type || 'documentary');
  const description = input.description || input.summary || content.substring(0, 200);

  // 关联事件处理 - 这是核心！
  let relatedEvents: string[] = [];
  if (Array.isArray(input.relatedEvents)) {
    relatedEvents = input.relatedEvents;
  } else if (Array.isArray(input.relatedEvidence)) {
    // 兼容旧字段名
    relatedEvents = input.relatedEvidence;
  } else if (Array.isArray(input.events)) {
    relatedEvents = input.events;
  } else if (typeof input.relatedEvents === 'string') {
    // 处理逗号分隔的字符串
    relatedEvents = input.relatedEvents.split(',').map((e: string) => e.trim());
  }

  // 构建标准Evidence对象
  const evidence: Evidence = {
    id,
    title,
    content,
    type,
    description,
    relatedEvents
  };

  // 处理可选的关联关系
  if (input.relations) {
    evidence.relations = normalizeRelations(input.relations);
  }

  // 处理质量评估
  if (input.quality) {
    evidence.quality = normalizeQuality(input.quality);
  }

  // 处理元数据
  if (input.metadata) {
    evidence.metadata = normalizeMetadata(input.metadata);
  }

  // 处理AI分析
  if (input.aiAnalysis) {
    evidence.aiAnalysis = normalizeAIAnalysis(input.aiAnalysis);
  }

  // 处理交互状态
  if (input.interactionState) {
    evidence.interactionState = input.interactionState;
  }

  // 处理教学相关
  if (input.teachingNotes) evidence.teachingNotes = input.teachingNotes;
  if (input.practiceHints) evidence.practiceHints = input.practiceHints;
  if (input.commonMistakes) evidence.commonMistakes = input.commonMistakes;

  return evidence;
}

/**
 * 规范化关联关系
 */
function normalizeRelations(relations: any): EvidenceRelations {
  return {
    relatedEvents: relations.relatedEvents || [],
    relatedDisputes: relations.relatedDisputes || [],
    relatedClaims: relations.relatedClaims || [],
    supportingEvidence: relations.supportingEvidence || [],
    contradictingEvidence: relations.contradictingEvidence || []
  };
}

/**
 * 规范化质量评估
 */
function normalizeQuality(quality: any): EvidenceQuality {
  const score = (field: any, defaultValue: number = 50): number => {
    const value = Number(field);
    if (isNaN(value)) return defaultValue;
    return Math.max(0, Math.min(100, value));
  };

  const base = {
    authenticity: score(quality.authenticity),
    relevance: score(quality.relevance),
    legality: score(quality.legality),
    probativeValue: score(quality.probativeValue || quality.probative_value),
    overallScore: score(quality.overallScore || quality.overall_score || quality.score)
  };

  // 如果没有提供综合评分，计算平均值
  if (!quality.overallScore && !quality.overall_score && !quality.score) {
    base.overallScore = Math.round(
      (base.authenticity + base.relevance + base.legality + base.probativeValue) / 4
    );
  }

  return {
    ...base,
    strengths: quality.strengths || [],
    weaknesses: quality.weaknesses || [],
    challenges: quality.challenges || quality.challengePoints || []
  };
}

/**
 * 规范化元数据
 */
function normalizeMetadata(metadata: any): EvidenceMetadata {
  const result: EvidenceMetadata = {
    source: metadata.source || '未知来源',
    dateCreated: metadata.dateCreated || metadata.date || new Date().toISOString()
  };

  if (metadata.dateSubmitted) result.dateSubmitted = metadata.dateSubmitted;
  if (metadata.author) result.author = metadata.author;
  if (metadata.submittedBy) result.submittedBy = metadata.submittedBy;
  if (metadata.courtAccepted !== undefined) result.courtAccepted = Boolean(metadata.courtAccepted);
  if (metadata.originalForm) result.originalForm = metadata.originalForm;
  if (metadata.verificationStatus) result.verificationStatus = metadata.verificationStatus;

  return result;
}

/**
 * 规范化AI分析
 */
function normalizeAIAnalysis(analysis: any): EvidenceAIAnalysis {
  return {
    summary: analysis.summary || '',
    keyPoints: Array.isArray(analysis.keyPoints) ? analysis.keyPoints : [],
    legalSignificance: analysis.legalSignificance || analysis.significance || '',
    relatedLaws: Array.isArray(analysis.relatedLaws) ? analysis.relatedLaws : [],
    confidence: normalizeConfidence(analysis.confidence),
    suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions : [],
    risks: Array.isArray(analysis.risks) ? analysis.risks : []
  };
}

/**
 * 规范化置信度值
 */
function normalizeConfidence(value: any): number {
  const num = Number(value);
  if (isNaN(num)) return 0.5;
  // 如果是百分制，转换为0-1
  if (num > 1) return num / 100;
  return Math.max(0, Math.min(1, num));
}

/**
 * 批量规范化证据
 */
export function normalizeEvidenceList(inputs: any[]): Evidence[] {
  if (!Array.isArray(inputs)) return [];
  return inputs.map(input => {
    try {
      return normalizeEvidence(input);
    } catch (error) {
      console.error('规范化证据失败:', error, input);
      // 返回最基础的结构，避免整个列表处理失败
      return {
        id: input?.id || generateEvidenceId(),
        title: '错误的证据数据',
        content: JSON.stringify(input),
        type: 'documentary' as EvidenceType,
        description: '数据格式错误',
        relatedEvents: []
      };
    }
  });
}

/**
 * 验证Evidence对象是否完整
 */
export function isCompleteEvidence(evidence: any): evidence is Evidence {
  return !!(
    evidence &&
    evidence.id &&
    evidence.title &&
    evidence.content &&
    evidence.type &&
    evidence.description &&
    Array.isArray(evidence.relatedEvents)
  );
}

/**
 * 修复不完整的Evidence对象
 */
export function repairEvidence(evidence: Partial<Evidence>): Evidence {
  return normalizeEvidence(evidence);
}

/**
 * 合并两个Evidence对象（用于更新）
 */
export function mergeEvidence(original: Evidence, updates: Partial<Evidence>): Evidence {
  // ID不能改变
  const { id: _id, ...validUpdates } = updates;

  return {
    ...original,
    ...validUpdates,
    // 特殊处理数组字段，避免直接覆盖
    relatedEvents: updates.relatedEvents || original.relatedEvents,
    relations: updates.relations ? {
      ...original.relations,
      ...updates.relations
    } : original.relations,
    quality: updates.quality ? {
      ...original.quality,
      ...updates.quality
    } : original.quality,
    metadata: updates.metadata ? {
      ...original.metadata,
      ...updates.metadata
    } : original.metadata,
    aiAnalysis: updates.aiAnalysis ? {
      ...original.aiAnalysis,
      ...updates.aiAnalysis
    } : original.aiAnalysis
  };
}

/**
 * 从Evidence转换为简化版（向后兼容）
 */
export function toSimpleEvidence(evidence: Evidence): SimpleEvidence {
  return {
    id: evidence.id,
    content: evidence.content,
    type: evidence.type
  };
}

/**
 * 提取证据的关键信息（用于摘要展示）
 */
export function extractEvidenceSummary(evidence: Evidence): {
  id: string;
  title: string;
  type: string;
  relatedEventsCount: number;
  qualityScore?: number;
  isCourtAccepted?: boolean;
} {
  return {
    id: evidence.id,
    title: evidence.title,
    type: evidence.type,
    relatedEventsCount: evidence.relatedEvents.length,
    qualityScore: evidence.quality?.overallScore,
    isCourtAccepted: evidence.metadata?.courtAccepted
  };
}

/**
 * 查找证据之间的关联
 */
export function findEvidenceConnections(evidences: Evidence[]): Map<string, Set<string>> {
  const connections = new Map<string, Set<string>>();

  evidences.forEach(evidence => {
    const id = evidence.id;
    if (!connections.has(id)) {
      connections.set(id, new Set<string>());
    }

    // 通过共同的关联事件建立连接
    evidences.forEach(other => {
      if (other.id !== id) {
        const commonEvents = evidence.relatedEvents.filter(
          e => other.relatedEvents.includes(e)
        );
        if (commonEvents.length > 0) {
          connections.get(id)?.add(other.id);
        }
      }
    });

    // 通过明确的关联关系建立连接
    if (evidence.relations) {
      evidence.relations.supportingEvidence.forEach(otherId => {
        connections.get(id)?.add(otherId);
      });
    }
  });

  return connections;
}

/**
 * 检测证据冲突
 */
export function detectEvidenceConflicts(evidences: Evidence[]): Array<{
  evidence1: string;
  evidence2: string;
  reason: string;
}> {
  const conflicts: Array<{ evidence1: string; evidence2: string; reason: string }> = [];

  evidences.forEach((ev1, i) => {
    evidences.slice(i + 1).forEach(ev2 => {
      // 检查是否有明确的矛盾关系
      if (ev1.relations?.contradictingEvidence.includes(ev2.id)) {
        conflicts.push({
          evidence1: ev1.id,
          evidence2: ev2.id,
          reason: '明确标记为相互矛盾的证据'
        });
      }

      // 可以添加更多智能冲突检测逻辑
      // 例如：时间矛盾、地点矛盾等
    });
  });

  return conflicts;
}