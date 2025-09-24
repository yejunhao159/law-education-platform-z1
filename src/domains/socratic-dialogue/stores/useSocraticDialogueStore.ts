/**
 * 精简版苏格拉底对话Store
 * 职责：仅负责核心对话逻辑
 * DeepPractice Standards Compliant
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { DialogueLevel, Message, MessageRole } from '@/lib/types/socratic';
import type { SocraticRequest, SocraticResponse } from '@/src/types';

// ========== 核心对话状态 ==========
interface DialogueState {
  // 对话消息
  messages: Message[];

  // 教学控制
  currentLevel: DialogueLevel;

  // AI交互状态
  isGenerating: boolean;
  isTyping: boolean;
  lastResponse: SocraticResponse | null;

  // 错误状态（仅对话相关）
  dialogueError: string | null;
}

interface DialogueActions {
  // 消息管理
  addMessage: (content: string, role: MessageRole, level?: DialogueLevel) => void;
  updateMessage: (messageId: string, content: string) => void;
  clearMessages: () => void;
  setMessages: (messages: Message[]) => void;

  // 教学层级控制
  setLevel: (level: DialogueLevel) => void;
  progressToNextLevel: () => void;

  // AI交互
  setGenerating: (generating: boolean) => void;
  setTyping: (typing: boolean) => void;
  setLastResponse: (response: SocraticResponse | null) => void;

  // 对话控制
  generateAIResponse: (request: SocraticRequest) => Promise<SocraticResponse | null>;

  // 错误处理
  setDialogueError: (error: string | null) => void;

  // 重置
  resetDialogue: () => void;

  // 兼容性方法
  setLastResponse: (response: SocraticResponse | null) => void;
}

type SocraticDialogueStore = DialogueState & DialogueActions;

// ========== 初始状态 ==========
const initialState: DialogueState = {
  messages: [],
  currentLevel: DialogueLevel.OBSERVATION,
  isGenerating: false,
  isTyping: false,
  lastResponse: null,
  dialogueError: null,
};

// ========== Store创建 ==========
export const useSocraticDialogueStore = create<SocraticDialogueStore>()(
  immer((set, get) => ({
    ...initialState,

    // 消息管理
    addMessage: (content, role, level) =>
      set((state) => {
        const message: Message = {
          id: crypto.randomUUID(),
          role,
          content,
          level: level || state.currentLevel,
          timestamp: Date.now(),
        };
        state.messages.push(message);
      }),

    updateMessage: (messageId, content) =>
      set((state) => {
        const messageIndex = state.messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
          state.messages[messageIndex]!.content = content;
        }
      }),

    clearMessages: () =>
      set((state) => {
        state.messages = [];
      }),

    setMessages: (messages) =>
      set((state) => {
        state.messages = messages;
      }),

    // 教学层级控制
    setLevel: (level) =>
      set((state) => {
        state.currentLevel = level;
      }),

    progressToNextLevel: () =>
      set((state) => {
        const levels = [
          DialogueLevel.OBSERVATION,
          DialogueLevel.FACTS,
          DialogueLevel.ANALYSIS,
          DialogueLevel.APPLICATION,
          DialogueLevel.VALUES
        ];

        const currentIndex = levels.indexOf(state.currentLevel);
        if (currentIndex < levels.length - 1) {
          state.currentLevel = levels[currentIndex + 1]!;
        }
      }),

    // AI交互状态
    setGenerating: (generating) =>
      set((state) => {
        state.isGenerating = generating;
      }),

    setTyping: (typing) =>
      set((state) => {
        state.isTyping = typing;
      }),

    setLastResponse: (response) =>
      set((state) => {
        state.lastResponse = response;
      }),

    // AI响应生成（核心业务逻辑）
    generateAIResponse: async (request) => {
      const { setGenerating, setDialogueError, setLastResponse, addMessage } = get();

      try {
        setGenerating(true);
        setDialogueError(null);

        const response = await fetch('/api/socratic', {
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
          throw new Error(result.error?.message || 'AI响应生成失败');
        }

        const aiResponse: SocraticResponse = result.data;

        // 添加AI响应消息
        addMessage(
          aiResponse.content || aiResponse.question || '',
          MessageRole.AGENT,
          request.level
        );

        setLastResponse(aiResponse);
        return aiResponse;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        setDialogueError(errorMessage);
        return null;
      } finally {
        setGenerating(false);
      }
    },

    // 错误处理
    setDialogueError: (error) =>
      set((state) => {
        state.dialogueError = error;
      }),

    // 重置对话
    resetDialogue: () =>
      set(() => ({
        ...initialState,
      })),

    // 兼容性方法
    setLastResponse: (response) =>
      set((state) => {
        state.lastResponse = response;
      }),
  }))
);

// ========== 选择器 Hooks ==========
export const useDialogueMessages = () => useSocraticDialogueStore((state) => state.messages);
export const useCurrentLevel = () => useSocraticDialogueStore((state) => state.currentLevel);
export const useIsGenerating = () => useSocraticDialogueStore((state) => state.isGenerating);
export const useIsTyping = () => useSocraticDialogueStore((state) => state.isTyping);
export const useLastResponse = () => useSocraticDialogueStore((state) => state.lastResponse);
export const useDialogueError = () => useSocraticDialogueStore((state) => state.dialogueError);

// ========== 操作 Hooks ==========
export const useDialogueActions = () => {
  const store = useSocraticDialogueStore();
  return {
    addMessage: store.addMessage,
    updateMessage: store.updateMessage,
    clearMessages: store.clearMessages,
    setMessages: store.setMessages,
    setLevel: store.setLevel,
    progressToNextLevel: store.progressToNextLevel,
    setGenerating: store.setGenerating,
    setTyping: store.setTyping,
    generateAIResponse: store.generateAIResponse,
    setDialogueError: store.setDialogueError,
    resetDialogue: store.resetDialogue,
    setLastResponse: store.setLastResponse,
  };
};