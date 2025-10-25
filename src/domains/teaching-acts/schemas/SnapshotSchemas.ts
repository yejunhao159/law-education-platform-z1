/**
 * 教学会话快照Schema定义
 * 使用Zod进行运行时验证，确保数据完整性
 * DeepPractice Standards Compliant
 */

import { z } from 'zod';

// ========== 基础Schema导入 ==========
// 从legal-case导入基础Schema（需要确保这些Schema存在）
// 如果不存在，我们在这里定义完整版本

// ========== 第一幕：案例导入 Schema ==========

/**
 * 基本信息Schema
 */
export const BasicInfoSnapshotSchema = z.object({
  caseNumber: z.string().optional(),
  court: z.string().optional(),
  judgeDate: z.string().optional(),
  caseType: z.string().optional(),
  level: z.string().optional(),
  nature: z.string().optional(),
  parties: z.object({
    plaintiff: z.array(z.string()).optional(),
    defendant: z.array(z.string()).optional(),
  }).optional(),
});

/**
 * 时间线事件Schema
 */
export const TimelineEventSnapshotSchema = z.object({
  date: z.string(),
  event: z.string(),
  description: z.string().optional(),
  importance: z.enum(['critical', 'important', 'normal']).optional(),
  category: z.string().optional(),
});

/**
 * 事实认定Schema
 */
export const FactsSnapshotSchema = z.object({
  summary: z.string(),
  timeline: z.array(TimelineEventSnapshotSchema).optional(),
  keyFacts: z.array(z.string()).optional(),
  disputedFacts: z.array(z.string()).optional(),
});

/**
 * 证据项Schema
 * 🔧 修复：与 legal-case.ts 的 EvidenceItemSchema 保持一致
 */
export const EvidenceItemSnapshotSchema = z.object({
  id: z.string().optional(),
  name: z.string(),  // ✅ 添加：证据名称
  type: z.enum(['documentary', 'testimonial', 'physical', 'expert']),
  submittedBy: z.enum(['plaintiff', 'defendant', 'third-party', 'court']).optional(),  // ✅ 添加：提交方（英文枚举）
  description: z.string().optional(),
  credibilityScore: z.number().min(0).max(100).optional(),  // 保留旧字段用于兼容
  relevanceScore: z.number().min(0).max(100).optional(),    // 保留旧字段用于兼容
  accepted: z.boolean(),  // ✅ 添加：是否采纳
  courtOpinion: z.string().optional(),  // ✅ 添加：法院意见
  relatedFacts: z.array(z.string()).optional(),  // ✅ 添加：相关事实
  // 保留旧字段用于向后兼容
  source: z.string().optional(),
  relevance: z.string().optional(),
  credibility: z.enum(['high', 'medium', 'low']).optional(),
  party: z.enum(['plaintiff', 'defendant', 'court']).optional(),
});

/**
 * 证据分析Schema
 */
export const EvidenceSnapshotSchema = z.object({
  summary: z.string(),
  items: z.array(EvidenceItemSnapshotSchema).optional(),
  chainAnalysis: z.object({
    complete: z.boolean(),
    missingLinks: z.array(z.string()).optional(),
    strength: z.enum(['strong', 'moderate', 'weak']),
  }).optional(),
});

/**
 * 法官说理Schema
 */
export const ReasoningSnapshotSchema = z.object({
  summary: z.string(),
  legalBasis: z.array(z.object({
    law: z.string(),
    article: z.string(),
    clause: z.string().optional(),  // ✅ 添加：条款号
    content: z.string().optional(),  // ✅ 法条完整内容
    source: z.enum(['判决书原文', 'AI补充', '待核实']).optional(),  // ✅ 添加：法条来源
    application: z.string().optional(),  // 添加application字段（与LegalCase一致）
    interpretation: z.string().optional(),  // ✅ 添加：法条解释
  })).optional(),
  // 🔧 修复：logicChain应该是对象数组，不是字符串数组
  logicChain: z.array(z.object({
    premise: z.string(),
    inference: z.string(),
    conclusion: z.string(),
    supportingEvidence: z.array(z.string()).optional(),
  })).optional(),
  keyArguments: z.array(z.string()).optional(),  // 添加keyArguments字段
  judgment: z.string().optional(),  // 添加judgment字段
  strength: z.enum(['strong', 'moderate', 'weak']).optional(),
});

/**
 * 提取元数据Schema
 */
export const MetadataSnapshotSchema = z.object({
  extractedAt: z.string().datetime(),
  confidence: z.number().min(0).max(1),
  processingTime: z.number(),
  aiModel: z.string(),
  extractionMethod: z.enum(['ai', 'rule', 'hybrid', 'manual']).optional(),
});

/**
 * 第一幕完整快照Schema
 * 对应JudgmentExtractedData
 */
export const Act1SnapshotSchema = z.object({
  basicInfo: BasicInfoSnapshotSchema,
  facts: FactsSnapshotSchema,
  evidence: EvidenceSnapshotSchema,
  reasoning: ReasoningSnapshotSchema,
  metadata: MetadataSnapshotSchema,
  originalFileName: z.string().optional(),
  uploadedAt: z.string().datetime(),
});

// ========== 第二幕：深度分析 Schema ==========

/**
 * 故事章节Schema
 */
export const StoryChapterSnapshotSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  icon: z.string().optional(),
  color: z.string().optional(),
  order: z.number(),
});

/**
 * AI叙事Schema
 */
export const NarrativeSnapshotSchema = z.object({
  chapters: z.array(StoryChapterSnapshotSchema),
  generatedAt: z.string().datetime(),
  fallbackUsed: z.boolean().optional(),
  errorMessage: z.string().optional(),
});

/**
 * 时间轴分析Schema
 * 保存完整的TimelineAnalysis结果
 */
export const TimelineAnalysisSnapshotSchema = z.object({
  // 转折点分析
  turningPoints: z.array(z.object({
    id: z.string(),
    date: z.string(),
    event: z.string(),
    description: z.string().optional(),
    impact: z.enum(['major', 'moderate', 'minor']),
    perspective: z.enum(['plaintiff', 'defendant', 'court']).optional(),
  })).optional(),

  // 时间线视图数据
  timeline: z.array(TimelineEventSnapshotSchema).optional(),

  // 分析元数据
  metadata: z.object({
    analyzedAt: z.string().datetime().optional(),
    confidence: z.number().optional(),
    method: z.string().optional(),
  }).optional(),

  // 其他时间线相关数据
  additionalData: z.record(z.unknown()).optional(),
}).passthrough();  // ⭐ 添加 passthrough() 允许AI生成的额外字段（如legalRisks, summary等）不被过滤

/**
 * 证据学习问题Schema
 */
export const EvidenceQuestionSnapshotSchema = z.object({
  id: z.string(),
  evidenceId: z.string(),
  question: z.string(),
  questionType: z.enum(['type', 'burden', 'relevance', 'admissibility', 'strength']),
  options: z.array(z.string()),
  correctAnswer: z.number(),
  explanation: z.string(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  points: z.number().optional(),
});

/**
 * 请求权分析Schema
 * 匹配ClaimAnalysisResult的实际结构
 */
export const ClaimAnalysisSnapshotSchema = z.object({
  id: z.string().optional(),
  timestamp: z.string().optional(),
  caseId: z.string().optional(),

  // claims是对象，包含primary/alternative/defense三个数组
  claims: z.object({
    primary: z.array(z.any()).optional(),      // 主要请求权
    alternative: z.array(z.any()).optional(),  // 备选请求权
    defense: z.array(z.any()).optional(),      // 抗辩事由
  }).optional(),

  // 时间维度分析
  timeline: z.object({
    keyPoints: z.array(z.any()).optional(),
    limitations: z.array(z.any()).optional(),
    sequence: z.array(z.string()).optional(),
  }).optional(),

  // 法律关系图谱
  legalRelations: z.array(z.any()).optional(),

  // 举证责任分配
  burdenOfProof: z.array(z.any()).optional(),

  // 策略建议（可能是字符串数组或对象数组）
  strategy: z.object({
    recommendations: z.array(z.any()).optional(),  // 兼容字符串或对象
    risks: z.array(z.any()).optional(),
    opportunities: z.array(z.any()).optional(),
  }).optional(),

  // AI分析元数据
  metadata: z.object({
    model: z.string().optional(),
    confidence: z.number().optional(),
    processingTime: z.number().optional(),
    tokensUsed: z.number().optional(),
  }).optional(),
}).passthrough();  // ⭐ 允许额外字段通过

/**
 * 第二幕完整快照Schema
 */
export const Act2SnapshotSchema = z.object({
  narrative: NarrativeSnapshotSchema.optional(),
  timelineAnalysis: TimelineAnalysisSnapshotSchema.optional(),
  evidenceQuestions: z.array(EvidenceQuestionSnapshotSchema).optional(),
  claimAnalysis: ClaimAnalysisSnapshotSchema.optional(),
  completedAt: z.string().datetime(),
});

// ========== 第三幕：苏格拉底对话 Schema ==========

/**
 * 第三幕完整快照Schema
 */
export const Act3SnapshotSchema = z.object({
  level: z.number().min(1).max(3),
  completedNodes: z.array(z.string()),
  totalRounds: z.number(),
  dialogueHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    timestamp: z.string().datetime(),
  })).optional(),
  completedAt: z.string().datetime(),
});

// ========== 第四幕：总结提升 Schema ==========

/**
 * 学习报告Schema
 */
export const LearningReportSnapshotSchema = z.object({
  summary: z.string(),
  keyLearnings: z.array(z.string()),
  skillsAssessed: z.array(z.object({
    skill: z.string(),
    level: z.enum(['novice', 'intermediate', 'advanced']),
    evidence: z.array(z.string()),
  })),
  recommendations: z.array(z.string()),
  nextSteps: z.array(z.string()),
  generatedAt: z.string().datetime(),
  // ✨ 新增：完整保存原始 CaseLearningReport（用于恢复完整数据结构）
  _fullReport: z.any().optional(),
});

/**
 * PPT元数据Schema
 */
export const PPTMetadataSnapshotSchema = z.object({
  generatedAt: z.string().datetime(),
  slideCount: z.number().optional(),
  fileSize: z.number().optional(),
  format: z.string().optional(),
});

/**
 * 第四幕完整快照Schema
 */
export const Act4SnapshotSchema = z.object({
  learningReport: LearningReportSnapshotSchema,
  pptUrl: z.string().url().optional(),
  pptMetadata: PPTMetadataSnapshotSchema.optional(),
  completedAt: z.string().datetime(),
});

// ========== 顶层快照Schema ==========

/**
 * 会话状态枚举
 */
export const SessionStateSchema = z.enum([
  'act1',      // 第一幕进行中
  'act2',      // 第二幕进行中
  'act3',      // 第三幕进行中
  'act4',      // 第四幕进行中
  'completed', // 全部完成
]);

/**
 * 教学会话完整快照Schema V1
 */
export const TeachingSessionSnapshotSchemaV1 = z.object({
  // 版本控制
  version: z.literal('1.0.0'),
  schemaVersion: z.literal(1),

  // 会话状态
  sessionState: SessionStateSchema,

  // 案例元数据
  caseTitle: z.string().min(1, '案例标题不能为空'),
  caseNumber: z.string().optional(),
  courtName: z.string().optional(),

  // 各幕数据
  act1: Act1SnapshotSchema,
  act2: Act2SnapshotSchema.optional(),
  act3: Act3SnapshotSchema.nullable().optional(), // Act3不持久化，允许null
  act4: Act4SnapshotSchema.optional(),

  // 时间戳
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastSavedAt: z.string().datetime().optional(),

  // 保存类型
  saveType: z.enum(['manual', 'auto']).optional(),
});

// ========== 类型导出 ==========
export type Act1Snapshot = z.infer<typeof Act1SnapshotSchema>;
export type Act2Snapshot = z.infer<typeof Act2SnapshotSchema>;
export type Act3Snapshot = z.infer<typeof Act3SnapshotSchema>;
export type Act4Snapshot = z.infer<typeof Act4SnapshotSchema>;
export type TeachingSessionSnapshotV1 = z.infer<typeof TeachingSessionSnapshotSchemaV1>;
export type SessionState = z.infer<typeof SessionStateSchema>;

// ========== 验证工具函数 ==========

/**
 * 验证Act1数据
 */
export function validateAct1Snapshot(data: unknown): {
  success: boolean;
  data?: Act1Snapshot;
  error?: z.ZodError;
} {
  const result = Act1SnapshotSchema.safeParse(data);
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    error: !result.success ? result.error : undefined,
  };
}

/**
 * 验证Act2数据
 */
export function validateAct2Snapshot(data: unknown): {
  success: boolean;
  data?: Act2Snapshot;
  error?: z.ZodError;
} {
  const result = Act2SnapshotSchema.safeParse(data);
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    error: !result.success ? result.error : undefined,
  };
}

/**
 * 验证完整快照
 */
export function validateTeachingSessionSnapshot(data: unknown): {
  success: boolean;
  data?: TeachingSessionSnapshotV1;
  error?: z.ZodError;
} {
  const result = TeachingSessionSnapshotSchemaV1.safeParse(data);
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    error: !result.success ? result.error : undefined,
  };
}

/**
 * 获取验证错误的友好提示
 */
export function getValidationErrorMessage(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join('.');
    return `${path}: ${issue.message}`;
  });
  return issues.join('; ');
}

// =============================================================================
// 快照系统 V2 Schema (Snapshot System V2)
// 支持版本管理、课堂模式、对话流水分离
// Spec: specs/001-teaching-session-storage/spec.md
// =============================================================================

/**
 * 快照状态枚举
 * 状态生命周期: draft → ready_for_class → classroom_ready → archived
 */
export const SnapshotStatusSchema = z.enum([
  'draft',              // 草稿状态
  'ready_for_class',    // 准备就绪,可供发布
  'classroom_ready',    // 已发布课堂版,锁定只读
  'archived',           // 已归档
]);

export type SnapshotStatus = z.infer<typeof SnapshotStatusSchema>;

/**
 * 快照封装 (Snapshot Envelope)
 * 顶层对象,包含版本、锁定、审计等元数据
 */
export const SnapshotEnvelopeSchema = z.object({
  // 版本标识
  versionId: z.string().uuid(),
  sessionId: z.string().uuid(),
  userId: z.string().min(1),
  organizationId: z.string().default('default-org'),

  // 版本元数据
  versionTag: z.string().default('draft'),
  status: SnapshotStatusSchema,
  classroomReady: z.boolean(),

  // 锁定机制
  lockedAt: z.string().datetime().optional().nullable(),
  lockedBy: z.string().optional().nullable(),

  // 审计追踪
  sourceService: z.string().min(1),
  requestId: z.string().min(1),
  traceId: z.string().optional(),

  // Schema版本
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/).default('1.0.0'),
  dataVersion: z.string().regex(/^\d+\.\d+\.\d+$/).default('1.0.0'),

  // 四幕快照 (JSONB字段)
  act1CaseSnapshot: Act1SnapshotSchema.nullable().optional(),
  act2AnalysisSnapshot: Act2SnapshotSchema.nullable().optional(),
  act3DialogueSnapshot: z.object({
    totalTurns: z.number().int().min(0).default(0),
    studentParticipation: z.number().min(0).max(100).default(0),
    startedAt: z.string().datetime().optional(),
    endedAt: z.string().datetime().optional(),
    latestTurnId: z.string().uuid().optional(),
  }).nullable().optional(),
  act4SummarySnapshot: Act4SnapshotSchema.nullable().optional(),

  // 时间戳
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

export type SnapshotEnvelope = z.infer<typeof SnapshotEnvelopeSchema>;

/**
 * Act3快照摘要 (不包含完整对话,对话在独立表中)
 */
export const Act3SnapshotSummarySchema = z.object({
  totalTurns: z.number().int().min(0),
  studentParticipation: z.number().min(0).max(100),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  latestTurnId: z.string().uuid().optional(),
});

export type Act3SnapshotSummary = z.infer<typeof Act3SnapshotSummarySchema>;

/**
 * 苏格拉底对话轮次 (Socratic Turn)
 * 存储在teaching_session_dialogues表中
 */
export const SocraticTurnSchema = z.object({
  // 主键
  turnId: z.string().uuid(),

  // 关联
  sessionId: z.string().uuid(),
  versionId: z.string().uuid(),

  // 排序
  turnIndex: z.number().int().min(0),
  chunkIndex: z.number().int().min(0).default(0),

  // 内容
  speaker: z.enum(['teacher', 'student', 'assistant']),
  message: z.string().min(1),

  // 审计追踪
  sourceService: z.string().min(1),
  requestId: z.string().min(1),
  traceId: z.string().optional(),

  // 时间戳
  streamedAt: z.string().datetime(),
});

export type SocraticTurn = z.infer<typeof SocraticTurnSchema>;

// =============================================================================
// V2 验证工具函数
// =============================================================================

/**
 * 验证快照封装
 */
export function validateSnapshotEnvelope(data: unknown): {
  success: boolean;
  data?: SnapshotEnvelope;
  error?: z.ZodError;
} {
  const result = SnapshotEnvelopeSchema.safeParse(data);
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    error: !result.success ? result.error : undefined,
  };
}

/**
 * 验证对话轮次
 */
export function validateSocraticTurn(data: unknown): {
  success: boolean;
  data?: SocraticTurn;
  error?: z.ZodError;
} {
  const result = SocraticTurnSchema.safeParse(data);
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    error: !result.success ? result.error : undefined,
  };
}

/**
 * 检查快照是否锁定(课堂模式)
 */
export function isSnapshotLocked(snapshot: SnapshotEnvelope): boolean {
  return snapshot.classroomReady === true && snapshot.lockedAt !== null && snapshot.lockedAt !== undefined;
}

/**
 * 检查快照是否可编辑
 */
export function isSnapshotEditable(snapshot: SnapshotEnvelope): boolean {
  return !isSnapshotLocked(snapshot) && snapshot.status !== 'archived';
}
