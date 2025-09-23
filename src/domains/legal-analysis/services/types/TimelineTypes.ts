/**
 * 时间轴分析服务类型定义
 * DeepPractice Standards Compliant
 */

// ========== 基础实体类型 ==========

export interface TimelineEvent {
  id?: string;
  date: string;
  title: string;
  description?: string;
  type?: EventType;
  importance?: EventImportance;
  parties?: string[];
  evidence?: string[];
  legalRelevance?: string;
}

export interface TimelineAnalysis {
  keyTurningPoints: TurningPoint[];
  behaviorPatterns: BehaviorPattern[];
  evidenceChain: EvidenceChainAnalysis;
  legalRisks: LegalRisk[];
  predictions: CasePrediction[];
  summary: string;
  confidence: number;
}

export interface TurningPoint {
  eventId?: string;
  date: string;
  description: string;
  legalSignificance: string;
  impact: 'high' | 'medium' | 'low';
  consequences: string[];
}

export interface BehaviorPattern {
  party: string;
  pattern: string;
  motivation: string;
  consistency: number;
  implications: string[];
}

export interface EvidenceChainAnalysis {
  completeness: number;
  logicalConsistency: number;
  gaps: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface LegalRisk {
  type: RiskType;
  description: string;
  likelihood: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  mitigation: string;
}

export interface CasePrediction {
  scenario: string;
  probability: number;
  reasoning: string;
  factors: string[];
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
  enablePredictions?: boolean;
  enableEvidenceChain?: boolean;
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
  details?: any;
}

export interface TimelineMetadata {
  processingTime: number;
  eventCount: number;
  analysisMethod: 'rule-based' | 'ai-enhanced' | 'hybrid';
  confidence: number;
  version: string;
}

// ========== AI分析类型 ==========

export interface AITimelineRequest {
  eventText: string;
  analysisType: AnalysisType;
  focusAreas?: string[];
}

export interface AITimelineResponse {
  analysis: string;
  structuredData?: any;
  confidence: number;
}

// ========== 处理结果类型 ==========

export interface ProcessedDocument {
  originalText: string;
  cleanedText: string;
  metadata: {
    eventCount: number;
    dateRange: {
      start: string;
      end: string;
    };
    mainParties: string[];
    documentType: string;
  };
}