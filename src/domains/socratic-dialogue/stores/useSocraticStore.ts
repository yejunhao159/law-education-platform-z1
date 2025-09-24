/**
 * 苏格拉底对话Store - 兼容性层
 * 将旧的统一Store重定向到新的模块化Store系统
 * 保持现有组件的兼容性
 */

import { useSocraticDialogueStore, useDialogueActions } from './useSocraticDialogueStore';
import { useUIStore, useUIActions } from './useUIStore';
import { dialogueSessionManager } from '../services/DialogueSessionManager';
import { useCurrentCase } from '@/src/domains/case-management/stores/useCaseStore';
import type { CaseInfo } from '@/lib/types/socratic';
import type { DialogueContext, Message, TeachingLevel, SocraticRequest, SocraticResponse, TeachingAssessment } from '@/src/types';

// ========== 兼容性接口 ==========
interface LegacySocraticState {
  // 当前会话状态
  currentSession: any | null;
  sessions: any[];

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

  // 课堂状态（简化版，主要功能由ClassroomAdapter处理）
  classroomSession: any | null;
  classroomCode: string | null;
  isClassroomMode: boolean;
  isTeacherMode: boolean;
}

// ========== 兼容性Hook ==========
export const useSocraticStore = () => {
  // 从各个专门的store获取状态
  const dialogueStore = useSocraticDialogueStore();
  const uiStore = useUIStore();
  const dialogueActions = useDialogueActions();
  const uiActions = useUIActions();
  const currentCase = useCurrentCase();

  // 模拟旧接口的状态
  const legacyState: LegacySocraticState = {
    // 会话状态（从DialogueSessionManager获取）
    currentSession: dialogueSessionManager.getActiveSession(),
    sessions: dialogueSessionManager.getAllSessionSummaries(),

    // 案件数据
    currentCase,

    // 对话状态（从DialogueStore获取）
    messages: dialogueStore.messages,
    isGenerating: dialogueStore.isGenerating,
    isTyping: dialogueStore.isTyping,

    // 教学状态
    currentLevel: mapDialogueLevelToTeachingLevel(dialogueStore.currentLevel),
    context: {},
    teacherMode: uiStore.teacherPanelOpen,

    // AI响应状态
    lastResponse: dialogueStore.lastResponse,
    responseHistory: [], // 简化：不再维护历史记录

    // 评估状态（简化）
    assessment: null,
    isAssessing: false,

    // UI状态（从UIStore获取）
    loading: uiStore.loading,
    error: uiStore.error,
    connectionStatus: uiStore.connectionStatus,

    // 课堂状态（简化）
    classroomSession: null,
    classroomCode: null,
    isClassroomMode: false,
    isTeacherMode: uiStore.teacherPanelOpen,
  };

  // 模拟旧接口的操作
  const legacyActions = {
    // 会话管理（委托给DialogueSessionManager）
    createSession: (title: string, level: TeachingLevel, context: DialogueContext) => {
      const session = dialogueSessionManager.createSession({
        title,
        mode: 'auto' as any, // 简化映射
      });
      dialogueActions.setLevel(mapTeachingLevelToDialogueLevel(level));
    },

    setCurrentSession: (session: any) => {
      dialogueSessionManager.setActiveSession(session?.id || null);
    },

    endSession: () => {
      const activeSession = dialogueSessionManager.getActiveSession();
      if (activeSession) {
        dialogueSessionManager.endSession(activeSession.id);
      }
    },

    // 消息管理（委托给DialogueStore）
    addMessage: (messageData: Omit<Message, 'id' | 'timestamp'>) => {
      dialogueActions.addMessage(
        messageData.content,
        mapMessageRole(messageData.role)
      );
    },

    clearMessages: dialogueActions.clearMessages,
    setMessages: dialogueActions.setMessages,

    // 对话控制
    sendMessage: (content: string) => {
      dialogueActions.addMessage(content, 'student' as any);
    },

    generateResponse: async (request: SocraticRequest): Promise<SocraticResponse | null> => {
      return dialogueActions.generateAIResponse(request);
    },

    setGenerating: dialogueActions.setGenerating,
    setTyping: dialogueActions.setTyping,

    // 教学控制
    setLevel: (level: TeachingLevel) => {
      dialogueActions.setLevel(mapTeachingLevelToDialogueLevel(level));
    },

    toggleTeacherMode: uiActions.toggleTeacherPanel,

    // UI控制（委托给UIStore）
    setLoading: uiActions.setLoading,
    setError: uiActions.setError,
    setConnectionStatus: uiActions.setConnectionStatus,

    // 简化的重置操作
    reset: () => {
      dialogueActions.resetDialogue();
      uiActions.resetUI();
      dialogueSessionManager.setActiveSession(null);
    },

    // 课堂管理（委托给ClassroomAdapter）
    createClassroomSession: async (dialogueSession: any) => {
      // 简化实现
      return false;
    },

    enableClassroomMode: () => {
      // 简化实现
    },

    disableClassroomMode: () => {
      // 简化实现
    },

    // 其他遗留操作（简化或空实现）
    updateSession: () => {},
    deleteSession: () => {},
    updateMessage: () => {},
    updateContext: () => {},
    resetLevel: () => dialogueActions.setLevel(1 as any),
    setLastResponse: dialogueActions.setLastResponse,
    addToResponseHistory: () => {},
    clearResponseHistory: () => {},
    startAssessment: () => {},
    setAssessment: () => {},
    setAssessing: () => {},
  };

  return {
    ...legacyState,
    ...legacyActions,
  };
};

// ========== 类型映射辅助函数 ==========
function mapDialogueLevelToTeachingLevel(dialogueLevel: number): TeachingLevel {
  switch (dialogueLevel) {
    case 1: return 'basic';
    case 2: return 'intermediate';
    case 3: return 'advanced';
    case 4: return 'advanced';
    case 5: return 'advanced';
    default: return 'basic';
  }
}

function mapTeachingLevelToDialogueLevel(teachingLevel: TeachingLevel): number {
  switch (teachingLevel) {
    case 'basic': return 1;
    case 'intermediate': return 2;
    case 'advanced': return 3;
    default: return 1;
  }
}

function mapMessageRole(role: string): any {
  switch (role) {
    case 'teacher': return 'student';
    case 'ai': return 'agent';
    case 'student': return 'student';
    case 'system': return 'system';
    default: return 'student';
  }
}

// ========== 兼容性选择器导出 ==========
export const useCurrentDialogueSession = () => {
  return dialogueSessionManager.getActiveSession();
};

export const useDialogueMessages = () => {
  return useSocraticDialogueStore(state => state.messages);
};

export const useDialogueSessions = () => {
  return dialogueSessionManager.getAllSessionSummaries();
};

export const useSocraticLevel = () => {
  const level = useSocraticDialogueStore(state => state.currentLevel);
  return mapDialogueLevelToTeachingLevel(level);
};

export const useIsGenerating = () => {
  return useSocraticDialogueStore(state => state.isGenerating);
};

export const useTeacherMode = () => {
  return useUIStore(state => state.teacherPanelOpen);
};

export const useLastResponse = () => {
  return useSocraticDialogueStore(state => state.lastResponse);
};

// ========== 兼容性操作导出 ==========
export const useSocraticActions = () => {
  const { ...actions } = useSocraticStore();
  return {
    createSession: actions.createSession,
    setCurrentSession: actions.setCurrentSession,
    addMessage: actions.addMessage,
    sendMessage: actions.sendMessage,
    generateResponse: actions.generateResponse,
    setLevel: actions.setLevel,
    toggleTeacherMode: actions.toggleTeacherMode,
    endSession: actions.endSession,
    reset: actions.reset,
  };
};

// ========== 缺失的导出函数（修复stores.ts警告）==========

// 重新导出案例相关函数，避免循环依赖
export const useCurrentCase = () => {
  // 动态导入避免循环依赖
  const caseStore = require('@/src/domains/case-management/stores/useCaseStore');
  return caseStore.useCurrentCase();
};

// 课堂管理相关函数（简化实现）
export const useClassroomSession = () => {
  return null; // 简化实现
};

export const useClassroomCode = () => {
  return ''; // 简化实现
};

export const useClassroomStudents = () => {
  return []; // 简化实现
};

export const useCurrentVote = () => {
  return null; // 简化实现
};

export const useIsClassroomMode = () => {
  return false; // 简化实现
};

export const useIsTeacherMode = () => {
  return useUIStore(state => state.teacherPanelOpen);
};