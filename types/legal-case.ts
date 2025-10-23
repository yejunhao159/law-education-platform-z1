/**
 * 法律案件数据模型定义
 * 基于中国法律判决书结构设计
 * 墨匠 - 2025-08-24
 */

import { z } from 'zod'

// ========== 法条引用 ==========
export const LawReferenceSchema = z.object({
  lawName: z.string(), // 法律名称，如"民法典"
  article: z.string(), // 条文编号，如"第123条"
  content: z.string().optional(), // 条文内容
  relevance: z.enum(['direct', 'indirect', 'reference']).optional(), // 关联度
})

export type LawReference = z.infer<typeof LawReferenceSchema>

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
  // AI分析相关字段
  detail: z.string().optional(), // 事件详细描述
  isKeyEvent: z.boolean().optional(), // 是否为关键事件
  party: z.string().optional(), // 相关当事人
})

// ========== AI分析重要性评分 ==========
export const ImportanceScoreSchema = z.object({
  score: z.number().min(1).max(100), // 1-100分评分
  level: z.enum(['critical', 'high', 'medium', 'low']), // 重要性等级
  reasoning: z.string(), // AI分析重要性的理由
  legalSignificance: z.array(z.string()), // 法律意义标签
  impactFactors: z.object({
    proceduralImpact: z.number().min(0).max(100), // 程序性影响
    substantiveImpact: z.number().min(0).max(100), // 实体性影响
    evidenceImpact: z.number().min(0).max(100), // 证据影响
    strategicImpact: z.number().min(0).max(100), // 策略影响
  }),
})

// ========== AI法学分析 ==========
export const LegalAnalysisSchema = z.object({
  factualAnalysis: z.string(), // 事实认定分析
  legalPrinciples: z.array(z.string()), // 适用的法律原则
  jurisprudence: z.string(), // 法理分析
  evidenceRequirement: z.string(), // 举证要求
  riskAssessment: z.string(), // 风险提示
  strategicAdvice: z.string(), // 策略建议
  applicableLaws: z.array(z.string()), // 适用法条
  precedents: z.array(z.string()), // 相关判例
  keyTerms: z.array(z.object({
    term: z.string(), // 法律术语
    definition: z.string(), // 术语定义
  })),
})

// ========== 多视角分析 ==========
export const PerspectiveAnalysisSchema = LegalAnalysisSchema.extend({
  perspective: z.enum(['neutral', 'plaintiff', 'defendant', 'judge']),
  viewpoint: z.string(), // 视角观点总结
  favorablePoints: z.array(z.string()).optional(), // 有利要点(原告视角)
  concerns: z.array(z.string()).optional(), // 关注风险(原告视角)
  defensiveStrategy: z.array(z.string()).optional(), // 防御策略(被告视角)
  counterArguments: z.array(z.string()).optional(), // 反驳论点(被告视角)
  keyFocus: z.array(z.string()).optional(), // 关键焦点(法官视角)
  teachingPoints: z.array(z.string()).optional(), // 教学要点(教学模式)
})

// ========== 时间轴智能分析结果 ==========
export const TimelineAnalysisSchema = z.object({
  eventId: z.string(), // 事件ID
  perspective: z.enum(['neutral', 'plaintiff', 'defendant', 'judge']), // 分析视角
  importance: ImportanceScoreSchema, // 重要性评分
  legalAnalysis: LegalAnalysisSchema, // 法学分析
  perspectiveAnalysis: PerspectiveAnalysisSchema.optional(), // 视角化分析
  generatedAt: z.string(), // 生成时间
  cacheExpiry: z.string(), // 缓存过期时间
  apiVersion: z.string(), // API版本
  confidence: z.number().min(0).max(100).optional(), // 分析可信度
})

// ========== 分析缓存统计 ==========
export const CacheStatisticsSchema = z.object({
  hitRate: z.number().min(0).max(100), // 缓存命中率
  totalRequests: z.number().min(0), // 总请求数
  cacheSize: z.number().min(0), // 缓存大小(字节)
  lastCleanup: z.string(), // 最后清理时间
  averageResponseTime: z.number().min(0).optional(), // 平均响应时间(毫秒)
})

// ========== 分析缓存配置 ==========
export const AnalysisCacheConfigSchema = z.object({
  maxAge: z.number().min(0).default(86400000), // 24小时(毫秒)
  maxSize: z.number().min(0).default(1000), // 最大缓存条目数
  compressionEnabled: z.boolean().default(true), // 是否启用压缩
  autoCleanupEnabled: z.boolean().default(true), // 是否自动清理过期缓存
})

// ========== 分析缓存 ==========
export const AnalysisCacheSchema = z.object({
  analyses: z.record(z.string(), TimelineAnalysisSchema), // 分析结果Map
  statistics: CacheStatisticsSchema, // 缓存统计
  config: AnalysisCacheConfigSchema, // 缓存配置
  lastUpdated: z.string(), // 最后更新时间
})

// ========== 事实认定 ==========
export const FactsSchema = z.object({
  // 为时间轴AI分析添加的字段
  main: z.string().optional(), // 主要事实描述文本
  disputed: z.array(z.string()).optional(), // 争议焦点数组
  // 原有字段
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
  credibilityScore: z.number().min(0).max(100).optional(), // 可选，新版本不再使用
  relevanceScore: z.number().min(0).max(100).optional(), // 可选，新版本不再使用
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
  content: z.string().optional(), // 法条完整内容
  source: z.enum(['判决书原文', 'AI补充', '待核实']).optional(), // 法条来源
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
  confidence: z.number().min(0).max(1),  // 🔧 修复：改为0-1范围（与SnapshotSchemas一致）
  aiModel: z.string(),
  processingTime: z.number(),
  extractionMethod: z.enum(['ai', 'rule', 'hybrid', 'manual']),  // 🔧 修复：统一枚举值（与SnapshotSchemas一致）
  version: z.string().optional(),
  confidenceReport: z.object({
    overall: z.number().min(0).max(100),
    details: z.array(z.object({
      module: z.enum(['facts', 'evidence', 'reasoning']),
      score: z.number().min(0).max(100),
      factors: z.array(z.string()).optional(),
      warnings: z.array(z.string()).optional(),
    }))
  }).optional(),
})

// ========== 完整案件数据 ==========
export const LegalCaseSchema = z.object({
  id: z.string().optional(),
  basicInfo: BasicInfoSchema,
  threeElements: ThreeElementsSchema,
  // 使用统一的TimelineEventSchema，支持可选的扩展字段
  timeline: z.array(TimelineEventSchema.extend({
    id: z.number().optional(),
    title: z.string().optional(), // 作为event的别名
    description: z.string().optional(),
    type: z.string().optional()
  }).transform(item => ({
    ...item,
    // 确保event字段存在，如果没有则使用title
    event: item.event || item.title || '',
    // 确保title字段存在，如果没有则使用event
    title: item.title || item.event || ''
  }))).optional(),
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
export type ConfidenceReport = NonNullable<Metadata['confidenceReport']>
export type LegalCase = z.infer<typeof LegalCaseSchema>

// ========== AI分析相关类型导出 ==========
export type ImportanceScore = z.infer<typeof ImportanceScoreSchema>
export type LegalAnalysis = z.infer<typeof LegalAnalysisSchema>
export type PerspectiveAnalysis = z.infer<typeof PerspectiveAnalysisSchema>
export type TimelineAnalysis = z.infer<typeof TimelineAnalysisSchema>
export type CacheStatistics = z.infer<typeof CacheStatisticsSchema>
export type AnalysisCacheConfig = z.infer<typeof AnalysisCacheConfigSchema>
export type AnalysisCache = z.infer<typeof AnalysisCacheSchema>

// ========== 视角类型别名 ==========
export type ViewPerspective = 'neutral' | 'plaintiff' | 'defendant' | 'judge'
export type ImportanceLevel = 'critical' | 'high' | 'medium' | 'low'

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
      judgeDate: new Date().toISOString().split('T')[0] || '',
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
      confidence: 0,  // 0-1范围
      aiModel: 'DeepSeek',
      processingTime: 0,
      extractionMethod: 'ai',  // 使用Schema枚举值
    }
  }
}
