/**
 * 案例管理域API服务
 * DeepPractice Standards Compliant
 */

import { apiClient } from '@/src/infrastructure/api/clients';
import type { LegalCase, ApiResponse, Pagination } from '@/src/types';

// ========== 请求/响应类型 ==========
export interface CaseListRequest {
  page?: number;
  limit?: number;
  search?: string;
  caseType?: string;
  court?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CaseListResponse {
  cases: LegalCase[];
  pagination: Pagination;
}

export interface CaseCreateRequest {
  basicInfo: LegalCase['basicInfo'];
  originalText?: string;
}

export interface CaseUpdateRequest {
  id: string;
  updates: Partial<LegalCase>;
}

// ========== 案例管理服务 ==========
export class CaseService {
  private readonly basePath = '/api/cases';

  // ========== 获取案例列表 ==========
  async getCases(params: CaseListRequest = {}): Promise<ApiResponse<CaseListResponse>> {
    return apiClient.get<CaseListResponse>(this.basePath, params);
  }

  // ========== 获取单个案例 ==========
  async getCase(id: string): Promise<ApiResponse<LegalCase>> {
    return apiClient.get<LegalCase>(`${this.basePath}/${id}`);
  }

  // ========== 创建案例 ==========
  async createCase(data: CaseCreateRequest): Promise<ApiResponse<LegalCase>> {
    return apiClient.post<LegalCase>(this.basePath, data);
  }

  // ========== 更新案例 ==========
  async updateCase(id: string, updates: Partial<LegalCase>): Promise<ApiResponse<LegalCase>> {
    return apiClient.put<LegalCase>(`${this.basePath}/${id}`, updates);
  }

  // ========== 删除案例 ==========
  async deleteCase(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/${id}`);
  }

  // ========== 批量操作 ==========
  async batchDeleteCases(ids: string[]): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.basePath}/batch-delete`, { ids });
  }

  async batchUpdateCases(
    updates: Array<{ id: string; data: Partial<LegalCase> }>
  ): Promise<ApiResponse<LegalCase[]>> {
    return apiClient.post<LegalCase[]>(`${this.basePath}/batch-update`, { updates });
  }

  // ========== 文件上传 ==========
  async uploadDocument(file: File, metadata?: Record<string, unknown>): Promise<ApiResponse<LegalCase>> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    return apiClient.post<LegalCase>(`${this.basePath}/upload`, formData, {
      headers: {
        // 移除Content-Type，让浏览器自动设置multipart/form-data
      },
    });
  }

  // ========== 导出功能 ==========
  async exportCase(id: string, format: 'json' | 'pdf' | 'docx' = 'json'): Promise<ApiResponse<Blob>> {
    return apiClient.get<Blob>(`${this.basePath}/${id}/export`, { format });
  }

  async exportCases(
    ids: string[],
    format: 'json' | 'xlsx' | 'csv' = 'json'
  ): Promise<ApiResponse<Blob>> {
    return apiClient.post<Blob>(`${this.basePath}/export`, { ids, format });
  }

  // ========== 搜索功能 ==========
  async searchCases(query: string, options: {
    fields?: string[];
    fuzzy?: boolean;
    limit?: number;
  } = {}): Promise<ApiResponse<LegalCase[]>> {
    return apiClient.get<LegalCase[]>(`${this.basePath}/search`, {
      q: query,
      ...options,
    });
  }

  // ========== 统计功能 ==========
  async getCaseStats(filters?: CaseListRequest): Promise<ApiResponse<{
    total: number;
    byType: Record<string, number>;
    byCourt: Record<string, number>;
    byMonth: Record<string, number>;
    recentActivity: number;
  }>> {
    return apiClient.get(`${this.basePath}/stats`, filters);
  }
}

// ========== 单例导出 ==========
export const caseService = new CaseService();