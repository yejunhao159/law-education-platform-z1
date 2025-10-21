/**
 * 领域Store统一导出
 * DeepPractice Standards Compliant
 */

// ========== 案例管理域 ==========
export {
  useCaseManagementStore,
  useCurrentCase,
  useCases,
  useSelectedCaseId,
  useCaseLoading,
  useCaseError,
  useCaseSearchQuery,
  useCaseFilters,
  useCasePagination,
  useCaseActions,
} from './case-management/stores/useCaseStore';

// ========== 教学活动域 ==========
export {
  useTeachingStore,
  useCurrentAct,
  useTeachingProgress,
  useCurrentSession,
  useStoryMode,
  useSocraticLevel as useTeachingSocraticLevel,
  useTeachingSessionId,
  useTeachingSessionState,
  useTeachingActions,
} from './teaching-acts/stores/useTeachingStore';

// ========== 苏格拉底对话域 ==========
export {
  useSocraticStore,
  useCurrentDialogueSession,
  useDialogueMessages,
  useDialogueSessions,
  useSocraticLevel,
  useIsGenerating,
  useTeacherMode,
  useLastResponse,
  useSocraticActions,
  useCurrentCase as useSocraticCurrentCase,  // 重命名以避免冲突
  useClassroomSession,
  useClassroomCode,
  useClassroomStudents,
  useCurrentVote,
  useIsClassroomMode,
  useIsTeacherMode as useSocraticTeacherMode, // 重命名以避免冲突
} from './socratic-dialogue/stores/useSocraticStore';

// ========== 法律分析域 ==========
export {
  useAnalysisStore,
  useTimelineAnalyses,
  useCurrentPerspective,
  useSelectedTimelineNode,
  useThreeElements,
  useAnalysisComplete,
  useTimelineView,
  useComparisonMode,
  useAnalysisActions,
  type DisputeLevel,
} from './legal-analysis/stores/useAnalysisStore';

// ========== 向后兼容性导出 ==========
// 兼容性层从单独的文件导出，避免循环依赖
export {
  useCaseStore,
  useFactDisputes,
  useEvidenceLinks,
  useClaimAnalysis,
  useTimelineViewMode,
  useIsAnalyzingClaims,
  useAppState,
  useGlobalActions,
} from './compatibility';
