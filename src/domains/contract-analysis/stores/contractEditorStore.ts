/**
 * 合同编辑器状态管理
 */

import { create } from 'zustand';
import type {
  ContractDocument,
  RiskHighlight,
  ClauseCheckResult,
  AIMessage,
  EditorState,
} from '../types/editor';
import type { ParsedContract } from '../types/analysis';

interface ContractEditorStore extends EditorState {
  // 新增：解析结果和状态
  parsedContract: ParsedContract | null;
  analysisStatus: 'idle' | 'analyzing' | 'completed' | 'failed';

  // Actions
  setDocument: (document: ContractDocument) => void;
  updateEditedText: (text: string) => void;
  setRisks: (risks: RiskHighlight[]) => void;
  addRisk: (risk: RiskHighlight) => void;
  removeRisk: (riskId: string) => void;
  setClauseChecks: (checks: ClauseCheckResult[]) => void;
  addMessage: (message: Omit<AIMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setAnalysisProgress: (progress: number) => void;

  // 新增：解析相关 actions
  setParsedContract: (parsed: ParsedContract) => void;
  setAnalysisStatus: (status: 'idle' | 'analyzing' | 'completed' | 'failed') => void;

  reset: () => void;
}

const initialState: EditorState = {
  document: null,
  risks: [],
  clauseChecks: [],
  messages: [],
  isAnalyzing: false,
  analysisProgress: 0,
};

// 扩展初始状态（包含新增字段）
const extendedInitialState = {
  ...initialState,
  parsedContract: null as ParsedContract | null,
  analysisStatus: 'idle' as 'idle' | 'analyzing' | 'completed' | 'failed',
};

export const useContractEditorStore = create<ContractEditorStore>((set) => ({
  ...extendedInitialState,

  setDocument: (document) => set({ document }),

  updateEditedText: (text) =>
    set((state) => ({
      document: state.document
        ? { ...state.document, editedText: text }
        : null,
    })),

  setRisks: (risks) => set({ risks }),

  addRisk: (risk) =>
    set((state) => ({
      risks: [...state.risks, risk],
    })),

  removeRisk: (riskId) =>
    set((state) => ({
      risks: state.risks.filter((r) => r.id !== riskId),
    })),

  setClauseChecks: (checks) => set({ clauseChecks: checks }),

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: `msg-${Date.now()}-${Math.random()}`,
          timestamp: new Date(),
        },
      ],
    })),

  clearMessages: () => set({ messages: [] }),

  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),

  setAnalysisProgress: (progress) => set({ analysisProgress: progress }),

  // 新增：解析相关 actions
  setParsedContract: (parsed) => set({ parsedContract: parsed }),

  setAnalysisStatus: (status) => set({ analysisStatus: status }),

  reset: () => set(extendedInitialState),
}));
