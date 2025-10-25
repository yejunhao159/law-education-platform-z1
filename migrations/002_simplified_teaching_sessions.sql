-- Migration: 002_simplified_teaching_sessions.sql
-- Purpose: 简化教学会话表设计，只存储Act1/2/4，Act3不持久化
-- Date: 2025-10-24
-- Based on: 用户流程图 + 实际需求分析

-- =============================================================================
-- 删除旧的复杂表结构
-- =============================================================================

-- 删除旧的快照系统表（太复杂，用不上版本控制）
DROP TABLE IF EXISTS teaching_session_dialogues CASCADE;
DROP TABLE IF EXISTS teaching_session_snapshots CASCADE;

-- =============================================================================
-- 创建简化的教学会话表
-- =============================================================================

CREATE TABLE IF NOT EXISTS teaching_sessions (
  -- ========== 主键 ==========
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ========== 基本信息 ==========
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 从Act1提取的关键信息（用于列表展示）
  case_title VARCHAR(500) NOT NULL,           -- 案例标题
  case_number VARCHAR(200),                   -- 案号，如"(2023)京01民终1234号"
  court_name VARCHAR(200),                    -- 法院名称

  -- ========== 当前状态 ==========
  current_act VARCHAR(10) NOT NULL DEFAULT 'act1'
    CHECK (current_act IN ('act1', 'act2', 'act3', 'act4', 'completed')),

  -- ========== 四幕数据（JSONB格式）==========

  -- 第一幕：案例导入
  act1_data JSONB,

  -- 第二幕：深度分析
  act2_data JSONB,

  -- 第三幕：苏格拉底讨论
  -- ⚠️ 注意：Act3不需要持久化存储！
  -- 对话只在前端实时进行，不存数据库
  -- act3_data JSONB,  -- 已删除

  -- 第四幕：总结提升
  act4_data JSONB,

  -- ========== 时间戳 ==========
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ                      -- 软删除标记
);

-- =============================================================================
-- 索引设计（基于真实查询需求）
-- =============================================================================

-- 索引1：用户查询自己的教案列表（最常用）
-- 查询: SELECT * FROM teaching_sessions WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC
CREATE INDEX idx_sessions_user_created
  ON teaching_sessions(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- 索引2：按状态筛选（次常用）
-- 查询: SELECT * FROM teaching_sessions WHERE user_id = ? AND current_act = 'act2'
CREATE INDEX idx_sessions_user_act
  ON teaching_sessions(user_id, current_act)
  WHERE deleted_at IS NULL;

-- 索引3：全文搜索案例标题和案号（偶尔用）
-- 查询: SELECT * FROM teaching_sessions WHERE case_title ILIKE '%合同%'
CREATE INDEX idx_sessions_search
  ON teaching_sessions USING gin(
    to_tsvector('simple', coalesce(case_title, '') || ' ' || coalesce(case_number, ''))
  )
  WHERE deleted_at IS NULL;

-- =============================================================================
-- 触发器：自动更新 updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_teaching_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_teaching_sessions_updated_at ON teaching_sessions;
CREATE TRIGGER trigger_update_teaching_sessions_updated_at
  BEFORE UPDATE ON teaching_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_teaching_sessions_updated_at();

-- =============================================================================
-- 字段注释（完整的中文说明）
-- =============================================================================

COMMENT ON TABLE teaching_sessions IS '教学会话表 - 存储老师的四幕教学数据（Act1/2/4，Act3不持久化）';

COMMENT ON COLUMN teaching_sessions.id IS '会话ID（UUID主键）';
COMMENT ON COLUMN teaching_sessions.user_id IS '老师ID（外键关联users表）';
COMMENT ON COLUMN teaching_sessions.case_title IS '案例标题（从Act1的当事人信息提取，用于列表展示）';
COMMENT ON COLUMN teaching_sessions.case_number IS '案号（如：(2023)京01民终1234号）';
COMMENT ON COLUMN teaching_sessions.court_name IS '法院名称（如：北京市第一中级人民法院）';
COMMENT ON COLUMN teaching_sessions.current_act IS '当前进行到哪一幕（act1/act2/act3/act4/completed）';

-- ========== Act1 数据结构详细说明 ==========
COMMENT ON COLUMN teaching_sessions.act1_data IS '
第一幕：案例导入数据 (JSONB结构)

完整JSON Schema:
{
  "basicInfo": {                                // 基本信息
    "caseNumber": "string",                     // 案号
    "court": "string",                          // 法院
    "judgeDate": "string",                      // 裁判日期（YYYY-MM-DD）
    "caseType": "string",                       // 案件类型（民事/刑事/行政）
    "level": "string",                          // 审级（一审/二审/再审）
    "nature": "string",                         // 案由
    "parties": {                                // 当事人
      "plaintiff": ["string"],                  // 原告列表
      "defendant": ["string"]                   // 被告列表
    }
  },
  "facts": {                                    // 事实认定
    "summary": "string",                        // 事实摘要（200-500字）
    "timeline": [                               // 时间线事件数组
      {
        "date": "string",                       // 日期（YYYY-MM-DD）
        "event": "string",                      // 事件描述
        "description": "string",                // 详细说明
        "importance": "critical|important|normal", // 重要性
        "category": "string"                    // 事件类别
      }
    ],
    "keyFacts": ["string"],                     // 关键事实列表
    "disputedFacts": ["string"]                 // 争议事实列表
  },
  "evidence": {                                 // 证据清单
    "summary": "string",                        // 证据总结
    "items": [                                  // 证据项数组
      {
        "id": "string",                         // 证据ID（如：E001）
        "type": "documentary|testimonial|physical|expert", // 证据类型
        "description": "string",                // 证据描述
        "source": "string",                     // 证据来源
        "relevance": "string",                  // 关联性说明
        "credibility": "high|medium|low",       // 可信度
        "party": "plaintiff|defendant|court"    // 举证方
      }
    ],
    "chainAnalysis": {                          // 证据链分析
      "complete": false,                        // 是否完整
      "missingLinks": ["string"],               // 缺失环节
      "strength": "strong|moderate|weak"        // 证据链强度
    }
  },
  "reasoning": {                                // 法官说理
    "summary": "string",                        // 说理摘要
    "legalBasis": [                             // 法律依据数组
      {
        "law": "string",                        // 法律名称（如：合同法）
        "article": "string",                    // 法条（如：第52条）
        "content": "string",                    // 法条内容
        "application": "string"                 // 适用说明
      }
    ],
    "logicChain": [                             // 逻辑推理链
      {
        "premise": "string",                    // 前提
        "inference": "string",                  // 推理
        "conclusion": "string",                 // 结论
        "supportingEvidence": ["string"]        // 支持证据ID列表
      }
    ],
    "keyArguments": ["string"],                 // 关键论点
    "judgment": "string",                       // 裁判结果
    "strength": "strong|moderate|weak"          // 说理强度
  },
  "metadata": {                                 // 元数据
    "extractedAt": "string",                    // 提取时间（ISO 8601）
    "confidence": 0.95,                         // AI提取置信度（0-1）
    "processingTime": 1234,                     // 处理耗时（毫秒）
    "aiModel": "string",                        // AI模型名称
    "extractionMethod": "ai|rule|hybrid|manual" // 提取方法
  },
  "originalFileName": "string",                 // 原始文件名
  "uploadedAt": "string"                        // 上传时间（ISO 8601）
}

使用场景:
1. 用户上传判决书PDF
2. AI提取结构化数据
3. Schema验证通过后存入此字段
4. 前端读取渲染，用户可编辑
5. 编辑后更新此字段
6. 传递给Act2作为初始数据
';

-- ========== Act2 数据结构详细说明 ==========
COMMENT ON COLUMN teaching_sessions.act2_data IS '
第二幕：深度分析数据 (JSONB结构)

完整JSON Schema:
{
  "narrative": {                                // AI叙事
    "chapters": [                               // 章节数组
      {
        "id": "string",                         // 章节ID（如：chapter-1）
        "title": "string",                      // 章节标题
        "content": "string",                    // 章节内容（Markdown格式）
        "icon": "string",                       // 图标（可选）
        "color": "string",                      // 颜色（可选）
        "order": 1                              // 排序（从1开始）
      }
    ],
    "generatedAt": "string",                    // 生成时间（ISO 8601）
    "fallbackUsed": false,                      // 是否使用降级方案
    "errorMessage": "string"                    // 错误信息（如果有）
  },
  "timelineAnalysis": {                         // 时间轴分析
    "turningPoints": [                          // 转折点数组
      {
        "id": "string",                         // 转折点ID
        "date": "string",                       // 日期（YYYY-MM-DD）
        "event": "string",                      // 事件
        "description": "string",                // 描述
        "impact": "major|moderate|minor",       // 影响程度
        "perspective": "plaintiff|defendant|court" // 视角
      }
    ],
    "timeline": [...],                          // 完整时间线（结构同Act1.facts.timeline）
    "metadata": {
      "analyzedAt": "string",                   // 分析时间
      "confidence": 0.9,                        // 置信度
      "method": "string"                        // 分析方法
    },
    "additionalData": {}                        // 其他数据
  },
  "evidenceQuestions": [                        // 证据学习问题数组
    {
      "id": "string",                           // 问题ID
      "evidenceId": "string",                   // 关联的证据ID（来自Act1）
      "question": "string",                     // 问题文本
      "questionType": "type|burden|relevance|admissibility|strength", // 问题类型
      "options": ["A选项", "B选项", "C选项", "D选项"], // 选项数组
      "correctAnswer": 0,                       // 正确答案索引（0-based）
      "explanation": "string",                  // 答案解析
      "difficulty": "beginner|intermediate|advanced", // 难度
      "points": 10                              // 分值（可选）
    }
  ],
  "claimAnalysis": {                            // 请求权分析
    "claims": [                                 // 请求权数组
      {
        "id": "string",                         // 请求权ID
        "type": "string",                       // 请求权类型
        "party": "plaintiff|defendant",         // 主张方
        "status": "supported|rejected|partial", // 裁判结果
        "basis": ["string"],                    // 法律依据
        "facts": ["string"],                    // 事实依据
        "reasoning": "string"                   // 分析说理
      }
    ],
    "analysisAt": "string"                      // 分析时间
  },
  "completedAt": "string"                       // Act2完成时间（ISO 8601）
}

使用场景:
1. 基于Act1数据生成AI叙事
2. 进行时间轴转折点分析
3. AI生成证据学习问题
4. 进行请求权分析
5. 用户可编辑各部分内容
6. 编辑后更新此字段
7. 传递给Act4生成学习报告
';

-- ========== Act4 数据结构详细说明 ==========
COMMENT ON COLUMN teaching_sessions.act4_data IS '
第四幕：总结提升数据 (JSONB结构)

完整JSON Schema:
{
  "learningReport": {                           // 学习报告
    "summary": "string",                        // 总结（200-500字）
    "generatedAt": "string",                    // 生成时间（ISO 8601）
    "keyLearnings": [                           // 关键学习点数组
      "学习点1：...",
      "学习点2：...",
      "学习点3：..."
    ],
    "recommendations": [                        // 建议数组
      "建议1：...",
      "建议2：..."
    ],
    "skillsAssessed": [                         // 技能评估数组
      {
        "skill": "string",                      // 技能名称（如：证据分析）
        "level": "novice|intermediate|advanced", // 掌握程度
        "evidence": ["string"]                  // 评估依据
      }
    ],
    "nextSteps": [                              // 下一步建议
      "步骤1：...",
      "步骤2：..."
    ]
  },
  "pptUrl": "string",                           // PPT下载链接（可选）
  "pptMetadata": {                              // PPT元数据（可选）
    "generatedAt": "string",                    // 生成时间
    "slideCount": 20,                           // 幻灯片数量
    "fileSize": 1024000,                        // 文件大小（字节）
    "format": "pptx",                           // 文件格式
    "downloadUrl": "string"                     // 下载地址
  },
  "completedAt": "string"                       // Act4完成时间（ISO 8601）
}

使用场景:
1. 基于Act1+Act2数据生成学习报告
2. AI评估学习技能
3. 可选生成PPT
4. 用户可下载PPT
5. 标记教学会话完成
';

COMMENT ON COLUMN teaching_sessions.created_at IS '创建时间（自动生成）';
COMMENT ON COLUMN teaching_sessions.updated_at IS '最后更新时间（自动更新）';
COMMENT ON COLUMN teaching_sessions.deleted_at IS '软删除时间（NULL表示未删除）';

-- =============================================================================
-- 验证
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teaching_sessions') THEN
    RAISE EXCEPTION 'Table teaching_sessions not created';
  END IF;

  RAISE NOTICE 'Migration 002: Simplified teaching_sessions table created successfully';
END $$;
