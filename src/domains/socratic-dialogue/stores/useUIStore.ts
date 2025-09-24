/**
 * 苏格拉底对话UI状态管理
 * 职责：仅负责UI相关状态
 * DeepPractice Standards Compliant
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// ========== UI状态接口 ==========
interface UIState {
  // 加载状态
  loading: boolean;
  loadingMessage: string | null;

  // 连接状态
  connectionStatus: 'connected' | 'disconnected' | 'connecting';

  // 错误状态
  error: string | null;
  errorType: 'warning' | 'error' | 'info' | null;

  // 模态框状态
  showSessionSelector: boolean;
  showSettingsModal: boolean;
  showHelpModal: boolean;

  // 面板状态
  sidebarCollapsed: boolean;
  showPerformancePanel: boolean;
  showDebugPanel: boolean;

  // 教师控制面板
  teacherPanelOpen: boolean;
  levelControlsVisible: boolean;

  // 通知系统
  notifications: Array<{
    id: string;
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
    timestamp: number;
    autoClose: boolean;
  }>;
}

interface UIActions {
  // 加载状态管理
  setLoading: (loading: boolean, message?: string) => void;
  clearLoading: () => void;

  // 连接状态管理
  setConnectionStatus: (status: UIState['connectionStatus']) => void;

  // 错误管理
  setError: (error: string | null, type?: UIState['errorType']) => void;
  clearError: () => void;

  // 模态框控制
  toggleSessionSelector: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  openHelpModal: () => void;
  closeHelpModal: () => void;

  // 面板控制
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  togglePerformancePanel: () => void;
  toggleDebugPanel: () => void;

  // 教师面板控制
  toggleTeacherPanel: () => void;
  toggleLevelControls: () => void;

  // 通知系统
  addNotification: (
    type: 'success' | 'warning' | 'error' | 'info',
    title: string,
    message: string,
    autoClose?: boolean
  ) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;

  // 重置
  resetUI: () => void;
}

type UIStore = UIState & UIActions;

// ========== 初始状态 ==========
const initialState: UIState = {
  loading: false,
  loadingMessage: null,
  connectionStatus: 'disconnected',
  error: null,
  errorType: null,
  showSessionSelector: false,
  showSettingsModal: false,
  showHelpModal: false,
  sidebarCollapsed: false,
  showPerformancePanel: false,
  showDebugPanel: false,
  teacherPanelOpen: false,
  levelControlsVisible: true,
  notifications: [],
};

// ========== Store创建 ==========
export const useUIStore = create<UIStore>()(
  immer((set, get) => ({
    ...initialState,

    // 加载状态管理
    setLoading: (loading, message) =>
      set((state) => {
        state.loading = loading;
        state.loadingMessage = message || null;
        if (!loading) {
          state.loadingMessage = null;
        }
      }),

    clearLoading: () =>
      set((state) => {
        state.loading = false;
        state.loadingMessage = null;
      }),

    // 连接状态管理
    setConnectionStatus: (status) =>
      set((state) => {
        state.connectionStatus = status;
      }),

    // 错误管理
    setError: (error, type) =>
      set((state) => {
        state.error = error;
        state.errorType = type || 'error';
      }),

    clearError: () =>
      set((state) => {
        state.error = null;
        state.errorType = null;
      }),

    // 模态框控制
    toggleSessionSelector: () =>
      set((state) => {
        state.showSessionSelector = !state.showSessionSelector;
      }),

    openSettingsModal: () =>
      set((state) => {
        state.showSettingsModal = true;
      }),

    closeSettingsModal: () =>
      set((state) => {
        state.showSettingsModal = false;
      }),

    openHelpModal: () =>
      set((state) => {
        state.showHelpModal = true;
      }),

    closeHelpModal: () =>
      set((state) => {
        state.showHelpModal = false;
      }),

    // 面板控制
    toggleSidebar: () =>
      set((state) => {
        state.sidebarCollapsed = !state.sidebarCollapsed;
      }),

    setSidebarCollapsed: (collapsed) =>
      set((state) => {
        state.sidebarCollapsed = collapsed;
      }),

    togglePerformancePanel: () =>
      set((state) => {
        state.showPerformancePanel = !state.showPerformancePanel;
      }),

    toggleDebugPanel: () =>
      set((state) => {
        state.showDebugPanel = !state.showDebugPanel;
      }),

    // 教师面板控制
    toggleTeacherPanel: () =>
      set((state) => {
        state.teacherPanelOpen = !state.teacherPanelOpen;
      }),

    toggleLevelControls: () =>
      set((state) => {
        state.levelControlsVisible = !state.levelControlsVisible;
      }),

    // 通知系统
    addNotification: (type, title, message, autoClose = true) =>
      set((state) => {
        const notification = {
          id: crypto.randomUUID(),
          type,
          title,
          message,
          timestamp: Date.now(),
          autoClose,
        };
        state.notifications.push(notification);

        // 自动移除通知（3秒后）
        if (autoClose) {
          setTimeout(() => {
            const { removeNotification } = get();
            removeNotification(notification.id);
          }, 3000);
        }
      }),

    removeNotification: (id) =>
      set((state) => {
        state.notifications = state.notifications.filter(n => n.id !== id);
      }),

    clearAllNotifications: () =>
      set((state) => {
        state.notifications = [];
      }),

    // 重置UI状态
    resetUI: () =>
      set(() => ({
        ...initialState,
      })),
  }))
);

// ========== 选择器 Hooks ==========
export const useLoading = () => useUIStore((state) => ({ loading: state.loading, message: state.loadingMessage }));
export const useConnectionStatus = () => useUIStore((state) => state.connectionStatus);
export const useError = () => useUIStore((state) => ({ error: state.error, type: state.errorType }));
export const useModals = () => useUIStore((state) => ({
  showSessionSelector: state.showSessionSelector,
  showSettingsModal: state.showSettingsModal,
  showHelpModal: state.showHelpModal,
}));
export const usePanels = () => useUIStore((state) => ({
  sidebarCollapsed: state.sidebarCollapsed,
  showPerformancePanel: state.showPerformancePanel,
  showDebugPanel: state.showDebugPanel,
  teacherPanelOpen: state.teacherPanelOpen,
  levelControlsVisible: state.levelControlsVisible,
}));
export const useNotifications = () => useUIStore((state) => state.notifications);

// ========== 操作 Hooks ==========
export const useUIActions = () => {
  const store = useUIStore();
  return {
    // 加载控制
    setLoading: store.setLoading,
    clearLoading: store.clearLoading,

    // 连接状态
    setConnectionStatus: store.setConnectionStatus,

    // 错误控制
    setError: store.setError,
    clearError: store.clearError,

    // 模态框控制
    toggleSessionSelector: store.toggleSessionSelector,
    openSettingsModal: store.openSettingsModal,
    closeSettingsModal: store.closeSettingsModal,
    openHelpModal: store.openHelpModal,
    closeHelpModal: store.closeHelpModal,

    // 面板控制
    toggleSidebar: store.toggleSidebar,
    setSidebarCollapsed: store.setSidebarCollapsed,
    togglePerformancePanel: store.togglePerformancePanel,
    toggleDebugPanel: store.toggleDebugPanel,

    // 教师面板
    toggleTeacherPanel: store.toggleTeacherPanel,
    toggleLevelControls: store.toggleLevelControls,

    // 通知系统
    addNotification: store.addNotification,
    removeNotification: store.removeNotification,
    clearAllNotifications: store.clearAllNotifications,

    // 重置
    resetUI: store.resetUI,
  };
};