/**
 * 遗留Store兼容性桥接
 * 确保现有组件能够平滑迁移到新的DDD架构
 */

import {
  useCaseManagementStore,
  useTeachingStore,
  useSocraticStore,
  useAnalysisStore,
} from '@/src/domains/stores';

import type { LegalCase, TimelineEvent, EvidenceItem, TimelineAnalysis } from '@/src/types';

// ========== 向后兼容的Store接口 ==========
// 模拟原始巨型Store的接口，但内部调用新的领域Store

export interface LegacyStoreState {
  // 核心数据
  caseData: LegalCase | null;
  currentAct: string;
  actProgress: Record<string, boolean>;

  // 时间轴分析状态
  analysisComplete: boolean;
  socraticLevel: 1 | 2 | 3;
  timelineAnalyses: Map<string, TimelineAnalysis>;
  selectedTimelineNode: string | null;
  timelinePerspective: 'neutral' | 'plaintiff' | 'defendant' | 'judge';
  teachingModeEnabled: boolean;
  completedLearningNodes: Set<string>;

  // 请求权分析状态
  claimAnalysis: Record<string, unknown> | null;
  timelineViewMode: 'simple' | 'enhanced' | 'analysis';
  selectedClaim: string | null;
  isAnalyzingClaims: boolean;
  claimHighlights: Set<string>;

  // 事实认定状态
  factDisputes: Map<string, 'agreed' | 'partial' | 'disputed'>;
  evidenceLinks: Map<string, string[]>;
  annotations: Map<string, string>;
  timelineView: 'vertical' | 'horizontal';
  comparisonMode: boolean;

  // 案情导入状态
  storyMode: boolean;
  storyChapters: Array<{
    id: string;
    title: string;
    content: string;
    icon?: string;
    color?: string;
  }>;
  editingFields: Set<string>;
  autoTransition: boolean;
}

export interface LegacyStoreActions {
  // 核心Actions
  setCaseData: (data: LegalCase) => void;
  setCurrentAct: (act: string) => void;
  markActComplete: (act: string) => void;
  resetStore: () => void;

  // 事实认定Actions
  markFactDispute: (factId: string, level: 'agreed' | 'partial' | 'disputed') => void;
  linkEvidence: (factId: string, evidenceId: string) => void;
  unlinkEvidence: (factId: string, evidenceId: string) => void;
  addAnnotation: (id: string, text: string) => void;
  removeAnnotation: (id: string) => void;
  setTimelineView: (view: 'vertical' | 'horizontal') => void;
  toggleComparisonMode: () => void;

  // 案情导入Actions
  toggleStoryMode: () => void;
  generateStoryChapters: () => void;
  updateStoryChapter: (id: string, content: string) => void;
  setEditingField: (field: string, isEditing: boolean) => void;
  setAutoTransition: (enabled: boolean) => void;

  // 时间轴分析Actions
  markAnalysisComplete: () => void;
  progressSocraticLevel: () => void;
  setTimelinePerspective: (perspective: 'neutral' | 'plaintiff' | 'defendant' | 'judge') => void;
  setSelectedTimelineNode: (nodeId: string | null) => void;
  cacheTimelineAnalysis: (key: string, analysis: TimelineAnalysis) => void;
  toggleTeachingMode: () => void;
  markLearningNodeComplete: (nodeId: string) => void;

  // 请求权分析Actions
  setClaimAnalysis: (analysis: Record<string, unknown> | null) => void;
  clearClaimAnalysis: () => void;
  setTimelineViewMode: (mode: 'simple' | 'enhanced' | 'analysis') => void;
  toggleTimelineViewMode: () => void;
  setSelectedClaim: (claimId: string | null) => void;
  setIsAnalyzingClaims: (analyzing: boolean) => void;
  toggleClaimHighlight: (claimId: string) => void;
  clearClaimHighlights: () => void;

  // 计算属性
  getDisputedFacts: () => TimelineEvent[];
  getEvidenceForFact: (factId: string) => EvidenceItem[];
  getCurrentActData: () => unknown;
  isActComplete: (act: string) => boolean;
}

// ========== 兼容性Store实现 ==========
// 注意：这个实现已被 /src/domains/compatibility.ts 替代，避免重复定义
export const useCaseStoreLegacy = (): LegacyStoreState & LegacyStoreActions => {
  // 获取各个领域Store的状态和方法
  const caseStore = useCaseManagementStore();
  const teachingStore = useTeachingStore();
  const socraticStore = useSocraticStore();
  const analysisStore = useAnalysisStore();

  // 映射状态
  const state: LegacyStoreState = {
    // 从案例管理域获取
    caseData: caseStore.currentCase,

    // 从教学域获取
    currentAct: teachingStore.currentAct,
    actProgress: teachingStore.progress ?
      Object.fromEntries(teachingStore.progress.acts.map(act => [act.actId, act.status === 'completed'])) : {},
    storyMode: teachingStore.storyMode,
    storyChapters: teachingStore.storyChapters,
    editingFields: teachingStore.editingFields,
    autoTransition: teachingStore.autoTransition,

    // 从苏格拉底域获取
    socraticLevel: socraticStore.currentLevel === 'basic' ? 1 :
                   socraticStore.currentLevel === 'intermediate' ? 2 : 3,
    teachingModeEnabled: socraticStore.teacherMode,

    // 从分析域获取
    analysisComplete: analysisStore.analysisComplete,
    timelineAnalyses: analysisStore.timelineAnalyses,
    selectedTimelineNode: analysisStore.selectedTimelineNode,
    timelinePerspective: analysisStore.currentPerspective,
    claimAnalysis: analysisStore.claimAnalysis,
    timelineViewMode: analysisStore.timelineViewMode,
    selectedClaim: analysisStore.selectedClaim,
    isAnalyzingClaims: analysisStore.isAnalyzingClaims,
    claimHighlights: analysisStore.claimHighlights,
    factDisputes: analysisStore.factDisputes,
    evidenceLinks: analysisStore.evidenceLinks,
    annotations: analysisStore.annotations,
    timelineView: analysisStore.timelineView,
    comparisonMode: analysisStore.comparisonMode,

    // 模拟的状态
    completedLearningNodes: new Set(),
  };

  // 映射Actions
  const actions: LegacyStoreActions = {
    // 核心Actions
    setCaseData: caseStore.setCurrentCase,
    setCurrentAct: (act: string) => teachingStore.setCurrentAct(act as any),
    markActComplete: (act: string) => teachingStore.markActComplete(act as any),
    resetStore: () => {
      caseStore.reset();
      teachingStore.reset();
      socraticStore.reset();
      analysisStore.reset();
    },

    // 事实认定Actions
    markFactDispute: analysisStore.markFactDispute,
    linkEvidence: analysisStore.linkEvidence,
    unlinkEvidence: analysisStore.unlinkEvidence,
    addAnnotation: analysisStore.addAnnotation,
    removeAnnotation: analysisStore.removeAnnotation,
    setTimelineView: analysisStore.setTimelineView,
    toggleComparisonMode: analysisStore.toggleComparisonMode,

    // 案情导入Actions
    toggleStoryMode: teachingStore.toggleStoryMode,
    generateStoryChapters: () => {
      // 这里需要调用服务层生成章节，暂时空实现
    },
    updateStoryChapter: teachingStore.updateStoryChapter,
    setEditingField: teachingStore.setEditingField,
    setAutoTransition: teachingStore.setAutoTransition,

    // 时间轴分析Actions
    markAnalysisComplete: analysisStore.markAnalysisComplete,
    progressSocraticLevel: () => {
      // 映射苏格拉底等级
      const currentLevel = socraticStore.currentLevel;
      if (currentLevel === 'basic') {
        socraticStore.setLevel('intermediate');
      } else if (currentLevel === 'intermediate') {
        socraticStore.setLevel('advanced');
      }
    },
    setTimelinePerspective: analysisStore.setPerspective,
    setSelectedTimelineNode: analysisStore.setSelectedTimelineNode,
    cacheTimelineAnalysis: (key, analysis) => {
      analysisStore.setTimelineAnalysis(key, analysis);
    },
    toggleTeachingMode: socraticStore.toggleTeacherMode,
    markLearningNodeComplete: () => {
      // 暂时空实现
    },

    // 请求权分析Actions
    setClaimAnalysis: analysisStore.setClaimAnalysis,
    clearClaimAnalysis: () => analysisStore.setClaimAnalysis(null),
    setTimelineViewMode: analysisStore.setTimelineViewMode,
    toggleTimelineViewMode: () => {
      const current = analysisStore.timelineViewMode;
      const modes: Array<'simple' | 'enhanced' | 'analysis'> = ['simple', 'enhanced', 'analysis'];
      const currentIndex = modes.indexOf(current);
      const nextMode = modes[(currentIndex + 1) % modes.length]!;
      analysisStore.setTimelineViewMode(nextMode);
    },
    setSelectedClaim: analysisStore.setSelectedClaim,
    setIsAnalyzingClaims: analysisStore.setIsAnalyzingClaims,
    toggleClaimHighlight: analysisStore.toggleClaimHighlight,
    clearClaimHighlights: analysisStore.clearClaimHighlights,

    // 计算属性
    getDisputedFacts: () => {
      if (!state.caseData?.timeline) return [];
      return state.caseData.timeline.filter(event => {
        const eventKey = `${event.date}_${event.event || ''}`;
        const disputeLevel = state.factDisputes.get(eventKey);
        return disputeLevel === 'disputed' || disputeLevel === 'partial';
      });
    },
    getEvidenceForFact: (factId: string) => {
      const linkedIds = state.evidenceLinks.get(factId) || [];
      // 这里需要从案例数据中获取证据项，暂时返回空数组
      return [];
    },
    getCurrentActData: () => {
      // 根据当前幕返回相应数据
      switch (state.currentAct) {
        case 'upload':
          return teachingStore.uploadData;
        case 'analysis':
          return teachingStore.analysisData;
        case 'socratic':
          return teachingStore.socraticData;
        case 'summary':
          return teachingStore.summaryData;
        default:
          return null;
      }
    },
    isActComplete: (act: string) => {
      return state.actProgress[act] || false;
    },
  };

  return {
    ...state,
    ...actions,
  };
};

// ========== 导出兼容性Hooks ==========
export const useCaseData = () => {
  const { caseData } = useCaseStore();
  return caseData;
};

export const useCurrentAct = () => {
  const { currentAct } = useCaseStore();
  return currentAct;
};

export const useStoryMode = () => {
  const { storyMode } = useCaseStore();
  return storyMode;
};

export const useFactDisputes = () => {
  const { factDisputes } = useCaseStore();
  return factDisputes;
};

export const useEvidenceLinks = () => {
  const { evidenceLinks } = useCaseStore();
  return evidenceLinks;
};

export const useClaimAnalysis = () => {
  const { claimAnalysis } = useCaseStore();
  return claimAnalysis;
};

export const useTimelineViewMode = () => {
  const { timelineViewMode } = useCaseStore();
  return timelineViewMode;
};

export const useIsAnalyzingClaims = () => {
  const { isAnalyzingClaims } = useCaseStore();
  return isAnalyzingClaims;
};