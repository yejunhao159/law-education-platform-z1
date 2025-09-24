/**
 * 苏格拉底对话Store统一导出
 * 重构后的模块化状态管理
 */

// 核心对话逻辑Store
export {
  useSocraticDialogueStore,
  useDialogueMessages,
  useCurrentLevel,
  useIsGenerating,
  useIsTyping,
  useLastResponse,
  useDialogueError,
  useDialogueActions,
} from './useSocraticDialogueStore';

// UI状态Store
export {
  useUIStore,
  useLoading,
  useConnectionStatus,
  useError,
  useModals,
  usePanels,
  useNotifications,
  useUIActions,
} from './useUIStore';

// 对话会话管理器
export { dialogueSessionManager, DialogueSessionManager, type DialogueSession, type SessionSummary, type CreateSessionOptions } from '../services/DialogueSessionManager';

// 兼容性导出（保持向后兼容）
export { useSocraticStore } from './useSocraticStore';