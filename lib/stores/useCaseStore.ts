/**
 * 全局状态管理Store
 * 使用Zustand + Immer实现
 * 墨匠 - 2025-08-25
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'
import type { LegalCase, TimelineEvent, EvidenceItem } from '@/types/legal-case'

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
            content: `原告：${basicInfo.parties.plaintiff.map(p => p.name).join('、')}；被告：${basicInfo.parties.defendant.map(p => p.name).join('、')}`,
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
        storyMode: state.storyMode,
        storyChapters: state.storyChapters,
        autoTransition: state.autoTransition,
        timelineView: state.timelineView,
        // Map转Array进行持久化
        factDisputes: Array.from(state.factDisputes.entries()),
        evidenceLinks: Array.from(state.evidenceLinks.entries()),
        annotations: Array.from(state.annotations.entries()),
      }),
      // 恢复时将Array转回Map
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.factDisputes = new Map(state.factDisputes as any)
          state.evidenceLinks = new Map(state.evidenceLinks as any)
          state.annotations = new Map(state.annotations as any)
          state.editingFields = new Set()
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