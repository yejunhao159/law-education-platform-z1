/**
 * 案例管理域状态管理
 * DeepPractice Standards Compliant
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';

import type { LegalCase } from '@/src/types';

// ========== 接口定义 ==========
interface CaseManagementState {
  // 数据状态
  currentCase: LegalCase | null;
  cases: LegalCase[];
  selectedCaseId: string | null;

  // UI状态
  loading: boolean;
  error: string | null;
  searchQuery: string;
  filters: {
    caseType?: string;
    court?: string;
    dateRange?: [string, string];
  };

  // 分页状态
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

interface CaseManagementActions {
  // 案例CRUD操作
  setCurrentCase: (caseData: LegalCase | null) => void;
  addCase: (caseData: LegalCase) => void;
  updateCase: (id: string, updates: Partial<LegalCase>) => void;
  removeCase: (id: string) => void;
  setCases: (cases: LegalCase[]) => void;

  // 选择和导航
  selectCase: (id: string | null) => void;
  clearSelection: () => void;

  // UI状态管理
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // 搜索和筛选
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<CaseManagementState['filters']>) => void;
  clearFilters: () => void;

  // 分页
  setPagination: (pagination: Partial<CaseManagementState['pagination']>) => void;
  nextPage: () => void;
  previousPage: () => void;

  // 重置
  reset: () => void;
}

type CaseManagementStore = CaseManagementState & CaseManagementActions;

// ========== 初始状态 ==========
const initialState: CaseManagementState = {
  currentCase: null,
  cases: [],
  selectedCaseId: null,
  loading: false,
  error: null,
  searchQuery: '',
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
};

// ========== Store创建 ==========
export const useCaseManagementStore = create<CaseManagementStore>()(
  persist(
    immer((set, get) => ({
      // 初始状态
      ...initialState,

      // 案例CRUD操作
      setCurrentCase: (caseData) =>
        set((state) => {
          state.currentCase = caseData;
          state.selectedCaseId = caseData?.id || null;
        }),

      addCase: (caseData) =>
        set((state) => {
          state.cases.unshift(caseData);
          state.pagination.total += 1;
        }),

      updateCase: (id, updates) =>
        set((state) => {
          const index = state.cases.findIndex((c) => c.id === id);
          if (index !== -1) {
            Object.assign(state.cases[index]!, updates);
          }
          // 如果更新的是当前案例，也要更新currentCase
          if (state.currentCase?.id === id) {
            Object.assign(state.currentCase, updates);
          }
        }),

      removeCase: (id) =>
        set((state) => {
          state.cases = state.cases.filter((c) => c.id !== id);
          state.pagination.total = Math.max(0, state.pagination.total - 1);
          // 如果删除的是当前案例，清空当前案例
          if (state.currentCase?.id === id) {
            state.currentCase = null;
            state.selectedCaseId = null;
          }
        }),

      setCases: (cases) =>
        set((state) => {
          state.cases = cases;
        }),

      // 选择和导航
      selectCase: (id) =>
        set((state) => {
          state.selectedCaseId = id;
          if (id) {
            const selectedCase = state.cases.find((c) => c.id === id);
            if (selectedCase) {
              state.currentCase = selectedCase;
            }
          } else {
            state.currentCase = null;
          }
        }),

      clearSelection: () =>
        set((state) => {
          state.selectedCaseId = null;
          state.currentCase = null;
        }),

      // UI状态管理
      setLoading: (loading) =>
        set((state) => {
          state.loading = loading;
        }),

      setError: (error) =>
        set((state) => {
          state.error = error;
        }),

      clearError: () =>
        set((state) => {
          state.error = null;
        }),

      // 搜索和筛选
      setSearchQuery: (query) =>
        set((state) => {
          state.searchQuery = query;
          // 重置到第一页
          state.pagination.page = 1;
        }),

      setFilters: (filters) =>
        set((state) => {
          Object.assign(state.filters, filters);
          // 重置到第一页
          state.pagination.page = 1;
        }),

      clearFilters: () =>
        set((state) => {
          state.filters = {};
          state.searchQuery = '';
          state.pagination.page = 1;
        }),

      // 分页
      setPagination: (pagination) =>
        set((state) => {
          Object.assign(state.pagination, pagination);
        }),

      nextPage: () =>
        set((state) => {
          const { page, limit, total } = state.pagination;
          const maxPage = Math.ceil(total / limit);
          if (page < maxPage) {
            state.pagination.page += 1;
          }
        }),

      previousPage: () =>
        set((state) => {
          if (state.pagination.page > 1) {
            state.pagination.page -= 1;
          }
        }),

      // 重置
      reset: () =>
        set(() => ({
          ...initialState,
        })),
    })),
    {
      name: 'case-management-store',
      partialize: (state) => ({
        currentCase: state.currentCase,
        selectedCaseId: state.selectedCaseId,
        searchQuery: state.searchQuery,
        filters: state.filters,
        pagination: state.pagination,
      }),
    }
  )
);

// ========== 选择器 Hooks ==========
export const useCurrentCase = () => useCaseManagementStore((state) => state.currentCase);
export const useCases = () => useCaseManagementStore((state) => state.cases);
export const useSelectedCaseId = () => useCaseManagementStore((state) => state.selectedCaseId);
export const useCaseLoading = () => useCaseManagementStore((state) => state.loading);
export const useCaseError = () => useCaseManagementStore((state) => state.error);
export const useCaseSearchQuery = () => useCaseManagementStore((state) => state.searchQuery);
export const useCaseFilters = () => useCaseManagementStore((state) => state.filters);
export const useCasePagination = () => useCaseManagementStore((state) => state.pagination);

// ========== 操作 Hooks ==========
export const useCaseActions = () => {
  const store = useCaseManagementStore();
  return {
    setCurrentCase: store.setCurrentCase,
    addCase: store.addCase,
    updateCase: store.updateCase,
    removeCase: store.removeCase,
    setCases: store.setCases,
    selectCase: store.selectCase,
    clearSelection: store.clearSelection,
    setLoading: store.setLoading,
    setError: store.setError,
    clearError: store.clearError,
    setSearchQuery: store.setSearchQuery,
    setFilters: store.setFilters,
    clearFilters: store.clearFilters,
    setPagination: store.setPagination,
    nextPage: store.nextPage,
    previousPage: store.previousPage,
    reset: store.reset,
  };
};