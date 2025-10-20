/**
 * 教学会话仓储接口
 * 负责四幕教学快照的持久化
 * DeepPractice Standards Compliant
 */

import type { DeepAnalysisResult, CaseLearningReport } from '@/src/types';

/**
 * 教学会话快照数据结构
 */
export interface TeachingSessionSnapshot {
  // 案例基本信息（从第1幕提取）
  caseTitle: string;
  caseNumber?: string;
  courtName?: string;

  // 四幕数据
  act1_upload: {
    extractedElements: Record<string, unknown>;
    confidence: number;
    originalFileName?: string;
    uploadedAt: string;
  };

  act2_analysis: {
    result: DeepAnalysisResult | Record<string, unknown>;
    completedAt: string;
  };

  act3_socratic: {
    level: 1 | 2 | 3;
    completedNodes: string[];
    totalRounds?: number;
    completedAt: string;
  };

  act4_summary: {
    learningReport: CaseLearningReport | Record<string, unknown>;
    pptUrl?: string;
    pptMetadata?: {
      coverUrl?: string;
      slides?: number;
      generatedAt?: string;
    };
    completedAt: string;
  };
}

/**
 * 教学会话实体
 */
export interface TeachingSession {
  id: string;
  userId: number;
  caseTitle: string;
  caseNumber?: string;
  courtName?: string;
  act1_upload: any;
  act2_analysis: any;
  act3_socratic: any;
  act4_summary: any;
  status: 'completed' | 'archived';
  currentAct: 'upload' | 'analysis' | 'socratic' | 'summary';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  lastViewedAt?: string;
}

/**
 * 列表项（简化版，用于列表展示）
 */
export interface TeachingSessionListItem {
  id: string;
  caseTitle: string;
  caseNumber?: string;
  courtName?: string;
  originalFileName?: string;
  pptUrl?: string;
  status: string;
  createdAt: string;
  lastViewedAt?: string;
}

/**
 * 分页选项
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'updated_at' | 'last_viewed_at';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 教学会话仓储接口
 */
export interface ITeachingSessionRepository {
  /**
   * 保存教学会话快照
   * @param userId 用户ID（老师）
   * @param snapshot 四幕数据快照（从Zustand Store序列化）
   */
  saveSnapshot(userId: number, snapshot: TeachingSessionSnapshot): Promise<TeachingSession>;

  /**
   * 获取用户的所有教学会话（我的教案列表）
   * @param userId 用户ID
   * @param options 分页和过滤选项
   */
  findByUserId(
    userId: number,
    options?: PaginationOptions
  ): Promise<{
    sessions: TeachingSessionListItem[];
    total: number;
  }>;

  /**
   * 根据ID获取单个教学会话
   * @param sessionId 会话ID
   * @param userId 用户ID（权限校验）
   */
  findById(sessionId: string, userId: number): Promise<TeachingSession | null>;

  /**
   * 搜索教学会话
   * @param userId 用户ID
   * @param query 搜索关键词（案例标题、案号）
   */
  search(userId: number, query: string): Promise<TeachingSessionListItem[]>;

  /**
   * 更新最后查看时间
   * @param sessionId 会话ID
   */
  updateLastViewed(sessionId: string): Promise<void>;

  /**
   * 删除教学会话
   * @param sessionId 会话ID
   * @param userId 用户ID（权限校验）
   */
  delete(sessionId: string, userId: number): Promise<void>;

  /**
   * 归档教学会话
   * @param sessionId 会话ID
   */
  archive(sessionId: string): Promise<void>;
}
