/**
 * 四幕教学域API服务
 * DeepPractice Standards Compliant
 */

import { apiClient } from '@/src/infrastructure/api/clients';
import type {
  TeachingSession,
  TeachingProgress,
  ActType,
  ActState,
  DeepAnalysisResult,
  LearningReport,
  StoryChapter,
  ApiResponse,
} from '@/src/types';

// ========== 请求/响应类型 ==========
export interface SessionCreateRequest {
  title: string;
  description?: string;
  caseId: string;
  teacherId?: string;
  studentIds: string[];
  settings?: {
    allowSkipping?: boolean;
    timeLimit?: number;
    autoAdvance?: boolean;
    collaborativeMode?: boolean;
  };
  metadata?: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedDuration: number;
    tags?: string[];
  };
}

export interface ProgressUpdateRequest {
  sessionId: string;
  actId: ActType;
  progress: number;
  data?: Record<string, unknown>;
}

export interface ActTransitionRequest {
  sessionId: string;
  fromAct: ActType;
  toAct: ActType;
  completionData?: Record<string, unknown>;
}

// ========== 四幕教学服务 ==========
export class TeachingService {
  private readonly basePath = '/api/teaching';

  // ========== 会话管理 ==========
  async createSession(data: SessionCreateRequest): Promise<ApiResponse<TeachingSession>> {
    return apiClient.post<TeachingSession>(this.basePath, data);
  }

  async getSessions(params: {
    page?: number;
    limit?: number;
    teacherId?: string;
    studentId?: string;
    caseId?: string;
    status?: 'active' | 'completed' | 'paused';
  } = {}): Promise<ApiResponse<{
    sessions: TeachingSession[];
    total: number;
  }>> {
    return apiClient.get(`${this.basePath}`, params);
  }

  async getSession(sessionId: string): Promise<ApiResponse<TeachingSession>> {
    return apiClient.get<TeachingSession>(`${this.basePath}/${sessionId}`);
  }

  async updateSession(
    sessionId: string,
    updates: Partial<TeachingSession>
  ): Promise<ApiResponse<TeachingSession>> {
    return apiClient.put<TeachingSession>(`${this.basePath}/${sessionId}`, updates);
  }

  async deleteSession(sessionId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/${sessionId}`);
  }

  // ========== 进度管理 ==========
  async getProgress(sessionId: string): Promise<ApiResponse<TeachingProgress>> {
    return apiClient.get<TeachingProgress>(`${this.basePath}/${sessionId}/progress`);
  }

  async updateProgress(request: ProgressUpdateRequest): Promise<ApiResponse<TeachingProgress>> {
    const { sessionId, ...data } = request;
    return apiClient.put<TeachingProgress>(`${this.basePath}/${sessionId}/progress`, data);
  }

  async markActComplete(sessionId: string, actId: ActType, completionData?: Record<string, unknown>): Promise<ApiResponse<ActState>> {
    return apiClient.post<ActState>(`${this.basePath}/${sessionId}/acts/${actId}/complete`, {
      completionData,
    });
  }

  async transitionToAct(request: ActTransitionRequest): Promise<ApiResponse<TeachingProgress>> {
    const { sessionId, ...data } = request;
    return apiClient.post<TeachingProgress>(`${this.basePath}/${sessionId}/transition`, data);
  }

  // ========== 第一幕：案例导入 ==========
  async uploadCaseDocument(sessionId: string, file: File, metadata?: Record<string, unknown>): Promise<ApiResponse<{
    extractedElements: Record<string, unknown>;
    confidence: number;
    processingTime: number;
  }>> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    return apiClient.post(`${this.basePath}/${sessionId}/acts/upload/document`, formData, {
      headers: {}, // 让浏览器自动设置Content-Type
      timeout: 120000, // 文档解析可能需要较长时间
    });
  }

  async extractElements(sessionId: string, documentText: string, options?: {
    extractionMethod?: 'pure-ai' | 'hybrid' | 'rule-enhanced';
    includeConfidence?: boolean;
  }): Promise<ApiResponse<{
    elements: Record<string, unknown>;
    confidence: number;
    suggestions: string[];
  }>> {
    return apiClient.post(`${this.basePath}/${sessionId}/acts/upload/extract`, {
      documentText,
      ...options,
    });
  }

  // ========== 第二幕：深度分析 ==========
  async performDeepAnalysis(sessionId: string, options?: {
    analysisDepth?: 'basic' | 'comprehensive';
    focusAreas?: string[];
    includeRecommendations?: boolean;
  }): Promise<ApiResponse<DeepAnalysisResult>> {
    return apiClient.post<DeepAnalysisResult>(`${this.basePath}/${sessionId}/acts/analysis/perform`, options, {
      timeout: 90000,
    });
  }

  async getAnalysisResult(sessionId: string): Promise<ApiResponse<DeepAnalysisResult>> {
    return apiClient.get<DeepAnalysisResult>(`${this.basePath}/${sessionId}/acts/analysis/result`);
  }

  async generateStoryChapters(sessionId: string): Promise<ApiResponse<StoryChapter[]>> {
    return apiClient.post<StoryChapter[]>(`${this.basePath}/${sessionId}/acts/analysis/story`);
  }

  async updateStoryChapter(sessionId: string, chapterId: string, content: string): Promise<ApiResponse<StoryChapter>> {
    return apiClient.put<StoryChapter>(`${this.basePath}/${sessionId}/acts/analysis/story/${chapterId}`, {
      content,
    });
  }

  // ========== 第三幕：苏格拉底讨论 ==========
  async startSocraticSession(sessionId: string, options?: {
    level?: 'basic' | 'intermediate' | 'advanced';
    topics?: string[];
    duration?: number;
  }): Promise<ApiResponse<{
    dialogueSessionId: string;
    initialQuestions: string[];
    guidelines: string[];
  }>> {
    return apiClient.post(`${this.basePath}/${sessionId}/acts/socratic/start`, options);
  }

  async getSocraticProgress(sessionId: string): Promise<ApiResponse<{
    level: number;
    completedTopics: string[];
    currentTopic: string;
    engagement: number;
    insights: string[];
  }>> {
    return apiClient.get(`${this.basePath}/${sessionId}/acts/socratic/progress`);
  }

  async endSocraticSession(sessionId: string): Promise<ApiResponse<{
    summary: string;
    achievements: string[];
    recommendations: string[];
  }>> {
    return apiClient.post(`${this.basePath}/${sessionId}/acts/socratic/end`);
  }

  // ========== 第四幕：总结提升 ==========
  async generateLearningReport(sessionId: string, options?: {
    includeAnalytics?: boolean;
    includeRecommendations?: boolean;
    format?: 'detailed' | 'summary';
  }): Promise<ApiResponse<LearningReport>> {
    return apiClient.post<LearningReport>(`${this.basePath}/${sessionId}/acts/summary/report`, options, {
      timeout: 60000,
    });
  }

  async getLearningReport(sessionId: string): Promise<ApiResponse<LearningReport>> {
    return apiClient.get<LearningReport>(`${this.basePath}/${sessionId}/acts/summary/report`);
  }

  async exportSession(sessionId: string, format: 'json' | 'pdf' | 'docx' = 'json'): Promise<ApiResponse<Blob>> {
    return apiClient.get<Blob>(`${this.basePath}/${sessionId}/export`, { format });
  }

  // ========== 协作功能 ==========
  async inviteParticipant(sessionId: string, participantData: {
    email: string;
    role: 'teacher' | 'student';
    name: string;
  }): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.basePath}/${sessionId}/invite`, participantData);
  }

  async removeParticipant(sessionId: string, participantId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/${sessionId}/participants/${participantId}`);
  }

  async getParticipants(sessionId: string): Promise<ApiResponse<TeachingSession['participants']>> {
    return apiClient.get(`${this.basePath}/${sessionId}/participants`);
  }

  // ========== 模板和配置 ==========
  async getSessionTemplates(difficulty?: 'beginner' | 'intermediate' | 'advanced'): Promise<ApiResponse<{
    templates: Array<{
      id: string;
      title: string;
      description: string;
      difficulty: string;
      estimatedDuration: number;
      acts: Record<ActType, {
        enabled: boolean;
        config: Record<string, unknown>;
      }>;
    }>;
  }>> {
    return apiClient.get(`${this.basePath}/templates`, { difficulty });
  }

  async createSessionFromTemplate(templateId: string, overrides: Partial<SessionCreateRequest>): Promise<ApiResponse<TeachingSession>> {
    return apiClient.post<TeachingSession>(`${this.basePath}/templates/${templateId}/create`, overrides);
  }

  // ========== 分析和报告 ==========
  async getSessionAnalytics(sessionId: string): Promise<ApiResponse<{
    duration: number;
    engagement: number;
    completion: number;
    participationByAct: Record<ActType, number>;
    learningOutcomes: string[];
    challenges: string[];
  }>> {
    return apiClient.get(`${this.basePath}/${sessionId}/analytics`);
  }

  async getTeachingStatistics(teacherId?: string, dateRange?: {
    from: string;
    to: string;
  }): Promise<ApiResponse<{
    totalSessions: number;
    avgDuration: number;
    completionRate: number;
    studentEngagement: number;
    popularActs: Record<ActType, number>;
    improvementAreas: string[];
  }>> {
    return apiClient.get(`${this.basePath}/statistics`, {
      teacherId,
      ...dateRange,
    });
  }
}

// ========== 单例导出 ==========
export const teachingService = new TeachingService();