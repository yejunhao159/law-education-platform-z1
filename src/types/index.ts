/**
 * 统一类型定义导出
 * DeepPractice Standards Compliant
 */

// ========== 共享基础类型 ==========
export * from './shared/base';

// ========== 域类型 ==========
export * from './domains/case-management';
export * from './domains/legal-analysis';
export * from './domains/socratic-dialogue';
export * from './domains/teaching-acts';

// ========== 根目录类型导入 ==========
export type { LegalCase, LawReference, Party as LegalParty } from '../../types/legal-case';
export type { ExtractedData, DateElement, Amount, LegalClause, FactElement, DocumentMetadata } from '../../types/legal-intelligence';

// ========== 工厂函数导出 ==========
// export { createDefaultLegalCase } from './domains/case-management';

// ========== 向后兼容的类型别名 ==========
// 保持与现有代码的兼容性，逐步迁移

export type {
  ThreeElements,
  Facts,
  Evidence,
  EvidenceItem,
  Reasoning,
  TimelineAnalysis,
  LegalAnalysis,
} from './domains/legal-analysis';

export type {
  DialogueSession,
  Message,
  SocraticRequest,
  SocraticResponse,
} from './domains/socratic-dialogue';

export type {
  TeachingSession,
  ActState,
  ActType,
  TeachingProgress,
} from './domains/teaching-acts';

// ========== 常用类型组合 ==========
export interface CaseWithAnalysis {
  case: LegalCase;
  threeElements: ThreeElements;
  analyses: TimelineAnalysis[];
}

export interface TeachingContext {
  session: TeachingSession;
  case: LegalCase;
  progress: TeachingProgress;
  dialogues?: DialogueSession[];
}

// ========== 应用层类型 ==========
export interface AppState {
  currentCase: LegalCase | null;
  currentSession: TeachingSession | null;
  currentDialogue: DialogueSession | null;
  ui: {
    loading: boolean;
    error: string | null;
    theme: 'light' | 'dark' | 'system';
  };
}

// ========== API类型 ==========
export interface ApiEndpoints {
  cases: {
    list: () => Promise<ApiResponse<LegalCase[]>>;
    get: (id: string) => Promise<ApiResponse<LegalCase>>;
    create: (data: Partial<LegalCase>) => Promise<ApiResponse<LegalCase>>;
    update: (id: string, data: Partial<LegalCase>) => Promise<ApiResponse<LegalCase>>;
    delete: (id: string) => Promise<ApiResponse<void>>;
  };
  analysis: {
    timeline: (eventId: string, perspective: ViewPerspective) => Promise<ApiResponse<TimelineAnalysis>>;
    threeElements: (caseId: string) => Promise<ApiResponse<ThreeElements>>;
  };
  socratic: {
    generate: (request: SocraticRequest) => Promise<ApiResponse<SocraticResponse>>;
    sessions: () => Promise<ApiResponse<DialogueSession[]>>;
  };
  teaching: {
    sessions: () => Promise<ApiResponse<TeachingSession[]>>;
    progress: (sessionId: string) => Promise<ApiResponse<TeachingProgress>>;
  };
}