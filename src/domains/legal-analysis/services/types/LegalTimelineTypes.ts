/**
 * 法学专业时间轴分析类型定义
 * 基于法学实务需求的专业化扩展
 * 整合ISSUE协作范式的分析结果
 */

// ========== 法学专业事件类型 ==========

export enum LegalEventType {
  // 法律行为类
  CONTRACT_FORMATION = 'contract_formation',     // 合同成立
  CONTRACT_EFFECTIVENESS = 'contract_effectiveness', // 合同生效
  CONTRACT_MODIFICATION = 'contract_modification',   // 合同变更
  CONTRACT_TERMINATION = 'contract_termination',     // 合同解除
  CONTRACT_RESCISSION = 'contract_rescission',       // 合同撤销

  // 履行行为类
  PERFORMANCE_COMPLETE = 'performance_complete',     // 履行完毕
  PERFORMANCE_PARTIAL = 'performance_partial',       // 部分履行
  PERFORMANCE_DEFECTIVE = 'performance_defective',   // 瑕疵履行
  PERFORMANCE_DELAYED = 'performance_delayed',       // 迟延履行
  PERFORMANCE_REFUSED = 'performance_refused',       // 拒绝履行

  // 意思表示类
  OFFER_MADE = 'offer_made',                     // 要约发出
  OFFER_ACCEPTED = 'offer_accepted',             // 承诺生效
  OFFER_REVOKED = 'offer_revoked',               // 要约撤销
  OFFER_WITHDRAWN = 'offer_withdrawn',           // 要约撤回

  // 时效相关类
  LIMITATION_START = 'limitation_start',         // 时效起算
  LIMITATION_INTERRUPTION = 'limitation_interruption', // 时效中断
  LIMITATION_SUSPENSION = 'limitation_suspension',     // 时效中止
  LIMITATION_EXPIRY = 'limitation_expiry',       // 时效届满

  // 程序行为类
  LAWSUIT_FILED = 'lawsuit_filed',               // 起诉
  RESPONSE_FILED = 'response_filed',             // 答辩
  EVIDENCE_SUBMITTED = 'evidence_submitted',     // 举证
  HEARING_HELD = 'hearing_held',                 // 庭审
  JUDGMENT_RENDERED = 'judgment_rendered',       // 判决

  // 损害事实类
  DAMAGE_OCCURRED = 'damage_occurred',           // 损害发生
  DAMAGE_DISCOVERED = 'damage_discovered',       // 损害发现
  DAMAGE_ASSESSED = 'damage_assessed',           // 损害评估

  // 通知行为类
  NOTICE_SENT = 'notice_sent',                   // 通知发出
  NOTICE_RECEIVED = 'notice_received',           // 通知接收
  DEMAND_MADE = 'demand_made',                   // 催告
  WARNING_GIVEN = 'warning_given'               // 警告
}

// ========== 法学专业时间轴事件 ==========

export interface LegalTimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: LegalEventType;

  // 法学专业字段
  legalNature: 'legal_act' | 'factual_act' | 'procedural_act'; // 法律性质
  effectiveDate?: string;                        // 生效日期
  parties: {
    actor: string;                               // 行为人
    recipient?: string;                          // 相对人
    witnesses?: string[];                        // 见证人
  };

  // 证据相关
  evidence: {
    type: 'documentary' | 'physical' | 'testimonial' | 'electronic'; // 证据类型
    description: string;
    authenticity: 'verified' | 'disputed' | 'unknown'; // 真实性
    legality: 'legal' | 'illegal' | 'questionable';   // 合法性
    relevance: 'direct' | 'indirect' | 'circumstantial'; // 关联性
    strength: number; // 证明力强度 0-1
  }[];

  // 法律意义
  legalSignificance: {
    rightsAffected: string[];                    // 影响的权利
    obligationsCreated: string[];               // 产生的义务
    legalConsequences: string[];                // 法律后果
    statuteOfLimitationsImpact?: {              // 时效影响
      action: 'start' | 'interrupt' | 'suspend' | 'none';
      period?: number; // 时效期间（天）
      reason?: string;
    };
  };

  // 争议相关
  disputed: boolean;                             // 是否有争议
  disputeReasons?: string[];                     // 争议理由

  importance: 'critical' | 'high' | 'medium' | 'low';
}

// ========== 法学专业时间轴分析 ==========

export interface LegalTimelineAnalysis {
  // 基础分析
  keyTurningPoints: LegalTurningPoint[];
  legalRelationshipEvolution: LegalRelationshipPhase[];

  // 时效分析
  statuteOfLimitationsAnalysis: StatuteOfLimitationsAnalysis;

  // 证据分析
  evidenceChainAnalysis: LegalEvidenceChainAnalysis;

  // 法律风险
  legalRisks: DetailedLegalRisk[];

  // 争议焦点
  disputeFoci: DisputeFocus[];

  // 行为模式分析
  partyBehaviorAnalysis: PartyBehaviorAnalysis[];

  // 程序合规性
  proceduralCompliance: ProceduralComplianceAnalysis;

  // 案例预测
  casePredictions: DetailedCasePrediction[];

  summary: string;
  confidence: number;
}

// ========== 详细分析类型 ==========

export interface LegalTurningPoint {
  eventId: string;
  date: string;
  description: string;
  legalSignificance: string;
  impact: 'critical' | 'high' | 'medium' | 'low';

  // 法学专业扩展
  legalEffect: {
    rightsChanged: string[];
    obligationsModified: string[];
    relationshipStatus: string;
    remediesAvailable: string[];
  };

  consequences: string[];
  alternativeOutcomes?: string[]; // 如果当时选择不同行为的可能结果
}

export interface StatuteOfLimitationsAnalysis {
  applicablePeriods: {
    claimType: string;
    period: number; // 天数
    startDate: string;
    endDate: string;
    status: 'active' | 'expired' | 'suspended' | 'interrupted';
    remainingDays?: number;
  }[];

  interruptionEvents: {
    date: string;
    event: string;
    newPeriodStart: string;
  }[];

  suspensionPeriods: {
    startDate: string;
    endDate: string;
    reason: string;
  }[];

  risks: {
    type: 'expiry_risk' | 'calculation_dispute';
    description: string;
    mitigation: string;
  }[];
}

export interface LegalEvidenceChainAnalysis {
  evidenceMap: {
    fact: string; // 待证事实
    evidence: {
      eventId: string;
      type: string;
      strength: number;
      reliability: number;
    }[];
    sufficiency: 'sufficient' | 'insufficient' | 'questionable';
  }[];

  burdenOfProof: {
    party: string;
    facts: string[];
    standard: 'preponderance' | 'clear_and_convincing' | 'beyond_reasonable_doubt';
    met: boolean;
  }[];

  evidenceGaps: {
    fact: string;
    missingEvidence: string;
    impact: 'critical' | 'significant' | 'minor';
    suggestions: string[];
  }[];

  credibilityIssues: {
    eventId: string;
    issue: string;
    severity: 'high' | 'medium' | 'low';
  }[];
}

export interface DisputeFocus {
  id: string;
  description: string;
  type: 'factual' | 'legal' | 'procedural';

  positions: {
    party: string;
    stance: string;
    supportingEvents: string[];
    legalBasis: string;
    strength: number;
  }[];

  keyIssues: string[];
  applicableLaw: string[];
  precedents?: string[];

  likelihood: {
    plaintiff: number; // 原告胜诉概率
    defendant: number; // 被告胜诉概率
    settlement: number; // 和解概率
  };
}

export interface PartyBehaviorAnalysis {
  party: string;

  behaviorPattern: {
    consistency: number; // 行为一致性
    predictability: number; // 可预测性
    goodFaith: number; // 诚信度评估
    complianceRate: number; // 合规率
  };

  strategicIntentions: {
    apparent: string[];
    hidden?: string[];
    effectiveness: number;
  };

  riskProfile: {
    legalRisks: string[];
    businessRisks: string[];
    reputationRisks: string[];
  };

  recommendations: string[];
}

export interface ProceduralComplianceAnalysis {
  timeline: {
    procedure: string;
    requiredDate: string;
    actualDate?: string;
    status: 'compliant' | 'delayed' | 'missing';
    consequences?: string[];
  }[];

  documentationQuality: {
    completeness: number;
    accuracy: number;
    timeliness: number;
    formalities: number;
  };

  complianceRisks: {
    type: string;
    severity: 'high' | 'medium' | 'low';
    mitigation: string;
  }[];
}

export interface DetailedCasePrediction {
  scenario: string;
  probability: number;

  outcome: {
    winner: string;
    remedy: string;
    damages?: {
      type: string;
      amount?: number;
      basis: string;
    };
  };

  reasoning: {
    factualFindings: string[];
    legalAnalysis: string[];
    precedents: string[];
    policies: string[];
  };

  keyFactors: {
    supporting: string[];
    opposing: string[];
    neutral: string[];
  };

  alternativeScenarios?: {
    condition: string;
    newProbability: number;
    outcomeChange: string;
  }[];
}

// ========== 请求和响应类型 ==========

export interface LegalTimelineAnalysisRequest {
  events: LegalTimelineEvent[];
  caseType: 'contract' | 'tort' | 'property' | 'family' | 'criminal' | 'administrative';
  jurisdiction: string; // 法域
  analysisType: 'comprehensive' | 'focused' | 'quick';
  focusAreas?: string[];

  options?: {
    enableStatuteAnalysis?: boolean;
    enableEvidenceAnalysis?: boolean;
    enableRiskAssessment?: boolean;
    enablePredictions?: boolean;
    confidenceThreshold?: number;
  };
}

export interface LegalTimelineAnalysisResponse {
  success: boolean;
  data?: {
    analysis: LegalTimelineAnalysis;
    processedEvents: LegalTimelineEvent[];
    legalSuggestions: string[];
    visualData?: LegalVisualizationData;
  };
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  metadata?: {
    processingTime: number;
    eventCount: number;
    analysisMethod: string;
    confidence: number;
    version: string;
    jurisdiction: string;
  };
}

export interface LegalVisualizationData {
  timeline: LegalTimelineEvent[];

  // 法学专业可视化
  legalPhases: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    description: string;
    color: string;
  }[];

  statuteOfLimitationsMap: {
    claimType: string;
    startDate: string;
    endDate: string;
    status: string;
    urgency: 'critical' | 'warning' | 'normal';
  }[];

  evidenceConnections: {
    from: string;
    to: string;
    type: 'supports' | 'contradicts' | 'corroborates';
    strength: number;
  }[];

  disputeAreas: {
    timeRange: {
      start: string;
      end: string;
    };
    intensity: number;
    description: string;
  }[];
}