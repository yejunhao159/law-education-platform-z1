/**
 * 教学会话仓储 - PostgreSQL实现（简化版）
 * 使用 teaching_sessions 单表设计
 * - 只存储 Act1/2/4 数据（Act3不持久化）
 * - 无版本控制、无审计日志
 * - 简单直接的CRUD操作
 */

import { pool } from '@/lib/db';
import type {
  ITeachingSessionRepository,
  TeachingSessionSnapshot,
  TeachingSession,
  TeachingSessionListItem,
  PaginationOptions,
} from './TeachingSessionRepository';
import type { SessionState } from '../schemas/SnapshotSchemas';

const SORTABLE_COLUMNS = new Set([
  'created_at',
  'updated_at',
  'case_title',
]);

export class PostgreSQLTeachingSessionRepository
  implements ITeachingSessionRepository
{
  /**
   * 保存教学会话快照
   * INSERT或UPDATE到 teaching_sessions 表
   */
  async saveSnapshot(
    userId: number,
    snapshot: TeachingSessionSnapshot,
    sessionId?: string
  ): Promise<TeachingSession> {
    const now = new Date().toISOString();
    const id = sessionId || crypto.randomUUID();

    // 从Snapshot或Act1提取基本信息用于列表展示
    // 优先使用传入的caseTitle，如果没有则从Act1提取
    const caseTitle =
      snapshot.caseTitle ||
      snapshot.act1?.basicInfo?.parties?.plaintiff?.[0] ||
      '未命名案例';
    const caseNumber =
      snapshot.caseNumber || snapshot.act1?.basicInfo?.caseNumber || null;
    const courtName =
      snapshot.courtName || snapshot.act1?.basicInfo?.court || null;

    // 确定当前所在的幕
    const currentAct = snapshot.sessionState || 'act1';

    const query = `
      INSERT INTO teaching_sessions (
        id,
        user_id,
        case_title,
        case_number,
        court_name,
        current_act,
        act1_data,
        act2_data,
        act4_data,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id)
      DO UPDATE SET
        case_title = EXCLUDED.case_title,
        case_number = EXCLUDED.case_number,
        court_name = EXCLUDED.court_name,
        current_act = EXCLUDED.current_act,
        act1_data = EXCLUDED.act1_data,
        act2_data = EXCLUDED.act2_data,
        act4_data = EXCLUDED.act4_data,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `;

    const params = [
      id,
      userId,
      caseTitle,
      caseNumber,
      courtName,
      currentAct,
      snapshot.act1 ? JSON.stringify(snapshot.act1) : null,
      snapshot.act2 ? JSON.stringify(snapshot.act2) : null,
      snapshot.act4 ? JSON.stringify(snapshot.act4) : null,
      snapshot.createdAt || now,
      now,
    ];

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      throw new Error('Failed to save teaching session');
    }

    return this.mapRowToSession(result.rows[0]);
  }

  /**
   * 获取用户的所有教学会话
   */
  async findByUserId(
    userId: number,
    options: PaginationOptions = {}
  ): Promise<{ sessions: TeachingSessionListItem[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options;

    const sortColumn = SORTABLE_COLUMNS.has(sortBy || '')
      ? sortBy
      : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    // 查询总数
    const countResult = await pool.query(
      `
        SELECT COUNT(*) AS total
        FROM teaching_sessions
        WHERE user_id = $1 AND deleted_at IS NULL
      `,
      [userId]
    );
    const total = parseInt(countResult.rows[0].total, 10) || 0;

    // 查询列表
    const query = `
      SELECT
        id,
        case_title,
        case_number,
        court_name,
        current_act,
        act1_data,
        act4_data,
        created_at,
        updated_at
      FROM teaching_sessions
      WHERE user_id = $1
        AND deleted_at IS NULL
      ORDER BY ${sortColumn} ${order}
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limit, offset]);
    const sessions = result.rows.map((row) => this.mapRowToListItem(row));

    return { sessions, total };
  }

  /**
   * 根据ID获取单个教学会话
   */
  async findById(
    sessionId: string,
    userId: number
  ): Promise<TeachingSession | null> {
    const query = `
      SELECT *
      FROM teaching_sessions
      WHERE id = $1
        AND user_id = $2
        AND deleted_at IS NULL
      LIMIT 1
    `;

    const result = await pool.query(query, [sessionId, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSession(result.rows[0]);
  }

  /**
   * 搜索教学会话（按案例标题和案号）
   */
  async search(
    userId: number,
    query: string
  ): Promise<TeachingSessionListItem[]> {
    const sqlQuery = `
      SELECT
        id,
        case_title,
        case_number,
        court_name,
        current_act,
        act1_data,
        act4_data,
        created_at,
        updated_at
      FROM teaching_sessions
      WHERE user_id = $1
        AND deleted_at IS NULL
        AND (
          case_title ILIKE $2
          OR case_number ILIKE $2
        )
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const result = await pool.query(sqlQuery, [userId, `%${query}%`]);
    return result.rows.map((row) => this.mapRowToListItem(row));
  }

  /**
   * 更新最后查看时间（暂不实现）
   */
  async updateLastViewed(_sessionId: string): Promise<void> {
    // 简化设计，暂不记录最后查看时间
    // 如需要可以在updated_at或单独的访问日志表中记录
  }

  /**
   * 删除教学会话（软删除）
   */
  async delete(sessionId: string, userId: number): Promise<void> {
    await pool.query(
      `
        UPDATE teaching_sessions
        SET deleted_at = NOW()
        WHERE id = $1
          AND user_id = $2
      `,
      [sessionId, userId]
    );
  }

  /**
   * 归档教学会话（软删除）
   */
  async archive(sessionId: string): Promise<void> {
    await pool.query(
      `
        UPDATE teaching_sessions
        SET deleted_at = NOW()
        WHERE id = $1
      `,
      [sessionId]
    );
  }

  // =============================================================================
  // 数据映射辅助方法
  // =============================================================================

  /**
   * 将数据库行映射为完整的TeachingSession对象
   */
  private mapRowToSession(row: any): TeachingSession {
    // 解析JSON字符串（数据库存储的是JSON字符串）
    const act1 = row.act1_data ? (typeof row.act1_data === 'string' ? JSON.parse(row.act1_data) : row.act1_data) : null;
    const act2 = row.act2_data ? (typeof row.act2_data === 'string' ? JSON.parse(row.act2_data) : row.act2_data) : null;
    const act4 = row.act4_data ? (typeof row.act4_data === 'string' ? JSON.parse(row.act4_data) : row.act4_data) : null;

    return {
      id: row.id,
      userId: row.user_id,
      schemaVersion: 1,
      dataVersion: '1.0.0',
      sessionState: row.current_act as SessionState,
      caseTitle: row.case_title,
      caseNumber: row.case_number,
      courtName: row.court_name,
      act1: act1,
      act2: act2,
      act3: null, // Act3不持久化
      act4: act4,
      act1Confidence: act1?.metadata?.confidence || null,
      act1CompletedAt: act1?.uploadedAt || act1?.metadata?.extractedAt || null,
      act2CompletedAt: act2?.completedAt || null,
      act3CompletedAt: null, // Act3不持久化
      act4CompletedAt: act4?.completedAt || null,
      act4PptUrl: act4?.pptUrl || null,
      createdAt: this.formatTimestamp(row.created_at) || new Date().toISOString(),
      updatedAt: this.formatTimestamp(row.updated_at) || new Date().toISOString(),
      completedAt: row.current_act === 'completed' ? this.formatTimestamp(row.updated_at) : null,
    };
  }

  /**
   * 将数据库行映射为列表项（轻量级）
   */
  private mapRowToListItem(row: any): TeachingSessionListItem {
    // 解析JSON字符串（数据库存储的是JSON字符串）
    const act1 = row.act1_data ? (typeof row.act1_data === 'string' ? JSON.parse(row.act1_data) : row.act1_data) : null;
    const act4 = row.act4_data ? (typeof row.act4_data === 'string' ? JSON.parse(row.act4_data) : row.act4_data) : null;

    return {
      id: row.id,
      caseTitle: row.case_title,
      caseNumber: row.case_number,
      courtName: row.court_name,
      sessionState: row.current_act as SessionState,
      originalFileName: act1?.originalFileName || null,
      pptUrl: act4?.pptUrl || null,
      act1Confidence: act1?.metadata?.confidence || null,
      createdAt: this.formatTimestamp(row.created_at) || new Date().toISOString(),
      updatedAt: this.formatTimestamp(row.updated_at) || new Date().toISOString(),
      completedAt: row.current_act === 'completed' ? this.formatTimestamp(row.updated_at) : null,
    };
  }

  /**
   * 格式化时间戳为ISO字符串
   */
  private formatTimestamp(value: unknown): string | null {
    if (!value) return null;
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return value;
    }
    return new Date(value as any).toISOString();
  }
}

export const teachingSessionRepository =
  new PostgreSQLTeachingSessionRepository();
