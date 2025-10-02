/**
 * Legal Analysis Services - 统一导出
 * 提供法律分析领域的所有服务
 */

// ========== 核心服务 ==========

/**
 * 判决书提取服务（第一幕核心）
 */
export {
  JudgmentExtractionService,
  judgmentExtractionService,
  type JudgmentExtractedData,
  type JudgmentExtractionConfig
} from './JudgmentExtractionService';

/**
 * 法律分析统一门面（第二幕核心）
 */
export {
  LegalAnalysisFacade,
  legalAnalysisFacade,
  createLegalAnalysisFacade,
  type LegalAnalysisFacadeConfig,
  type AnalysisParams
} from './LegalAnalysisFacade';

// ========== 专业分析服务（第二幕） ==========

/**
 * 案例叙事服务
 */
export { caseNarrativeService } from './CaseNarrativeService';

/**
 * 请求权分析服务
 */
export { ClaimAnalysisService } from './ClaimAnalysisService';

/**
 * 争议焦点分析服务
 */
export { DisputeAnalysisService } from './DisputeAnalysisService';

/**
 * 证据质量评估服务
 */
export { EvidenceIntelligenceService } from './EvidenceIntelligenceService';

/**
 * 时间轴分析服务
 */
export { TimelineAnalysisApplicationService } from './TimelineAnalysisApplicationService';

// ========== 类型定义 ==========

export type {
  LegalAnalysisAction,
  LegalAnalysisResponse,
  LegalErrorCode,
  NarrativeGenerationRequest,
  NarrativeGenerationResponse,
} from '../types';
