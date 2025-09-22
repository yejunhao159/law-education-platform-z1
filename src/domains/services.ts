/**
 * 领域服务统一导出
 * DeepPractice Standards Compliant
 */

// ========== 案例管理域服务 ==========
export {
  CaseService,
  caseService,
  type CaseListRequest,
  type CaseListResponse,
  type CaseCreateRequest,
  type CaseUpdateRequest,
} from './case-management/services/caseService';

// ========== 苏格拉底对话域服务 ==========
export {
  SocraticService,
  socraticService,
  type SessionCreateRequest,
  type SessionListResponse,
  type MessageSendRequest,
} from './socratic-dialogue/services/socraticService';

// ========== 法律分析域服务 ==========
export {
  AnalysisService,
  analysisService,
  type TimelineAnalysisRequest,
  type ThreeElementsAnalysisRequest,
  type EvidenceQualityRequest,
  type EvidenceQualityResponse,
} from './legal-analysis/services/analysisService';

// ========== 教学活动域服务 ==========
export {
  TeachingService,
  teachingService,
  type SessionCreateRequest as TeachingSessionCreateRequest,
  type ProgressUpdateRequest,
  type ActTransitionRequest,
} from './teaching-acts/services/teachingService';

// ========== 服务聚合类 ==========
// 提供统一的服务访问入口
export class DomainServices {
  static readonly case = caseService;
  static readonly socratic = socraticService;
  static readonly analysis = analysisService;
  static readonly teaching = teachingService;

  // 健康检查
  static async healthCheck(): Promise<{
    case: boolean;
    socratic: boolean;
    analysis: boolean;
    teaching: boolean;
    overall: boolean;
  }> {
    const results = await Promise.allSettled([
      caseService.getCaseStats().then(() => true).catch(() => false),
      socraticService.getSessions({ limit: 1 }).then(() => true).catch(() => false),
      analysisService.getCacheStats().then(() => true).catch(() => false),
      teachingService.getSessions({ limit: 1 }).then(() => true).catch(() => false),
    ]);

    const [caseOk, socraticOk, analysisOk, teachingOk] = results.map(
      (result) => result.status === 'fulfilled' ? result.value : false
    );

    return {
      case: caseOk,
      socratic: socraticOk,
      analysis: analysisOk,
      teaching: teachingOk,
      overall: caseOk && socraticOk && analysisOk && teachingOk,
    };
  }

  // 清理缓存
  static async clearAllCaches(): Promise<void> {
    await Promise.all([
      analysisService.clearAnalysisCache().catch(() => {}),
      // 其他服务的缓存清理可以在这里添加
    ]);
  }
}

// ========== 默认导出 ==========
export default DomainServices;