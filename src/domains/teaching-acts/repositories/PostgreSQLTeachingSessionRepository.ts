/**
 * 教学会话仓储 - PostgreSQL实现（teaching_sessions_v2）
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
import type { SessionState } from '../schemas/SnapshotSchemas';

interface SnapshotColumnPayload {
  schemaVersion: number;
  dataVersion: string;
  sessionState: SessionState;
  caseTitle: string;
  caseNumber?: string | null;
  courtName?: string | null;
  act1BasicInfo: any | null;
  act1Facts: any | null;
  act1Evidence: any | null;
  act1Reasoning: any | null;
  act1Metadata: any | null;
  act1Confidence: number | null;
  act1CompletedAt: string | null;
  act2Narrative: any | null;
  act2TimelineAnalysis: any | null;
  act2EvidenceQuestions: any | null;
  act2ClaimAnalysis: any | null;
  act2CompletedAt: string | null;
  act3Socratic: any | null;
  act3CompletedAt: string | null;
  act4LearningReport: any | null;
  act4PptUrl: string | null;
  act4PptMetadata: any | null;
  act4CompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  lastSavedAt: string | null;
  saveType: 'manual' | 'auto';
}

const SORTABLE_COLUMNS = new Set([
  'created_at',
  'updated_at',
  'last_viewed_at',
  'completed_at',
]);

export class PostgreSQLTeachingSessionRepository
  implements ITeachingSessionRepository
{
  async saveSnapshot(
    userId: number,
    snapshot: TeachingSessionSnapshot,
    sessionId?: string
  ): Promise<TeachingSession> {
    const columns = this.buildColumnPayload(snapshot);

    if (sessionId) {
      return this.updateSnapshot(userId, sessionId, columns);
    }

    return this.insertSnapshot(userId, columns);
  }

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

    const countResult = await pool.query(
      `
        SELECT COUNT(*) AS total
        FROM teaching_sessions_v2
        WHERE user_id = $1 AND deleted_at IS NULL
      `,
      [userId]
    );
    const total = parseInt(countResult.rows[0].total, 10) || 0;

    const query = `
      SELECT
        id,
        user_id,
        case_title,
        case_number,
        court_name,
        session_state,
        act1_confidence,
        act1_metadata,
        act4_ppt_url,
        created_at,
        updated_at,
        completed_at,
        last_viewed_at,
        save_type
      FROM teaching_sessions_v2
      WHERE user_id = $1
        AND deleted_at IS NULL
      ORDER BY ${sortColumn} ${order}
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limit, offset]);
    const sessions = result.rows.map((row) => this.mapRowToListItem(row));

    return { sessions, total };
  }

  async findById(
    sessionId: string,
    userId: number
  ): Promise<TeachingSession | null> {
    const query = `
      SELECT *
      FROM teaching_sessions_v2
      WHERE id = $1
        AND user_id = $2
        AND deleted_at IS NULL
      LIMIT 1
    `;

    const result = await pool.query(query, [sessionId, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result.rows[0]);
  }

  async search(
    userId: number,
    query: string
  ): Promise<TeachingSessionListItem[]> {
    const sqlQuery = `
      SELECT
        id,
        user_id,
        case_title,
        case_number,
        court_name,
        session_state,
        act1_confidence,
        act1_metadata,
        act4_ppt_url,
        created_at,
        updated_at,
        completed_at,
        last_viewed_at,
        save_type
      FROM teaching_sessions_v2
      WHERE user_id = $1
        AND deleted_at IS NULL
        AND (
          case_title ILIKE $2
          OR COALESCE(case_number, '') ILIKE $2
          OR COALESCE(court_name, '') ILIKE $2
        )
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const result = await pool.query(sqlQuery, [userId, `%${query}%`]);
    return result.rows.map((row) => this.mapRowToListItem(row));
  }

  async updateLastViewed(sessionId: string): Promise<void> {
    await pool.query(
      `
        UPDATE teaching_sessions_v2
        SET last_viewed_at = $1
        WHERE id = $2
          AND deleted_at IS NULL
      `,
      [new Date().toISOString(), sessionId]
    );
  }

  async delete(sessionId: string, userId: number): Promise<void> {
    await pool.query(
      `
        UPDATE teaching_sessions_v2
        SET deleted_at = NOW()
        WHERE id = $1
          AND user_id = $2
      `,
      [sessionId, userId]
    );
  }

  async archive(sessionId: string): Promise<void> {
    await pool.query(
      `
        UPDATE teaching_sessions_v2
        SET deleted_at = NOW()
        WHERE id = $1
      `,
      [sessionId]
    );
  }

  // ==================== 私有方法 ====================

  private async insertSnapshot(
    userId: number,
    columns: SnapshotColumnPayload
  ): Promise<TeachingSession> {
    const result = await pool.query(
      `
        INSERT INTO teaching_sessions_v2 (
          user_id,
          schema_version,
          data_version,
          session_state,
          case_title,
          case_number,
          court_name,
          act1_basic_info,
          act1_facts,
          act1_evidence,
          act1_reasoning,
          act1_metadata,
          act1_confidence,
          act1_completed_at,
          act2_narrative,
          act2_timeline_analysis,
          act2_evidence_questions,
          act2_claim_analysis,
          act2_completed_at,
          act3_socratic,
          act3_completed_at,
          act4_learning_report,
          act4_ppt_url,
          act4_ppt_metadata,
          act4_completed_at,
          created_at,
          updated_at,
          completed_at,
          last_saved_at,
          save_type
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19,
          $20, $21,
          $22, $23, $24, $25,
          $26, $27, $28, $29, $30
        )
        RETURNING *
      `,
      [
        userId,
        columns.schemaVersion,
        columns.dataVersion,
        columns.sessionState,
        columns.caseTitle,
        columns.caseNumber ?? null,
        columns.courtName ?? null,
        columns.act1BasicInfo,
        columns.act1Facts,
        columns.act1Evidence,
        columns.act1Reasoning,
        columns.act1Metadata,
        columns.act1Confidence,
        columns.act1CompletedAt,
        columns.act2Narrative,
        columns.act2TimelineAnalysis,
        columns.act2EvidenceQuestions,
        columns.act2ClaimAnalysis,
        columns.act2CompletedAt,
        columns.act3Socratic,
        columns.act3CompletedAt,
        columns.act4LearningReport,
        columns.act4PptUrl,
        columns.act4PptMetadata,
        columns.act4CompletedAt,
        columns.createdAt,
        columns.updatedAt,
        columns.completedAt,
        columns.lastSavedAt,
        columns.saveType,
      ]
    );

    return this.mapRowToEntity(result.rows[0]);
  }

  private async updateSnapshot(
    userId: number,
    sessionId: string,
    columns: SnapshotColumnPayload
  ): Promise<TeachingSession> {
    const result = await pool.query(
      `
        UPDATE teaching_sessions_v2
        SET
          schema_version = $3,
          data_version = $4,
          session_state = $5,
          case_title = $6,
          case_number = $7,
          court_name = $8,
          act1_basic_info = $9,
          act1_facts = $10,
          act1_evidence = $11,
          act1_reasoning = $12,
          act1_metadata = $13,
          act1_confidence = $14,
          act1_completed_at = $15,
          act2_narrative = $16,
          act2_timeline_analysis = $17,
          act2_evidence_questions = $18,
          act2_claim_analysis = $19,
          act2_completed_at = $20,
          act3_socratic = $21,
          act3_completed_at = $22,
          act4_learning_report = $23,
          act4_ppt_url = $24,
          act4_ppt_metadata = $25,
          act4_completed_at = $26,
          updated_at = $27,
          completed_at = $28,
          last_saved_at = $29,
          save_type = $30
        WHERE id = $1
          AND user_id = $2
          AND deleted_at IS NULL
        RETURNING *
      `,
      [
        sessionId,
        userId,
        columns.schemaVersion,
        columns.dataVersion,
        columns.sessionState,
        columns.caseTitle,
        columns.caseNumber ?? null,
        columns.courtName ?? null,
        columns.act1BasicInfo,
        columns.act1Facts,
        columns.act1Evidence,
        columns.act1Reasoning,
        columns.act1Metadata,
        columns.act1Confidence,
        columns.act1CompletedAt,
        columns.act2Narrative,
        columns.act2TimelineAnalysis,
        columns.act2EvidenceQuestions,
        columns.act2ClaimAnalysis,
        columns.act2CompletedAt,
        columns.act3Socratic,
        columns.act3CompletedAt,
        columns.act4LearningReport,
        columns.act4PptUrl,
        columns.act4PptMetadata,
        columns.act4CompletedAt,
        columns.updatedAt,
        columns.completedAt,
        columns.lastSavedAt,
        columns.saveType,
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('教学会话更新失败或已被删除');
    }

    return this.mapRowToEntity(result.rows[0]);
  }

  private buildColumnPayload(snapshot: TeachingSessionSnapshot): SnapshotColumnPayload {
    const act1 = snapshot.act1;
    const act2 = snapshot.act2;
    const act3 = snapshot.act3;
    const act4 = snapshot.act4;

    const metadata = act1?.metadata
      ? {
          ...act1.metadata,
          originalFileName: act1.originalFileName ?? act1.metadata?.originalFileName,
          uploadedAt: act1.uploadedAt ?? act1.metadata?.uploadedAt,
        }
      : null;

    const act3Payload = act3
      ? {
          level: act3.level,
          completedNodes: act3.completedNodes,
          totalRounds: act3.totalRounds ?? act3.completedNodes.length,
        }
      : null;

    const completedAt =
      snapshot.sessionState === 'completed'
        ? act4?.completedAt || snapshot.updatedAt
        : null;

    return {
      schemaVersion: snapshot.schemaVersion,
      dataVersion: snapshot.version,
      sessionState: snapshot.sessionState,
      caseTitle: snapshot.caseTitle,
      caseNumber: snapshot.caseNumber ?? null,
      courtName: snapshot.courtName ?? null,
      act1BasicInfo: act1?.basicInfo ?? null,
      act1Facts: act1?.facts ?? null,
      act1Evidence: act1?.evidence ?? null,
      act1Reasoning: act1?.reasoning ?? null,
      act1Metadata: metadata,
      act1Confidence: metadata?.confidence ?? null,
      act1CompletedAt:
        act1?.uploadedAt ||
        act1?.metadata?.uploadedAt ||
        act1?.metadata?.extractedAt ||
        null,
      act2Narrative: act2?.narrative ?? null,
      act2TimelineAnalysis: act2?.timelineAnalysis ?? null,
      act2EvidenceQuestions: act2?.evidenceQuestions ?? null,
      act2ClaimAnalysis: act2?.claimAnalysis ?? null,
      act2CompletedAt: act2?.completedAt ?? null,
      act3Socratic: act3Payload,
      act3CompletedAt: act3?.completedAt ?? null,
      act4LearningReport: act4?.learningReport ?? null,
      act4PptUrl: act4?.pptUrl ?? null,
      act4PptMetadata: act4?.pptMetadata ?? null,
      act4CompletedAt: act4?.completedAt ?? null,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
      completedAt,
      lastSavedAt: snapshot.lastSavedAt ?? snapshot.updatedAt,
      saveType: snapshot.saveType ?? 'manual',
    };
  }

  private mapRowToEntity(row: any): TeachingSession {
    const act1: any = row.act1_basic_info
      ? {
          basicInfo: row.act1_basic_info,
          facts: row.act1_facts,
          evidence: row.act1_evidence,
          reasoning: row.act1_reasoning,
          metadata: row.act1_metadata,
          originalFileName: row.act1_metadata?.originalFileName,
          uploadedAt:
            row.act1_metadata?.uploadedAt ||
            row.act1_metadata?.extractedAt ||
            this.formatTimestamp(row.act1_completed_at),
        }
      : undefined;

    const act2: any =
      row.act2_narrative ||
      row.act2_timeline_analysis ||
      row.act2_evidence_questions ||
      row.act2_claim_analysis
        ? {
            narrative: row.act2_narrative,
            timelineAnalysis: row.act2_timeline_analysis,
            evidenceQuestions: row.act2_evidence_questions,
            claimAnalysis: row.act2_claim_analysis,
            completedAt: this.formatTimestamp(row.act2_completed_at),
          }
        : undefined;

    const act3: any = row.act3_socratic
      ? {
          ...row.act3_socratic,
          completedAt: this.formatTimestamp(row.act3_completed_at),
        }
      : undefined;

    const act4: any = row.act4_learning_report
      ? {
          learningReport: row.act4_learning_report,
          pptUrl: row.act4_ppt_url,
          pptMetadata: row.act4_ppt_metadata,
          completedAt: this.formatTimestamp(row.act4_completed_at),
        }
      : undefined;

    return {
      id: row.id,
      userId: row.user_id,
      schemaVersion: row.schema_version,
      dataVersion: row.data_version,
      sessionState: row.session_state,
      caseTitle: row.case_title,
      caseNumber: row.case_number,
      courtName: row.court_name,
      act1,
      act2,
      act3,
      act4,
      act1Confidence: row.act1_confidence,
      act1CompletedAt: this.formatTimestamp(row.act1_completed_at),
      act2CompletedAt: this.formatTimestamp(row.act2_completed_at),
      act3CompletedAt: this.formatTimestamp(row.act3_completed_at),
      act4CompletedAt: this.formatTimestamp(row.act4_completed_at),
      act4PptUrl: row.act4_ppt_url,
      createdAt: this.formatTimestamp(row.created_at) ?? new Date().toISOString(),
      updatedAt: this.formatTimestamp(row.updated_at) ?? new Date().toISOString(),
      completedAt: this.formatTimestamp(row.completed_at),
      lastSavedAt: this.formatTimestamp(row.last_saved_at),
      lastViewedAt: this.formatTimestamp(row.last_viewed_at),
      saveType: row.save_type ?? 'manual',
    };
  }

  private mapRowToListItem(row: any): TeachingSessionListItem {
    return {
      id: row.id,
      caseTitle: row.case_title,
      caseNumber: row.case_number,
      courtName: row.court_name,
      sessionState: row.session_state,
      originalFileName: row.act1_metadata?.originalFileName ?? null,
      pptUrl: row.act4_ppt_url ?? null,
      act1Confidence: row.act1_confidence ?? null,
      createdAt: this.formatTimestamp(row.created_at) ?? new Date().toISOString(),
      updatedAt: this.formatTimestamp(row.updated_at) ?? new Date().toISOString(),
      completedAt: this.formatTimestamp(row.completed_at),
      lastViewedAt: this.formatTimestamp(row.last_viewed_at),
      saveType: row.save_type ?? 'manual',
    };
  }

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
