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
    // 🔍 关键诊断：在构建参数数组之前检查columns对象
    console.log('🚨 [insertSnapshot] 传递给pool.query之前的columns.act2EvidenceQuestions:', {
      type: typeof columns.act2EvidenceQuestions,
      isString: typeof columns.act2EvidenceQuestions === 'string',
      value: columns.act2EvidenceQuestions,
    });

    // 构建参数数组 - 🔧 修复：显式序列化所有JSONB字段
    const params = [
        userId,
        columns.schemaVersion,
        columns.dataVersion,
        columns.sessionState,
        columns.caseTitle,
        columns.caseNumber ?? null,
        columns.courtName ?? null,
        columns.act1BasicInfo ? JSON.stringify(columns.act1BasicInfo) : null,
        columns.act1Facts ? JSON.stringify(columns.act1Facts) : null,
        columns.act1Evidence ? JSON.stringify(columns.act1Evidence) : null,
        columns.act1Reasoning ? JSON.stringify(columns.act1Reasoning) : null,
        columns.act1Metadata ? JSON.stringify(columns.act1Metadata) : null,
        columns.act1Confidence,
        columns.act1CompletedAt,
        columns.act2Narrative ? JSON.stringify(columns.act2Narrative) : null,
        columns.act2TimelineAnalysis ? JSON.stringify(columns.act2TimelineAnalysis) : null,
        columns.act2EvidenceQuestions ? JSON.stringify(columns.act2EvidenceQuestions) : null,
        columns.act2ClaimAnalysis ? JSON.stringify(columns.act2ClaimAnalysis) : null,
        columns.act2CompletedAt,
        columns.act3Socratic ? JSON.stringify(columns.act3Socratic) : null,
        columns.act3CompletedAt,
        columns.act4LearningReport ? JSON.stringify(columns.act4LearningReport) : null,
        columns.act4PptUrl,
        columns.act4PptMetadata ? JSON.stringify(columns.act4PptMetadata) : null,
        columns.act4CompletedAt,
        columns.createdAt,
        columns.updatedAt,
        columns.completedAt,
        columns.lastSavedAt,
        columns.saveType,
      ];

    // 🔍 关键诊断：检查参数数组中$17(act2_evidence_questions)
    console.log('🚨 [insertSnapshot] 参数数组中$17(act2_evidence_questions)的值:', {
      index: 16, // $17对应索引16（userId是$1）
      type: typeof params[16],
      isString: typeof params[16] === 'string',
      valuePreview: params[16] ? JSON.stringify(params[16]).substring(0, 150) : 'null',
    });

    console.log('🚀 [insertSnapshot] 即将执行INSERT，参数数量:', params.length);

    let result;
    try {
      result = await pool.query(
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
        params
      );

      console.log('✅ [insertSnapshot] INSERT执行成功，返回行数:', result.rows.length);
      console.log('📋 [insertSnapshot] 返回的ID:', result.rows[0]?.id);

    } catch (error) {
      console.error('❌ [insertSnapshot] pool.query失败:', error);
      console.error('🔍 [insertSnapshot] 错误详情:', {
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        detail: (error as any)?.detail,
        hint: (error as any)?.hint,
        position: (error as any)?.position,
      });
      throw error;  // 重新抛出，让上层处理
    }

    if (!result.rows[0]) {
      console.error('❌ [insertSnapshot] INSERT成功但未返回数据!');
      throw new Error('INSERT操作未返回预期数据');
    }

    return this.mapRowToEntity(result.rows[0]);
  }

  private async updateSnapshot(
    userId: number,
    sessionId: string,
    columns: SnapshotColumnPayload
  ): Promise<TeachingSession> {
    // 🔍 关键诊断：在构建参数数组之前检查columns对象
    console.log('🚨 [updateSnapshot] 传递给pool.query之前的columns.act2EvidenceQuestions:', {
      type: typeof columns.act2EvidenceQuestions,
      isString: typeof columns.act2EvidenceQuestions === 'string',
      value: columns.act2EvidenceQuestions,
    });

    // 构建参数数组 - 🔧 修复：显式序列化所有JSONB字段
    const params = [
        sessionId,
        userId,
        columns.schemaVersion,
        columns.dataVersion,
        columns.sessionState,
        columns.caseTitle,
        columns.caseNumber ?? null,
        columns.courtName ?? null,
        columns.act1BasicInfo ? JSON.stringify(columns.act1BasicInfo) : null,
        columns.act1Facts ? JSON.stringify(columns.act1Facts) : null,
        columns.act1Evidence ? JSON.stringify(columns.act1Evidence) : null,
        columns.act1Reasoning ? JSON.stringify(columns.act1Reasoning) : null,
        columns.act1Metadata ? JSON.stringify(columns.act1Metadata) : null,
        columns.act1Confidence,
        columns.act1CompletedAt,
        columns.act2Narrative ? JSON.stringify(columns.act2Narrative) : null,
        columns.act2TimelineAnalysis ? JSON.stringify(columns.act2TimelineAnalysis) : null,
        columns.act2EvidenceQuestions ? JSON.stringify(columns.act2EvidenceQuestions) : null,
        columns.act2ClaimAnalysis ? JSON.stringify(columns.act2ClaimAnalysis) : null,
        columns.act2CompletedAt,
        columns.act3Socratic ? JSON.stringify(columns.act3Socratic) : null,
        columns.act3CompletedAt,
        columns.act4LearningReport ? JSON.stringify(columns.act4LearningReport) : null,
        columns.act4PptUrl,
        columns.act4PptMetadata ? JSON.stringify(columns.act4PptMetadata) : null,
        columns.act4CompletedAt,
        columns.updatedAt,
        columns.completedAt,
        columns.lastSavedAt,
        columns.saveType,
      ];

    // 🔍 关键诊断：检查参数数组中第18个元素（act2_evidence_questions对应$18）
    console.log('🚨 [updateSnapshot] 参数数组中$18(act2_evidence_questions)的值:', {
      index: 17, // 数组索引从0开始，$18对应索引17
      type: typeof params[17],
      isString: typeof params[17] === 'string',
      valuePreview: params[17] ? JSON.stringify(params[17]).substring(0, 150) : 'null',
    });

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
      params
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

    /**
     * 🛡️ 深度递归解析函数 - 处理嵌套的双重JSON序列化问题
     *
     * 问题场景:evidenceQuestions本身是对象,但内部属性如difficulty可能是被序列化的字符串
     * 例如: { difficulty: "{\"value\":\"beginner\"}" } 需要递归解析
     *
     * @param value - 可能是对象、数组或JSON字符串
     * @param fieldName - 字段名称,用于日志
     * @param depth - 当前递归深度
     * @returns 完全解析后的JavaScript对象/数组
     */
    const deepParseJSON = (value: any, fieldName: string, depth: number = 0): any => {
      if (!value || depth > 10) return value; // 防止无限递归

      // 如果是字符串,尝试解析
      if (typeof value === 'string') {
        // 检查是否看起来像JSON
        const trimmed = value.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          console.warn(`⚠️ [deepParseJSON] ${fieldName}(深度${depth})是JSON字符串，解析中...`, trimmed.substring(0, 80));
          try {
            const parsed = JSON.parse(value);
            // 递归解析结果(可能还有嵌套的序列化)
            return deepParseJSON(parsed, fieldName, depth + 1);
          } catch (e) {
            console.error(`❌ [deepParseJSON] 解析${fieldName}失败:`, e);
            return value; // 解析失败,返回原字符串
          }
        }
        return value; // 普通字符串,不需要解析
      }

      // 如果是数组,递归处理每个元素
      if (Array.isArray(value)) {
        return value.map((item, index) =>
          deepParseJSON(item, `${fieldName}[${index}]`, depth + 1)
        );
      }

      // 如果是对象,递归处理每个属性
      if (typeof value === 'object' && value !== null) {
        const result: any = {};
        for (const [key, val] of Object.entries(value)) {
          result[key] = deepParseJSON(val, `${fieldName}.${key}`, depth + 1);
        }
        return result;
      }

      // 其他类型(number, boolean, null等),直接返回
      return value;
    };

    /**
     * 🛡️ 防御性解析函数 - 使用深度解析处理双重JSON序列化
     * 这是所有JSONB字段的安全入口,确保无论数据经过多少次序列化,都能正确解析
     */
    const safeParseJSON = (value: any, fieldName: string) => {
      if (!value) return null;
      const result = deepParseJSON(value, fieldName, 0);
      console.log(`✅ [safeParseJSON] ${fieldName}深度解析完成`);
      return result;
    };

    // 🔍 全面检查所有JSONB字段的类型
    console.log('🔍 [buildColumnPayload] 所有字段类型检查:', {
      // Act1字段
      act1BasicInfoType: typeof act1?.basicInfo,
      act1BasicInfoIsString: typeof act1?.basicInfo === 'string',
      act1FactsType: typeof act1?.facts,
      act1FactsIsString: typeof act1?.facts === 'string',
      act1EvidenceType: typeof act1?.evidence,
      act1EvidenceIsString: typeof act1?.evidence === 'string',
      act1ReasoningType: typeof act1?.reasoning,
      act1ReasoningIsString: typeof act1?.reasoning === 'string',
      act1MetadataType: typeof act1?.metadata,
      act1MetadataIsString: typeof act1?.metadata === 'string',
      // Act2字段（关键！）
      act2NarrativeType: typeof act2?.narrative,
      act2NarrativeIsString: typeof act2?.narrative === 'string',
      act2TimelineType: typeof act2?.timelineAnalysis,
      act2TimelineIsString: typeof act2?.timelineAnalysis === 'string',
      act2EvidenceQuestionsType: typeof act2?.evidenceQuestions,
      act2EvidenceQuestionsIsString: typeof act2?.evidenceQuestions === 'string',  // ⚠️ 疑点
      act2ClaimAnalysisType: typeof act2?.claimAnalysis,
      act2ClaimAnalysisIsString: typeof act2?.claimAnalysis === 'string',
      // Act3字段（关键！）
      act3Type: typeof act3,
      act3IsString: typeof act3 === 'string',  // ⚠️ 疑点
      // Act4字段
      act4LearningReportType: typeof act4?.learningReport,
      act4LearningReportIsString: typeof act4?.learningReport === 'string',
      act4PptMetadataType: typeof act4?.pptMetadata,
      act4PptMetadataIsString: typeof act4?.pptMetadata === 'string',
    });

    // 🔍 深度检查：打印act2EvidenceQuestions的实际内容（前200字符）
    if (act2?.evidenceQuestions) {
      const evidQStr = JSON.stringify(act2.evidenceQuestions);
      console.log('🔍 [buildColumnPayload] act2EvidenceQuestions实际内容（前200字）:', evidQStr.substring(0, 200));
      console.log('🔍 [buildColumnPayload] act2EvidenceQuestions包含difficulty:', evidQStr.includes('difficulty'));
      console.log('🔍 [buildColumnPayload] act2EvidenceQuestions包含转义引号:', evidQStr.includes('\\"'));
    }

    const metadata = act1?.metadata
      ? {
          ...act1.metadata,
          originalFileName: act1.originalFileName ?? act1.metadata?.originalFileName,
          uploadedAt: act1.uploadedAt ?? act1.metadata?.uploadedAt,
        }
      : null;

    const act1ConfidenceValue =
      metadata && typeof metadata.confidence !== 'undefined'
        ? Number(metadata.confidence)
        : null;

    if (metadata && typeof act1ConfidenceValue === 'number' && !Number.isNaN(act1ConfidenceValue)) {
      metadata.confidence = act1ConfidenceValue;
    }

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

    // 🔧 使用safeParseJSON确保所有JSONB字段都是对象而非字符串
    const result = {
      schemaVersion: snapshot.schemaVersion,
      dataVersion: snapshot.version,
      sessionState: snapshot.sessionState,
      caseTitle: snapshot.caseTitle,
      caseNumber: snapshot.caseNumber ?? null,
      courtName: snapshot.courtName ?? null,
      // Act1 JSONB字段 - 安全解析
      act1BasicInfo: safeParseJSON(act1?.basicInfo, 'act1BasicInfo'),
      act1Facts: safeParseJSON(act1?.facts, 'act1Facts'),
      act1Evidence: safeParseJSON(act1?.evidence, 'act1Evidence'),
      act1Reasoning: safeParseJSON(act1?.reasoning, 'act1Reasoning'),
      act1Metadata: safeParseJSON(metadata, 'act1Metadata'),
      act1Confidence:
        typeof act1ConfidenceValue === 'number' && !Number.isNaN(act1ConfidenceValue)
          ? act1ConfidenceValue
          : null,
      act1CompletedAt:
        act1?.uploadedAt ||
        act1?.metadata?.uploadedAt ||
        act1?.metadata?.extractedAt ||
        null,
      // Act2 JSONB字段 - 安全解析（关键！）
      act2Narrative: safeParseJSON(act2?.narrative, 'act2Narrative'),
      act2TimelineAnalysis: safeParseJSON(act2?.timelineAnalysis, 'act2TimelineAnalysis'),
      act2EvidenceQuestions: safeParseJSON(act2?.evidenceQuestions, 'act2EvidenceQuestions'),  // ⚠️ "difficulty"可能在这里
      act2ClaimAnalysis: safeParseJSON(act2?.claimAnalysis, 'act2ClaimAnalysis'),
      act2CompletedAt: act2?.completedAt ?? null,
      // Act3 JSONB字段 - 安全解析（关键！）
      act3Socratic: safeParseJSON(act3Payload, 'act3Socratic'),  // ⚠️ "difficulty"也可能在这里
      act3CompletedAt: act3?.completedAt ?? null,
      // Act4 JSONB字段 - 安全解析
      act4LearningReport: safeParseJSON(act4?.learningReport, 'act4LearningReport'),
      act4PptUrl: act4?.pptUrl ?? null,
      act4PptMetadata: safeParseJSON(act4?.pptMetadata, 'act4PptMetadata'),
      act4CompletedAt: act4?.completedAt ?? null,
      // 时间戳字段
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
      completedAt,
      lastSavedAt: snapshot.lastSavedAt ?? snapshot.updatedAt,
      saveType: snapshot.saveType ?? 'manual',
    };

    // 🔍 关键诊断：打印最终返回值的类型（在返回给pool.query之前）
    console.log('🎯 [buildColumnPayload] 最终返回值类型检查:', {
      act2EvidenceQuestionsType: typeof result.act2EvidenceQuestions,
      act2EvidenceQuestionsIsString: typeof result.act2EvidenceQuestions === 'string',
      act2EvidenceQuestionsPreview: result.act2EvidenceQuestions
        ? JSON.stringify(result.act2EvidenceQuestions).substring(0, 100)
        : 'null',
    });

    return result;
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
