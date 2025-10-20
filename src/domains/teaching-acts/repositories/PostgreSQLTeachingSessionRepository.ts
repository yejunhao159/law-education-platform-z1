/**
 * 教学会话仓储 - PostgreSQL实现
 * DeepPractice Standards Compliant
 */

import { pool } from '@/lib/db';
import type {
  ITeachingSessionRepository,
  TeachingSessionSnapshot,
  TeachingSession,
  TeachingSessionListItem,
  PaginationOptions,
} from './TeachingSessionRepository';

export class PostgreSQLTeachingSessionRepository implements ITeachingSessionRepository {
  async saveSnapshot(userId: number, snapshot: TeachingSessionSnapshot): Promise<TeachingSession> {
    const now = new Date().toISOString();

    const query = `
      INSERT INTO teaching_sessions (
        user_id, case_title, case_number, court_name,
        act1_upload, act2_analysis, act3_socratic, act4_summary,
        status, current_act, completed_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
      RETURNING *
    `;

    const result = await pool.query(query, [
      userId,
      snapshot.caseTitle,
      snapshot.caseNumber || null,
      snapshot.courtName || null,
      JSON.stringify(snapshot.act1_upload),
      JSON.stringify(snapshot.act2_analysis),
      JSON.stringify(snapshot.act3_socratic),
      JSON.stringify(snapshot.act4_summary),
      'completed',
      'summary', // 完成时停留在第4幕
      now,
    ]);

    return this.mapToEntity(result.rows[0]);
  }

  async findByUserId(
    userId: number,
    options: PaginationOptions = {}
  ): Promise<{ sessions: TeachingSessionListItem[]; total: number }> {
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = options;

    const offset = (page - 1) * limit;

    // 查询总数
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM teaching_sessions WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].total);

    // 查询数据（只返回列表需要的字段，不加载完整JSONB）
    const query = `
      SELECT
        id, user_id, case_title, case_number, court_name,
        status, current_act, created_at, updated_at,
        completed_at, last_viewed_at,
        act1_upload->>'originalFileName' as original_file_name,
        act4_summary->>'pptUrl' as ppt_url
      FROM teaching_sessions
      WHERE user_id = $1
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limit, offset]);
    const sessions = result.rows.map((row) => this.mapToListItem(row));

    return { sessions, total };
  }

  async findById(sessionId: string, userId: number): Promise<TeachingSession | null> {
    const query = `
      SELECT * FROM teaching_sessions
      WHERE id = $1 AND user_id = $2
    `;

    const result = await pool.query(query, [sessionId, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToEntity(result.rows[0]);
  }

  async search(userId: number, query: string): Promise<TeachingSessionListItem[]> {
    const sqlQuery = `
      SELECT
        id, case_title, case_number, court_name,
        status, created_at, last_viewed_at,
        act1_upload->>'originalFileName' as original_file_name,
        act4_summary->>'pptUrl' as ppt_url
      FROM teaching_sessions
      WHERE user_id = $1
        AND (
          case_title ILIKE $2
          OR case_number ILIKE $2
          OR court_name ILIKE $2
        )
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const result = await pool.query(sqlQuery, [userId, `%${query}%`]);
    return result.rows.map((row) => this.mapToListItem(row));
  }

  async updateLastViewed(sessionId: string): Promise<void> {
    await pool.query('UPDATE teaching_sessions SET last_viewed_at = $1 WHERE id = $2', [
      new Date().toISOString(),
      sessionId,
    ]);
  }

  async delete(sessionId: string, userId: number): Promise<void> {
    await pool.query('DELETE FROM teaching_sessions WHERE id = $1 AND user_id = $2', [
      sessionId,
      userId,
    ]);
  }

  async archive(sessionId: string): Promise<void> {
    await pool.query("UPDATE teaching_sessions SET status = 'archived' WHERE id = $1", [
      sessionId,
    ]);
  }

  // ========== 私有辅助方法 ==========

  private mapToEntity(row: any): TeachingSession {
    return {
      id: row.id,
      userId: row.user_id,
      caseTitle: row.case_title,
      caseNumber: row.case_number,
      courtName: row.court_name,
      act1_upload: row.act1_upload,
      act2_analysis: row.act2_analysis,
      act3_socratic: row.act3_socratic,
      act4_summary: row.act4_summary,
      status: row.status,
      currentAct: row.current_act,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      lastViewedAt: row.last_viewed_at,
    };
  }

  private mapToListItem(row: any): TeachingSessionListItem {
    return {
      id: row.id,
      caseTitle: row.case_title,
      caseNumber: row.case_number,
      courtName: row.court_name,
      originalFileName: row.original_file_name,
      pptUrl: row.ppt_url,
      status: row.status,
      createdAt: row.created_at,
      lastViewedAt: row.last_viewed_at,
    };
  }
}

// 导出单例
export const teachingSessionRepository = new PostgreSQLTeachingSessionRepository();
