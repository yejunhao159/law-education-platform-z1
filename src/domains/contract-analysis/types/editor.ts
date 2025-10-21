/**
 * 合同编辑器相关类型定义
 */

export interface ContractDocument {
  id: string;
  fileName: string;
  uploadTime: Date;
  originalText: string;
  editedText: string;
  contractType?: string;
  parties?: {
    partyA: string;
    partyB: string;
  };
}

export interface RiskHighlight {
  id: string;
  text: string;
  riskLevel: 'critical' | 'medium' | 'low';
  riskType: string;
  description: string;
  legalBasis?: string;
  consequence?: string;
  position: {
    start: number;
    end: number;
  };
  suggestion: string;
  suggestedText?: string;
}

export interface ClauseCheckResult {
  clauseName: string;
  present: boolean;
  adequacy?: 'sufficient' | 'needs-improvement' | 'inadequate';
  importance: 'critical' | 'important' | 'recommended';
  reason?: string;
  risk?: string;
  suggestion?: string;
}

export interface AIMessage {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
  type?: 'question' | 'suggestion' | 'info' | 'warning';
}

export interface EditorState {
  document: ContractDocument | null;
  risks: RiskHighlight[];
  clauseChecks: ClauseCheckResult[];
  messages: AIMessage[];
  isAnalyzing: boolean;
  analysisProgress: number;
}

export interface ModificationSuggestion {
  id: string;
  riskId: string;
  originalText: string;
  suggestedText: string;
  position: {
    start: number;
    end: number;
  };
  reason: string;
  applied: boolean;
}

export const RISK_COLORS = {
  critical: '#ff6b6b',  // 红色
  medium: '#ffd93d',    // 黄色
  low: '#a8e6cf',       // 绿色
} as const;

export const ESSENTIAL_CLAUSES = [
  '违约责任条款',
  '合同终止条款',
  '交付/履行条款',
  '管辖条款',
  '争议解决条款',
  '法律费用承担条款',
] as const;
