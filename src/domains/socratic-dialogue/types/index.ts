/**
 * 苏格拉底对话域 - 统一类型定义
 * 合并了 lib/types/socratic 和 src/types/domains/socratic-dialogue
 * DeepPractice Standards Compliant
 */

import { z } from 'zod';

// ========== 基础实体Schema ==========
const BaseEntitySchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

// ========== 教学层级枚举（统一命名） ==========
// 替代原来的 SocraticDifficultyLevel 和 TeachingLevel
export const DialogueLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export type DialogueLevel = z.infer<typeof DialogueLevelSchema>;

// 向后兼容的别名
export type TeachingLevel = DialogueLevel;
export type SocraticDifficultyLevel = DialogueLevel;

// ========== 对话模式 ==========
export const DialogueModeSchema = z.enum([
  'exploration',   // 探索模式
  'analysis',      // 分析模式
  'synthesis',     // 综合模式
  'evaluation',    // 评估模式
]);
export type DialogueMode = z.infer<typeof DialogueModeSchema>;

// ========== 消息角色 ==========
export const MessageRoleSchema = z.enum(['teacher', 'ai', 'student', 'system', 'user', 'assistant']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

// ========== 对话消息 ==========
export const MessageSchema = z.object({
  id: z.string(),
  role: MessageRoleSchema,
  content: z.string(),
  timestamp: z.string().datetime(),
  level: DialogueLevelSchema.optional(),
  metadata: z.object({
    confidence: z.number().min(0).max(100).optional(),
    responseTime: z.number().optional(),
    tokens: z.number().optional(),
  }).optional(),
});
export type Message = z.infer<typeof MessageSchema>;

// ========== 结构化案例元素 ==========
export const StructuredFactSchema = z.object({
  id: z.string().or(z.number()),
  content: z.string(),
  date: z.string().optional(),
  evidence: z.array(z.string()).optional(),
  relevance: z.string().optional(),
});
export type StructuredFact = z.infer<typeof StructuredFactSchema>;

export const StructuredLawSchema = z.object({
  article: z.string(),
  content: z.string(),
  relevance: z.string().optional(),
  category: z.string().optional(),
});
export type StructuredLaw = z.infer<typeof StructuredLawSchema>;

export const StructuredDisputeSchema = z.object({
  focus: z.string(),
  plaintiffView: z.string().optional(),
  defendantView: z.string().optional(),
  legalIssues: z.array(z.string()).optional(),
});
export type StructuredDispute = z.infer<typeof StructuredDisputeSchema>;

// ========== 结构化案例上下文 ==========
export const StructuredCaseContextSchema = z.object({
  title: z.string(),
  facts: z.array(StructuredFactSchema).optional(),
  laws: z.array(StructuredLawSchema).optional(),
  disputes: z.array(z.string()).or(z.array(StructuredDisputeSchema)).optional(),
});
export type StructuredCaseContext = z.infer<typeof StructuredCaseContextSchema>;

// ========== 对话上下文 ==========
export const DialogueContextSchema = z.object({
  caseTitle: z.string().optional(),
  caseId: z.string().optional(),
  facts: z.array(z.string()).optional(),
  laws: z.array(z.string()).optional(),
  dispute: z.string().optional(),
  previousMessages: z.array(MessageSchema).optional(),
  // 新增：结构化案例上下文
  structuredCase: StructuredCaseContextSchema.optional(),
});
export type DialogueContext = z.infer<typeof DialogueContextSchema>;

// ========== 案例信息 ==========
export const CaseInfoSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string().optional(),
  description: z.string().optional(),
  facts: z.array(z.string()).optional(),
  timeline: z.array(z.any()).optional(),
  disputes: z.array(z.any()).optional(),
});
export type CaseInfo = z.infer<typeof CaseInfoSchema>;

// ========== 苏格拉底请求 ==========
export const SocraticRequestSchema = z.object({
  // 必需字段
  currentTopic: z.string().optional(),
  studentInput: z.string().optional(),

  // 会话信息
  sessionId: z.string().optional(),
  messages: z.array(MessageSchema).optional(),

  // 教学控制
  level: DialogueLevelSchema.optional(),
  mode: DialogueModeSchema.optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),

  // 案例上下文（支持两种格式）
  caseContext: z.string().or(StructuredCaseContextSchema).optional(),
  caseInfo: CaseInfoSchema.optional(),
  context: DialogueContextSchema.optional(),

  // 配置选项
  streaming: z.boolean().optional(),
  maxTokens: z.number().optional(),
  temperature: z.number().optional(),
});
export type SocraticRequest = z.infer<typeof SocraticRequestSchema>;

// ========== AI分析结果 ==========
export const AnalysisResultSchema = z.object({
  keyPoints: z.array(z.string()),
  weaknesses: z.array(z.string()),
  suggestions: z.array(z.string()),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

// ========== 苏格拉底响应数据 ==========
export const SocraticResponseDataSchema = z.object({
  question: z.string(),
  content: z.string(),
  level: DialogueLevelSchema,
  mode: DialogueModeSchema,
  timestamp: z.string(),
  sessionId: z.string(),
  followUpQuestions: z.array(z.string()).optional(),
  analysis: AnalysisResultSchema.optional(),
  metadata: z.object({
    tokensUsed: z.union([
      z.number(),
      z.object({
        input: z.number(),
        output: z.number(),
        total: z.number(),
      })
    ]).optional(),
    cost: z.union([
      z.number(),
      z.object({
        input: z.number(),
        output: z.number(),
        total: z.number(),
      })
    ]).optional(),
    model: z.string().optional(),
    processingTime: z.number().optional(),
  }).optional(),
});
export type SocraticResponseData = z.infer<typeof SocraticResponseDataSchema>;

// ========== 苏格拉底响应（带成功/失败状态） ==========
export const SocraticErrorSchema = z.object({
  code: z.enum([
    'INVALID_INPUT',
    'INVALID_CONTENT',
    'AI_SERVICE_ERROR',
    'SESSION_NOT_FOUND',
    'INTERNAL_ERROR',
    'SERVICE_UNAVAILABLE',
  ]),
  message: z.string(),
  timestamp: z.string(),
  details: z.any().optional(),
});
export type SocraticError = z.infer<typeof SocraticErrorSchema>;

export const SocraticResponseSchema = z.union([
  z.object({
    success: z.literal(true),
    data: SocraticResponseDataSchema,
  }),
  z.object({
    success: z.literal(false),
    error: SocraticErrorSchema,
  }),
]);
export type SocraticResponse = z.infer<typeof SocraticResponseSchema>;

// ========== 对话会话 ==========
export const DialogueSessionSchema = BaseEntitySchema.extend({
  title: z.string(),
  level: DialogueLevelSchema,
  context: DialogueContextSchema,
  messages: z.array(MessageSchema),
  isActive: z.boolean().default(true),
  summary: z.string().optional(),
  teachingOutcomes: z.array(z.string()).optional(),
  participants: z.array(z.object({
    id: z.string(),
    role: z.enum(['teacher', 'student']),
    name: z.string(),
  })),
  metadata: z.object({
    totalQuestions: z.number().optional(),
    correctAnswers: z.number().optional(),
    averageResponseTime: z.number().optional(),
    progressScore: z.number().optional(),
  }).optional(),
});
export type DialogueSession = z.infer<typeof DialogueSessionSchema>;

// ========== 教学评估 ==========
export const TeachingAssessmentSchema = z.object({
  sessionId: z.string(),
  studentEngagement: z.number().min(0).max(100),
  comprehensionLevel: z.number().min(0).max(100),
  criticalThinking: z.number().min(0).max(100),
  overallScore: z.number().min(0).max(100),
  feedback: z.string().optional(),
  improvementAreas: z.array(z.string()),
  strengths: z.array(z.string()),
});
export type TeachingAssessment = z.infer<typeof TeachingAssessmentSchema>;

// ========== 课堂相关类型 ==========
export const ClassroomSessionSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  teacherId: z.string(),
  students: z.array(z.object({
    id: z.string(),
    name: z.string(),
    joinedAt: z.string(),
  })),
  currentVote: z.object({
    id: z.string(),
    question: z.string(),
    options: z.array(z.string()),
    votes: z.record(z.string(), z.string()),
    startedAt: z.string(),
    endsAt: z.string().optional(),
  }).optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
});
export type ClassroomSession = z.infer<typeof ClassroomSessionSchema>;

// ========== 验证函数 ==========
export const validateSocraticRequest = (data: unknown): SocraticRequest => {
  return SocraticRequestSchema.parse(data);
};

export const validateSocraticResponse = (data: unknown): SocraticResponse => {
  return SocraticResponseSchema.parse(data);
};

export const validateDialogueSession = (data: unknown): DialogueSession => {
  return DialogueSessionSchema.parse(data);
};

// ========== 错误代码枚举（向后兼容） ==========
export enum SocraticErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_CONTENT = 'INVALID_CONTENT',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}
