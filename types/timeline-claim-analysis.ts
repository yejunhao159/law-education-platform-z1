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

  // ========== 新增：智能分析增强字段 ==========

  // 争议焦点标记
  disputeFocus?: {
    isKeyDispute: boolean     // 是否为争议焦点
    disputeType: 'factual' | 'legal' | 'procedural' // 争议类型
    description: string       // 争议描述
    parties: string[]         // 争议方
    resolved?: boolean        // 是否已解决
  }

  // 法条关联信息
  relatedProvisions?: Array<{
    id: string               // 法条ID
    title: string            // 法条标题
    content?: string         // 法条内容
    relevance: 'high' | 'medium' | 'low' // 关联度
    applicationType: 'direct' | 'analogical' | 'reference' // 适用类型
  }>

  // AI洞察信息
  aiInsights?: {
    reasoning: string         // AI推理过程
    legalSignificance: string // 法律意义
    suggestions: string[]     // 建议
    relatedCases?: Array<{   // 相关案例
      title: string
      summary: string
      relevance: number
    }>
    confidence: number        // 置信度 0-1
  }

  // 证据相关信息
  evidenceInfo?: {
    evidenceType: 'documentary' | 'testimonial' | 'physical' | 'expert' // 证据类型
    strength: number          // 证据强度 0-1
    admissibility: boolean    // 可采纳性
    authenticity: 'verified' | 'disputed' | 'unverified' // 真实性
    relevance: number         // 关联性 0-1
  }
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

/**
 * ========== 新增：智能时间轴相关接口 ==========
 */

/**
 * 智能时间轴节点属性
 */
export interface SmartTimelineNodeProps {
  event: TimelineEvent
  isExpanded?: boolean
  showInsights?: boolean
  onExpand?: () => void
  onInsightClick?: () => void
  onEvidenceClick?: () => void
  className?: string
}

/**
 * AI洞察气泡组件属性
 */
export interface AIInsightBubbleProps {
  insights: TimelineEvent['aiInsights']
  position?: 'top' | 'bottom' | 'left' | 'right'
  isVisible: boolean
  onClose: () => void
  className?: string
}

/**
 * 证据学习相关接口
 */

/**
 * 证据信息
 */
export interface Evidence {
  id: string
  title: string
  description: string
  content: string
  type: 'documentary' | 'testimonial' | 'physical' | 'expert'
  relatedEvents: string[]  // 关联的时间轴事件ID
  metadata?: {
    source: string
    dateCreated: string
    author?: string
  }
}

/**
 * 证据问答题目
 */
export interface EvidenceQuiz {
  id: string
  evidenceId: string
  evidence: Evidence
  question: string
  questionType: 'type' | 'burden' | 'relevance' | 'admissibility' | 'strength'
  options: string[]
  correctAnswer: number
  explanation: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  points?: number
}

/**
 * 证据学习会话状态
 */
export interface EvidenceQuizSession {
  id: string
  startTime: string
  currentQuizIndex: number
  quizzes: EvidenceQuiz[]
  userAnswers: Array<{
    quizId: string
    selectedAnswer: number
    isCorrect: boolean
    timeSpent: number
  }>
  score: number
  totalPossibleScore: number
  completed: boolean
}

/**
 * 证据学习组件属性
 */
export interface EvidenceQuizSectionProps {
  evidences?: Evidence[]
  autoGenerate?: boolean  // 是否自动生成题目
  maxQuizzes?: number    // 最大题目数量
  onSessionComplete?: (session: EvidenceQuizSession) => void
  onAnswerSubmit?: (quizId: string, answer: number) => void
  className?: string
}