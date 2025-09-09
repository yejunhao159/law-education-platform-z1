// CCPM 模块间接口契约
// 所有Claude实例都应遵守这些契约

import { Turn, RubricScore, Challenge, ElementCoverage, Fact, Law } from '../types';

// ==================== 模块A: IRAC编辑器 ====================
export interface EditorModuleContract {
  // 输入
  input: {
    facts: Fact[];
    laws: Law[];
    issueId: string;
    sessionId?: string;
  };
  
  // 输出
  output: {
    onTurnSubmit: (turn: Turn) => void;
    onStanceChange: (stance: 'pro' | 'con') => void;
    onTimeout?: () => void;
  };
  
  // 内部状态
  state: {
    currentTurn: Partial<Turn>;
    timeRemaining: number;
    validationErrors: string[];
  };
}

// ==================== 模块B: SSE交互流 ====================
export interface APIModuleContract {
  // 输入
  input: {
    endpoint: '/api/socratic/session';
    method: 'POST';
    body: {
      caseId: string;
      issueId: string;
      sessionId: string;
      turn: Turn;
    };
  };
  
  // 输出 (SSE Events)
  output: {
    events: Array<
      | { type: 'coach'; tips: string[] }
      | { type: 'score'; rubric: RubricScore }
      | { type: 'challenge'; challenge: Challenge }
      | { type: 'element_check'; covered: string[]; missing: string[] }
      | { type: 'end'; reason?: string }
    >;
  };
  
  // 错误处理
  errors: {
    INVALID_TURN: 'Turn validation failed';
    SESSION_EXPIRED: 'Session has expired';
    RATE_LIMIT: 'Too many requests';
  };
}

// ==================== 模块C: 要件热力图 ====================
export interface HeatmapModuleContract {
  // 输入
  input: {
    elements: string[];
    coverage: ElementCoverage[];
    currentFocus?: string;
  };
  
  // 输出
  output: {
    onElementClick: (elementId: string) => void;
    onRequestGuidance: (elementId: string) => string;
  };
  
  // 视觉状态
  visual: {
    colors: {
      covered: '#10b981';    // green-500
      partial: '#f59e0b';    // amber-500
      missing: '#ef4444';    // red-500
      focused: '#3b82f6';    // blue-500
    };
  };
}

// ==================== 集成契约 ====================
export interface IntegrationContract {
  // 数据流: Editor -> API
  editorToAPI: {
    trigger: 'onTurnSubmit';
    payload: Turn;
    response: 'SSE stream';
  };
  
  // 数据流: API -> Heatmap
  apiToHeatmap: {
    trigger: 'element_check event';
    payload: { covered: string[]; missing: string[] };
    response: 'visual update';
  };
  
  // 数据流: Heatmap -> Editor
  heatmapToEditor: {
    trigger: 'onElementClick';
    payload: { elementId: string; guidingQuestion: string };
    response: 'focus on element in editor';
  };
}

// ==================== Mock数据接口 ====================
export interface MockDataContract {
  facts: Fact[];
  laws: Law[];
  elements: string[];
  sampleTurns: Turn[];
  sampleScores: RubricScore[];
  sampleChallenges: Challenge[];
}
