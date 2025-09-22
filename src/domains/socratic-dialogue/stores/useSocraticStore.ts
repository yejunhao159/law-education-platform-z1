/**
 * 苏格拉底对话域状态管理
 * DeepPractice Standards Compliant
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';

import type {
  DialogueSession,
  Message,
  TeachingLevel,
  DialogueContext,
  SocraticRequest,
  SocraticResponse,
  TeachingAssessment,
} from '@/src/types';

// ========== 接口定义 ==========
interface SocraticState {
  // 当前会话状态
  currentSession: DialogueSession | null;
  sessions: DialogueSession[];

  // 对话状态
  messages: Message[];
  isGenerating: boolean;
  isTyping: boolean;

  // 教学状态
  currentLevel: TeachingLevel;
  context: DialogueContext;
  teacherMode: boolean;

  // AI响应状态
  lastResponse: SocraticResponse | null;
  responseHistory: SocraticResponse[];

  // 评估状态
  assessment: TeachingAssessment | null;
  isAssessing: boolean;

  // UI状态
  loading: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

interface SocraticActions {
  // 会话管理
  createSession: (title: string, level: TeachingLevel, context: DialogueContext) => void;
  setCurrentSession: (session: DialogueSession | null) => void;
  updateSession: (sessionId: string, updates: Partial<DialogueSession>) => void;
  deleteSession: (sessionId: string) => void;
  endSession: () => void;

  // 消息管理
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
  setMessages: (messages: Message[]) => void;

  // 对话控制
  sendMessage: (content: string) => void;
  generateResponse: (request: SocraticRequest) => Promise<SocraticResponse | null>;
  setGenerating: (generating: boolean) => void;
  setTyping: (typing: boolean) => void;

  // 教学控制
  setLevel: (level: TeachingLevel) => void;
  updateContext: (updates: Partial<DialogueContext>) => void;
  toggleTeacherMode: () => void;
  resetLevel: () => void;

  // AI响应管理
  setLastResponse: (response: SocraticResponse) => void;
  addToResponseHistory: (response: SocraticResponse) => void;
  clearResponseHistory: () => void;

  // 评估功能
  startAssessment: (sessionId: string) => void;
  setAssessment: (assessment: TeachingAssessment) => void;
  setAssessing: (assessing: boolean) => void;

  // 连接状态
  setConnectionStatus: (status: SocraticState['connectionStatus']) => void;

  // 通用操作
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type SocraticStore = SocraticState & SocraticActions;

// ========== 初始状态 ==========
const initialState: SocraticState = {
  currentSession: null,
  sessions: [],
  messages: [],
  isGenerating: false,
  isTyping: false,
  currentLevel: 'basic',
  context: {},
  teacherMode: false,
  lastResponse: null,
  responseHistory: [],
  assessment: null,
  isAssessing: false,
  loading: false,
  error: null,
  connectionStatus: 'disconnected',
};

// ========== Store创建 ==========
export const useSocraticStore = create<SocraticStore>()(
  persist(
    immer((set, get) => ({
      // 初始状态
      ...initialState,

      // 会话管理
      createSession: (title, level, context) =>
        set((state) => {
          const newSession: DialogueSession = {
            id: crypto.randomUUID(),
            title,
            level,
            context,
            messages: [],
            isActive: true,
            participants: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          state.sessions.unshift(newSession);
          state.currentSession = newSession;
          state.currentLevel = level;
          state.context = context;
          state.messages = [];
        }),

      setCurrentSession: (session) =>
        set((state) => {
          state.currentSession = session;
          if (session) {
            state.currentLevel = session.level;
            state.context = session.context;
            state.messages = session.messages;
          } else {
            state.messages = [];
          }
        }),

      updateSession: (sessionId, updates) =>
        set((state) => {
          const sessionIndex = state.sessions.findIndex((s) => s.id === sessionId);
          if (sessionIndex !== -1) {
            Object.assign(state.sessions[sessionIndex]!, updates);
            if (state.currentSession?.id === sessionId) {
              Object.assign(state.currentSession, updates);
            }
          }
        }),

      deleteSession: (sessionId) =>
        set((state) => {
          state.sessions = state.sessions.filter((s) => s.id !== sessionId);
          if (state.currentSession?.id === sessionId) {
            state.currentSession = null;
            state.messages = [];
          }
        }),

      endSession: () =>
        set((state) => {
          if (state.currentSession) {
            state.currentSession.isActive = false;
            state.currentSession.updatedAt = new Date().toISOString();

            // 更新会话列表中的对应项
            const sessionIndex = state.sessions.findIndex(
              (s) => s.id === state.currentSession?.id
            );
            if (sessionIndex !== -1) {
              state.sessions[sessionIndex]!.isActive = false;
              state.sessions[sessionIndex]!.updatedAt = new Date().toISOString();
            }
          }
        }),

      // 消息管理
      addMessage: (messageData) =>
        set((state) => {
          const message: Message = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            ...messageData,
          };

          state.messages.push(message);

          // 同步到当前会话
          if (state.currentSession) {
            state.currentSession.messages.push(message);
            state.currentSession.updatedAt = new Date().toISOString();

            // 更新会话列表
            const sessionIndex = state.sessions.findIndex(
              (s) => s.id === state.currentSession?.id
            );
            if (sessionIndex !== -1) {
              state.sessions[sessionIndex]!.messages.push(message);
              state.sessions[sessionIndex]!.updatedAt = new Date().toISOString();
            }
          }
        }),

      updateMessage: (messageId, updates) =>
        set((state) => {
          const messageIndex = state.messages.findIndex((m) => m.id === messageId);
          if (messageIndex !== -1) {
            Object.assign(state.messages[messageIndex]!, updates);

            // 同步到当前会话
            if (state.currentSession) {
              const sessionMessageIndex = state.currentSession.messages.findIndex(
                (m) => m.id === messageId
              );
              if (sessionMessageIndex !== -1) {
                Object.assign(state.currentSession.messages[sessionMessageIndex]!, updates);
              }
            }
          }
        }),

      clearMessages: () =>
        set((state) => {
          state.messages = [];
          if (state.currentSession) {
            state.currentSession.messages = [];
          }
        }),

      setMessages: (messages) =>
        set((state) => {
          state.messages = messages;
          if (state.currentSession) {
            state.currentSession.messages = messages;
          }
        }),

      // 对话控制
      sendMessage: (content) => {
        const { addMessage } = get();
        addMessage({
          role: 'teacher',
          content,
        });
      },

      generateResponse: async (request) => {
        const { setGenerating, setLastResponse, addToResponseHistory, addMessage, setError } = get();

        try {
          setGenerating(true);
          setError(null);

          const response = await fetch('/api/socratic/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
          });

          if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
          }

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || 'AI响应生成失败');
          }

          const aiResponse: SocraticResponse = result.data;

          // 添加AI消息到对话
          addMessage({
            role: 'ai',
            content: aiResponse.answer,
            metadata: {
              confidence: 85,
              responseTime: Date.now(),
            },
          });

          setLastResponse(aiResponse);
          addToResponseHistory(aiResponse);

          return aiResponse;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          setError(errorMessage);
          return null;
        } finally {
          setGenerating(false);
        }
      },

      setGenerating: (generating) =>
        set((state) => {
          state.isGenerating = generating;
        }),

      setTyping: (typing) =>
        set((state) => {
          state.isTyping = typing;
        }),

      // 教学控制
      setLevel: (level) =>
        set((state) => {
          state.currentLevel = level;
          if (state.currentSession) {
            state.currentSession.level = level;
          }
        }),

      updateContext: (updates) =>
        set((state) => {
          Object.assign(state.context, updates);
          if (state.currentSession) {
            Object.assign(state.currentSession.context, updates);
          }
        }),

      toggleTeacherMode: () =>
        set((state) => {
          state.teacherMode = !state.teacherMode;
        }),

      resetLevel: () =>
        set((state) => {
          state.currentLevel = 'basic';
        }),

      // AI响应管理
      setLastResponse: (response) =>
        set((state) => {
          state.lastResponse = response;
        }),

      addToResponseHistory: (response) =>
        set((state) => {
          state.responseHistory.push(response);
          // 保持历史记录不超过50条
          if (state.responseHistory.length > 50) {
            state.responseHistory = state.responseHistory.slice(-50);
          }
        }),

      clearResponseHistory: () =>
        set((state) => {
          state.responseHistory = [];
        }),

      // 评估功能
      startAssessment: (sessionId) =>
        set((state) => {
          state.isAssessing = true;
          // 这里可以触发评估逻辑
        }),

      setAssessment: (assessment) =>
        set((state) => {
          state.assessment = assessment;
          state.isAssessing = false;
        }),

      setAssessing: (assessing) =>
        set((state) => {
          state.isAssessing = assessing;
        }),

      // 连接状态
      setConnectionStatus: (status) =>
        set((state) => {
          state.connectionStatus = status;
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
        })),
    })),
    {
      name: 'socratic-store',
      partialize: (state) => ({
        sessions: state.sessions,
        currentLevel: state.currentLevel,
        teacherMode: state.teacherMode,
        responseHistory: state.responseHistory.slice(-10), // 只持久化最近10条
      }),
    }
  )
);

// ========== 选择器 Hooks ==========
export const useCurrentDialogueSession = () => useSocraticStore((state) => state.currentSession);
export const useDialogueMessages = () => useSocraticStore((state) => state.messages);
export const useDialogueSessions = () => useSocraticStore((state) => state.sessions);
export const useSocraticLevel = () => useSocraticStore((state) => state.currentLevel);
export const useIsGenerating = () => useSocraticStore((state) => state.isGenerating);
export const useTeacherMode = () => useSocraticStore((state) => state.teacherMode);
export const useLastResponse = () => useSocraticStore((state) => state.lastResponse);

// ========== 操作 Hooks ==========
export const useSocraticActions = () => {
  const store = useSocraticStore();
  return {
    createSession: store.createSession,
    setCurrentSession: store.setCurrentSession,
    addMessage: store.addMessage,
    sendMessage: store.sendMessage,
    generateResponse: store.generateResponse,
    setLevel: store.setLevel,
    toggleTeacherMode: store.toggleTeacherMode,
    endSession: store.endSession,
    reset: store.reset,
  };
};