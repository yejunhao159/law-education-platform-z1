/**
 * 精简版苏格拉底对话Store
 * 职责：仅负责核心对话逻辑
 * DeepPractice Standards Compliant
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  DialogueLevel,
  Message,
  MessageRole,
  SocraticRequest,
  SocraticResponse
} from '@/src/domains/socratic-dialogue/types';

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
  currentLevel: 'beginner' as DialogueLevel, // 修复: DialogueLevel是类型不是枚举
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

        // 🔗 数据桥接：同步对话消息计数到 useTeachingStore（第四幕需要）
        if (typeof window !== 'undefined') {
          import('@/src/domains/teaching-acts/stores/useTeachingStore').then(({ useTeachingStore }) => {
            // 简单记录：当前讨论深度等级
            const levelMap = { beginner: 1, intermediate: 2, advanced: 3 } as const;
            const numericLevel = levelMap[state.currentLevel] || 1;

            // 更新苏格拉底数据的level
            const teachingStore = useTeachingStore.getState();
            if (teachingStore.socraticData.level !== numericLevel) {
              // 🔧 修复：实际调用方法更新level
              while (teachingStore.socraticData.level < numericLevel) {
                teachingStore.progressSocraticLevel();
              }
            }
          });
        }
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
        const levels: DialogueLevel[] = [
          'beginner',
          'intermediate',
          'advanced'
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

    // AI响应生成（核心业务逻辑）- Phase B: 支持流式输出
    generateAIResponse: async (request) => {
      const { setGenerating, setDialogueError, setLastResponse, addMessage, updateMessage } = get();

      try {
        setGenerating(true);
        setDialogueError(null);

        // Phase B: 启用流式输出
        const response = await fetch('/api/socratic', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...request,
            streaming: true // 启用流式
          }),
        });

        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status}`);
        }

        // 流式接收SSE
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        // 先创建一个占位消息
        const tempMessageId = crypto.randomUUID();
        addMessage('', MessageRole.AGENT, request.level);
        const messages = get().messages;
        const messageIndex = messages.length - 1;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    fullContent += parsed.content;
                    // 实时更新消息内容
                    const currentMessages = get().messages;
                    if (currentMessages[messageIndex]) {
                      currentMessages[messageIndex].content = fullContent;
                      set((state) => { state.messages = [...currentMessages]; });
                    }
                  }
                } catch (e) {
                  console.warn('解析SSE数据失败:', data);
                }
              }
            }
          }
        }

        const aiResponse: SocraticResponse = {
          content: fullContent,
          question: fullContent,
          level: request.level || 'beginner'
        };

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