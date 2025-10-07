/**
 * 旧Store兼容性层
 * DeepPractice Standards Compliant
 */

import { useMemo } from 'react';
import { useCaseManagementStore } from './case-management/stores/useCaseStore';
import { useTeachingStore } from './teaching-acts/stores/useTeachingStore';
import { useSocraticStore } from './socratic-dialogue/stores/useSocraticStore';
import { useAnalysisStore } from './legal-analysis/stores/useAnalysisStore';

// ========== 旧Store兼容性Hook ==========
// 提供旧useCaseStore功能的兼容性实现，使用缓存避免无限循环
export const useCaseStore = () => {
  // 使用精确的 selector 订阅，避免过度订阅
  const currentCase = useCaseManagementStore((state) => state.currentCase);
  const setCurrentCase = useCaseManagementStore((state) => state.setCurrentCase);

  const storyChapters = useTeachingStore((state) => state.storyChapters);
  const setCurrentAct = useTeachingStore((state) => state.setCurrentAct);
  const toggleStoryMode = useTeachingStore((state) => state.toggleStoryMode);
  const updateStoryChapter = useTeachingStore((state) => state.updateStoryChapter);

  // 使用 useMemo 缓存返回对象，确保引用稳定
  return useMemo(() => ({
    // 案例数据
    caseData: currentCase,
    setCaseData: setCurrentCase,

    // 教学流程控制
    setCurrentAct,
    toggleStoryMode,
    generateStoryChapters: () => {
      // 空实现，避免调用不存在的方法
      console.warn('generateStoryChapters: 已弃用，请使用直接的 store 方法');
    },

    // 故事章节
    storyChapters,
    updateStoryChapter,
  }), [
    currentCase,
    setCurrentCase,
    storyChapters,
    setCurrentAct,
    toggleStoryMode,
    updateStoryChapter
  ]);
};

// 从分析域导出，兼容原有的分析相关功能
export const useFactDisputes = () => useAnalysisStore((state) => state.factDisputes);
export const useEvidenceLinks = () => useAnalysisStore((state) => state.evidenceLinks);
export const useClaimAnalysis = () => useAnalysisStore((state) => state.claimAnalysis);
export const useTimelineViewMode = () => useAnalysisStore((state) => state.timelineViewMode);
export const useIsAnalyzingClaims = () => useAnalysisStore((state) => state.isAnalyzingClaims);

// 分析操作函数
export const useAnalysisActions = () => {
  const setClaimAnalysis = useAnalysisStore((state) => state.setClaimAnalysis);
  const setTimelineViewMode = useAnalysisStore((state) => state.setTimelineViewMode);
  const setIsAnalyzingClaims = useAnalysisStore((state) => state.setIsAnalyzingClaims);

  return {
    setClaimAnalysis,
    setTimelineViewMode,
    setIsAnalyzingClaims,
  };
};

// ========== 组合Store Hook ==========
// 提供一个组合多个域状态的Hook，用于需要跨域数据的组件
export const useAppState = () => {
  const currentCase = useCaseManagementStore((state: any) => state.currentCase);
  const currentSession = useTeachingStore((state: any) => state.currentSession);
  const currentDialogue = useSocraticStore((state: any) => state.currentDialogueSession);
  const analysisComplete = useAnalysisStore((state: any) => state.analysisComplete);
  const currentAct = useTeachingStore((state: any) => state.currentAct);

  return {
    case: currentCase,
    session: currentSession,
    dialogue: currentDialogue,
    analysisComplete,
    currentAct,
  };
};

// ========== 全局操作Hook ==========
// 提供全局重置操作
export const useGlobalActions = () => {
  const caseActions = useCaseManagementStore((state) => ({
    reset: state.reset,
    setCurrentCase: state.setCurrentCase,
    addCase: state.addCase,
    deleteCase: state.deleteCase,
  }));
  const teachingActions = useTeachingStore((state) => ({
    reset: state.reset,
    setCurrentAct: state.setCurrentAct,
    toggleStoryMode: state.toggleStoryMode,
  }));
  const socraticActions = useSocraticStore((state: any) => ({
    reset: state.reset,
    startNewDialogue: state.startNewDialogue,
    sendMessage: state.sendMessage,
  }));
  const analysisActions = useAnalysisStore((state: any) => ({
    reset: state.reset,
    setThreeElements: state.setThreeElements,
    selectTimelineNode: state.selectTimelineNode,
  }));

  return {
    resetAll: () => {
      caseActions.reset();
      teachingActions.reset();
      socraticActions.reset();
      analysisActions.reset();
    },
    caseActions,
    teachingActions,
    socraticActions,
    analysisActions,
  };
};