/**
 * 苏格拉底式问答模块状态管理Store
 * @description 基于Zustand + Immer实现的苏格拉底式问答状态管理
 * @author 墨匠 - 2025-09-08
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'
import { enableMapSet } from 'immer'
import {
  DialogueState,
  Message,
  MessageRole,
  DialogueLevel,
  ControlMode,
  SessionMode,
  Difficulty,
  StudentInfo,
  ClassroomSession,
  VoteData,
  Performance,
  AgentSettings,
  AgentResponse,
  CaseInfo,
  CachedResponse,
  LogEntry
} from '../types/socratic'

// 启用Immer的MapSet插件以支持Map和Set
enableMapSet()

// ============== Store接口定义 ==============

interface SocraticStore {
  // ========== 会话状态 ==========
  currentSession: DialogueState | null
  classroomSession: ClassroomSession | null
  sessionMode: SessionMode
  
  // ========== UI状态 ==========
  isConnected: boolean
  isLoading: boolean
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  errorMessage: string | null
  showSettings: boolean
  
  // ========== Agent配置 ==========
  agentSettings: AgentSettings
  currentCase: CaseInfo | null
  
  // ========== 消息管理 ==========
  messages: Message[]
  currentLevel: DialogueLevel
  isWaitingForResponse: boolean
  streamingMessage: Message | null
  
  // ========== 性能监控 ==========
  performance: Performance
  responseCache: Map<string, CachedResponse>
  logs: LogEntry[]
  
  // ========== 课堂管理 ==========
  students: Map<string, StudentInfo>
  currentQuestion: string | null
  currentVote: VoteData | null
  teacherId: string | null
  
  // ========== Actions - 会话管理 ==========
  createSession: (options?: {
    sessionMode?: SessionMode
    caseId?: string
    teacherId?: string
  }) => Promise<{ success: boolean; sessionId?: string; error?: string }>
  
  joinSession: (sessionId: string, options?: {
    studentName?: string
    isTeacher?: boolean
  }) => Promise<{ success: boolean; error?: string }>
  
  leaveSession: () => Promise<void>
  endSession: () => Promise<void>
  
  // ========== Actions - 消息管理 ==========
  sendMessage: (content: string, role?: MessageRole) => Promise<void>
  receiveMessage: (message: Message) => void
  clearMessages: () => void
  setCurrentLevel: (level: DialogueLevel) => void
  
  // ========== Actions - Agent管理 ==========
  updateAgentSettings: (settings: Partial<AgentSettings>) => void
  setCase: (caseInfo: CaseInfo) => void
  
  // ========== Actions - 课堂管理 ==========
  addStudent: (student: StudentInfo) => void
  removeStudent: (studentId: string) => void
  updateStudentStatus: (studentId: string, updates: Partial<StudentInfo>) => void
  setCurrentQuestion: (question: string | null) => void
  setCurrentVote: (vote: VoteData | null) => void
  castVote: (studentId: string, choiceId: string) => void
  
  // ========== Actions - UI状态 ==========
  setConnectionStatus: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  toggleSettings: () => void
  
  // ========== Actions - 性能监控 ==========
  updatePerformance: (updates: Partial<Performance>) => void
  cacheResponse: (key: string, response: CachedResponse) => void
  getCachedResponse: (key: string) => CachedResponse | undefined
  clearCache: () => void
  addLog: (entry: LogEntry) => void
  clearLogs: () => void
  
  // ========== Actions - 工具方法 ==========
  resetStore: () => void
  getSessionStats: () => {
    totalMessages: number
    averageResponseTime: number
    currentLevelProgress: number
    studentCount: number
    activeStudents: number
  }
}

// ============== 初始状态 ==============

const initialAgentSettings: AgentSettings = {
  difficulty: Difficulty.NORMAL,
  language: 'zh-CN',
  legalSystem: 'chinese',
  maxTokens: 500,
  temperature: 0.7,
  streaming: true
}

const initialPerformance: Performance = {
  questionCount: 0,
  correctRate: 0,
  thinkingTime: [],
  avgResponseTime: 0,
  levelDuration: {
    [DialogueLevel.OBSERVATION]: 0,
    [DialogueLevel.FACTS]: 0,
    [DialogueLevel.ANALYSIS]: 0,
    [DialogueLevel.APPLICATION]: 0,
    [DialogueLevel.VALUES]: 0
  }
}

const initialState = {
  // 会话状态
  currentSession: null,
  classroomSession: null,
  sessionMode: SessionMode.DEMO as SessionMode,
  
  // UI状态
  isConnected: false,
  isLoading: false,
  connectionStatus: 'disconnected' as const,
  errorMessage: null,
  showSettings: false,
  
  // Agent配置
  agentSettings: initialAgentSettings,
  currentCase: null,
  
  // 消息管理
  messages: [] as Message[],
  currentLevel: DialogueLevel.OBSERVATION,
  isWaitingForResponse: false,
  streamingMessage: null,
  
  // 性能监控
  performance: initialPerformance,
  responseCache: new Map<string, CachedResponse>(),
  logs: [] as LogEntry[],
  
  // 课堂管理
  students: new Map<string, StudentInfo>(),
  currentQuestion: null,
  currentVote: null,
  teacherId: null
}

// ============== Store创建 ==============

export const useSocraticStore = create<SocraticStore>()(
  persist(
    immer((set, get) => ({
      // ========== 初始状态 ==========
      ...initialState,
      
      // ========== Actions - 会话管理 ==========
      createSession: async (options = {}) => {
        const { sessionMode = SessionMode.DEMO, caseId, teacherId } = options
        
        try {
          set((state) => {
            state.isLoading = true
            state.connectionStatus = 'connecting'
            state.errorMessage = null
          })
          
          // 生成会话ID
          const sessionId = Math.random().toString(36).substring(2, 8).toUpperCase()
          
          // 创建新会话状态
          const newSession: DialogueState = {
            sessionId,
            caseId: caseId || 'default-case',
            currentLevel: DialogueLevel.OBSERVATION,
            messages: [],
            participants: [],
            mode: ControlMode.AUTO,
            performance: { ...initialPerformance },
            createdAt: Date.now(),
            lastActivityAt: Date.now(),
            isEnded: false
          }
          
          set((state) => {
            state.currentSession = newSession
            state.sessionMode = sessionMode
            state.teacherId = teacherId || null
            state.isConnected = true
            state.isLoading = false
            state.connectionStatus = 'connected'
            state.messages = []
          })
          
          return { success: true, sessionId }
        } catch (error) {
          set((state) => {
            state.isLoading = false
            state.connectionStatus = 'error'
            state.errorMessage = error instanceof Error ? error.message : '创建会话失败'
          })
          
          return { success: false, error: '创建会话失败' }
        }
      },
      
      joinSession: async (sessionId, options = {}) => {
        const { studentName, isTeacher = false } = options
        
        try {
          set((state) => {
            state.isLoading = true
            state.connectionStatus = 'connecting'
            state.errorMessage = null
          })
          
          // 模拟加入会话的网络请求
          await new Promise(resolve => setTimeout(resolve, 500))
          
          set((state) => {
            if (isTeacher) {
              state.teacherId = sessionId + '-teacher'
            } else if (studentName) {
              const studentId = Math.random().toString(36).substring(2, 8)
              const student: StudentInfo = {
                id: studentId,
                displayName: studentName,
                joinedAt: Date.now(),
                isOnline: true,
                lastActiveAt: Date.now()
              }
              state.students.set(studentId, student)
            }
            
            state.isConnected = true
            state.isLoading = false
            state.connectionStatus = 'connected'
          })
          
          return { success: true }
        } catch (error) {
          set((state) => {
            state.isLoading = false
            state.connectionStatus = 'error'
            state.errorMessage = error instanceof Error ? error.message : '加入会话失败'
          })
          
          return { success: false, error: '加入会话失败' }
        }
      },
      
      leaveSession: async () => {
        set((state) => {
          state.currentSession = null
          state.classroomSession = null
          state.isConnected = false
          state.connectionStatus = 'disconnected'
          state.messages = []
          state.students.clear()
          state.currentQuestion = null
          state.currentVote = null
          state.teacherId = null
        })
      },
      
      endSession: async () => {
        set((state) => {
          if (state.currentSession) {
            state.currentSession.isEnded = true
          }
          state.isConnected = false
          state.connectionStatus = 'disconnected'
        })
      },
      
      // ========== Actions - 消息管理 ==========
      sendMessage: async (content, role = MessageRole.STUDENT) => {
        const message: Message = {
          id: Math.random().toString(36).substring(2, 15),
          role,
          content,
          level: get().currentLevel,
          timestamp: Date.now()
        }
        
        set((state) => {
          state.messages.push(message)
          state.isWaitingForResponse = true
          
          // 更新会话最后活动时间
          if (state.currentSession) {
            state.currentSession.lastActivityAt = Date.now()
            state.currentSession.messages.push(message)
          }
        })
        
        // 模拟Agent响应
        setTimeout(() => {
          const agentResponse: Message = {
            id: Math.random().toString(36).substring(2, 15),
            role: MessageRole.AGENT,
            content: '这是一个很好的观点。请进一步分析...',
            level: get().currentLevel,
            timestamp: Date.now(),
            metadata: {
              quality: 85,
              suggestions: ['可以从法律角度进一步分析']
            }
          }
          
          get().receiveMessage(agentResponse)
        }, 1000)
      },
      
      receiveMessage: (message) => {
        set((state) => {
          state.messages.push(message)
          state.isWaitingForResponse = false
          
          if (state.currentSession) {
            state.currentSession.messages.push(message)
          }
        })
      },
      
      clearMessages: () => {
        set((state) => {
          state.messages = []
          if (state.currentSession) {
            state.currentSession.messages = []
          }
        })
      },
      
      setCurrentLevel: (level) => {
        set((state) => {
          state.currentLevel = level
          if (state.currentSession) {
            state.currentSession.currentLevel = level
          }
        })
      },
      
      // ========== Actions - Agent管理 ==========
      updateAgentSettings: (settings) => {
        set((state) => {
          state.agentSettings = { ...state.agentSettings, ...settings }
        })
      },
      
      setCase: (caseInfo) => {
        set((state) => {
          state.currentCase = caseInfo
          if (state.currentSession) {
            state.currentSession.caseId = caseInfo.id
          }
        })
      },
      
      // ========== Actions - 课堂管理 ==========
      addStudent: (student) => {
        set((state) => {
          state.students.set(student.id, student)
        })
      },
      
      removeStudent: (studentId) => {
        set((state) => {
          state.students.delete(studentId)
        })
      },
      
      updateStudentStatus: (studentId, updates) => {
        set((state) => {
          const student = state.students.get(studentId)
          if (student) {
            Object.assign(student, updates)
            state.students.set(studentId, student)
          }
        })
      },
      
      setCurrentQuestion: (question) => {
        set((state) => {
          state.currentQuestion = question
        })
      },
      
      setCurrentVote: (vote) => {
        set((state) => {
          state.currentVote = vote
        })
      },
      
      castVote: (studentId, choiceId) => {
        set((state) => {
          if (state.currentVote && !state.currentVote.votedStudents.has(studentId)) {
            const choice = state.currentVote.choices.find(c => c.id === choiceId)
            if (choice) {
              choice.count++
              state.currentVote.votedStudents.add(studentId)
            }
          }
        })
      },
      
      // ========== Actions - UI状态 ==========
      setConnectionStatus: (status) => {
        set((state) => {
          state.connectionStatus = status
          state.isConnected = status === 'connected'
        })
      },
      
      setError: (error) => {
        set((state) => {
          state.errorMessage = error
        })
      },
      
      setLoading: (loading) => {
        set((state) => {
          state.isLoading = loading
        })
      },
      
      toggleSettings: () => {
        set((state) => {
          state.showSettings = !state.showSettings
        })
      },
      
      // ========== Actions - 性能监控 ==========
      updatePerformance: (updates) => {
        set((state) => {
          state.performance = { ...state.performance, ...updates }
          if (state.currentSession) {
            state.currentSession.performance = state.performance
          }
        })
      },
      
      cacheResponse: (key, response) => {
        set((state) => {
          state.responseCache.set(key, response)
        })
      },
      
      getCachedResponse: (key) => {
        return get().responseCache.get(key)
      },
      
      clearCache: () => {
        set((state) => {
          state.responseCache.clear()
        })
      },
      
      addLog: (entry) => {
        set((state) => {
          state.logs.push(entry)
          // 保持日志数量在合理范围内
          if (state.logs.length > 1000) {
            state.logs = state.logs.slice(-500)
          }
        })
      },
      
      clearLogs: () => {
        set((state) => {
          state.logs = []
        })
      },
      
      // ========== Actions - 工具方法 ==========
      resetStore: () => {
        set(() => ({
          ...initialState,
          responseCache: new Map(),
          students: new Map()
        }))
      },
      
      getSessionStats: () => {
        const state = get()
        const totalMessages = state.messages.length
        const responseTime = state.messages
          .filter(m => m.metadata?.thinkingTime)
          .map(m => m.metadata!.thinkingTime!)
        const averageResponseTime = responseTime.length > 0 
          ? responseTime.reduce((a, b) => a + b, 0) / responseTime.length 
          : 0
        
        return {
          totalMessages,
          averageResponseTime,
          currentLevelProgress: Math.min((totalMessages / 5) * 100, 100), // 假设每层级5个消息完成
          studentCount: state.students.size,
          activeStudents: Array.from(state.students.values()).filter(s => s.isOnline).length
        }
      }
    })),
    {
      name: 'socratic-dialogue-store',
      // 只持久化核心数据
      partialize: (state) => ({
        sessionMode: state.sessionMode,
        agentSettings: state.agentSettings,
        currentCase: state.currentCase,
        currentLevel: state.currentLevel,
        performance: state.performance,
        // Map类型转Array进行持久化
        responseCache: Array.from(state.responseCache.entries()),
        students: Array.from(state.students.entries())
      }),
      // 恢复时将Array转回Map
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.responseCache = new Map(state.responseCache as any)
          state.students = new Map(state.students as any)
          // 重置运行时状态
          state.isConnected = false
          state.isLoading = false
          state.connectionStatus = 'disconnected'
          state.errorMessage = null
          state.messages = []
          state.currentSession = null
          state.classroomSession = null
          state.isWaitingForResponse = false
          state.streamingMessage = null
          state.currentQuestion = null
          state.currentVote = null
          state.logs = []
          state.showSettings = false
        }
      }
    }
  )
)

// ============== 导出选择器Hooks ==============

export const useSocraticSession = () => useSocraticStore(state => state.currentSession)
export const useSocraticMessages = () => useSocraticStore(state => state.messages)
export const useSocraticConnectionStatus = () => useSocraticStore(state => state.connectionStatus)
export const useSocraticIsConnected = () => useSocraticStore(state => state.isConnected)
export const useSocraticError = () => useSocraticStore(state => state.errorMessage)
export const useSocraticSettings = () => useSocraticStore(state => state.agentSettings)
export const useSocraticStudents = () => useSocraticStore(state => state.students)
export const useSocraticPerformance = () => useSocraticStore(state => state.performance)
export const useSocraticCurrentLevel = () => useSocraticStore(state => state.currentLevel)
export const useSocraticIsLoading = () => useSocraticStore(state => state.isLoading)