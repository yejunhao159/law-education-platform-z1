// 苏格拉底对话系统类型定义
import { z } from 'zod';

// ==================== 核心数据结构 ====================

// IRAC论证结构
export const TurnSchema = z.object({
  issueId: z.string().min(1, '必须指定争议点'),
  stance: z.enum(['pro', 'con'], { 
    errorMap: () => ({ message: '必须选择正方或反方立场' })
  }),
  
  // IRAC四要素
  issue: z.string().min(10, '争议点描述至少10字'),
  rule: z.string().min(10, '法律规则描述至少10字'),
  application: z.string().min(20, '要件适用分析至少20字'),
  conclusion: z.string().min(5, '结论至少5字'),
  
  // 引用要求
  citedFacts: z.array(z.string()).min(1, '至少引用1条事实'),
  citedLaws: z.array(z.string()).min(1, '至少引用1条法条或判例'),
  
  // 元数据
  timestamp: z.string().datetime().optional(),
  duration: z.number().optional(), // 本轮用时(秒)
});

export type Turn = z.infer<typeof TurnSchema>;
export type TurnDraft = Partial<Turn>;

// ==================== 评分体系 ====================

export interface RubricDimension {
  score: number;      // 0-100
  weight: number;     // 权重
  feedback: string;   // 具体反馈
}

export interface RubricScore {
  total: number;      // 总分
  dims: {
    relevance: RubricDimension;    // 相关性(20%)
    rule: RubricDimension;          // 规则准确性(20%)
    application: RubricDimension;   // 应用深度(30%)
    citation: RubricDimension;      // 证据引用(20%)
    conclusion: RubricDimension;    // 结论清晰度(10%)
  };
  gaps: string[];                  // 缺失要件列表
  actionable: string[];             // 可操作建议(最多3条)
  mustFix?: 'MISSING_CITATION' | 'WRONG_RULE' | 'ELEMENT_GAP' | null;
  overallLevel: 'excellent' | 'good' | 'fair' | 'poor';
}

// ==================== 对抗挑战 ====================

export type ChallengeKind = 'counter' | 'hypothetical' | 'clarification';
export type Hardness = 'easy' | 'medium' | 'hard';

export interface Challenge {
  kind: ChallengeKind;
  prompt: string;
  targetElement?: string;  // 针对哪个要件/事实
  suggestedResponse?: string; // 参考回应
}

// ==================== SSE事件流 ====================

export type SocraticEvent = 
  | { type: 'coach'; tips: string[] }
  | { type: 'score'; rubric: RubricScore }
  | { type: 'challenge'; challenge: Challenge }
  | { type: 'arg_patch'; patch: ArgumentNode[] }
  | { type: 'warning'; code: WarningCode; message: string }
  | { type: 'element_check'; covered: string[]; missing: string[] }
  | { type: 'summary'; text: string; misconceptions: string[] }
  | { type: 'timer'; remaining: number }
  | { type: 'end'; reason?: 'complete' | 'timeout' | 'abort' };

export type WarningCode = 
  | 'MISSING_CITATION'
  | 'WRONG_RULE'
  | 'ELEMENT_GAP'
  | 'OFF_TOPIC'
  | 'CIRCULAR_REASONING';

// ==================== 论证树结构 ====================

export interface ArgumentNode {
  id: string;
  type: 'claim' | 'reason' | 'evidence' | 'counter';
  content: string;
  stance: 'pro' | 'con';
  parentId?: string;
  cited?: string[];  // 引用的事实/法条ID
  strength?: number; // 论证强度 0-1
}

// ==================== 要件覆盖追踪 ====================

export interface ElementCoverage {
  elementId: string;
  elementName: string;
  required: boolean;
  covered: boolean;
  coveredBy?: string[]; // 哪些Turn覆盖了此要件
  guidingQuestion?: string; // 引导问题
}

// ==================== 会话管理 ====================

export interface SocraticSession {
  id: string;
  caseId: string;
  issueId: string;
  userId: string;
  
  turns: Turn[];
  scores: RubricScore[];
  challenges: Challenge[];
  argumentTree: ArgumentNode[];
  elementCoverage: ElementCoverage[];
  
  startTime: string;
  endTime?: string;
  status: 'active' | 'paused' | 'completed';
  
  // 难度控制
  currentHardness: Hardness;
  performanceHistory: number[]; // 最近N轮的得分
  
  // 统计指标
  metrics?: {
    firstCitationTime?: number;  // 首次正确引用时间
    elementCoverageRate: number; // 要件覆盖率
    resilienceScore?: number;    // 对抗弹性分
    avgResponseTime: number;     // 平均响应时间
  };
}

// ==================== 案例与法源 ====================

export interface Fact {
  id: string;
  content: string;
  category: 'background' | 'key' | 'evidence' | 'disputed';
  timestamp?: string;
  relatedParties?: string[];
}

export interface Law {
  id: string;
  title: string;
  content: string;
  type: 'statute' | 'regulation' | 'precedent';
  elements?: string[]; // 构成要件
  source?: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  elements: string[]; // 需要论证的要件
  relatedLaws: string[]; // 相关法条ID
  difficulty: Hardness;
}

// ==================== 配置与设置 ====================

export interface SocraticConfig {
  // 时间控制
  roundDuration: number;      // 每轮时长(秒)
  totalRounds?: number;        // 总轮数限制
  
  // 难度设置
  initialHardness: Hardness;
  adaptiveDifficulty: boolean;
  
  // 引用要求
  minFactCitations: number;
  minLawCitations: number;
  citationEnforcement: 'strict' | 'loose';
  
  // 反馈设置
  instantFeedback: boolean;
  showRubricDetails: boolean;
  
  // UI选项
  enableTimer: boolean;
  enableHeatmap: boolean;
  enableArgumentTree: boolean;
  
  // 教学模式
  mode: 'guided' | 'practice' | 'exam';
}