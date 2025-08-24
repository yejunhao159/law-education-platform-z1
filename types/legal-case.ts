/**
 * 法律案件数据模型定义
 * 基于中国法律判决书结构设计
 * 墨匠 - 2025-08-24
 */

import { z } from 'zod'

// ========== 基础信息 ==========
export const PartySchema = z.object({
  name: z.string(),
  type: z.enum(['自然人', '法人', '其他组织']).optional(),
  legalRepresentative: z.string().optional(),
  attorney: z.array(z.string()).optional(),
})

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
})

// ========== 时间线事件 ==========
export const TimelineEventSchema = z.object({
  date: z.string(),
  event: z.string(),
  importance: z.enum(['critical', 'important', 'normal']),
  actors: z.array(z.string()).optional(),
  location: z.string().optional(),
  relatedEvidence: z.array(z.string()).optional(),
})

// ========== 事实认定 ==========
export const FactsSchema = z.object({
  summary: z.string().max(500, '摘要不超过500字'),
  timeline: z.array(TimelineEventSchema),
  keyFacts: z.array(z.string()),
  disputedFacts: z.array(z.string()),
  undisputedFacts: z.array(z.string()).optional(),
})

// ========== 证据项 ==========
export const EvidenceItemSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  type: z.enum([
    '书证', 
    '物证', 
    '证人证言', 
    '鉴定意见', 
    '勘验笔录', 
    '视听资料', 
    '电子数据',
    '当事人陈述'
  ]),
  submittedBy: z.enum(['原告', '被告', '第三人', '法院调取']),
  description: z.string().optional(),
  credibilityScore: z.number().min(0).max(100),
  relevanceScore: z.number().min(0).max(100),
  accepted: z.boolean(),
  courtOpinion: z.string().optional(),
  relatedFacts: z.array(z.string()).optional(),
})

// ========== 证据链分析 ==========
export const EvidenceChainSchema = z.object({
  complete: z.boolean(),
  missingLinks: z.array(z.string()),
  strength: z.enum(['strong', 'moderate', 'weak']),
  analysis: z.string().optional(),
})

// ========== 证据质证 ==========
export const EvidenceSchema = z.object({
  summary: z.string().max(500, '摘要不超过500字'),
  items: z.array(EvidenceItemSchema),
  chainAnalysis: EvidenceChainSchema,
  crossExamination: z.string().optional(),
})

// ========== 法律依据 ==========
export const LegalBasisSchema = z.object({
  law: z.string(),
  article: z.string(),
  clause: z.string().optional(),
  application: z.string(),
  interpretation: z.string().optional(),
})

// ========== 逻辑推理 ==========
export const LogicStepSchema = z.object({
  premise: z.string(),
  inference: z.string(),
  conclusion: z.string(),
  supportingEvidence: z.array(z.string()).optional(),
})

// ========== 法官说理 ==========
export const ReasoningSchema = z.object({
  summary: z.string().max(500, '摘要不超过500字'),
  legalBasis: z.array(LegalBasisSchema),
  logicChain: z.array(LogicStepSchema),
  keyArguments: z.array(z.string()),
  judgment: z.string(),
  dissenting: z.string().optional(), // 少数意见
})

// ========== 三要素 ==========
export const ThreeElementsSchema = z.object({
  facts: FactsSchema,
  evidence: EvidenceSchema,
  reasoning: ReasoningSchema,
})

// ========== 元数据 ==========
export const MetadataSchema = z.object({
  extractedAt: z.string().datetime(),
  confidence: z.number().min(0).max(100),
  aiModel: z.string(),
  processingTime: z.number(),
  extractionMethod: z.enum(['pure-ai', 'hybrid', 'rule-enhanced', 'manual']),
  version: z.string().optional(),
})

// ========== 完整案件数据 ==========
export const LegalCaseSchema = z.object({
  id: z.string().optional(),
  basicInfo: BasicInfoSchema,
  threeElements: ThreeElementsSchema,
  metadata: MetadataSchema,
  originalText: z.string().optional(),
  attachments: z.array(z.object({
    name: z.string(),
    type: z.string(),
    url: z.string(),
  })).optional(),
})

// ========== TypeScript 类型导出 ==========
export type Party = z.infer<typeof PartySchema>
export type BasicInfo = z.infer<typeof BasicInfoSchema>
export type TimelineEvent = z.infer<typeof TimelineEventSchema>
export type Facts = z.infer<typeof FactsSchema>
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>
export type EvidenceChain = z.infer<typeof EvidenceChainSchema>
export type Evidence = z.infer<typeof EvidenceSchema>
export type LegalBasis = z.infer<typeof LegalBasisSchema>
export type LogicStep = z.infer<typeof LogicStepSchema>
export type Reasoning = z.infer<typeof ReasoningSchema>
export type ThreeElements = z.infer<typeof ThreeElementsSchema>
export type Metadata = z.infer<typeof MetadataSchema>
export type LegalCase = z.infer<typeof LegalCaseSchema>

// ========== 验证函数 ==========
export function validateLegalCase(data: unknown): LegalCase {
  return LegalCaseSchema.parse(data)
}

export function validatePartialCase(data: unknown): Partial<LegalCase> {
  return LegalCaseSchema.partial().parse(data)
}

// ========== 默认值工厂函数 ==========
export function createDefaultCase(): Partial<LegalCase> {
  return {
    basicInfo: {
      caseNumber: '',
      court: '',
      judgeDate: new Date().toISOString().split('T')[0],
      parties: {
        plaintiff: [],
        defendant: [],
      }
    },
    threeElements: {
      facts: {
        summary: '',
        timeline: [],
        keyFacts: [],
        disputedFacts: [],
      },
      evidence: {
        summary: '',
        items: [],
        chainAnalysis: {
          complete: false,
          missingLinks: [],
          strength: 'moderate',
        }
      },
      reasoning: {
        summary: '',
        legalBasis: [],
        logicChain: [],
        keyArguments: [],
        judgment: '',
      }
    },
    metadata: {
      extractedAt: new Date().toISOString(),
      confidence: 0,
      aiModel: 'DeepSeek',
      processingTime: 0,
      extractionMethod: 'pure-ai',
    }
  }
}