/**
 * Legal Analysis Domain - 统一类型定义
 * 整合Timeline、Extraction、Narrative、Claim等所有子模块类型
 * DeepPractice Standards Compliant
 *
 * 参考Socratic重构成功经验：
 * - 单一数据源（Single Source of Truth）
 * - 向后兼容导出
 * - Zod验证支持（未来扩展）
 */

// ========== 从旧位置重新导出（向后兼容） ==========
// 显式导出以避免命名冲突
export type {
  TimelineEvent,
  TimelineAnalysis,
  TurningPoint,
  EvidenceMapping,  // 替换EvidenceChainAnalysis
  LegalRisk,
  EventType,
  EventImportance,
  RiskType,
  RiskTypeLiteral,
  TimelineAnalysisRequest,
} from '../services/types/TimelineTypes';

// 注：以下类型已废弃（2025-09-30重构）
// - BehaviorPattern: 行为模式分析已移除
// - EvidenceChainAnalysis: 已简化为EvidenceMapping
// - CasePrediction: 案件预测功能已移除

export type {
  ExtractionRequest,
  ExtractionOptions,
  ExtractionResult,
  ExtractionMetadata,
  MergeOptions,
} from '../services/types/ExtractionTypes';

export type {
  LegalEventType,
  LegalTimelineEvent,
} from '../services/types/LegalTimelineTypes';

// ========== 通用基础类型 ==========

/**
 * API统一响应格式
 */
export interface LegalAnalysisResponse<T = any> {
  success: boolean;
  data?: T;
  error?: LegalAnalysisError;
  metadata?: ResponseMetadata;
}

export interface LegalAnalysisError {
  code: LegalErrorCode;
  message: string;
  timestamp: string;
  details?: any;
}

export enum LegalErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export interface ResponseMetadata {
  processingTime: number;
  tokensUsed?: number | {
    input: number;
    output: number;
    total: number;
  };
  cost?: number | {
    input: number;
    output: number;
    total: number;
  };
  model?: string;
  confidence?: number;
  source?: 'ai' | 'rule' | 'hybrid';
}

// ========== Narrative（智能故事）类型 ==========

export interface NarrativeGenerationRequest {
  caseData: {
    basicInfo: {
      caseNumber?: string;
      court?: string;
      caseType?: string;
      level?: string;
      nature?: string;
    };
    threeElements: {
      facts: {
        timeline: any[];
        parties: string[];
        keyFacts: string[];
      };
      disputes: any[];
      reasoning?: {
        summary: string;
      };
    };
  };
  narrativeStyle: 'story' | 'professional' | 'educational';
  depth: 'basic' | 'detailed' | 'comprehensive';
  focusAreas?: Array<'timeline' | 'parties' | 'disputes' | 'evidence' | 'legal-reasoning'>;
}

export interface NarrativeGenerationResponse {
  success: boolean;
  chapters: StoryChapter[];
  metadata: {
    generatedAt: string;
    processingTime: number;
    confidence: number;
    model: string;
    tokensUsed?: number;
    fallbackUsed?: boolean;
    errorMessage?: string;
  };
  error?: string;
}

export interface StoryChapter {
  id: string;
  title: string;
  content: string;
  icon: string;
  color: 'blue' | 'orange' | 'green' | 'purple' | 'red';
  timelineEvents?: string[];
  legalSignificance?: string;
  keyParties?: string[];
  disputeElements?: string[];
}

// ========== Claim（请求权分析）类型 ==========

export interface EventClaimAnalysis {
  eventId: string;
  eventSummary: {
    date: string;
    title: string;
    parties: string[];
    legalNature: string;
  };
  plaintiffAnalysis: {
    action: string;
    legalBasis: string;
    requirements: string[];
    evidence: string[];
    strength: 'strong' | 'medium' | 'weak';
  };
  defendantAnalysis: {
    action: string;
    response: string;
    defenses: string[];
    counterClaims: string[];
    strength: 'strong' | 'medium' | 'weak';
  };
  legalSignificance: {
    impact: string;
    consequences: string[];
    relatedClaims: string[];
  };
  courtPerspective: {
    keyFindings: string[];
    appliedLaws: string[];
    reasoning: string;
  };
}

// ========== Dispute（争议分析）类型 ==========

export interface DisputeAnalysisRequest {
  caseInfo: any;
  context?: string;
}

export interface DisputeAnalysisResult {
  mainDisputes: DisputeFocus[];
  relationships: DisputeRelationship[];
  recommendations: string[];
}

export interface DisputeFocus {
  id: string;
  title: string;
  description: string;
  parties: {
    plaintiff: string;
    defendant: string;
  };
  type: 'factual' | 'legal' | 'procedural';
  importance: 'high' | 'medium' | 'low';
}

export interface DisputeRelationship {
  from: string;
  to: string;
  relationship: 'depends_on' | 'conflicts_with' | 'supports';
}

// ========== Evidence（证据智能分析）类型 ==========

export interface EvidenceQualityAssessment {
  evidenceId: string;
  credibility: number; // 0-1
  relevance: number;   // 0-1
  admissibility: 'admissible' | 'inadmissible' | 'conditional';
  strengths: string[];
  weaknesses: string[];
  legalBasis: string[];
}

// ========== Facade统一接口类型 ==========

export type LegalAnalysisAction =
  | 'narrative'   // 智能故事生成
  | 'claim'       // 请求权分析
  | 'dispute'     // 争议焦点分析
  | 'evidence'    // 证据质量评估
  | 'extract'     // 三要素提取
  | 'timeline';   // 时间轴生成

export interface LegalAnalysisRequest {
  action: LegalAnalysisAction;
  params: any; // 根据action不同，params类型不同
}

// ========== 类型验证函数（未来扩展Zod） ==========

export const isNarrativeRequest = (params: any): params is NarrativeGenerationRequest => {
  return params && params.caseData && params.narrativeStyle;
};

export const isClaimRequest = (params: any): params is { event: any } => {
  return params && params.event;
};

export const isDisputeRequest = (params: any): params is DisputeAnalysisRequest => {
  return params && params.caseInfo;
};

// ========== 向后兼容的类型别名 ==========

/**
 * @deprecated 请使用 LegalAnalysisResponse
 */
export type AnalysisResult<T> = LegalAnalysisResponse<T>;

/**
 * @deprecated 请使用 LegalErrorCode
 */
export const AnalysisErrorCode = LegalErrorCode;