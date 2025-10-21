-- ============================================
-- 教学会话数据库Schema V2（优化版）
-- 设计理念：
-- 1. 结构化JSONB存储（分层明确）
-- 2. 版本控制（支持向后兼容）
-- 3. 状态机管理（明确会话状态）
-- 4. 性能优化（索引优化、字段分离）
-- ============================================

-- ========== 核心表：teaching_sessions_v2 ==========
CREATE TABLE IF NOT EXISTS teaching_sessions_v2 (
  -- 主键和用户关联
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL,

  -- 版本控制（关键字段）
  schema_version INTEGER NOT NULL DEFAULT 1,
  data_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',

  -- 会话状态（状态机）
  session_state VARCHAR(20) NOT NULL DEFAULT 'act1',
  -- 可选值: 'act1', 'act2', 'act3', 'act4', 'completed'

  -- 案例元数据（常用查询字段，从JSONB提升到顶层）
  case_title VARCHAR(500) NOT NULL,
  case_number VARCHAR(200),
  court_name VARCHAR(200),

  -- ========== 第一幕：案例导入（结构化存储） ==========
  act1_basic_info JSONB,
  -- 存储结构: { caseNumber, court, judgeDate, parties: {plaintiff[], defendant[]} }

  act1_facts JSONB,
  -- 存储结构: { summary, timeline[], keyFacts[], disputedFacts[] }

  act1_evidence JSONB,
  -- 存储结构: { summary, items[], chainAnalysis }

  act1_reasoning JSONB,
  -- 存储结构: { summary, legalBasis[], logicChain[], strength }

  act1_metadata JSONB,
  -- 存储结构: { extractedAt, confidence, processingTime, aiModel, extractionMethod }

  act1_confidence DECIMAL(3,2),
  -- 0.00 - 1.00，提升到顶层便于筛选高质量案例

  act1_completed_at TIMESTAMP,

  -- ========== 第二幕：深度分析（结构化存储） ==========
  act2_narrative JSONB,
  -- 存储结构: { chapters: [{ id, title, content, icon, color, order }], generatedAt, fallbackUsed }

  act2_timeline_analysis JSONB,
  -- 存储结构: { turningPoints[], timeline[], metadata }
  -- 关键字段！时间轴分析的完整数据

  act2_evidence_questions JSONB,
  -- 存储结构: [{ id, evidenceId, question, questionType, options[], correctAnswer, explanation }]

  act2_claim_analysis JSONB,
  -- 存储结构: { claims[], defenses[], strategy }

  act2_completed_at TIMESTAMP,

  -- ========== 第三幕：苏格拉底对话 ==========
  act3_socratic JSONB,
  -- 存储结构: { level, completedNodes[], totalRounds, dialogueHistory[] }

  act3_completed_at TIMESTAMP,

  -- ========== 第四幕：总结提升 ==========
  act4_learning_report JSONB,
  -- 存储结构: { summary, keyLearnings[], skillsAssessed[], recommendations[], nextSteps[] }

  act4_ppt_url TEXT,
  -- 提升到顶层，方便查询"有PPT的会话"

  act4_ppt_metadata JSONB,
  -- 存储结构: { generatedAt, slideCount, fileSize, format }

  act4_completed_at TIMESTAMP,

  -- ========== 时间戳 ==========
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_saved_at TIMESTAMP,
  completed_at TIMESTAMP,
  last_viewed_at TIMESTAMP,

  -- ========== 保存类型 ==========
  save_type VARCHAR(20) DEFAULT 'manual',
  -- 可选值: 'manual', 'auto'

  -- ========== 软删除 ==========
  deleted_at TIMESTAMP,

  -- ========== 约束 ==========
  CONSTRAINT valid_session_state CHECK (
    session_state IN ('act1', 'act2', 'act3', 'act4', 'completed')
  ),
  CONSTRAINT valid_save_type CHECK (
    save_type IN ('manual', 'auto')
  ),
  CONSTRAINT valid_confidence CHECK (
    act1_confidence IS NULL OR (act1_confidence >= 0 AND act1_confidence <= 1)
  )
);

-- ========== 索引优化 ==========

-- 用户查询索引（最常用）
CREATE INDEX idx_sessions_v2_user_created ON teaching_sessions_v2 (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- 状态查询索引
CREATE INDEX idx_sessions_v2_state ON teaching_sessions_v2 (session_state)
  WHERE deleted_at IS NULL;

-- 版本查询索引（用于数据迁移）
CREATE INDEX idx_sessions_v2_version ON teaching_sessions_v2 (schema_version, data_version);

-- 案例搜索索引（GIN索引支持全文搜索）
CREATE INDEX idx_sessions_v2_case_search ON teaching_sessions_v2
  USING gin(to_tsvector('simple', case_title || ' ' || COALESCE(case_number, '') || ' ' || COALESCE(court_name, '')))
  WHERE deleted_at IS NULL;

-- 时间范围查询索引
CREATE INDEX idx_sessions_v2_completed ON teaching_sessions_v2 (completed_at DESC)
  WHERE deleted_at IS NULL AND completed_at IS NOT NULL;

-- PPT查询索引
CREATE INDEX idx_sessions_v2_has_ppt ON teaching_sessions_v2 (user_id, act4_ppt_url)
  WHERE deleted_at IS NULL AND act4_ppt_url IS NOT NULL;

-- ========== 触发器：自动更新updated_at ==========
CREATE OR REPLACE FUNCTION update_teaching_sessions_v2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_teaching_sessions_v2_updated_at
  BEFORE UPDATE ON teaching_sessions_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_teaching_sessions_v2_updated_at();

-- ========== 视图：简化查询 ==========

-- 会话列表视图（只包含列表需要的字段）
CREATE OR REPLACE VIEW teaching_sessions_list_v2 AS
SELECT
  id,
  user_id,
  case_title,
  case_number,
  court_name,
  session_state,
  act1_confidence,
  act1_metadata->>'originalFileName' as original_file_name,
  act4_ppt_url,
  created_at,
  last_viewed_at,
  completed_at,
  save_type
FROM teaching_sessions_v2
WHERE deleted_at IS NULL;

-- 已完成会话视图
CREATE OR REPLACE VIEW teaching_sessions_completed_v2 AS
SELECT *
FROM teaching_sessions_v2
WHERE session_state = 'completed'
  AND deleted_at IS NULL
ORDER BY completed_at DESC;

-- ========== 注释 ==========
COMMENT ON TABLE teaching_sessions_v2 IS '教学会话快照表V2 - 优化后的结构化存储';
COMMENT ON COLUMN teaching_sessions_v2.schema_version IS '数据库Schema版本号，用于向后兼容';
COMMENT ON COLUMN teaching_sessions_v2.data_version IS '数据格式版本号（语义化版本）';
COMMENT ON COLUMN teaching_sessions_v2.session_state IS '会话状态：act1(第一幕) | act2(第二幕) | act3(第三幕) | act4(第四幕) | completed(已完成)';
COMMENT ON COLUMN teaching_sessions_v2.act2_timeline_analysis IS '【关键】时间轴分析完整数据，恢复时需要同步到useAnalysisStore';
COMMENT ON COLUMN teaching_sessions_v2.save_type IS '保存类型：manual(手动保存) | auto(自动保存)';

-- ========== 数据迁移函数（从V1迁移到V2） ==========
CREATE OR REPLACE FUNCTION migrate_teaching_session_v1_to_v2()
RETURNS TABLE (
  migrated_count INTEGER,
  error_count INTEGER,
  errors TEXT[]
) AS $$
DECLARE
  v_migrated_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_session RECORD;
BEGIN
  -- 假设旧表名为 teaching_sessions
  FOR v_session IN
    SELECT * FROM teaching_sessions
  LOOP
    BEGIN
      INSERT INTO teaching_sessions_v2 (
        id,
        user_id,
        schema_version,
        data_version,
        session_state,
        case_title,
        case_number,
        court_name,

        -- 迁移第一幕数据（从旧JSONB拆分）
        act1_basic_info,
        act1_facts,
        act1_evidence,
        act1_reasoning,
        act1_metadata,
        act1_confidence,

        -- 迁移第二幕数据（从旧JSONB拆分）
        act2_narrative,
        act2_timeline_analysis,
        act2_evidence_questions,
        act2_claim_analysis,

        -- 迁移第三幕数据
        act3_socratic,

        -- 迁移第四幕数据
        act4_learning_report,
        act4_ppt_url,
        act4_ppt_metadata,

        -- 时间戳
        created_at,
        updated_at,
        completed_at,
        last_viewed_at,

        save_type
      )
      VALUES (
        v_session.id,
        v_session.user_id,
        1,  -- schema_version
        '1.0.0',  -- data_version
        COALESCE(v_session.current_act, 'act1'),
        v_session.case_title,
        v_session.case_number,
        v_session.court_name,

        -- 第一幕数据拆分
        (v_session.act1_upload->'extractedElements'->'basicInfo')::JSONB,
        (v_session.act1_upload->'extractedElements'->'facts')::JSONB,
        (v_session.act1_upload->'extractedElements'->'evidence')::JSONB,
        (v_session.act1_upload->'extractedElements'->'reasoning')::JSONB,
        (v_session.act1_upload->'extractedElements'->'metadata')::JSONB,
        (v_session.act1_upload->>'confidence')::DECIMAL,

        -- 第二幕数据拆分
        (v_session.act2_analysis->'result'->'narrative')::JSONB,
        (v_session.act2_analysis->'result'->'timelineAnalysis')::JSONB,
        (v_session.act2_analysis->'result'->'evidenceQuestions')::JSONB,
        (v_session.act2_analysis->'result'->'claimAnalysis')::JSONB,

        -- 第三幕数据
        v_session.act3_socratic::JSONB,

        -- 第四幕数据
        (v_session.act4_summary->'learningReport')::JSONB,
        v_session.act4_summary->>'pptUrl',
        (v_session.act4_summary->'pptMetadata')::JSONB,

        -- 时间戳
        v_session.created_at,
        v_session.updated_at,
        v_session.completed_at,
        v_session.last_viewed_at,

        'manual'  -- save_type默认为手动
      );

      v_migrated_count := v_migrated_count + 1;

    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      v_errors := array_append(v_errors,
        format('Session %s: %s', v_session.id, SQLERRM)
      );
    END;
  END LOOP;

  RETURN QUERY SELECT v_migrated_count, v_error_count, v_errors;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION migrate_teaching_session_v1_to_v2() IS '
从V1表结构迁移到V2表结构
返回：迁移成功数量、失败数量、错误信息列表

使用方法:
SELECT * FROM migrate_teaching_session_v1_to_v2();
';
