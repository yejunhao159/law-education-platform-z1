/**
 * 全局状态管理Store
 * 使用Zustand + Immer实现
 * 墨匠 - 2025-08-25
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'
import { enableMapSet } from 'immer'
import type { LegalCase, TimelineEvent, EvidenceItem, TimelineAnalysis } from '@/types/legal-case'
import type { 
  ClaimAnalysisResult, 
  TimelineEvent as EnhancedTimelineEvent,
  TimelineViewMode 
} from '@/types/timeline-claim-analysis'

// 启用Immer的MapSet插件以支持Map和Set
enableMapSet()

// 争议级别类型
export type DisputeLevel = 'agreed' | 'partial' | 'disputed'

// 故事章节类型
export interface StoryChapter {
  id: string
  title: string
  content: string
  icon?: string
  color?: string
}

// Store接口定义
interface CaseStore {
  // ========== 核心数据 ==========
  caseData: LegalCase | null
  currentAct: string
  actProgress: Record<string, boolean>
  
  // ========== 时间轴分析状态（优化版）==========
  analysisComplete: boolean
  socraticLevel: 1 | 2 | 3
  timelineAnalyses: Map<string, TimelineAnalysis> // 缓存的分析结果
  selectedTimelineNode: string | null
  timelinePerspective: 'neutral' | 'plaintiff' | 'defendant' | 'judge'
  teachingModeEnabled: boolean
  completedLearningNodes: Set<string>
  analysisResults: Map<string, TimelineAnalysis> // 新增：按事件ID存储的分析结果
  analysisLoading: Map<string, boolean> // 新增：分析加载状态
  
  // ========== 请求权分析状态 ==========
  claimAnalysis: ClaimAnalysisResult | null
  timelineViewMode: TimelineViewMode
  selectedClaim: string | null
  isAnalyzingClaims: boolean
  claimHighlights: Set<string>
  
  // ========== 事实认定状态（Issue #3）==========
  factDisputes: Map<string, DisputeLevel>
  evidenceLinks: Map<string, string[]>
  annotations: Map<string, string>
  timelineView: 'vertical' | 'horizontal'
  comparisonMode: boolean
  
  // ========== 案情导入状态（Issue #4）==========
  storyMode: boolean
  storyChapters: StoryChapter[]
  editingFields: Set<string>
  autoTransition: boolean
  
  // ========== Actions - 核心 ==========
  setCaseData: (data: LegalCase) => void
  setCurrentAct: (act: string) => void
  markActComplete: (act: string) => void
  resetStore: () => void
  
  // ========== Actions - 事实认定 ==========
  markFactDispute: (factId: string, level: DisputeLevel) => void
  linkEvidence: (factId: string, evidenceId: string) => void
  unlinkEvidence: (factId: string, evidenceId: string) => void
  addAnnotation: (id: string, text: string) => void
  removeAnnotation: (id: string) => void
  setTimelineView: (view: 'vertical' | 'horizontal') => void
  toggleComparisonMode: () => void
  
  // ========== Actions - 案情导入 ==========
  toggleStoryMode: () => void
  generateStoryChapters: () => void
  updateStoryChapter: (id: string, content: string) => void
  setEditingField: (field: string, isEditing: boolean) => void
  setAutoTransition: (enabled: boolean) => void
  
  // ========== Actions - 时间轴分析 ==========
  markAnalysisComplete: () => void
  progressSocraticLevel: () => void
  setTimelinePerspective: (perspective: 'neutral' | 'plaintiff' | 'defendant' | 'judge') => void
  setSelectedTimelineNode: (nodeId: string | null) => void
  cacheTimelineAnalysis: (key: string, analysis: TimelineAnalysis) => void
  toggleTeachingMode: () => void
  markLearningNodeComplete: (nodeId: string) => void
  setAnalysisResult: (eventId: string, analysis: TimelineAnalysis) => void
  setAnalysisLoading: (eventId: string, loading: boolean) => void
  getAnalysisResult: (eventId: string) => TimelineAnalysis | undefined
  clearAnalysisCache: () => void
  
  // ========== Actions - 请求权分析 ==========
  setClaimAnalysis: (analysis: ClaimAnalysisResult | null) => void
  clearClaimAnalysis: () => void
  setTimelineViewMode: (mode: TimelineViewMode) => void
  toggleTimelineViewMode: () => void
  setSelectedClaim: (claimId: string | null) => void
  setIsAnalyzingClaims: (analyzing: boolean) => void
  toggleClaimHighlight: (claimId: string) => void
  clearClaimHighlights: () => void
  
  // ========== 计算属性 ==========
  getDisputedFacts: () => TimelineEvent[]
  getEvidenceForFact: (factId: string) => EvidenceItem[]
  getCurrentActData: () => any
  isActComplete: (act: string) => boolean
}

// 初始状态
const initialState = {
  caseData: null,
  currentAct: 'prologue',
  actProgress: {},
  analysisComplete: false,
  socraticLevel: 1 as const,
  timelineAnalyses: new Map(),
  selectedTimelineNode: null,
  timelinePerspective: 'neutral' as const,
  teachingModeEnabled: false,
  completedLearningNodes: new Set<string>(),
  analysisResults: new Map(),
  analysisLoading: new Map(),
  claimAnalysis: null,
  timelineViewMode: 'simple' as TimelineViewMode,
  selectedClaim: null,
  isAnalyzingClaims: false,
  claimHighlights: new Set<string>(),
  factDisputes: new Map(),
  evidenceLinks: new Map(),
  annotations: new Map(),
  timelineView: 'vertical' as const,
  comparisonMode: false,
  storyMode: false,
  storyChapters: [],
  editingFields: new Set<string>(),
  autoTransition: true,
}

// 创建Store
export const useCaseStore = create<CaseStore>()(
  persist(
    immer((set, get) => ({
      // ========== 初始状态 ==========
      ...initialState,
      
      // ========== Actions - 核心 ==========
      setCaseData: (data) => set((state) => {
        state.caseData = data
        // 自动生成故事章节
        if (data && state.storyMode) {
          get().generateStoryChapters()
        }
        // 如果开启自动跳转，跳到第一幕
        if (state.autoTransition && state.currentAct === 'prologue') {
          state.currentAct = 'act1'
        }
      }),
      
      setCurrentAct: (act) => set((state) => {
        state.currentAct = act
      }),
      
      markActComplete: (act) => set((state) => {
        state.actProgress[act] = true
      }),
      
      resetStore: () => set(() => initialState),
      
      // ========== Actions - 事实认定 ==========
      markFactDispute: (factId, level) => set((state) => {
        state.factDisputes.set(factId, level)
      }),
      
      linkEvidence: (factId, evidenceId) => set((state) => {
        const current = state.evidenceLinks.get(factId) || []
        if (!current.includes(evidenceId)) {
          state.evidenceLinks.set(factId, [...current, evidenceId])
        }
      }),
      
      unlinkEvidence: (factId, evidenceId) => set((state) => {
        const current = state.evidenceLinks.get(factId) || []
        state.evidenceLinks.set(
          factId, 
          current.filter(id => id !== evidenceId)
        )
      }),
      
      addAnnotation: (id, text) => set((state) => {
        state.annotations.set(id, text)
      }),
      
      removeAnnotation: (id) => set((state) => {
        state.annotations.delete(id)
      }),
      
      setTimelineView: (view) => set((state) => {
        state.timelineView = view
      }),
      
      toggleComparisonMode: () => set((state) => {
        state.comparisonMode = !state.comparisonMode
      }),
      
      // ========== Actions - 案情导入 ==========
      toggleStoryMode: () => set((state) => {
        state.storyMode = !state.storyMode
        if (state.storyMode && state.caseData) {
          get().generateStoryChapters()
        }
      }),
      
      generateStoryChapters: () => set((state) => {
        if (!state.caseData) return
        
        const { basicInfo, threeElements } = state.caseData
        
        // 生成故事章节
        const chapters: StoryChapter[] = [
          {
            id: 'background',
            title: '案件背景',
            content: threeElements.facts.summary || '暂无背景信息',
            icon: 'BookOpen',
            color: 'blue'
          },
          {
            id: 'parties',
            title: '当事人关系',
            content: basicInfo.parties ? 
              `原告：${basicInfo.parties.plaintiff?.map((p: any) => p.name).join('、') || '未知'}；被告：${basicInfo.parties.defendant?.map((p: any) => p.name).join('、') || '未知'}` :
              `当事人：${basicInfo.plaintiff || '原告方'} 诉 ${basicInfo.defendant || '被告方'}`,
            icon: 'Users',
            color: 'green'
          },
          {
            id: 'disputes',
            title: '争议焦点',
            content: threeElements.facts.disputedFacts?.join('；') || '暂无争议信息',
            icon: 'AlertCircle',
            color: 'yellow'
          },
          {
            id: 'judgment',
            title: '法院判决',
            content: threeElements.reasoning.judgment || '暂无判决信息',
            icon: 'Gavel',
            color: 'purple'
          }
        ]
        
        state.storyChapters = chapters
      }),
      
      updateStoryChapter: (id, content) => set((state) => {
        const chapter = state.storyChapters.find(c => c.id === id)
        if (chapter) {
          chapter.content = content
        }
      }),
      
      setEditingField: (field, isEditing) => set((state) => {
        if (isEditing) {
          state.editingFields.add(field)
        } else {
          state.editingFields.delete(field)
        }
      }),
      
      setAutoTransition: (enabled) => set((state) => {
        state.autoTransition = enabled
      }),
      
      // ========== Actions - 时间轴分析 ==========
      markAnalysisComplete: () => set((state) => {
        state.analysisComplete = true
      }),
      
      progressSocraticLevel: () => set((state) => {
        if (state.socraticLevel < 3) {
          state.socraticLevel = (state.socraticLevel + 1) as 1 | 2 | 3
        }
      }),
      
      setTimelinePerspective: (perspective) => set((state) => {
        state.timelinePerspective = perspective
      }),
      
      setSelectedTimelineNode: (nodeId) => set((state) => {
        state.selectedTimelineNode = nodeId
      }),
      
      cacheTimelineAnalysis: (key, analysis) => set((state) => {
        state.timelineAnalyses.set(key, analysis)
      }),
      
      toggleTeachingMode: () => set((state) => {
        state.teachingModeEnabled = !state.teachingModeEnabled
      }),
      
      markLearningNodeComplete: (nodeId) => set((state) => {
        state.completedLearningNodes.add(nodeId)
      }),
      
      setAnalysisResult: (eventId, analysis) => set((state) => {
        state.analysisResults.set(eventId, analysis)
        // 同时更新缓存
        const cacheKey = `${eventId}_${state.timelinePerspective}`
        state.timelineAnalyses.set(cacheKey, analysis)
      }),
      
      setAnalysisLoading: (eventId, loading) => set((state) => {
        if (loading) {
          state.analysisLoading.set(eventId, true)
        } else {
          state.analysisLoading.delete(eventId)
        }
      }),
      
      getAnalysisResult: (eventId) => {
        return get().analysisResults.get(eventId)
      },
      
      clearAnalysisCache: () => set((state) => {
        state.analysisResults.clear()
        state.timelineAnalyses.clear()
        state.analysisLoading.clear()
      }),
      
      // ========== Actions - 请求权分析 ==========
      setClaimAnalysis: (analysis) => set((state) => {
        state.claimAnalysis = analysis
        state.isAnalyzingClaims = false
      }),
      
      clearClaimAnalysis: () => set((state) => {
        state.claimAnalysis = null
        state.selectedClaim = null
        state.claimHighlights.clear()
      }),
      
      setTimelineViewMode: (mode) => set((state) => {
        state.timelineViewMode = mode
      }),
      
      toggleTimelineViewMode: () => set((state) => {
        const modes: TimelineViewMode[] = ['simple', 'enhanced', 'analysis']
        const currentIndex = modes.indexOf(state.timelineViewMode)
        state.timelineViewMode = modes[(currentIndex + 1) % modes.length]
      }),
      
      setSelectedClaim: (claimId) => set((state) => {
        state.selectedClaim = claimId
      }),
      
      setIsAnalyzingClaims: (analyzing) => set((state) => {
        state.isAnalyzingClaims = analyzing
      }),
      
      toggleClaimHighlight: (claimId) => set((state) => {
        if (state.claimHighlights.has(claimId)) {
          state.claimHighlights.delete(claimId)
        } else {
          state.claimHighlights.add(claimId)
        }
      }),
      
      clearClaimHighlights: () => set((state) => {
        state.claimHighlights.clear()
      }),
      
      // ========== 计算属性 ==========
      getDisputedFacts: () => {
        const state = get()
        if (!state.caseData) return []
        
        return state.caseData.threeElements.facts.timeline.filter(event => {
          const disputeLevel = state.factDisputes.get(event.date + event.event)
          return disputeLevel === 'disputed' || disputeLevel === 'partial'
        })
      },
      
      getEvidenceForFact: (factId) => {
        const state = get()
        if (!state.caseData) return []
        
        const linkedIds = state.evidenceLinks.get(factId) || []
        return state.caseData.threeElements.evidence.items.filter(
          item => linkedIds.includes(item.id || item.name)
        )
      },
      
      getCurrentActData: () => {
        const state = get()
        if (!state.caseData) return null
        
        switch (state.currentAct) {
          case 'act1':
            return state.caseData.threeElements
          case 'act2':
            return state.storyMode ? state.storyChapters : state.caseData.threeElements.facts
          case 'act3':
            return {
              timeline: state.caseData.threeElements.facts.timeline,
              disputes: state.factDisputes,
              evidence: state.caseData.threeElements.evidence.items,
              links: state.evidenceLinks
            }
          default:
            return null
        }
      },
      
      isActComplete: (act) => {
        const state = get()
        return state.actProgress[act] || false
      }
    })),
    {
      name: 'law-education-case-store',
      // 只持久化核心数据，Map类型需要特殊处理
      partialize: (state) => ({
        caseData: state.caseData,
        currentAct: state.currentAct,
        actProgress: state.actProgress,
        analysisComplete: state.analysisComplete,
        socraticLevel: state.socraticLevel,
        timelinePerspective: state.timelinePerspective,
        selectedTimelineNode: state.selectedTimelineNode,
        teachingModeEnabled: state.teachingModeEnabled,
        claimAnalysis: state.claimAnalysis,
        timelineViewMode: state.timelineViewMode,
        selectedClaim: state.selectedClaim,
        storyMode: state.storyMode,
        storyChapters: state.storyChapters,
        autoTransition: state.autoTransition,
        timelineView: state.timelineView,
        // Map/Set转Array进行持久化
        timelineAnalyses: Array.from(state.timelineAnalyses.entries()),
        completedLearningNodes: Array.from(state.completedLearningNodes),
        claimHighlights: Array.from(state.claimHighlights),
        factDisputes: Array.from(state.factDisputes.entries()),
        evidenceLinks: Array.from(state.evidenceLinks.entries()),
        annotations: Array.from(state.annotations.entries()),
      }),
      // 恢复时将Array转回Map/Set
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.timelineAnalyses = new Map(state.timelineAnalyses as any)
          state.completedLearningNodes = new Set(state.completedLearningNodes as any)
          state.claimHighlights = new Set(state.claimHighlights as any)
          state.factDisputes = new Map(state.factDisputes as any)
          state.evidenceLinks = new Map(state.evidenceLinks as any)
          state.annotations = new Map(state.annotations as any)
          state.editingFields = new Set()
          state.isAnalyzingClaims = false
        }
      }
    }
  )
)

// 导出hooks
export const useCaseData = () => useCaseStore(state => state.caseData)
export const useCurrentAct = () => useCaseStore(state => state.currentAct)
export const useStoryMode = () => useCaseStore(state => state.storyMode)
export const useFactDisputes = () => useCaseStore(state => state.factDisputes)
export const useEvidenceLinks = () => useCaseStore(state => state.evidenceLinks)
export const useClaimAnalysis = () => useCaseStore(state => state.claimAnalysis)
export const useTimelineViewMode = () => useCaseStore(state => state.timelineViewMode)
export const useIsAnalyzingClaims = () => useCaseStore(state => state.isAnalyzingClaims)