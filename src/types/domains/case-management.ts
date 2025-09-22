/**
 * 案例管理域类型定义
 * DeepPractice Standards Compliant
 */

import { z } from 'zod';

import { BaseEntitySchema, ViewPerspectiveSchema, ImportanceLevelSchema } from '../shared/base';

// ========== 当事人信息 ==========
export const PartySchema = z.object({
  name: z.string().min(1, '当事人姓名不能为空'),
  type: z.enum(['自然人', '法人', '其他组织']).optional(),
  legalRepresentative: z.string().optional(),
  attorney: z.array(z.string()).optional(),
});

// ========== 基础案件信息 ==========
export const BasicInfoSchema = z.object({
  caseNumber: z.string().min(1, '案号不能为空'),
  court: z.string().min(1, '法院名称不能为空'),
  judgeDate: z.string().min(1, '判决日期不能为空'),
  caseType: z.enum(['民事', '刑事', '行政', '执行']).optional(),
  judge: z.array(z.string()).optional(),
  clerk: z.string().optional(),
  parties: z.object({
    plaintiff: z.array(PartySchema).min(1, '至少需要一个原告'),
    defendant: z.array(PartySchema).min(1, '至少需要一个被告'),
    thirdParty: z.array(PartySchema).optional(),
  }),
});

// ========== 时间线事件 ==========
export const TimelineEventSchema = z.object({
  id: z.string().optional(),
  date: z.string(),
  event: z.string(),
  importance: ImportanceLevelSchema,
  actors: z.array(z.string()).optional(),
  location: z.string().optional(),
  relatedEvidence: z.array(z.string()).optional(),
  detail: z.string().optional(),
  isKeyEvent: z.boolean().optional(),
  party: z.string().optional(),
});

// ========== 案件元数据 ==========
export const CaseMetadataSchema = z.object({
  extractedAt: z.string().datetime(),
  confidence: z.number().min(0).max(100),
  aiModel: z.string(),
  processingTime: z.number(),
  extractionMethod: z.enum(['pure-ai', 'hybrid', 'rule-enhanced', 'manual']),
  version: z.string().optional(),
});

// ========== 完整案件实体 ==========
export const LegalCaseSchema = BaseEntitySchema.extend({
  basicInfo: BasicInfoSchema,
  timeline: z.array(TimelineEventSchema).optional(),
  metadata: CaseMetadataSchema,
  originalText: z.string().optional(),
  attachments: z.array(z.object({
    name: z.string(),
    type: z.string(),
    url: z.string(),
  })).optional(),
});

// ========== TypeScript类型导出 ==========
export type Party = z.infer<typeof PartySchema>;
export type BasicInfo = z.infer<typeof BasicInfoSchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type CaseMetadata = z.infer<typeof CaseMetadataSchema>;
export type LegalCase = z.infer<typeof LegalCaseSchema>;

// ========== 验证函数 ==========
export const validateLegalCase = (data: unknown): LegalCase => {
  return LegalCaseSchema.parse(data);
};

export const validatePartialCase = (data: unknown): Partial<LegalCase> => {
  return LegalCaseSchema.partial().parse(data);
};

// ========== 工厂函数 ==========
export const createDefaultCase = (): Partial<LegalCase> => ({
  basicInfo: {
    caseNumber: '',
    court: '',
    judgeDate: new Date().toISOString().split('T')[0],
    parties: {
      plaintiff: [],
      defendant: [],
    },
  },
  timeline: [],
  metadata: {
    extractedAt: new Date().toISOString(),
    confidence: 0,
    aiModel: 'DeepSeek',
    processingTime: 0,
    extractionMethod: 'pure-ai',
  },
});