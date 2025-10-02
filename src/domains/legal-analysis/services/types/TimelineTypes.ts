/**
 * 时间轴分析服务类型定义
 * DeepPractice Standards Compliant
 */

// ========== 基础实体类型 ==========

export interface TimelineEvent {
  id?: string;
  date: string;
  title: string;
  event?: string;  // 允许使用event代替title
  detail?: string;  // 详细描述
  description?: string;
  type?: EventType;
  importance?: EventImportance;
  parties?: string[];
  evidence?: string[];
  legalRelevance?: string;
  claims?: ClaimInfo;  // 请求权相关信息
  legalRelation?: LegalRelationInfo;  // 法律关系
}

// 请求权信息
export interface ClaimInfo {
  type: string;
  basis?: string;
  amount?: number;
  description?: string;
}

// 法律关系信息
export interface LegalRelationInfo {
  type: string;
  parties: string[];
  description?: string;
}

export interface TimelineAnalysis {
  keyTurningPoints?: TurningPoint[];  // 兼容旧版本
  turningPoints?: TurningPoint[];      // AI返回的新字段名
  evidenceMapping?: EvidenceMapping;   // 简化的证据映射（替代复杂的evidenceChain）
  legalRisks: LegalRisk[];
  summary: string;
  confidence: number;
  aiWarnings?: string[];
  analysisSource?: 'ai' | 'rule';
}

export interface TurningPoint {
  eventId?: string;
  date: string;
  description: string;
  legalSignificance: string;
  impact: 'high' | 'medium' | 'low';
  consequences: string[];
}

// 简化的证据映射（替代复杂的EvidenceChainAnalysis）
export interface EvidenceMapping {
  evidenceToFacts: Map<string, string[]>;  // 证据ID -> 事实ID[]
  factToEvidence: Map<string, string[]>;   // 事实ID -> 证据ID[]
  strength: number;  // 整体证据强度 0-1
  gaps?: string[];   // 保留缺失证据提示
}

export interface LegalRisk {
  type: RiskType | RiskTypeLiteral | string;  // 兼容多种类型
  description: string;
  likelihood: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  mitigation: string;
}

// ========== 枚举类型 ==========

export enum EventType {
  CONTRACT_SIGNING = 'contract_signing',
  PAYMENT = 'payment',
  BREACH = 'breach',
  NEGOTIATION = 'negotiation',
  LITIGATION = 'litigation',
  SETTLEMENT = 'settlement',
  OTHER = 'other'
}

export enum EventImportance {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum RiskType {
  LEGAL = 'legal',
  FINANCIAL = 'financial',
  REPUTATIONAL = 'reputational',
  OPERATIONAL = 'operational'
}

// 支持字符串字面量类型兼容
export type RiskTypeLiteral = 'legal' | 'financial' | 'reputational' | 'operational';

export enum AnalysisType {
  COMPREHENSIVE = 'comprehensive',
  QUICK = 'quick',
  FOCUSED = 'focused'
}

export enum TimelineErrorCode {
  INVALID_EVENTS = 'INVALID_EVENTS',
  MISSING_DATA = 'MISSING_DATA',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// ========== 请求类型 ==========

export interface TimelineAnalysisRequest {
  events: TimelineEvent[];
  analysisType?: AnalysisType;
  includeAI?: boolean;
  focusAreas?: string[];
  options?: TimelineAnalysisOptions;
}

export interface TimelineAnalysisOptions {
  enableRiskAnalysis?: boolean;
  enableEvidenceMapping?: boolean;  // 简化的证据映射
  maxTurningPoints?: number;
  confidenceThreshold?: number;
}

// ========== 响应类型 ==========

export interface TimelineAnalysisResponse {
  success: boolean;
  data?: TimelineAnalysisData;
  error?: TimelineError;
  metadata?: TimelineMetadata;
}

export interface TimelineAnalysisData {
  analysis: TimelineAnalysis;
  processedEvents: TimelineEvent[];
  suggestions: string[];
  visualData?: TimelineVisualizationData;
}

export interface TimelineVisualizationData {
  timeline: TimelineEvent[];
  clusters: EventCluster[];
  connections: EventConnection[];
}

export interface EventCluster {
  id: string;
  events: string[];
  theme: string;
  importance: EventImportance;
}

export interface EventConnection {
  from: string;
  to: string;
  type: 'causality' | 'temporal' | 'logical';
  strength: number;
}

export interface TimelineError {
  message: string;
  code: TimelineErrorCode;
  details?: Record<string, unknown>;
}

export interface TimelineMetadata {
  processingTime: number;
  eventCount: number;
  analysisMethod: 'rule-based' | 'ai-enhanced' | 'hybrid';
  confidence: number;
  version: string;
  aiWarnings?: string[];
}

// ========== AI分析类型 ==========

export interface AITimelineRequest {
  eventText: string;
  events?: TimelineEvent[];
  analysisType: AnalysisType;
  focusAreas?: string[];
}

// AI分析结果的完整结构
export interface AITimelineAnalysis {
  dates?: string[];
  parties?: string[];
  amounts?: Array<{ value: number; description: string }>;
  legalClauses?: string[];
  facts?: string[];
  turningPoints?: Array<{
    eventId?: string;
    date: string;
    title: string;
    legalSignificance: string;
    impact: string;
    consequences?: string[];
    effects?: string[];
  }>;
  behaviorPatterns?: Array<{
    party: string;
    pattern: string;
    frequency?: string;
    legalImplication?: string;
  }>;
  evidenceChain?: {
    completeness: number;
    logicalConsistency: number;
    gaps?: string[];
    strengths?: string[];
    weaknesses?: string[];
  };
  legalRisks?: Array<{
    type: string;
    description: string;
    likelihood: string;
    impact: string;
    mitigation?: string;
  }>;
  summary?: string;
  metadata?: {
    confidence?: number;
    analysisType?: string;
  };
  warnings?: string[];
}

export interface AITimelineResponse {
  analysis: AITimelineAnalysis | null;
  structuredData?: AITimelineAnalysis;
  rawContent?: string;
  confidence: number;
  warnings?: string[];
}

// ========== 处理结果类型 ==========

// ProcessedDocument 类型已从 @/types/legal-intelligence 导入
// 如需在此文件使用，请从 @/types/legal-intelligence 导入

// ========== 分析合并类型 ==========

/**
 * 合并后的分析结果
 * 包含规则分析和AI分析的综合结果
 * 继承自MergedData并添加AI增强字段
 */
export interface CombinedAnalysisResult {
  // 继承MergedData的所有字段
  [key: string]: unknown;  // 索引签名，允许任意字段

  // AI增强数据（可选）
  aiInsights?: AITimelineAnalysis;
  rawAIResponse?: string;
  aiWarnings?: string[];
}
