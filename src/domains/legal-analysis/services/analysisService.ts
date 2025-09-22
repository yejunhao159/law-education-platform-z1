/**
 * 法律分析域API服务
 * DeepPractice Standards Compliant
 */

import { apiClient } from '@/src/infrastructure/api/clients';
import type {
  TimelineAnalysis,
  ThreeElements,
  ViewPerspective,
  EvidenceItem,
  ApiResponse,
} from '@/src/types';

// ========== 请求/响应类型 ==========
export interface TimelineAnalysisRequest {
  eventId: string;
  perspective: ViewPerspective;
  context?: {
    caseId?: string;
    relatedEvents?: string[];
    additionalContext?: string;
  };
}

export interface ThreeElementsAnalysisRequest {
  caseId: string;
  documentText: string;
  options?: {
    includeTimeline?: boolean;
    analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
    focusAreas?: string[];
  };
}

export interface EvidenceQualityRequest {
  evidenceItems: EvidenceItem[];
  context: {
    caseType: string;
    disputePoints: string[];
  };
}

export interface EvidenceQualityResponse {
  overallScore: number;
  itemScores: Array<{
    evidenceId: string;
    credibilityScore: number;
    relevanceScore: number;
    strengthAssessment: string;
    recommendations: string[];
  }>;
  chainAnalysis: {
    complete: boolean;
    gaps: string[];
    strengths: string[];
    improvements: string[];
  };
}

// ========== 法律分析服务 ==========
export class AnalysisService {
  private readonly basePath = '/api/legal-analysis';

  // ========== 时间轴分析 ==========
  async analyzeTimelineEvent(request: TimelineAnalysisRequest): Promise<ApiResponse<TimelineAnalysis>> {
    return apiClient.post<TimelineAnalysis>(`${this.basePath}/timeline`, request, {
      timeout: 45000, // AI分析需要更长时间
    });
  }

  async batchAnalyzeTimeline(requests: TimelineAnalysisRequest[]): Promise<ApiResponse<TimelineAnalysis[]>> {
    return apiClient.post<TimelineAnalysis[]>(`${this.basePath}/timeline/batch`, {
      requests,
    }, {
      timeout: 120000, // 批量分析需要更长时间
    });
  }

  async getTimelineAnalysis(eventId: string, perspective: ViewPerspective): Promise<ApiResponse<TimelineAnalysis>> {
    return apiClient.get<TimelineAnalysis>(`${this.basePath}/timeline/${eventId}`, {
      perspective,
    });
  }

  // ========== 三要素分析 ==========
  async analyzeThreeElements(request: ThreeElementsAnalysisRequest): Promise<ApiResponse<ThreeElements>> {
    return apiClient.post<ThreeElements>(`${this.basePath}/three-elements`, request, {
      timeout: 60000,
    });
  }

  async getThreeElements(caseId: string): Promise<ApiResponse<ThreeElements>> {
    return apiClient.get<ThreeElements>(`${this.basePath}/three-elements/${caseId}`);
  }

  async updateThreeElements(caseId: string, updates: Partial<ThreeElements>): Promise<ApiResponse<ThreeElements>> {
    return apiClient.put<ThreeElements>(`${this.basePath}/three-elements/${caseId}`, updates);
  }

  // ========== 证据质证分析 ==========
  async analyzeEvidenceQuality(request: EvidenceQualityRequest): Promise<ApiResponse<EvidenceQualityResponse>> {
    return apiClient.post<EvidenceQualityResponse>(`${this.basePath}/evidence-quality`, request, {
      timeout: 45000,
    });
  }

  async getEvidenceQuality(caseId: string): Promise<ApiResponse<EvidenceQualityResponse>> {
    return apiClient.get<EvidenceQualityResponse>(`${this.basePath}/evidence-quality/${caseId}`);
  }

  // ========== 争议分析 ==========
  async analyzeDisputes(caseId: string, options?: {
    includeResolution?: boolean;
    analysisDepth?: 'basic' | 'detailed';
  }): Promise<ApiResponse<{
    disputePoints: Array<{
      id: string;
      description: string;
      complexity: 'low' | 'medium' | 'high';
      legalBasis: string[];
      evidenceRequirements: string[];
      resolutionStrategy?: string;
    }>;
    priorityMatrix: Record<string, number>;
    resolutionSuggestions: string[];
  }>> {
    return apiClient.post(`${this.basePath}/disputes`, {
      caseId,
      ...options,
    });
  }

  // ========== 请求权分析 ==========
  async analyzeClaims(caseId: string, options?: {
    claimTypes?: string[];
    includeDefenses?: boolean;
  }): Promise<ApiResponse<{
    claims: Array<{
      id: string;
      type: string;
      description: string;
      legalBasis: string[];
      requirements: Array<{
        element: string;
        satisfied: boolean;
        evidence: string[];
        confidence: number;
      }>;
      defenses?: string[];
      successProbability: number;
    }>;
    timeline: Array<{
      eventId: string;
      relevantClaims: string[];
      impact: 'positive' | 'negative' | 'neutral';
    }>;
  }>> {
    return apiClient.post(`${this.basePath}/claims`, {
      caseId,
      ...options,
    });
  }

  // ========== 智能推荐 ==========
  async getAnalysisRecommendations(caseId: string): Promise<ApiResponse<{
    nextSteps: string[];
    focusAreas: string[];
    riskFactors: Array<{
      factor: string;
      level: 'low' | 'medium' | 'high';
      mitigation: string;
    }>;
    strategicAdvice: string[];
  }>> {
    return apiClient.get(`${this.basePath}/recommendations/${caseId}`);
  }

  // ========== 比较分析 ==========
  async compareCases(caseIds: string[], comparisonType: 'facts' | 'evidence' | 'reasoning' | 'outcomes'): Promise<ApiResponse<{
    similarities: Array<{
      aspect: string;
      cases: string[];
      description: string;
    }>;
    differences: Array<{
      aspect: string;
      variations: Record<string, string>;
    }>;
    insights: string[];
    learningPoints: string[];
  }>> {
    return apiClient.post(`${this.basePath}/compare`, {
      caseIds,
      comparisonType,
    });
  }

  // ========== 导出和报告 ==========
  async generateAnalysisReport(caseId: string, options: {
    includeTimeline?: boolean;
    includeEvidence?: boolean;
    includeRecommendations?: boolean;
    format?: 'json' | 'pdf' | 'docx';
    language?: 'zh' | 'en';
  } = {}): Promise<ApiResponse<Blob | object>> {
    const { format = 'json', ...params } = options;

    if (format === 'json') {
      return apiClient.get(`${this.basePath}/report/${caseId}`, params);
    } else {
      return apiClient.get<Blob>(`${this.basePath}/report/${caseId}`, {
        ...params,
        format,
      });
    }
  }

  // ========== 缓存管理 ==========
  async clearAnalysisCache(caseId?: string, analysisType?: string): Promise<ApiResponse<void>> {
    const params: Record<string, string> = {};
    if (caseId) params.caseId = caseId;
    if (analysisType) params.type = analysisType;

    return apiClient.post<void>(`${this.basePath}/cache/clear`, params);
  }

  async getCacheStats(): Promise<ApiResponse<{
    totalEntries: number;
    hitRate: number;
    memoryUsage: string;
    oldestEntry: string;
    newestEntry: string;
  }>> {
    return apiClient.get(`${this.basePath}/cache/stats`);
  }

  // ========== 法条匹配 ==========
  async matchLegalProvisions(text: string, jurisdiction?: string): Promise<ApiResponse<{
    provisions: Array<{
      law: string;
      article: string;
      text: string;
      relevance: number;
      context: string;
    }>;
    suggestions: string[];
  }>> {
    return apiClient.post(`${this.basePath}/provisions/match`, {
      text,
      jurisdiction,
    });
  }
}

// ========== 单例导出 ==========
export const analysisService = new AnalysisService();