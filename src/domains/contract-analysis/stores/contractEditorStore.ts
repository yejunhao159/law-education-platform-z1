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

interface ContractEditorStore extends EditorState {
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

export const useContractEditorStore = create<ContractEditorStore>((set) => ({
  ...initialState,

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

  reset: () => set(initialState),
}));
