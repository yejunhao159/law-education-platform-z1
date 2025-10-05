/**
 * 四幕教学域状态管理
 * DeepPractice Standards Compliant
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';

import type {
  ActType,
  ActState,
  TeachingProgress,
  TeachingSession,
  StoryChapter,
  DeepAnalysisResult,
  LearningReport,
  CaseLearningReport,
} from '@/src/types';

// ========== 接口定义 ==========
interface TeachingState {
  // 当前会话状态
  currentSession: TeachingSession | null;
  currentAct: ActType;
  progress: TeachingProgress | null;

  // 各幕的数据状态
  uploadData: {
    extractedElements: Record<string, unknown> | null;
    confidence: number;
  };

  analysisData: {
    result: DeepAnalysisResult | null;
    isAnalyzing: boolean;
  };

  socraticData: {
    isActive: boolean;
    level: 1 | 2 | 3;
    teachingModeEnabled: boolean;
    completedNodes: Set<string>;
  };

  summaryData: {
    report: LearningReport | CaseLearningReport | null;
    caseLearningReport: CaseLearningReport | null;
    isGenerating: boolean;
  };

  // 第二幕特有状态
  storyMode: boolean;
  storyChapters: StoryChapter[];
  editingFields: Set<string>;
  autoTransition: boolean;

  // UI状态
  loading: boolean;
  error: string | null;
}

interface TeachingActions {
  // 会话管理
  setCurrentSession: (session: TeachingSession | null) => void;
  updateSessionProgress: (progress: Partial<TeachingProgress>) => void;

  // 幕转换
  setCurrentAct: (act: ActType) => void;
  markActComplete: (act: ActType) => void;
  markActInProgress: (act: ActType) => void;
  canAdvanceToAct: (act: ActType) => boolean;
  getNextAct: () => ActType | null;

  // 第一幕：案例导入
  setExtractedElements: (elements: Record<string, unknown>, confidence: number) => void;
  clearUploadData: () => void;

  // 第二幕：深度分析
  setAnalysisResult: (result: DeepAnalysisResult) => void;
  setAnalyzing: (analyzing: boolean) => void;
  toggleStoryMode: () => void;
  setStoryChapters: (chapters: StoryChapter[]) => void;
  updateStoryChapter: (id: string, content: string) => void;
  setEditingField: (field: string, editing: boolean) => void;
  setAutoTransition: (enabled: boolean) => void;

  // 第三幕：苏格拉底讨论
  setSocraticActive: (active: boolean) => void;
  progressSocraticLevel: () => void;
  resetSocraticLevel: () => void;
  toggleTeachingMode: () => void;
  markNodeComplete: (nodeId: string) => void;
  clearCompletedNodes: () => void;

  // 第四幕：总结提升
  setLearningReport: (report: LearningReport) => void;
  setCaseLearningReport: (report: CaseLearningReport) => void;
  setGeneratingReport: (generating: boolean) => void;

  // 通用操作
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type TeachingStore = TeachingState & TeachingActions;

// ========== 初始状态 ==========
const initialState: TeachingState = {
  currentSession: null,
  currentAct: 'upload',
  progress: null,

  uploadData: {
    extractedElements: null,
    confidence: 0,
  },

  analysisData: {
    result: null,
    isAnalyzing: false,
  },

  socraticData: {
    isActive: false,
    level: 1,
    teachingModeEnabled: false,
    completedNodes: new Set(),
  },

  summaryData: {
    report: null,
    caseLearningReport: null,
    isGenerating: false,
  },

  storyMode: true,  // 默认开启故事模式以自动生成AI叙事
  storyChapters: [],
  editingFields: new Set(),
  autoTransition: true,

  loading: false,
  error: null,
};

// ========== Store创建 ==========
export const useTeachingStore = create<TeachingStore>()(
  persist(
    immer((set, get) => ({
      // 初始状态
      ...initialState,

      // 会话管理
      setCurrentSession: (session) =>
        set((state) => {
          state.currentSession = session;
          if (session?.progress) {
            state.progress = session.progress;
            state.currentAct = session.progress.currentAct;
          }
        }),

      updateSessionProgress: (progressUpdate) =>
        set((state) => {
          if (state.progress) {
            Object.assign(state.progress, progressUpdate);
          }
        }),

      // 幕转换
      setCurrentAct: (act) =>
        set((state) => {
          state.currentAct = act;
          if (state.progress) {
            state.progress.currentAct = act;
          }
        }),

      markActComplete: (act) =>
        set((state) => {
          if (state.progress) {
            const actState = state.progress.acts.find((a) => a.actId === act);
            if (actState) {
              actState.status = 'completed';
              actState.completedAt = new Date().toISOString();
              actState.progress = 100;
            }
          }
        }),

      markActInProgress: (act) =>
        set((state) => {
          if (state.progress) {
            const actState = state.progress.acts.find((a) => a.actId === act);
            if (actState) {
              actState.status = 'in_progress';
              actState.startedAt = new Date().toISOString();
            }
          }
        }),

      canAdvanceToAct: (act) => {
        const state = get();
        if (!state.progress) return false;

        const completedActs = state.progress.acts
          .filter((a) => a.status === 'completed')
          .map((a) => a.actId);

        // 实现前置条件检查逻辑
        const prerequisites: Record<ActType, ActType[]> = {
          upload: [],
          analysis: ['upload'],
          socratic: ['upload', 'analysis'],
          summary: ['upload', 'analysis', 'socratic'],
        };

        return (prerequisites[act] || []).every((prereq) => completedActs.includes(prereq));
      },

      getNextAct: () => {
        const state = get();
        const acts: ActType[] = ['upload', 'analysis', 'socratic', 'summary'];
        const currentIndex = acts.indexOf(state.currentAct);
        return currentIndex < acts.length - 1 ? acts[currentIndex + 1]! : null;
      },

      // 第一幕：案例导入
      setExtractedElements: (elements, confidence) =>
        set((state) => {
          state.uploadData.extractedElements = elements;
          state.uploadData.confidence = confidence;
        }),

      clearUploadData: () =>
        set((state) => {
          state.uploadData.extractedElements = null;
          state.uploadData.confidence = 0;
        }),

      // 第二幕：深度分析
      setAnalysisResult: (result) =>
        set((state) => {
          state.analysisData.result = result;
          state.analysisData.isAnalyzing = false;
        }),

      setAnalyzing: (analyzing) =>
        set((state) => {
          state.analysisData.isAnalyzing = analyzing;
        }),

      toggleStoryMode: () =>
        set((state) => {
          state.storyMode = !state.storyMode;
        }),

      setStoryChapters: (chapters) =>
        set((state) => {
          state.storyChapters = chapters;
        }),

      updateStoryChapter: (id, content) =>
        set((state) => {
          const chapter = state.storyChapters.find((c) => c.id === id);
          if (chapter) {
            chapter.content = content;
          }
        }),

      setEditingField: (field, editing) =>
        set((state) => {
          if (editing) {
            state.editingFields.add(field);
          } else {
            state.editingFields.delete(field);
          }
        }),

      setAutoTransition: (enabled) =>
        set((state) => {
          state.autoTransition = enabled;
        }),

      // 第三幕：苏格拉底讨论
      setSocraticActive: (active) =>
        set((state) => {
          state.socraticData.isActive = active;
        }),

      progressSocraticLevel: () =>
        set((state) => {
          if (state.socraticData.level < 3) {
            state.socraticData.level = (state.socraticData.level + 1) as 1 | 2 | 3;
          }
        }),

      resetSocraticLevel: () =>
        set((state) => {
          state.socraticData.level = 1;
        }),

      toggleTeachingMode: () =>
        set((state) => {
          state.socraticData.teachingModeEnabled = !state.socraticData.teachingModeEnabled;
        }),

      markNodeComplete: (nodeId) =>
        set((state) => {
          state.socraticData.completedNodes.add(nodeId);
        }),

      clearCompletedNodes: () =>
        set((state) => {
          state.socraticData.completedNodes.clear();
        }),

      // 第四幕：总结提升
      setLearningReport: (report) =>
        set((state) => {
          state.summaryData.report = report;
          state.summaryData.isGenerating = false;
        }),
        
      setCaseLearningReport: (report) =>
        set((state) => {
          state.summaryData.caseLearningReport = report;
          state.summaryData.isGenerating = false;
        }),

      setGeneratingReport: (generating) =>
        set((state) => {
          state.summaryData.isGenerating = generating;
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
          socraticData: {
            ...initialState.socraticData,
            completedNodes: new Set(),
          },
          editingFields: new Set(),
        })),
    })),
    {
      name: 'teaching-store',
      partialize: (state) => ({
        currentAct: state.currentAct,
        progress: state.progress,
        storyMode: state.storyMode,
        // 🚨 移除 storyChapters 的持久化，防止缓存问题
        // storyChapters: state.storyChapters,  // 不再持久化故事章节
        autoTransition: state.autoTransition,
        socraticData: {
          ...state.socraticData,
          completedNodes: Array.from(state.socraticData.completedNodes),
        },
      }),
      // 恢复时处理Set类型
      onRehydrateStorage: () => (state) => {
        if (state?.socraticData?.completedNodes) {
          state.socraticData.completedNodes = new Set(
            state.socraticData.completedNodes as string[]
          );
        }
        if (!state?.editingFields) {
          state.editingFields = new Set();
        }
      },
    }
  )
);

// ========== 选择器 Hooks ==========
export const useCurrentAct = () => useTeachingStore((state) => state.currentAct);
export const useTeachingProgress = () => useTeachingStore((state) => state.progress);
export const useCurrentSession = () => useTeachingStore((state) => state.currentSession);
export const useStoryMode = () => useTeachingStore((state) => state.storyMode);
export const useSocraticLevel = () => useTeachingStore((state) => state.socraticData.level);

// ========== 操作 Hooks ==========
export const useTeachingActions = () => {
  const store = useTeachingStore();
  return {
    setCurrentSession: store.setCurrentSession,
    setCurrentAct: store.setCurrentAct,
    markActComplete: store.markActComplete,
    canAdvanceToAct: store.canAdvanceToAct,
    getNextAct: store.getNextAct,
    toggleStoryMode: store.toggleStoryMode,
    progressSocraticLevel: store.progressSocraticLevel,
    toggleTeachingMode: store.toggleTeachingMode,
    reset: store.reset,
  };
};