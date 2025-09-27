/**
 * 统一的证据类型定义
 * 解决多处定义不一致的问题
 *
 * 问题背景：
 * - lib/evidence-mapping-service.ts 定义了简化版Evidence
 * - types/timeline-claim-analysis.ts 定义了完整版Evidence
 * - 导致类型不兼容和数据流转问题
 *
 * 解决方案：
 * - 统一在此文件定义Evidence类型
 * - 所有模块从这里导入
 * - 提供适配器处理兼容性
 */

/**
 * 证据类型枚举
 * 根据中国法律体系的证据分类
 */
export type EvidenceType =
  | 'documentary'   // 书证
  | 'testimonial'   // 证人证言
  | 'physical'      // 物证
  | 'expert'        // 鉴定意见
  | 'audio_visual'  // 视听资料
  | 'electronic'    // 电子数据
  | 'party_statement' // 当事人陈述
  | 'inspection';   // 勘验笔录

/**
 * 证据提交方
 */
export type EvidenceSubmitter =
  | 'plaintiff'     // 原告
  | 'defendant'     // 被告
  | 'third_party'   // 第三人
  | 'court';        // 法院调取

/**
 * 证据质量评分
 */
export interface EvidenceQuality {
  authenticity: number;    // 真实性 (0-100)
  relevance: number;       // 相关性 (0-100)
  legality: number;        // 合法性 (0-100)
  probativeValue: number;  // 证明力 (0-100)
  overallScore: number;    // 综合评分 (0-100)

  // 详细分析
  strengths?: string[];    // 优势
  weaknesses?: string[];   // 劣势
  challenges?: string[];   // 可能的质疑点
}

/**
 * 证据元数据
 */
export interface EvidenceMetadata {
  source: string;              // 来源
  dateCreated: string;         // 创建日期
  dateSubmitted?: string;      // 提交日期
  author?: string;             // 作者/制作人
  submittedBy?: EvidenceSubmitter; // 提交方
  courtAccepted?: boolean;     // 法院是否采信
  originalForm?: string;       // 原始形式（原件/复印件等）
  verificationStatus?: 'verified' | 'pending' | 'disputed'; // 验证状态
}

/**
 * AI分析结果
 */
export interface EvidenceAIAnalysis {
  summary: string;             // 摘要
  keyPoints: string[];         // 关键点
  legalSignificance: string;  // 法律意义
  relatedLaws: string[];       // 相关法条
  confidence: number;          // 置信度 (0-1)
  suggestions?: string[];      // 建议
  risks?: string[];           // 风险提示
}

/**
 * 证据与其他实体的关联
 */
export interface EvidenceRelations {
  relatedEvents: string[];     // 关联的时间轴事件ID
  relatedDisputes: string[];   // 关联的争议焦点ID
  relatedClaims: string[];     // 关联的请求权ID
  supportingEvidence: string[]; // 相互佐证的其他证据ID
  contradictingEvidence: string[]; // 相互矛盾的证据ID
}

/**
 * 统一的证据接口
 * 这是所有证据相关功能的标准类型定义
 */
export interface Evidence {
  // ========== 基础字段（必填） ==========
  id: string;                 // 唯一标识符
  title: string;              // 证据标题
  content: string;            // 证据内容
  type: EvidenceType;         // 证据类型

  // ========== 描述字段（必填） ==========
  description: string;        // 证据描述

  // ========== 关联关系（必填） ==========
  relatedEvents: string[];    // 关联的时间轴事件ID（解决核心问题）

  // ========== 扩展关联（可选） ==========
  relations?: EvidenceRelations;

  // ========== 质量评估（可选） ==========
  quality?: EvidenceQuality;

  // ========== 元数据（可选） ==========
  metadata?: EvidenceMetadata;

  // ========== AI分析（可选） ==========
  aiAnalysis?: EvidenceAIAnalysis;

  // ========== 交互状态（可选） ==========
  interactionState?: {
    isHighlighted?: boolean;
    isSelected?: boolean;
    isDragging?: boolean;
    mappingProgress?: number;
  };

  // ========== 学习相关（可选） ==========
  teachingNotes?: string;     // 教学说明
  practiceHints?: string[];   // 练习提示
  commonMistakes?: string[];  // 常见错误
}

/**
 * 简化版证据（向后兼容）
 * 用于兼容旧代码中的简化版Evidence
 */
export type SimpleEvidence = Pick<Evidence, 'id' | 'content' | 'type'>;

/**
 * 证据创建输入
 * 用于创建新证据时的输入类型
 */
export interface EvidenceInput {
  title: string;
  content: string;
  type: EvidenceType;
  description?: string;
  relatedEvents?: string[];
  metadata?: Partial<EvidenceMetadata>;
}

/**
 * 证据更新输入
 * 用于更新证据时的输入类型
 */
export type EvidenceUpdateInput = Partial<Omit<Evidence, 'id'>>;

/**
 * 证据过滤条件
 */
export interface EvidenceFilter {
  type?: EvidenceType | EvidenceType[];
  submittedBy?: EvidenceSubmitter | EvidenceSubmitter[];
  courtAccepted?: boolean;
  minQualityScore?: number;
  hasAIAnalysis?: boolean;
  relatedEventId?: string;
  relatedDisputeId?: string;
}

/**
 * 证据排序选项
 */
export type EvidenceSortBy =
  | 'dateCreated'
  | 'dateSubmitted'
  | 'relevance'
  | 'qualityScore'
  | 'title';

/**
 * 证据分页选项
 */
export interface EvidencePagination {
  page: number;
  pageSize: number;
  sortBy?: EvidenceSortBy;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 证据列表响应
 */
export interface EvidenceListResponse {
  items: Evidence[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * 证据映射（用于证据与请求权要素的映射）
 */
export interface EvidenceMapping {
  evidenceId: string;
  elementId: string;         // ClaimElement ID
  confidence: number;         // 映射置信度 (0-1)
  isManual: boolean;         // 是否手动映射
  reason?: string;           // 映射理由
  createdAt?: string;        // 创建时间
  createdBy?: string;        // 创建者
}

/**
 * 证据链
 */
export interface EvidenceChain {
  id: string;
  name: string;
  description: string;
  evidenceIds: string[];      // 有序的证据ID列表
  logicalFlow: string;        // 逻辑关系说明
  strength: 'strong' | 'moderate' | 'weak'; // 证据链强度
  gaps?: string[];           // 缺失环节
  conclusion: string;        // 证明结论
}

/**
 * 证据分析请求
 */
export interface EvidenceAnalysisRequest {
  evidenceIds: string[];
  analysisType: 'quality' | 'chain' | 'contradiction' | 'comprehensive';
  options?: {
    includeAI?: boolean;
    includeTeachingNotes?: boolean;
    depth?: 'basic' | 'detailed' | 'comprehensive';
  };
}

/**
 * 证据分析响应
 */
export interface EvidenceAnalysisResponse {
  success: boolean;
  analysis: {
    qualityAssessment?: EvidenceQuality[];
    chains?: EvidenceChain[];
    contradictions?: Array<{
      evidence1Id: string;
      evidence2Id: string;
      contradiction: string;
      severity: 'high' | 'medium' | 'low';
    }>;
    recommendations?: string[];
    overallStrength?: 'strong' | 'adequate' | 'weak';
  };
  metadata: {
    analysisTime: number;
    modelVersion: string;
    confidence: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ========== 辅助函数 ==========

/**
 * 检查是否为有效的证据类型
 */
export function isValidEvidenceType(type: any): type is EvidenceType {
  const validTypes: EvidenceType[] = [
    'documentary', 'testimonial', 'physical', 'expert',
    'audio_visual', 'electronic', 'party_statement', 'inspection'
  ];
  return validTypes.includes(type);
}

/**
 * 获取证据类型的中文名称
 */
export function getEvidenceTypeName(type: EvidenceType): string {
  const names: Record<EvidenceType, string> = {
    'documentary': '书证',
    'testimonial': '证人证言',
    'physical': '物证',
    'expert': '鉴定意见',
    'audio_visual': '视听资料',
    'electronic': '电子数据',
    'party_statement': '当事人陈述',
    'inspection': '勘验笔录'
  };
  return names[type] || type;
}

/**
 * 获取提交方的中文名称
 */
export function getSubmitterName(submitter: EvidenceSubmitter): string {
  const names: Record<EvidenceSubmitter, string> = {
    'plaintiff': '原告',
    'defendant': '被告',
    'third_party': '第三人',
    'court': '法院调取'
  };
  return names[submitter] || submitter;
}

/**
 * 创建空的证据对象
 */
export function createEmptyEvidence(): Evidence {
  return {
    id: '',
    title: '',
    content: '',
    type: 'documentary',
    description: '',
    relatedEvents: []
  };
}

/**
 * 判断证据质量等级
 */
export function getQualityLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

// 导出所有类型，方便其他模块使用
export type {
  Evidence as default
};