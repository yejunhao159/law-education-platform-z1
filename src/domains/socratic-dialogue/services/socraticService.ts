/**
 * 苏格拉底对话域API服务
 * DeepPractice Standards Compliant
 */

import { apiClient } from '@/src/infrastructure/api/clients';
import type {
  SocraticRequest,
  SocraticResponse,
  DialogueSession,
  TeachingLevel,
  DialogueContext,
  TeachingAssessment,
  ApiResponse,
} from '@/src/types';

// ========== 请求/响应类型 ==========
export interface SessionCreateRequest {
  title: string;
  level: TeachingLevel;
  context: DialogueContext;
  caseId?: string;
}

export interface SessionListResponse {
  sessions: DialogueSession[];
  total: number;
}

export interface MessageSendRequest {
  sessionId: string;
  content: string;
  role: 'teacher' | 'student';
}

// ========== 苏格拉底对话服务 ==========
export class SocraticService {
  private readonly basePath = '/api/socratic';

  // ========== AI对话生成 ==========
  async generateResponse(request: SocraticRequest): Promise<ApiResponse<SocraticResponse>> {
    return apiClient.post<SocraticResponse>(`${this.basePath}/generate`, request, {
      timeout: 60000, // AI生成可能需要更长时间
    });
  }

  // ========== 流式对话生成 ==========
  async generateStreamResponse(
    request: SocraticRequest,
    onChunk: (chunk: string) => void,
    onComplete: (response: SocraticResponse) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.basePath}/generate-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'chunk') {
                onChunk(parsed.content);
              } else if (parsed.type === 'complete') {
                onComplete(parsed.response);
                return;
              }
            } catch (e) {
              // 忽略解析错误，继续处理
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // ========== 会话管理 ==========
  async createSession(data: SessionCreateRequest): Promise<ApiResponse<DialogueSession>> {
    return apiClient.post<DialogueSession>(this.basePath, data);
  }

  async getSessions(params: {
    page?: number;
    limit?: number;
    caseId?: string;
    level?: TeachingLevel;
    active?: boolean;
  } = {}): Promise<ApiResponse<SessionListResponse>> {
    return apiClient.get<SessionListResponse>(this.basePath, params);
  }

  async getSession(sessionId: string): Promise<ApiResponse<DialogueSession>> {
    return apiClient.get<DialogueSession>(`${this.basePath}/${sessionId}`);
  }

  async updateSession(
    sessionId: string,
    updates: Partial<DialogueSession>
  ): Promise<ApiResponse<DialogueSession>> {
    return apiClient.put<DialogueSession>(`${this.basePath}/${sessionId}`, updates);
  }

  async deleteSession(sessionId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/${sessionId}`);
  }

  async endSession(sessionId: string): Promise<ApiResponse<DialogueSession>> {
    return apiClient.post<DialogueSession>(`${this.basePath}/${sessionId}/end`);
  }

  // ========== 消息管理 ==========
  async sendMessage(data: MessageSendRequest): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.basePath}/${data.sessionId}/messages`, {
      content: data.content,
      role: data.role,
    });
  }

  async getMessages(sessionId: string, params: {
    page?: number;
    limit?: number;
    fromDate?: string;
  } = {}): Promise<ApiResponse<{
    messages: DialogueSession['messages'];
    total: number;
  }>> {
    return apiClient.get(`${this.basePath}/${sessionId}/messages`, params);
  }

  // ========== 教学评估 ==========
  async assessSession(sessionId: string): Promise<ApiResponse<TeachingAssessment>> {
    return apiClient.post<TeachingAssessment>(`${this.basePath}/${sessionId}/assess`);
  }

  async getAssessment(sessionId: string): Promise<ApiResponse<TeachingAssessment>> {
    return apiClient.get<TeachingAssessment>(`${this.basePath}/${sessionId}/assessment`);
  }

  // ========== 教学资源 ==========
  async getTeachingPrompts(level: TeachingLevel, topic?: string): Promise<ApiResponse<{
    prompts: string[];
    examples: Array<{
      question: string;
      expectedResponse: string;
    }>;
  }>> {
    return apiClient.get(`${this.basePath}/prompts`, { level, topic });
  }

  async getSuggestedQuestions(context: DialogueContext): Promise<ApiResponse<{
    questions: string[];
    reasoning: string[];
  }>> {
    return apiClient.post(`${this.basePath}/suggestions`, { context });
  }

  // ========== 分析和报告 ==========
  async getSessionAnalytics(sessionId: string): Promise<ApiResponse<{
    duration: number;
    messageCount: number;
    participationRate: number;
    topicCoverage: string[];
    learningProgress: number;
  }>> {
    return apiClient.get(`${this.basePath}/${sessionId}/analytics`);
  }

  async exportSession(
    sessionId: string,
    format: 'json' | 'txt' | 'pdf' = 'json'
  ): Promise<ApiResponse<Blob>> {
    return apiClient.get<Blob>(`${this.basePath}/${sessionId}/export`, { format });
  }

  // ========== 实时功能 ==========
  async joinSession(sessionId: string, participantInfo: {
    id: string;
    role: 'teacher' | 'student';
    name: string;
  }): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.basePath}/${sessionId}/join`, participantInfo);
  }

  async leaveSession(sessionId: string, participantId: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.basePath}/${sessionId}/leave`, { participantId });
  }

  async getActiveParticipants(sessionId: string): Promise<ApiResponse<DialogueSession['participants']>> {
    return apiClient.get(`${this.basePath}/${sessionId}/participants`);
  }
}

// ========== 单例导出 ==========
export const socraticService = new SocraticService();