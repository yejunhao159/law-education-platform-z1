/**
 * Zustand store for evidence interaction state management
 * Handles drag-and-drop, scoring, and feedback for evidence review
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import type { FeedbackMessage, ViewMode } from '@/types/dispute-evidence';

// Enable MapSet plugin for Immer to handle Set and Map
enableMapSet();

interface EvidenceInteractionStore {
  // Drag and Drop State
  draggedItem: string | null;
  dropTarget: string | null;
  isAnimating: boolean;

  // Card State
  flippedCards: Set<string>;

  // Mapping State
  completedMappings: Map<string, string>;
  correctMappings: Map<string, string>;

  // Score and Feedback
  score: number;
  feedback: FeedbackMessage[];

  // Mode
  mode: ViewMode;

  // Statistics
  attemptCount: number;
  correctCount: number;

  // Actions - Drag and Drop
  startDrag: (itemId: string) => void;
  setDropTarget: (targetId: string | null) => void;
  endDrag: () => void;
  cancelDrag: () => void;
  completeDrop: (evidenceId: string, elementId: string, isCorrect: boolean) => void;

  // Actions - Card Management
  flipCard: (cardId: string) => void;
  flipAllCards: (cardIds: string[]) => void;
  resetFlippedCards: () => void;

  // Actions - Score Management
  updateScore: (delta: number) => void;
  addPoints: (points: number) => void;
  deductPoints: (points: number) => void;
  resetScore: () => void;

  // Actions - Feedback
  addFeedback: (type: FeedbackMessage['type'], message: string) => void;
  removeFeedback: (id: string) => void;
  clearFeedback: () => void;

  // Actions - Mode
  setMode: (mode: ViewMode) => void;
  toggleMode: () => void;

  // Actions - Mapping Management
  setCorrectMappings: (mappings: Map<string, string>) => void;
  isCorrectMapping: (evidenceId: string, elementId: string) => boolean;
  removeMapping: (evidenceId: string) => void;
  clearMappings: () => void;
  areAllMappingsComplete: (totalEvidence: string[]) => boolean;

  // Actions - Animation
  setAnimating: (animating: boolean) => void;

  // Actions - Statistics
  incrementAttempt: () => void;
  incrementCorrect: () => void;
  getAccuracy: () => number;

  // Actions - Reset
  reset: () => void;
}

const initialState = {
  draggedItem: null,
  dropTarget: null,
  isAnimating: false,
  flippedCards: new Set<string>(),
  completedMappings: new Map<string, string>(),
  correctMappings: new Map<string, string>(),
  score: 0,
  feedback: [],
  mode: 'watch' as ViewMode,
  attemptCount: 0,
  correctCount: 0,
};

export const useEvidenceInteractionStore = create<EvidenceInteractionStore>()(
  immer((set, get) => ({
    // Initial state
    ...initialState,

    // Drag and Drop Actions
    startDrag: (itemId) =>
      set((state) => {
        state.draggedItem = itemId;
        state.isAnimating = true;
      }),

    setDropTarget: (targetId) =>
      set((state) => {
        state.dropTarget = targetId;
      }),

    endDrag: () =>
      set((state) => {
        state.draggedItem = null;
        state.dropTarget = null;
        state.isAnimating = false;
      }),

    cancelDrag: () =>
      set((state) => {
        state.draggedItem = null;
        state.dropTarget = null;
        state.isAnimating = false;
      }),

    completeDrop: (evidenceId, elementId, isCorrect) =>
      set((state) => {
        state.completedMappings.set(evidenceId, elementId);
        state.draggedItem = null;
        state.dropTarget = null;
        state.isAnimating = false;
      }),

    // Card Management
    flipCard: (cardId) =>
      set((state) => {
        if (state.flippedCards.has(cardId)) {
          state.flippedCards.delete(cardId);
        } else {
          state.flippedCards.add(cardId);
        }
      }),

    flipAllCards: (cardIds) =>
      set((state) => {
        state.flippedCards = new Set(cardIds);
      }),

    resetFlippedCards: () =>
      set((state) => {
        state.flippedCards = new Set();
      }),

    // Score Management
    updateScore: (delta) =>
      set((state) => {
        state.score = Math.max(0, state.score + delta);
      }),

    addPoints: (points) =>
      set((state) => {
        state.score += points;
      }),

    deductPoints: (points) =>
      set((state) => {
        state.score = Math.max(0, state.score - points);
      }),

    resetScore: () =>
      set((state) => {
        state.score = 0;
      }),

    // Feedback Management
    addFeedback: (type, message) =>
      set((state) => {
        const feedback: FeedbackMessage = {
          id: `feedback-${Date.now()}-${Math.random()}`,
          type,
          message,
          timestamp: Date.now(),
        };
        state.feedback.push(feedback);
      }),

    removeFeedback: (id) =>
      set((state) => {
        state.feedback = state.feedback.filter((f) => f.id !== id);
      }),

    clearFeedback: () =>
      set((state) => {
        state.feedback = [];
      }),

    // Mode Management
    setMode: (mode) =>
      set((state) => {
        state.mode = mode;
      }),

    toggleMode: () =>
      set((state) => {
        state.mode = state.mode === 'watch' ? 'practice' : 'watch';
      }),

    // Mapping Management
    setCorrectMappings: (mappings) =>
      set((state) => {
        state.correctMappings = new Map(mappings);
      }),

    isCorrectMapping: (evidenceId, elementId) => {
      const state = get();
      return state.correctMappings.get(evidenceId) === elementId;
    },

    removeMapping: (evidenceId) =>
      set((state) => {
        state.completedMappings.delete(evidenceId);
      }),

    clearMappings: () =>
      set((state) => {
        state.completedMappings = new Map();
      }),

    areAllMappingsComplete: (totalEvidence) => {
      const state = get();
      return totalEvidence.every((evidenceId) =>
        state.completedMappings.has(evidenceId)
      );
    },

    // Animation Management
    setAnimating: (animating) =>
      set((state) => {
        state.isAnimating = animating;
      }),

    // Statistics Management
    incrementAttempt: () =>
      set((state) => {
        state.attemptCount += 1;
      }),

    incrementCorrect: () =>
      set((state) => {
        state.correctCount += 1;
      }),

    getAccuracy: () => {
      const state = get();
      if (state.attemptCount === 0) return 0;
      return (state.correctCount / state.attemptCount) * 100;
    },

    // Reset
    reset: () =>
      set(() => ({
        ...initialState,
        flippedCards: new Set<string>(),
        completedMappings: new Map<string, string>(),
        correctMappings: new Map<string, string>(),
      })),
  }))
);

// Selector hooks for common queries
export const useDraggedItem = () => useEvidenceInteractionStore((state) => state.draggedItem);
export const useDropTarget = () => useEvidenceInteractionStore((state) => state.dropTarget);
export const useScore = () => useEvidenceInteractionStore((state) => state.score);
export const useFeedback = () => useEvidenceInteractionStore((state) => state.feedback);
export const useInteractionMode = () => useEvidenceInteractionStore((state) => state.mode);
export const useFlippedCards = () => useEvidenceInteractionStore((state) => state.flippedCards);
export const useCompletedMappings = () => useEvidenceInteractionStore((state) => state.completedMappings);