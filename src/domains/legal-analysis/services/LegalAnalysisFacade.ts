/**
 * Legal Analysis Facade - 统一协调器
 * 职责：协调7个专业服务，提供统一的分析接口
 * DeepPractice Standards Compliant
 *
 * 设计模式：Facade Pattern
 * 参考：SocraticDialogueService的成功架构
 *
 * 核心职责：
 * 1. 路由分发：根据action参数调用对应的专业服务
 * 2. 结果聚合：统一返回格式
 * 3. 错误处理：统一降级策略
 * 4. 缓存管理：避免重复AI调用（未来扩展）
 */

import { createLogger } from '@/lib/logging';
import type {
  LegalAnalysisAction,
  LegalAnalysisResponse,
  LegalErrorCode,
  NarrativeGenerationRequest,
  NarrativeGenerationResponse,
} from '../types';

// 导入专业服务
import { caseNarrativeService } from './CaseNarrativeService';
import { ClaimAnalysisService } from './ClaimAnalysisService';
import { DisputeAnalysisService } from './DisputeAnalysisService';
import { EvidenceIntelligenceService } from './EvidenceIntelligenceService';
import { LegalExtractionApplicationService } from './LegalExtractionApplicationService';
import { TimelineAnalysisApplicationService } from './TimelineAnalysisApplicationService';

const logger = createLogger('LegalAnalysisFacade');

/**
 * Facade配置接口
 */
export interface LegalAnalysisFacadeConfig {
  enableCaching?: boolean;
  enableFallback?: boolean;
  timeout?: number;
}

/**
 * 法律分析统一门面服务
 */
export class LegalAnalysisFacade {
  private config: LegalAnalysisFacadeConfig;

  // 专业服务实例
  private claimService: ClaimAnalysisService;
  private disputeService: DisputeAnalysisService;
  private evidenceService: EvidenceIntelligenceService;
  private extractionService: LegalExtractionApplicationService;
  private timelineService: TimelineAnalysisApplicationService;

  constructor(config?: Partial<LegalAnalysisFacadeConfig>) {
    this.config = {
      enableCaching: true,
      enableFallback: true,
      timeout: 30000, // 30秒超时
      ...config
    };

    // 初始化服务实例
    this.claimService = new ClaimAnalysisService();
    this.disputeService = new DisputeAnalysisService();
    this.evidenceService = new EvidenceIntelligenceService();
    this.extractionService = new LegalExtractionApplicationService();
    this.timelineService = new TimelineAnalysisApplicationService();

    logger.info('LegalAnalysisFacade初始化完成', this.config);
  }

  /**
   * 统一分析入口 - 根据action路由到专业服务
   */
  async analyze(action: LegalAnalysisAction, params: any): Promise<LegalAnalysisResponse> {
    const startTime = Date.now();

    try {
      logger.info(`开始执行分析`, { action, paramsKeys: Object.keys(params) });

      let result: any;

      switch (action) {
        case 'narrative':
          result = await this.handleNarrative(params);
          break;

        case 'claim':
          result = await this.handleClaim(params);
          break;

        case 'dispute':
          result = await this.handleDispute(params);
          break;

        case 'evidence':
          result = await this.handleEvidence(params);
          break;

        case 'extract':
          result = await this.handleExtraction(params);
          break;

        case 'timeline':
          result = await this.handleTimeline(params);
          break;

        default:
          throw new Error(`未知的分析类型: ${action}`);
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: result,
        metadata: {
          processingTime,
          source: 'facade' as any, // 类型兼容性修复
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`分析失败: ${action}`, error);

      return {
        success: false,
        error: {
          code: 'ANALYSIS_FAILED' as LegalErrorCode,
          message: error instanceof Error ? error.message : '分析失败',
          timestamp: new Date().toISOString(),
          details: error
        },
        metadata: {
          processingTime
        }
      };
    }
  }

  /**
   * 智能故事生成
   */
  private async handleNarrative(params: NarrativeGenerationRequest): Promise<NarrativeGenerationResponse> {
    logger.info('执行智能故事生成');
    return await caseNarrativeService.generateIntelligentNarrative(params);
  }

  /**
   * 请求权分析
   */
  private async handleClaim(params: { event?: any; events?: any[]; depth?: string; focusAreas?: string[] }): Promise<any> {
    logger.info('执行请求权分析');

    // 兼容单事件和多事件请求
    const events = params.events || (params.event ? [params.event] : []);

    return await this.claimService.analyzeClaimStructure({
      events,
      depth: (params.depth || 'detailed') as any,
      focusAreas: (params.focusAreas || ['claims', 'timeline', 'burden', 'strategy']) as any
    });
  }

  /**
   * 争议焦点分析
   */
  private async handleDispute(params: any): Promise<any> {
    logger.info('执行争议焦点分析');
    return await this.disputeService.analyzeDisputes(params.caseInfo || params);
  }

  /**
   * 证据质量评估
   */
  private async handleEvidence(params: {
    evidences?: any[];
    claimElements?: any[];
    caseContext?: any;
    config?: any;
  }): Promise<any> {
    logger.info('执行证据质量评估');

    // Phase B1: 支持多维度问题生成
    if (params.config) {
      return await this.evidenceService.generateEvidenceLearningQuestions(
        params.evidences || [],
        params.claimElements || [],
        params.caseContext || {},
        params.config
      );
    }

    // 兼容旧版证据评估
    return await this.evidenceService.assessEvidenceQuality(
      params.evidences || [],
      {}
    );
  }

  /**
   * 三要素提取
   */
  private async handleExtraction(params: { text: string; options?: any }): Promise<any> {
    logger.info('执行三要素提取');
    return await this.extractionService.extractLegalElements({
      text: params.text,
      ...params.options
    });
  }

  /**
   * 时间轴分析
   */
  private async handleTimeline(params: any): Promise<any> {
    logger.info('执行时间轴分析');
    return await this.timelineService.analyzeTimeline(params);
  }

  /**
   * 批量分析（未来扩展）
   */
  async analyzeBatch(requests: Array<{ action: LegalAnalysisAction; params: any }>): Promise<LegalAnalysisResponse[]> {
    logger.info(`开始批量分析`, { count: requests.length });

    const results = await Promise.allSettled(
      requests.map(req => this.analyze(req.action, req.params))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: {
            code: 'ANALYSIS_FAILED' as LegalErrorCode,
            message: `批量分析第${index + 1}项失败`,
            timestamp: new Date().toISOString(),
            details: result.reason
          }
        };
      }
    });
  }

  /**
   * 健康检查
   */
  getHealthStatus() {
    return {
      status: 'healthy',
      services: {
        narrative: !!caseNarrativeService,
        claim: !!this.claimService,
        dispute: !!this.disputeService,
        evidence: !!this.evidenceService,
        extraction: !!this.extractionService,
        timeline: !!this.timelineService,
      },
      config: this.config
    };
  }

  /**
   * 获取配置
   */
  getConfig(): LegalAnalysisFacadeConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<LegalAnalysisFacadeConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('配置已更新', this.config);
  }
}

// ========== 默认实例导出 ==========

/**
 * 默认的法律分析Facade实例
 * 可以直接使用，无需手动创建实例
 *
 * @example
 * ```typescript
 * import { legalAnalysisFacade } from '@/src/domains/legal-analysis/services';
 *
 * const response = await legalAnalysisFacade.analyze('narrative', {
 *   caseData: {...},
 *   narrativeStyle: 'story'
 * });
 * ```
 */
export const legalAnalysisFacade = new LegalAnalysisFacade();

/**
 * 创建新的Facade实例（支持自定义配置）
 *
 * @example
 * ```typescript
 * const customFacade = createLegalAnalysisFacade({
 *   enableCaching: false,
 *   timeout: 60000
 * });
 * ```
 */
export function createLegalAnalysisFacade(config?: Partial<LegalAnalysisFacadeConfig>) {
  return new LegalAnalysisFacade(config);
}