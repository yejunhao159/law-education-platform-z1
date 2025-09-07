/**
 * 时间轴与请求权分析相关类型定义
 * 支持德国法学请求权分析法（Anspruchsmethode）
 */

import type { Party } from './legal-case'

/**
 * 扩展的时间轴事件类型
 * 在原有基础上增加请求权、法律关系、举证责任等字段
 */
export interface TimelineEvent {
  id: string
  date: string
  title: string
  description: string
  type: 'filing' | 'evidence' | 'hearing' | 'judgment' | 'execution' | 'fact' | 'procedure' | 'legal'
  importance: 'critical' | 'important' | 'reference'
  actor?: string
  
  // 请求权相关字段
  claims?: {
    basis: string[]           // 请求权基础（法条）
    elements: ClaimElement[]  // 构成要件
    fulfilled: boolean        // 是否满足
    type: 'contractual' | 'tort' | 'unjust-enrichment' | 'property' | 'other'
  }
  
  // 法律关系
  legalRelation?: {
    type: string             // 法律关系类型（买卖、借贷、侵权等）
    parties: string[]        // 当事方
    change: 'created' | 'modified' | 'terminated'
    description?: string
  }
  
  // 举证责任
  burdenOfProof?: {
    party: string            // 举证责任方
    standard: 'preponderance' | 'clear-and-convincing' | 'beyond-reasonable-doubt'
    evidence: string[]       // 相关证据
    satisfied?: boolean
  }
  
  // 时效相关
  limitation?: {
    startDate: string        // 起算日
    period: number          // 时效期间（月）
    suspended?: boolean     // 是否中止
    interrupted?: boolean   // 是否中断
  }
  
  // 因果关系
  relatedTo?: string[]      // 关联事件ID
}

/**
 * 请求权构成要件
 */
export interface ClaimElement {
  name: string              // 要件名称
  description: string       // 要件说明
  satisfied: boolean        // 是否满足
  evidence: string[]        // 支撑证据
  analysis?: string         // 分析说明
}

/**
 * 请求权结构
 */
export interface ClaimStructure {
  id: string
  basis: string            // 请求权基础（法条）
  basisText?: string       // 法条全文
  type: 'primary' | 'alternative' | 'subsidiary'
  elements: ClaimElement[]
  conclusion: 'established' | 'partial' | 'failed'
  reasoning?: string       // 推理过程
  priority?: number        // 优先级
}

/**
 * 抗辩结构
 */
export interface DefenseStructure {
  id: string
  type: 'denial' | 'excuse' | 'objection' | 'counterclaim'
  basis: string           // 抗辩依据
  description: string     // 抗辩理由
  evidence: string[]      // 支撑证据
  impact: 'blocks-claim' | 'reduces-claim' | 'no-impact'
}

/**
 * 时间轴关键点
 */
export interface TimelineKeyPoint {
  date: string
  event: string
  significance: string    // 法律意义
  impact: 'claim-creation' | 'claim-modification' | 'claim-extinction' | 'evidence' | 'procedure'
}

/**
 * 时效期间
 */
export interface LimitationPeriod {
  claim: string          // 涉及的请求权
  startDate: string      // 起算日
  endDate: string        // 届满日
  period: number         // 期间（月）
  status: 'running' | 'expired' | 'suspended' | 'interrupted'
  events: Array<{
    date: string
    type: 'suspension' | 'interruption' | 'restart'
    reason: string
  }>
}

/**
 * 请求权分析结果
 */
export interface ClaimAnalysisResult {
  id: string
  timestamp: string
  caseId?: string
  
  // 请求权分析
  claims: {
    primary: ClaimStructure[]      // 主要请求权
    alternative: ClaimStructure[]  // 备选请求权
    defense: DefenseStructure[]    // 抗辩事由
  }
  
  // 时间维度分析
  timeline: {
    keyPoints: TimelineKeyPoint[]  // 关键时间点
    limitations: LimitationPeriod[] // 时效期间
    sequence: string[]             // 事件时序分析
  }
  
  // 法律关系图谱
  legalRelations: Array<{
    type: string
    parties: Party[]
    startDate?: string
    endDate?: string
    status: 'active' | 'terminated' | 'disputed'
  }>
  
  // 举证责任分配
  burdenOfProof: Array<{
    fact: string                  // 争议事实
    party: string                  // 举证方
    evidence: string[]             // 现有证据
    gap?: string[]                 // 证据缺口
    evaluation: 'sufficient' | 'insufficient' | 'disputed'
  }>
  
  // 策略建议
  strategy: {
    recommendations: string[]       // 策略建议
    risks: string[]                // 风险提示
    opportunities: string[]        // 机会点
  }
  
  // AI分析元数据
  metadata: {
    model: string
    confidence: number
    processingTime: number
    tokensUsed?: number
  }
}

/**
 * 请求权分析请求参数
 */
export interface ClaimAnalysisRequest {
  events: TimelineEvent[]
  caseType?: string
  focusAreas?: Array<'claims' | 'defenses' | 'limitations' | 'burden-of-proof'>
  depth?: 'basic' | 'detailed' | 'comprehensive'
}

/**
 * 视图模式
 */
export type TimelineViewMode = 'simple' | 'enhanced' | 'analysis'

/**
 * 统一时间轴组件属性
 */
export interface UnifiedTimelineProps {
  events?: TimelineEvent[]
  analysis?: ClaimAnalysisResult
  mode?: TimelineViewMode
  enableAI?: boolean
  onNodeClick?: (event: TimelineEvent) => void
  onAnalysisComplete?: (result: ClaimAnalysisResult) => void
  className?: string
}

/**
 * 请求权详情弹窗属性
 */
export interface ClaimDetailModalProps {
  claim: ClaimStructure
  isOpen: boolean
  onClose: () => void
  onElementCheck?: (elementId: string, satisfied: boolean) => void
}

/**
 * 视图控制器属性
 */
export interface ViewModeControllerProps {
  currentMode: TimelineViewMode
  onModeChange: (mode: TimelineViewMode) => void
  aiEnabled: boolean
  onAIToggle: (enabled: boolean) => void
  isAnalyzing?: boolean
}