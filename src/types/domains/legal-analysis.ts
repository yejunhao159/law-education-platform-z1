/**
 * 法律分析域类型定义
 * DeepPractice Standards Compliant
 */

import { z } from 'zod';

import { BaseEntitySchema, ViewPerspectiveSchema, ImportanceLevelSchema } from '../shared/base';

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
    '当事人陈述',
  ]),
  submittedBy: z.enum(['原告', '被告', '第三人', '法院调取']),
  description: z.string().optional(),
  credibilityScore: z.number().min(0).max(100),
  relevanceScore: z.number().min(0).max(100),
  accepted: z.boolean(),
  courtOpinion: z.string().optional(),
  relatedFacts: z.array(z.string()).optional(),
});

// ========== 证据链分析 ==========
export const EvidenceChainSchema = z.object({
  complete: z.boolean(),
  missingLinks: z.array(z.string()),
  strength: z.enum(['strong', 'moderate', 'weak']),
  analysis: z.string().optional(),
});

// ========== 证据质证 ==========
export const EvidenceSchema = z.object({
  summary: z.string().max(500, '摘要不超过500字'),
  items: z.array(EvidenceItemSchema),
  chainAnalysis: EvidenceChainSchema,
  crossExamination: z.string().optional(),
});

// ========== 法律依据 ==========
export const LegalBasisSchema = z.object({
  law: z.string(),
  article: z.string(),
  clause: z.string().optional(),
  application: z.string(),
  interpretation: z.string().optional(),
});

// ========== 逻辑推理 ==========
export const LogicStepSchema = z.object({
  premise: z.string(),
  inference: z.string(),
  conclusion: z.string(),
  supportingEvidence: z.array(z.string()).optional(),
});

// ========== 法官说理 ==========
export const ReasoningSchema = z.object({
  summary: z.string().max(500, '摘要不超过500字'),
  legalBasis: z.array(LegalBasisSchema),
  logicChain: z.array(LogicStepSchema),
  keyArguments: z.array(z.string()),
  judgment: z.string(),
  dissenting: z.string().optional(),
});

// ========== 事实认定 ==========
export const FactsSchema = z.object({
  main: z.string().optional(),
  disputed: z.array(z.string()).optional(),
  summary: z.string().max(500, '摘要不超过500字'),
  keyFacts: z.array(z.string()),
  disputedFacts: z.array(z.string()),
  undisputedFacts: z.array(z.string()).optional(),
});

// ========== 三要素整合 ==========
export const ThreeElementsSchema = z.object({
  facts: FactsSchema,
  evidence: EvidenceSchema,
  reasoning: ReasoningSchema,
});

// ========== AI重要性评分 ==========
export const ImportanceScoreSchema = z.object({
  score: z.number().min(1).max(100),
  level: ImportanceLevelSchema,
  reasoning: z.string(),
  legalSignificance: z.array(z.string()),
  impactFactors: z.object({
    proceduralImpact: z.number().min(0).max(100),
    substantiveImpact: z.number().min(0).max(100),
    evidenceImpact: z.number().min(0).max(100),
    strategicImpact: z.number().min(0).max(100),
  }),
});

// ========== AI法学分析 ==========
export const LegalAnalysisSchema = z.object({
  factualAnalysis: z.string(),
  legalPrinciples: z.array(z.string()),
  jurisprudence: z.string(),
  evidenceRequirement: z.string(),
  riskAssessment: z.string(),
  strategicAdvice: z.string(),
  applicableLaws: z.array(z.string()),
  precedents: z.array(z.string()),
  keyTerms: z.array(z.object({
    term: z.string(),
    definition: z.string(),
  })),
});

// ========== 多视角分析 ==========
export const PerspectiveAnalysisSchema = LegalAnalysisSchema.extend({
  perspective: ViewPerspectiveSchema,
  viewpoint: z.string(),
  favorablePoints: z.array(z.string()).optional(),
  concerns: z.array(z.string()).optional(),
  defensiveStrategy: z.array(z.string()).optional(),
  counterArguments: z.array(z.string()).optional(),
  keyFocus: z.array(z.string()).optional(),
  teachingPoints: z.array(z.string()).optional(),
});

// ========== 时间轴智能分析结果 ==========
export const TimelineAnalysisSchema = BaseEntitySchema.extend({
  eventId: z.string(),
  perspective: ViewPerspectiveSchema,
  importance: ImportanceScoreSchema,
  legalAnalysis: LegalAnalysisSchema,
  perspectiveAnalysis: PerspectiveAnalysisSchema.optional(),
  cacheExpiry: z.string(),
  apiVersion: z.string(),
  confidence: z.number().min(0).max(100).optional(),
});

// ========== TypeScript类型导出 ==========
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;
export type EvidenceChain = z.infer<typeof EvidenceChainSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type LegalBasis = z.infer<typeof LegalBasisSchema>;
export type LogicStep = z.infer<typeof LogicStepSchema>;
export type Reasoning = z.infer<typeof ReasoningSchema>;
export type Facts = z.infer<typeof FactsSchema>;
export type ThreeElements = z.infer<typeof ThreeElementsSchema>;
export type ImportanceScore = z.infer<typeof ImportanceScoreSchema>;
export type LegalAnalysis = z.infer<typeof LegalAnalysisSchema>;
export type PerspectiveAnalysis = z.infer<typeof PerspectiveAnalysisSchema>;
export type TimelineAnalysis = z.infer<typeof TimelineAnalysisSchema>;