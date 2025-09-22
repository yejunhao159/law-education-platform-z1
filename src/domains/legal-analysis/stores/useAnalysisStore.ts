/**
 * 法律分析域状态管理
 * DeepPractice Standards Compliant
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { enableMapSet } from 'immer';

import type {
  TimelineAnalysis,
  ThreeElements,
  ViewPerspective,
  ImportanceLevel,
  EvidenceItem,
} from '@/src/types';

// 启用Immer的MapSet插件
enableMapSet();

// ========== 争议级别类型 ==========
export type DisputeLevel = 'agreed' | 'partial' | 'disputed';

// ========== 接口定义 ==========
interface AnalysisState {
  // 时间轴分析状态
  timelineAnalyses: Map<string, TimelineAnalysis>;
  analysisLoading: Map<string, boolean>;
  selectedTimelineNode: string | null;
  currentPerspective: ViewPerspective;

  // 三要素分析状态
  threeElements: ThreeElements | null;
  analysisComplete: boolean;

  // 事实认定状态
  factDisputes: Map<string, DisputeLevel>;
  evidenceLinks: Map<string, string[]>;
  annotations: Map<string, string>;

  // 视图状态
  timelineView: 'vertical' | 'horizontal';
  comparisonMode: boolean;

  // 请求权分析状态（保持兼容性）
  claimAnalysis: Record<string, unknown> | null;
  timelineViewMode: 'simple' | 'enhanced' | 'analysis';
  selectedClaim: string | null;
  isAnalyzingClaims: boolean;
  claimHighlights: Set<string>;

  // UI状态
  loading: boolean;
  error: string | null;
}

interface AnalysisActions {
  // 时间轴分析
  setTimelineAnalysis: (eventId: string, analysis: TimelineAnalysis) => void;
  getTimelineAnalysis: (eventId: string) => TimelineAnalysis | undefined;
  setAnalysisLoading: (eventId: string, loading: boolean) => void;
  isAnalysisLoading: (eventId: string) => boolean;
  clearAnalysisCache: () => void;
  cacheAnalysis: (key: string, analysis: TimelineAnalysis) => void;

  // 视角和节点选择
  setPerspective: (perspective: ViewPerspective) => void;
  setSelectedTimelineNode: (nodeId: string | null) => void;

  // 三要素分析
  setThreeElements: (elements: ThreeElements) => void;
  markAnalysisComplete: () => void;
  resetAnalysis: () => void;

  // 事实认定
  markFactDispute: (factId: string, level: DisputeLevel) => void;
  getFactDisputeLevel: (factId: string) => DisputeLevel | undefined;
  linkEvidence: (factId: string, evidenceId: string) => void;
  unlinkEvidence: (factId: string, evidenceId: string) => void;
  getLinkedEvidence: (factId: string) => string[];
  addAnnotation: (id: string, text: string) => void;
  removeAnnotation: (id: string) => void;
  getAnnotation: (id: string) => string | undefined;

  // 视图控制
  setTimelineView: (view: 'vertical' | 'horizontal') => void;
  toggleComparisonMode: () => void;

  // 请求权分析（兼容性）
  setClaimAnalysis: (analysis: Record<string, unknown> | null) => void;
  setTimelineViewMode: (mode: 'simple' | 'enhanced' | 'analysis') => void;
  setSelectedClaim: (claimId: string | null) => void;
  setIsAnalyzingClaims: (analyzing: boolean) => void;
  toggleClaimHighlight: (claimId: string) => void;
  clearClaimHighlights: () => void;

  // 通用操作
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type AnalysisStore = AnalysisState & AnalysisActions;

// ========== 初始状态 ==========
const initialState: AnalysisState = {
  timelineAnalyses: new Map(),
  analysisLoading: new Map(),
  selectedTimelineNode: null,
  currentPerspective: 'neutral',

  threeElements: null,
  analysisComplete: false,

  factDisputes: new Map(),
  evidenceLinks: new Map(),
  annotations: new Map(),

  timelineView: 'vertical',
  comparisonMode: false,

  claimAnalysis: null,
  timelineViewMode: 'simple',
  selectedClaim: null,
  isAnalyzingClaims: false,
  claimHighlights: new Set(),

  loading: false,
  error: null,
};

// ========== Store创建 ==========
export const useAnalysisStore = create<AnalysisStore>()(
  persist(
    immer((set, get) => ({
      // 初始状态
      ...initialState,

      // 时间轴分析
      setTimelineAnalysis: (eventId, analysis) =>
        set((state) => {
          state.timelineAnalyses.set(eventId, analysis);
          state.analysisLoading.delete(eventId);
        }),

      getTimelineAnalysis: (eventId) => {
        return get().timelineAnalyses.get(eventId);
      },

      setAnalysisLoading: (eventId, loading) =>
        set((state) => {
          if (loading) {
            state.analysisLoading.set(eventId, true);
          } else {
            state.analysisLoading.delete(eventId);
          }
        }),

      isAnalysisLoading: (eventId) => {
        return get().analysisLoading.has(eventId);
      },

      clearAnalysisCache: () =>
        set((state) => {
          state.timelineAnalyses.clear();
          state.analysisLoading.clear();
        }),

      cacheAnalysis: (key, analysis) =>
        set((state) => {
          state.timelineAnalyses.set(key, analysis);
        }),

      // 视角和节点选择
      setPerspective: (perspective) =>
        set((state) => {
          state.currentPerspective = perspective;
        }),

      setSelectedTimelineNode: (nodeId) =>
        set((state) => {
          state.selectedTimelineNode = nodeId;
        }),

      // 三要素分析
      setThreeElements: (elements) =>
        set((state) => {
          state.threeElements = elements;
        }),

      markAnalysisComplete: () =>
        set((state) => {
          state.analysisComplete = true;
        }),

      resetAnalysis: () =>
        set((state) => {
          state.threeElements = null;
          state.analysisComplete = false;
          state.timelineAnalyses.clear();
          state.analysisLoading.clear();
        }),

      // 事实认定
      markFactDispute: (factId, level) =>
        set((state) => {
          state.factDisputes.set(factId, level);
        }),

      getFactDisputeLevel: (factId) => {
        return get().factDisputes.get(factId);
      },

      linkEvidence: (factId, evidenceId) =>
        set((state) => {
          const current = state.evidenceLinks.get(factId) || [];
          if (!current.includes(evidenceId)) {
            state.evidenceLinks.set(factId, [...current, evidenceId]);
          }
        }),

      unlinkEvidence: (factId, evidenceId) =>
        set((state) => {
          const current = state.evidenceLinks.get(factId) || [];
          state.evidenceLinks.set(
            factId,
            current.filter((id) => id !== evidenceId)
          );
        }),

      getLinkedEvidence: (factId) => {
        return get().evidenceLinks.get(factId) || [];
      },

      addAnnotation: (id, text) =>
        set((state) => {
          state.annotations.set(id, text);
        }),

      removeAnnotation: (id) =>
        set((state) => {
          state.annotations.delete(id);
        }),

      getAnnotation: (id) => {
        return get().annotations.get(id);
      },

      // 视图控制
      setTimelineView: (view) =>
        set((state) => {
          state.timelineView = view;
        }),

      toggleComparisonMode: () =>
        set((state) => {
          state.comparisonMode = !state.comparisonMode;
        }),

      // 请求权分析（兼容性）
      setClaimAnalysis: (analysis) =>
        set((state) => {
          state.claimAnalysis = analysis;
          state.isAnalyzingClaims = false;
        }),

      setTimelineViewMode: (mode) =>
        set((state) => {
          state.timelineViewMode = mode;
        }),

      setSelectedClaim: (claimId) =>
        set((state) => {
          state.selectedClaim = claimId;
        }),

      setIsAnalyzingClaims: (analyzing) =>
        set((state) => {
          state.isAnalyzingClaims = analyzing;
        }),

      toggleClaimHighlight: (claimId) =>
        set((state) => {
          if (state.claimHighlights.has(claimId)) {
            state.claimHighlights.delete(claimId);
          } else {
            state.claimHighlights.add(claimId);
          }
        }),

      clearClaimHighlights: () =>
        set((state) => {
          state.claimHighlights.clear();
        }),

      // 通用操作
      setLoading: (loading) =>
        set((state) => {
          state.loading = loading;
        }),

      setError: (error) =>
        set((state) => {
          state.error = error;
        }),

      reset: () =>
        set(() => ({
          ...initialState,
          timelineAnalyses: new Map(),
          analysisLoading: new Map(),
          factDisputes: new Map(),
          evidenceLinks: new Map(),
          annotations: new Map(),
          claimHighlights: new Set(),
        })),
    })),
    {
      name: 'analysis-store',
      partialize: (state) => ({
        currentPerspective: state.currentPerspective,
        threeElements: state.threeElements,
        analysisComplete: state.analysisComplete,
        timelineView: state.timelineView,
        comparisonMode: state.comparisonMode,
        timelineViewMode: state.timelineViewMode,
        selectedClaim: state.selectedClaim,
        // Map/Set序列化
        timelineAnalyses: Array.from(state.timelineAnalyses.entries()),
        factDisputes: Array.from(state.factDisputes.entries()),
        evidenceLinks: Array.from(state.evidenceLinks.entries()),
        annotations: Array.from(state.annotations.entries()),
        claimHighlights: Array.from(state.claimHighlights),
      }),
      // 反序列化Map/Set
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.timelineAnalyses = new Map(state.timelineAnalyses as [string, TimelineAnalysis][]);
          state.analysisLoading = new Map();
          state.factDisputes = new Map(state.factDisputes as [string, DisputeLevel][]);
          state.evidenceLinks = new Map(state.evidenceLinks as [string, string[]][]);
          state.annotations = new Map(state.annotations as [string, string][]);
          state.claimHighlights = new Set(state.claimHighlights as string[]);
        }
      },
    }
  )
);

// ========== 选择器 Hooks ==========
export const useTimelineAnalyses = () => useAnalysisStore((state) => state.timelineAnalyses);
export const useCurrentPerspective = () => useAnalysisStore((state) => state.currentPerspective);
export const useSelectedTimelineNode = () => useAnalysisStore((state) => state.selectedTimelineNode);
export const useThreeElements = () => useAnalysisStore((state) => state.threeElements);
export const useAnalysisComplete = () => useAnalysisStore((state) => state.analysisComplete);
export const useTimelineView = () => useAnalysisStore((state) => state.timelineView);
export const useComparisonMode = () => useAnalysisStore((state) => state.comparisonMode);

// ========== 操作 Hooks ==========
export const useAnalysisActions = () => {
  const store = useAnalysisStore();
  return {
    setTimelineAnalysis: store.setTimelineAnalysis,
    getTimelineAnalysis: store.getTimelineAnalysis,
    setAnalysisLoading: store.setAnalysisLoading,
    setPerspective: store.setPerspective,
    setSelectedTimelineNode: store.setSelectedTimelineNode,
    markFactDispute: store.markFactDispute,
    linkEvidence: store.linkEvidence,
    unlinkEvidence: store.unlinkEvidence,
    addAnnotation: store.addAnnotation,
    removeAnnotation: store.removeAnnotation,
    setTimelineView: store.setTimelineView,
    toggleComparisonMode: store.toggleComparisonMode,
    reset: store.reset,
  };
};