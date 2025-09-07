/**
 * Zustand store for dispute focus state management
 * Extends the existing case store with dispute-specific functionality
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { DisputeFocus, DifficultyLevel, TeachingValueLevel } from '@/types/dispute-evidence';
import type { DisputeAnalysisStatus } from '@/lib/ai-dispute-analyzer';

interface DisputeStore {
  // State
  disputes: DisputeFocus[];
  selectedDisputeId: string | null;
  status: DisputeAnalysisStatus;
  error: string | null;
  isLoading: boolean;
  isCached: boolean;
  cacheTimestamp: number | null;

  // Actions - Dispute Management
  setDisputes: (disputes: DisputeFocus[]) => void;
  addDispute: (dispute: DisputeFocus) => void;
  updateDispute: (id: string, updates: Partial<DisputeFocus>) => void;
  removeDispute: (id: string) => void;

  // Actions - Selection
  selectDispute: (id: string) => void;
  clearSelection: () => void;
  getSelectedDispute: () => DisputeFocus | null;

  // Actions - State Management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setStatus: (status: DisputeAnalysisStatus) => void;

  // Actions - Cache
  setCached: (cached: boolean) => void;
  updateCacheTimestamp: () => void;

  // Actions - Filtering and Sorting
  filterByDifficulty: (difficulty: DifficultyLevel) => DisputeFocus[];
  sortByTeachingValue: () => DisputeFocus[];

  // Actions - Reset
  reset: () => void;
}

const initialState = {
  disputes: [],
  selectedDisputeId: null,
  status: 'pending' as DisputeAnalysisStatus,
  error: null,
  isLoading: false,
  isCached: false,
  cacheTimestamp: null,
};

export const useDisputeStore = create<DisputeStore>()(
  immer((set, get) => ({
    // Initial state
    ...initialState,

    // Dispute Management
    setDisputes: (disputes) =>
      set((state) => {
        state.disputes = disputes;
      }),

    addDispute: (dispute) =>
      set((state) => {
        state.disputes.push(dispute);
      }),

    updateDispute: (id, updates) =>
      set((state) => {
        const index = state.disputes.findIndex((d) => d.id === id);
        if (index !== -1) {
          state.disputes[index] = { ...state.disputes[index], ...updates };
        }
      }),

    removeDispute: (id) =>
      set((state) => {
        state.disputes = state.disputes.filter((d) => d.id !== id);
        if (state.selectedDisputeId === id) {
          state.selectedDisputeId = null;
        }
      }),

    // Selection Management
    selectDispute: (id) =>
      set((state) => {
        state.selectedDisputeId = id;
      }),

    clearSelection: () =>
      set((state) => {
        state.selectedDisputeId = null;
      }),

    getSelectedDispute: () => {
      const state = get();
      if (!state.selectedDisputeId) return null;
      return state.disputes.find((d) => d.id === state.selectedDisputeId) || null;
    },

    // State Management
    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    clearError: () =>
      set((state) => {
        state.error = null;
      }),

    setStatus: (status) =>
      set((state) => {
        state.status = status;
      }),

    // Cache Management
    setCached: (cached) =>
      set((state) => {
        state.isCached = cached;
      }),

    updateCacheTimestamp: () =>
      set((state) => {
        state.cacheTimestamp = Date.now();
      }),

    // Filtering and Sorting
    filterByDifficulty: (difficulty) => {
      const state = get();
      return state.disputes.filter((d) => d.difficulty === difficulty);
    },

    sortByTeachingValue: () => {
      const state = get();
      const valueOrder: Record<TeachingValueLevel, number> = {
        high: 3,
        medium: 2,
        low: 1,
      };

      return [...state.disputes].sort(
        (a, b) => valueOrder[b.teachingValue] - valueOrder[a.teachingValue]
      );
    },

    // Reset
    reset: () =>
      set(() => ({
        ...initialState,
      })),
  }))
);

// Selector hooks for common queries
export const useDisputes = () => useDisputeStore((state) => state.disputes);
export const useSelectedDispute = () => {
  const selectedId = useDisputeStore((state) => state.selectedDisputeId);
  const disputes = useDisputeStore((state) => state.disputes);
  return disputes.find((d) => d.id === selectedId) || null;
};
export const useDisputeStatus = () => useDisputeStore((state) => state.status);
export const useDisputeLoading = () => useDisputeStore((state) => state.isLoading);
export const useDisputeError = () => useDisputeStore((state) => state.error);