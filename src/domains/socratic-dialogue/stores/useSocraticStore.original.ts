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

// 新增课堂相关类型导入
import type { StudentInfo, VoteData, ClassroomSession, CaseInfo } from '@/lib/types/socratic';
import { classroomAdapter, type SessionMapping } from '../services/ClassroomAdapter';

// ========== 接口定义 ==========
interface SocraticState {
  // 当前会话状态
  currentSession: DialogueSession | null;
  sessions: DialogueSession[];

  // 案件数据状态
  currentCase: CaseInfo | null;

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

  // ========== 新增：课堂状态 ==========
  // 课堂会话信息
  classroomSession: ClassroomSession | null;
  classroomCode: string | null;
  sessionMapping: SessionMapping | null;

  // 学生管理
  classroomStudents: Map<string, StudentInfo>;
  onlineStudentCount: number;

  // 投票系统
  currentVote: VoteData | null;
  voteHistory: VoteData[];

  // 课堂模式
  isClassroomMode: boolean;
  isTeacherMode: boolean; // 区分课堂中的教师模式
  classroomStatus: 'creating' | 'active' | 'ended' | 'error';
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

  // 案件数据管理
  setCase: (caseInfo: CaseInfo | null) => void;

  // 通用操作
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // ========== 新增：课堂管理Actions ==========
  // 课堂会话管理
  createClassroomSession: (dialogueSession: DialogueSession) => Promise<boolean>;
  setClassroomSession: (classroom: ClassroomSession | null) => void;
  endClassroomSession: () => Promise<boolean>;
  setClassroomStatus: (status: SocraticState['classroomStatus']) => void;

  // 学生管理
  addStudentToClassroom: (studentId: string, displayName: string, avatar?: string) => Promise<boolean>;
  removeStudentFromClassroom: (studentId: string) => Promise<boolean>;
  updateStudentStatus: (studentId: string, updates: Partial<StudentInfo>) => void;
  setClassroomStudents: (students: Map<string, StudentInfo>) => void;
  clearClassroomStudents: () => void;

  // 投票系统
  startVote: (voteData: Omit<VoteData, 'id' | 'createdAt' | 'votedStudents'>) => Promise<boolean>;
  endVote: () => Promise<boolean>;
  setCurrentVote: (vote: VoteData | null) => void;
  addToVoteHistory: (vote: VoteData) => void;

  // 课堂模式控制
  enableClassroomMode: () => void;
  disableClassroomMode: () => void;
  setIsTeacherMode: (isTeacher: boolean) => void;

  // 状态同步
  syncClassroomState: () => void;
  syncDialogueState: () => void;
}

type SocraticStore = SocraticState & SocraticActions;

// ========== 初始状态 ==========
const initialState: SocraticState = {
  currentSession: null,
  sessions: [],
  currentCase: null,
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

  // ========== 新增：课堂状态初始值 ==========
  classroomSession: null,
  classroomCode: null,
  sessionMapping: null,
  classroomStudents: new Map(),
  onlineStudentCount: 0,
  currentVote: null,
  voteHistory: [],
  isClassroomMode: false,
  isTeacherMode: false,
  classroomStatus: 'creating',
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

      // 案件数据管理
      setCase: (caseInfo) =>
        set((state) => {
          state.currentCase = caseInfo;
          console.log('📝 案件数据已设置到Store:', caseInfo?.title || '(空)');
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

      // ========== 新增：课堂管理Actions实现 ==========

      // 课堂会话管理
      createClassroomSession: async (dialogueSession) => {
        const { setLoading, setError, setClassroomStatus } = get();

        try {
          setLoading(true);
          setClassroomStatus('creating');
          setError(null);

          const result = await classroomAdapter.createClassroomSession(dialogueSession);

          set((state) => {
            state.classroomSession = result.classroomSession;
            state.classroomCode = result.classroomSession.code;
            state.sessionMapping = result.mapping;
            state.isClassroomMode = true;
            state.classroomStatus = 'active';
          });

          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '创建课堂失败';
          setError(errorMessage);
          setClassroomStatus('error');
          return false;
        } finally {
          setLoading(false);
        }
      },

      setClassroomSession: (classroom) =>
        set((state) => {
          state.classroomSession = classroom;
          if (classroom) {
            state.classroomCode = classroom.code;
            state.isClassroomMode = true;
          } else {
            state.classroomCode = null;
            state.isClassroomMode = false;
            state.sessionMapping = null;
          }
        }),

      endClassroomSession: async () => {
        const { currentSession, setLoading, setError } = get();

        if (!currentSession) {
          return false;
        }

        try {
          setLoading(true);
          setError(null);

          const success = await classroomAdapter.endClassroomSession(currentSession.id);

          if (success) {
            set((state) => {
              state.classroomSession = null;
              state.classroomCode = null;
              state.sessionMapping = null;
              state.isClassroomMode = false;
              state.classroomStatus = 'ended';
              state.classroomStudents.clear();
              state.currentVote = null;
              state.onlineStudentCount = 0;
            });
          }

          return success;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '结束课堂失败';
          setError(errorMessage);
          return false;
        } finally {
          setLoading(false);
        }
      },

      setClassroomStatus: (status) =>
        set((state) => {
          state.classroomStatus = status;
        }),

      // 学生管理
      addStudentToClassroom: async (studentId, displayName, avatar) => {
        const { currentSession, setError } = get();

        if (!currentSession) {
          setError('没有活跃的对话会话');
          return false;
        }

        try {
          const student = await classroomAdapter.addStudentToClassroom(currentSession.id, studentId, {
            displayName,
            avatar,
          });

          if (student) {
            set((state) => {
              state.classroomStudents.set(studentId, student);
              state.onlineStudentCount = Array.from(state.classroomStudents.values())
                .filter(s => s.isOnline).length;
            });
            return true;
          }

          return false;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '学生加入失败';
          setError(errorMessage);
          return false;
        }
      },

      removeStudentFromClassroom: async (studentId) => {
        const { currentSession, setError } = get();

        if (!currentSession) {
          setError('没有活跃的对话会话');
          return false;
        }

        try {
          const success = await classroomAdapter.removeStudentFromClassroom(currentSession.id, studentId);

          if (success) {
            set((state) => {
              state.classroomStudents.delete(studentId);
              state.onlineStudentCount = Array.from(state.classroomStudents.values())
                .filter(s => s.isOnline).length;
            });
          }

          return success;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '学生离开失败';
          setError(errorMessage);
          return false;
        }
      },

      updateStudentStatus: (studentId, updates) =>
        set((state) => {
          const student = state.classroomStudents.get(studentId);
          if (student) {
            Object.assign(student, updates);
            state.classroomStudents.set(studentId, student);

            // 更新在线人数
            state.onlineStudentCount = Array.from(state.classroomStudents.values())
              .filter(s => s.isOnline).length;
          }
        }),

      setClassroomStudents: (students) =>
        set((state) => {
          state.classroomStudents = students;
          state.onlineStudentCount = Array.from(students.values())
            .filter(s => s.isOnline).length;
        }),

      clearClassroomStudents: () =>
        set((state) => {
          state.classroomStudents.clear();
          state.onlineStudentCount = 0;
        }),

      // 投票系统
      startVote: async (voteData) => {
        const { currentSession, setError } = get();

        if (!currentSession) {
          setError('没有活跃的对话会话');
          return false;
        }

        try {
          const vote: VoteData = {
            ...voteData,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            votedStudents: new Set(),
          };

          const success = await classroomAdapter.setCurrentVote(currentSession.id, vote);

          if (success) {
            set((state) => {
              state.currentVote = vote;
            });
          }

          return success;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '开始投票失败';
          setError(errorMessage);
          return false;
        }
      },

      endVote: async () => {
        const { currentSession, currentVote, addToVoteHistory } = get();

        if (!currentSession || !currentVote) {
          return false;
        }

        try {
          const success = await classroomAdapter.endCurrentVote(currentSession.id);

          if (success) {
            // 将当前投票添加到历史记录
            addToVoteHistory(currentVote);

            set((state) => {
              state.currentVote = null;
            });
          }

          return success;
        } catch (error) {
          return false;
        }
      },

      setCurrentVote: (vote) =>
        set((state) => {
          state.currentVote = vote;
        }),

      addToVoteHistory: (vote) =>
        set((state) => {
          state.voteHistory.push(vote);
          // 保持历史记录不超过20条
          if (state.voteHistory.length > 20) {
            state.voteHistory = state.voteHistory.slice(-20);
          }
        }),

      // 课堂模式控制
      enableClassroomMode: () =>
        set((state) => {
          state.isClassroomMode = true;
        }),

      disableClassroomMode: () =>
        set((state) => {
          state.isClassroomMode = false;
          state.classroomSession = null;
          state.classroomCode = null;
          state.sessionMapping = null;
          state.classroomStudents.clear();
          state.currentVote = null;
          state.onlineStudentCount = 0;
        }),

      setIsTeacherMode: (isTeacher) =>
        set((state) => {
          state.isTeacherMode = isTeacher;
        }),

      // 状态同步
      syncClassroomState: () => {
        const { currentSession } = get();

        if (!currentSession) {
          return;
        }

        try {
          const syncData = classroomAdapter.syncClassroomToDialogue(currentSession.id);

          if (syncData && syncData.participants) {
            set((state) => {
              // 同步学生信息
              const studentsMap = new Map<string, StudentInfo>();
              syncData.participants?.forEach(student => {
                if ('id' in student && 'displayName' in student) {
                  studentsMap.set(student.id, student as StudentInfo);
                }
              });

              state.classroomStudents = studentsMap;
              state.onlineStudentCount = Array.from(studentsMap.values())
                .filter(s => s.isOnline).length;
            });
          }
        } catch (error) {
          console.error('同步课堂状态失败:', error);
        }
      },

      syncDialogueState: () => {
        const { currentSession } = get();

        if (!currentSession) {
          return;
        }

        try {
          classroomAdapter.syncDialogueToClassroom(currentSession);
        } catch (error) {
          console.error('同步对话状态失败:', error);
        }
      },
    })),
    {
      name: 'socratic-store',
      partialize: (state) => ({
        sessions: state.sessions,
        currentLevel: state.currentLevel,
        teacherMode: state.teacherMode,
        responseHistory: state.responseHistory.slice(-10), // 只持久化最近10条
        isTeacherMode: state.isTeacherMode,
        voteHistory: state.voteHistory.slice(-5), // 持久化最近5次投票记录
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

// 案件数据状态选择器
export const useCurrentCase = () => useSocraticStore((state) => state.currentCase);

// ========== 新增：课堂状态选择器 Hooks ==========
export const useClassroomSession = () => useSocraticStore((state) => state.classroomSession);
export const useClassroomCode = () => useSocraticStore((state) => state.classroomCode);
export const useClassroomStudents = () => useSocraticStore((state) => state.classroomStudents);
export const useOnlineStudentCount = () => useSocraticStore((state) => state.onlineStudentCount);
export const useCurrentVote = () => useSocraticStore((state) => state.currentVote);
export const useVoteHistory = () => useSocraticStore((state) => state.voteHistory);
export const useIsClassroomMode = () => useSocraticStore((state) => state.isClassroomMode);
export const useIsTeacherMode = () => useSocraticStore((state) => state.isTeacherMode);
export const useClassroomStatus = () => useSocraticStore((state) => state.classroomStatus);
export const useSessionMapping = () => useSocraticStore((state) => state.sessionMapping);

// ========== 操作 Hooks ==========
export const useSocraticActions = () => {
  const store = useSocraticStore();
  return {
    // 原有功能
    createSession: store.createSession,
    setCurrentSession: store.setCurrentSession,
    addMessage: store.addMessage,
    sendMessage: store.sendMessage,
    generateResponse: store.generateResponse,
    setLevel: store.setLevel,
    toggleTeacherMode: store.toggleTeacherMode,
    endSession: store.endSession,
    reset: store.reset,

    // 案件数据操作
    setCase: store.setCase,

    // ========== 新增：课堂管理操作 ==========
    // 课堂会话管理
    createClassroomSession: store.createClassroomSession,
    endClassroomSession: store.endClassroomSession,
    setClassroomSession: store.setClassroomSession,

    // 学生管理
    addStudentToClassroom: store.addStudentToClassroom,
    removeStudentFromClassroom: store.removeStudentFromClassroom,
    updateStudentStatus: store.updateStudentStatus,

    // 投票系统
    startVote: store.startVote,
    endVote: store.endVote,
    setCurrentVote: store.setCurrentVote,

    // 课堂模式控制
    enableClassroomMode: store.enableClassroomMode,
    disableClassroomMode: store.disableClassroomMode,
    setIsTeacherMode: store.setIsTeacherMode,

    // 状态同步
    syncClassroomState: store.syncClassroomState,
    syncDialogueState: store.syncDialogueState,
  };
};