/**
 * 教学会话仓储接口
 * 负责四幕教学快照的持久化
 * DeepPractice Standards Compliant
 */

import type {
  TeachingSessionSnapshotV1,
  SessionState,
  Act1Snapshot,
  Act2Snapshot,
  Act3Snapshot,
  Act4Snapshot,
} from '@/src/domains/teaching-acts/schemas/SnapshotSchemas';

/**
 * 教学会话快照数据结构（V2）
 */
export type TeachingSessionSnapshot = TeachingSessionSnapshotV1;

/**
 * 教学会话实体（对应teaching_sessions_v2）
 */
export interface TeachingSession {
  id: string;
  userId: number;
  schemaVersion: number;
  dataVersion: string;
  sessionState: SessionState;
  caseTitle: string;
  caseNumber?: string | null;
  courtName?: string | null;
  act1?: Act1Snapshot;
  act2?: Act2Snapshot;
  act3?: Act3Snapshot;
  act4?: Act4Snapshot;
  act1Confidence?: number | null;
  act1CompletedAt?: string | null;
  act2CompletedAt?: string | null;
  act3CompletedAt?: string | null;
  act4CompletedAt?: string | null;
  act4PptUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  lastSavedAt?: string | null;
  lastViewedAt?: string | null;
  saveType: 'manual' | 'auto';
}

/**
 * 列表项（简化版，用于列表展示）
 */
export interface TeachingSessionListItem {
  id: string;
  caseTitle: string;
  caseNumber?: string | null;
  courtName?: string | null;
  sessionState: SessionState;
  originalFileName?: string | null;
  pptUrl?: string | null;
  act1Confidence?: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  lastViewedAt?: string | null;
  saveType: 'manual' | 'auto';
}

/**
 * 分页选项
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'updated_at' | 'last_viewed_at' | 'completed_at';
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
   * @param sessionId 可选，会话ID；存在时执行更新，否则创建
   */
  saveSnapshot(
    userId: number,
    snapshot: TeachingSessionSnapshot,
    sessionId?: string
  ): Promise<TeachingSession>;

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
   * 删除教学会话（软删除）
   * @param sessionId 会话ID
   * @param userId 用户ID（权限校验）
   */
  delete(sessionId: string, userId: number): Promise<void>;

  /**
   * 归档教学会话（软删除，用于兼容旧逻辑）
   * @param sessionId 会话ID
   */
  archive(sessionId: string): Promise<void>;
}
