/**
 * 苏格拉底对话域类型定义
 * DeepPractice Standards Compliant
 */

import { z } from 'zod';

import { BaseEntitySchema } from '../shared/base';

// ========== 对话消息 ==========
export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['teacher', 'ai', 'student', 'system']),
  content: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.object({
    confidence: z.number().min(0).max(100).optional(),
    responseTime: z.number().optional(),
    tokens: z.number().optional(),
  }).optional(),
});

// ========== 教学难度级别 ==========
export const TeachingLevelSchema = z.enum(['basic', 'intermediate', 'advanced']);

// ========== 对话模式 ==========
export const DialogueModeSchema = z.enum(['response', 'suggestions', 'analysis']);

// ========== 对话上下文 ==========
export const DialogueContextSchema = z.object({
  caseTitle: z.string().optional(),
  facts: z.array(z.string()).optional(),
  laws: z.array(z.string()).optional(),
  dispute: z.string().optional(),
  previousMessages: z.array(MessageSchema).optional(),
});

// ========== 苏格拉底请求 ==========
export const SocraticRequestSchema = z.object({
  question: z.string().min(1, '问题不能为空'),
  level: TeachingLevelSchema,
  context: DialogueContextSchema,
  mode: DialogueModeSchema,
});

// ========== AI分析结果 ==========
export const AnalysisResultSchema = z.object({
  keyPoints: z.array(z.string()),
  weaknesses: z.array(z.string()),
  suggestions: z.array(z.string()),
});

// ========== 苏格拉底响应 ==========
export const SocraticResponseSchema = z.object({
  answer: z.string(),
  followUpQuestions: z.array(z.string()),
  analysis: AnalysisResultSchema.optional(),
});

// ========== 对话会话 ==========
export const DialogueSessionSchema = BaseEntitySchema.extend({
  title: z.string(),
  level: TeachingLevelSchema,
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
});

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

// ========== TypeScript类型导出 ==========
export type Message = z.infer<typeof MessageSchema>;
export type TeachingLevel = z.infer<typeof TeachingLevelSchema>;
export type DialogueMode = z.infer<typeof DialogueModeSchema>;
export type DialogueContext = z.infer<typeof DialogueContextSchema>;
export type SocraticRequest = z.infer<typeof SocraticRequestSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type SocraticResponse = z.infer<typeof SocraticResponseSchema>;
export type DialogueSession = z.infer<typeof DialogueSessionSchema>;
export type TeachingAssessment = z.infer<typeof TeachingAssessmentSchema>;

// ========== 验证函数 ==========
export const validateSocraticRequest = (data: unknown): SocraticRequest => {
  return SocraticRequestSchema.parse(data);
};

export const validateDialogueSession = (data: unknown): DialogueSession => {
  return DialogueSessionSchema.parse(data);
};

// ========== 工厂函数 ==========
export const createMessage = (
  role: Message['role'],
  content: string,
  metadata?: Message['metadata']
): Message => ({
  id: crypto.randomUUID(),
  role,
  content,
  timestamp: new Date().toISOString(),
  metadata,
});

export const createDialogueSession = (
  title: string,
  level: TeachingLevel,
  context: DialogueContext
): Partial<DialogueSession> => ({
  title,
  level,
  context,
  messages: [],
  isActive: true,
  participants: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});