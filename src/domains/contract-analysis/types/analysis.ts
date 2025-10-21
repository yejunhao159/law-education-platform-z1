/**
 * 合同分析相关类型定义
 */

/**
 * 合同解析结果
 */
export interface ParsedContract {
  // 元数据
  metadata: {
    contractType: '买卖' | '租赁' | '服务' | '劳动' | '加盟' | '其他';
    parties: {
      partyA: { name: string; role: '甲方' | '乙方' };
      partyB: { name: string; role: '甲方' | '乙方' };
    };
    signDate?: string;
    effectiveDate?: string;
  };

  // 条款列表
  clauses: Clause[];

  // 原始文本
  rawText: string;

  // 提取置信度 (0-1)
  extractionConfidence: number;
}

/**
 * 合同条款
 */
export interface Clause {
  id: string;
  title: string; // 如："第三条 违约责任"
  content: string; // 条款完整内容
  category: ClauseCategory;
  position: {
    start: number;
    end: number;
  };
}

/**
 * 条款分类
 */
export type ClauseCategory =
  | '违约责任'
  | '合同终止'
  | '交付履行'
  | '管辖条款'
  | '争议解决'
  | '费用承担'
  | '其他';

/**
 * 风险分析结果
 */
export interface RiskAnalysisResult {
  overallRiskLevel: 'high' | 'medium' | 'low';
  riskyClauseCount: number;
  risks: Risk[];
  summary: string; // 风险总结（100字以内）
}

/**
 * 风险项
 */
export interface Risk {
  clauseId: string;
  clauseTitle: string;
  clauseContent: string;
  riskType: '霸王条款' | '违约责任不对等' | '管辖不利' | '费用承担不公' | '其他';
  riskLevel: 'critical' | 'medium' | 'low';
  description: string; // 为什么有风险
  legalBasis: string; // 法律依据（如《民法典》第497条）
  consequence: string; // 可能的后果
  negotiationSuggestion: string; // 协商建议
}

/**
 * 条款检查结果
 */
export interface ClauseCheckResult {
  missingClauses: MissingClause[];
  presentClauses: PresentClause[];
  completenessScore: number; // 0-100，条款完整度评分
}

/**
 * 缺失的条款
 */
export interface MissingClause {
  name: string;
  importance: 'critical' | 'important' | 'recommended';
  reason: string; // 为什么重要
  risk: string; // 缺失的风险
  suggestion: string; // 建议增加的条款内容
}

/**
 * 存在的条款
 */
export interface PresentClause {
  name: string;
  clauseId: string;
  adequacy: 'sufficient' | 'needs-improvement' | 'inadequate';
  improvement?: string; // 改进建议
}

/**
 * 6大核心条款常量
 */
export const ESSENTIAL_CLAUSES = [
  '违约责任条款',
  '合同终止条款',
  '交付/履行条款',
  '管辖条款',
  '争议解决条款',
  '法律费用承担条款',
] as const;
