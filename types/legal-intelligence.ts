/**
 * Legal Intelligence System Type Definitions
 * 法律智能系统类型定义
 */

import { LegalCase } from './legal-case'

/**
 * 提取的数据主结构
 */
export interface ExtractedData {
  dates: DateElement[]
  parties: Party[]
  amounts: Amount[]
  legalClauses: LegalClause[]
  facts: FactElement[]
  metadata: DocumentMetadata
  confidence: number
  source: 'rule' | 'ai' | 'merged'
}

/**
 * 日期元素
 */
export interface DateElement {
  date: string // ISO格式日期
  type: 'filing' | 'incident' | 'judgment' | 'deadline' | 'contract' | 'payment'
  description: string
  importance: 'critical' | 'important' | 'reference'
  relatedParties?: string[]
  context?: string // 原文上下文
  confidence?: number
}

/**
 * 当事人信息
 */
export interface Party {
  id: string
  name: string
  type: 'plaintiff' | 'defendant' | 'third-party' | 'witness' | 'lawyer' | 'judge'
  role: string // 具体角色描述
  aliases?: string[] // 别名或其他称呼
  contact?: {
    phone?: string
    address?: string
    idNumber?: string // 身份证号（部分隐藏）
  }
  legalRepresentative?: string
  confidence?: number
}

/**
 * 金额信息
 */
export interface Amount {
  value: number
  currency: 'CNY' | 'USD' | 'EUR'
  type: 'principal' | 'interest' | 'penalty' | 'compensation' | 'fee' | 'deposit'
  description: string
  relatedDate?: string
  relatedParties?: string[]
  calculation?: string // 计算方式说明
  confidence?: number
}

/**
 * 法律条款
 */
export interface LegalClause {
  id: string
  text: string
  type: 'contract' | 'statute' | 'regulation' | 'judicial-interpretation'
  source: string // 来源文件或法律
  article?: string // 具体条款号
  importance: 'core' | 'supporting' | 'reference'
  interpretation?: string // 条款解释
  relatedFacts?: string[] // 关联事实ID
  confidence?: number
}

/**
 * 事实元素
 */
export interface FactElement {
  id: string
  content: string
  type: 'disputed' | 'agreed' | 'claimed' | 'proven'
  party?: string // 提出方
  evidence?: string[] // 支持证据
  legalSignificance?: string // 法律意义
  timeline?: {
    date: string
    order: number
  }
  confidence?: number
}

/**
 * 文档元数据
 */
export interface DocumentMetadata {
  fileName?: string
  uploadTime: string
  documentType: 'judgment' | 'complaint' | 'contract' | 'evidence' | 'unknown'
  court?: string
  caseNumber?: string
  judgeDate?: string
  pageCount?: number
  extractionTime: string
  extractionVersion: string
}

/**
 * 法律条款映射
 */
export interface LegalProvision {
  code: string // 法律代码，如"民法典"
  title: string // 法律名称
  article: string // 条款号
  content?: string // 条款内容
  relevance: number // 相关度评分 0-1
  applicability: string[] // 适用情况
  citations: Citation[] // 引用案例
  tags?: string[] // 标签分类
}

/**
 * 引用信息
 */
export interface Citation {
  caseNumber: string
  court: string
  date: string
  summary?: string
  url?: string
}

/**
 * AI提示模板
 */
export interface AIPromptTemplate {
  id: string
  elementType: ElementType
  template: string
  systemPrompt?: string
  responseSchema: any // JSON Schema
  examples: Example[]
  version: string
  effectiveness?: number // 效果评分
}

/**
 * 示例数据
 */
export interface Example {
  input: string
  output: any
  explanation?: string
}

/**
 * 元素类型枚举
 */
export type ElementType = 'date' | 'party' | 'amount' | 'clause' | 'fact' | 'all'

/**
 * 处理后的文档
 */
export interface ProcessedDocument {
  originalText: string
  cleanedText: string
  sentences: string[]
  paragraphs: string[]
  metadata: DocumentMetadata
  language: 'zh' | 'en'
  encoding?: string
}

/**
 * 合并后的数据
 */
export interface MergedData extends ExtractedData {
  conflicts?: Conflict[]
  resolutions?: Resolution[]
  mergeStrategy: 'rule-priority' | 'ai-priority' | 'confidence-based'
}

/**
 * 冲突信息
 */
export interface Conflict {
  field: string
  ruleValue: any
  aiValue: any
  reason?: string
}

/**
 * 冲突解决方案
 */
export interface Resolution {
  conflictId: string
  chosenValue: any
  source: 'rule' | 'ai' | 'manual'
  confidence: number
  reason: string
}

/**
 * 缓存数据
 */
export interface CachedData<T = any> {
  key: string
  data: T
  timestamp: string
  ttl: number // 秒
  hits?: number
}

/**
 * 批处理任务
 */
export interface BatchTask {
  id: string
  documents: ProcessedDocument[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number // 0-100
  results?: ExtractedData[]
  errors?: Error[]
  startTime?: string
  endTime?: string
}

/**
 * 提取配置
 */
export interface ExtractionConfig {
  enableAI: boolean
  aiProvider: 'deepseek' | 'openai' | 'custom'
  cacheEnabled: boolean
  cacheTTL: number
  batchSize: number
  timeout: number
  confidence: {
    minimum: number // 最小置信度阈值
    aiWeight: number // AI权重
    ruleWeight: number // 规则权重
  }
}

/**
 * 分析结果
 */
export interface AnalysisResult {
  summary: string
  legalPoints: string[]
  legalBasis: string[]
  riskAssessment?: {
    level: 'high' | 'medium' | 'low'
    factors: string[]
    recommendations: string[]
  }
  timeline?: TimelineAnalysis
}

/**
 * 时间线分析
 */
export interface TimelineAnalysis {
  totalDuration: number // 天数
  phases: {
    name: string
    startDate: string
    endDate: string
    keyEvents: string[]
  }[]
  criticalDates: DateElement[]
  delays?: {
    description: string
    duration: number
    impact: string
  }[]
}

/**
 * 法律元素标记
 */
export interface LegalElementMarking {
  elementId: string
  elementType: ElementType
  text: string
  position: {
    start: number
    end: number
    paragraph?: number
    sentence?: number
  }
  confidence: number
  verified?: boolean
  correctedValue?: any
}

/**
 * 导出所有类型
 */
export type {
  LegalCase,
  ExtractedData,
  DateElement,
  Party,
  Amount,
  LegalClause,
  FactElement,
  DocumentMetadata,
  LegalProvision,
  Citation,
  AIPromptTemplate,
  Example,
  ElementType,
  ProcessedDocument,
  MergedData,
  Conflict,
  Resolution,
  CachedData,
  BatchTask,
  ExtractionConfig,
  AnalysisResult,
  TimelineAnalysis,
  LegalElementMarking
}