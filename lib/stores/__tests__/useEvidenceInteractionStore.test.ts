/**
 * TDD Tests for Evidence Interaction Store
 * Testing drag-and-drop state management for evidence review
 */

import { act, renderHook } from '@testing-library/react';
import { useEvidenceInteractionStore } from '../useEvidenceInteractionStore';
import type { FeedbackMessage } from '@/types/dispute-evidence';

describe('useEvidenceInteractionStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useEvidenceInteractionStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      expect(result.current.draggedItem).toBeNull();
      expect(result.current.dropTarget).toBeNull();
      expect(result.current.flippedCards.size).toBe(0);
      expect(result.current.completedMappings.size).toBe(0);
      expect(result.current.score).toBe(0);
      expect(result.current.feedback).toEqual([]);
      expect(result.current.mode).toBe('watch');
      expect(result.current.isAnimating).toBe(false);
    });
  });

  describe('Drag and Drop Operations', () => {
    it('should start dragging an item', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.startDrag('evidence-1');
      });

      expect(result.current.draggedItem).toBe('evidence-1');
      expect(result.current.isAnimating).toBe(true);
    });

    it('should set drop target on hover', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.startDrag('evidence-1');
        result.current.setDropTarget('element-1');
      });

      expect(result.current.dropTarget).toBe('element-1');
    });

    it('should end drag operation', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.startDrag('evidence-1');
        result.current.setDropTarget('element-1');
        result.current.endDrag();
      });

      expect(result.current.draggedItem).toBeNull();
      expect(result.current.dropTarget).toBeNull();
      expect(result.current.isAnimating).toBe(false);
    });

    it('should complete mapping on successful drop', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.startDrag('evidence-1');
        result.current.setDropTarget('element-1');
        result.current.completeDrop('evidence-1', 'element-1', true);
      });

      expect(result.current.completedMappings.has('evidence-1')).toBe(true);
      expect(result.current.completedMappings.get('evidence-1')).toBe('element-1');
      expect(result.current.draggedItem).toBeNull();
      expect(result.current.dropTarget).toBeNull();
    });

    it('should cancel drag operation', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.startDrag('evidence-1');
        result.current.setDropTarget('element-1');
        result.current.cancelDrag();
      });

      expect(result.current.draggedItem).toBeNull();
      expect(result.current.dropTarget).toBeNull();
      expect(result.current.isAnimating).toBe(false);
    });
  });

  describe('Card Flipping', () => {
    it('should flip a card', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.flipCard('card-1');
      });

      expect(result.current.flippedCards.has('card-1')).toBe(true);
    });

    it('should toggle card flip state', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.flipCard('card-1');
      });
      expect(result.current.flippedCards.has('card-1')).toBe(true);

      act(() => {
        result.current.flipCard('card-1');
      });
      expect(result.current.flippedCards.has('card-1')).toBe(false);
    });

    it('should flip all cards', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());
      const cardIds = ['card-1', 'card-2', 'card-3'];

      act(() => {
        result.current.flipAllCards(cardIds);
      });

      expect(result.current.flippedCards.size).toBe(3);
      cardIds.forEach(id => {
        expect(result.current.flippedCards.has(id)).toBe(true);
      });
    });

    it('should reset flipped cards', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.flipCard('card-1');
        result.current.flipCard('card-2');
      });
      expect(result.current.flippedCards.size).toBe(2);

      act(() => {
        result.current.resetFlippedCards();
      });
      expect(result.current.flippedCards.size).toBe(0);
    });
  });

  describe('Scoring System', () => {
    it('should update score', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.updateScore(10);
      });
      expect(result.current.score).toBe(10);

      act(() => {
        result.current.updateScore(5);
      });
      expect(result.current.score).toBe(15);
    });

    it('should add points for correct mapping', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.addPoints(20);
      });

      expect(result.current.score).toBe(20);
    });

    it('should deduct points for incorrect mapping', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.updateScore(50);
        result.current.deductPoints(10);
      });

      expect(result.current.score).toBe(40);
    });

    it('should not allow negative scores', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.deductPoints(10);
      });

      expect(result.current.score).toBe(0);
    });

    it('should reset score', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.updateScore(100);
      });
      expect(result.current.score).toBe(100);

      act(() => {
        result.current.resetScore();
      });
      expect(result.current.score).toBe(0);
    });
  });

  describe('Feedback Management', () => {
    it('should add feedback message', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.addFeedback('success', '正确！');
      });

      expect(result.current.feedback).toHaveLength(1);
      expect(result.current.feedback[0].type).toBe('success');
      expect(result.current.feedback[0].message).toBe('正确！');
      expect(result.current.feedback[0].id).toBeDefined();
      expect(result.current.feedback[0].timestamp).toBeDefined();
    });

    it('should add multiple feedback messages', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.addFeedback('success', '第一条');
        result.current.addFeedback('error', '第二条');
        result.current.addFeedback('info', '第三条');
      });

      expect(result.current.feedback).toHaveLength(3);
    });

    it('should remove feedback by id', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.addFeedback('success', '消息1');
        result.current.addFeedback('error', '消息2');
      });

      const feedbackId = result.current.feedback[0].id;

      act(() => {
        result.current.removeFeedback(feedbackId);
      });

      expect(result.current.feedback).toHaveLength(1);
      expect(result.current.feedback[0].message).toBe('消息2');
    });

    it('should clear all feedback', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.addFeedback('success', '消息1');
        result.current.addFeedback('error', '消息2');
      });
      expect(result.current.feedback).toHaveLength(2);

      act(() => {
        result.current.clearFeedback();
      });
      expect(result.current.feedback).toHaveLength(0);
    });
  });

  describe('Mode Management', () => {
    it('should set mode to practice', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.setMode('practice');
      });

      expect(result.current.mode).toBe('practice');
    });

    it('should set mode to watch', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.setMode('practice');
      });
      expect(result.current.mode).toBe('practice');

      act(() => {
        result.current.setMode('watch');
      });
      expect(result.current.mode).toBe('watch');
    });

    it('should toggle mode', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      expect(result.current.mode).toBe('watch');

      act(() => {
        result.current.toggleMode();
      });
      expect(result.current.mode).toBe('practice');

      act(() => {
        result.current.toggleMode();
      });
      expect(result.current.mode).toBe('watch');
    });
  });

  describe('Mapping Management', () => {
    it('should check if mapping is correct', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      const correctMappings = new Map([
        ['evidence-1', 'element-1'],
        ['evidence-2', 'element-2']
      ]);

      act(() => {
        result.current.setCorrectMappings(correctMappings);
      });

      expect(result.current.isCorrectMapping('evidence-1', 'element-1')).toBe(true);
      expect(result.current.isCorrectMapping('evidence-1', 'element-2')).toBe(false);
    });

    it('should remove a mapping', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.completeDrop('evidence-1', 'element-1', true);
        result.current.completeDrop('evidence-2', 'element-2', true);
      });
      expect(result.current.completedMappings.size).toBe(2);

      act(() => {
        result.current.removeMapping('evidence-1');
      });
      expect(result.current.completedMappings.size).toBe(1);
      expect(result.current.completedMappings.has('evidence-1')).toBe(false);
    });

    it('should clear all mappings', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.completeDrop('evidence-1', 'element-1', true);
        result.current.completeDrop('evidence-2', 'element-2', true);
      });
      expect(result.current.completedMappings.size).toBe(2);

      act(() => {
        result.current.clearMappings();
      });
      expect(result.current.completedMappings.size).toBe(0);
    });

    it('should check if all mappings are complete', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      const totalEvidence = ['evidence-1', 'evidence-2', 'evidence-3'];

      act(() => {
        result.current.completeDrop('evidence-1', 'element-1', true);
        result.current.completeDrop('evidence-2', 'element-2', true);
      });
      expect(result.current.areAllMappingsComplete(totalEvidence)).toBe(false);

      act(() => {
        result.current.completeDrop('evidence-3', 'element-3', true);
      });
      expect(result.current.areAllMappingsComplete(totalEvidence)).toBe(true);
    });
  });

  describe('Animation State', () => {
    it('should set animation state', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.setAnimating(true);
      });
      expect(result.current.isAnimating).toBe(true);

      act(() => {
        result.current.setAnimating(false);
      });
      expect(result.current.isAnimating).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should track attempt count', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      expect(result.current.attemptCount).toBe(0);

      act(() => {
        result.current.incrementAttempt();
      });
      expect(result.current.attemptCount).toBe(1);

      act(() => {
        result.current.incrementAttempt();
      });
      expect(result.current.attemptCount).toBe(2);
    });

    it('should track correct count', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      expect(result.current.correctCount).toBe(0);

      act(() => {
        result.current.incrementCorrect();
      });
      expect(result.current.correctCount).toBe(1);
    });

    it('should calculate accuracy', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      act(() => {
        result.current.incrementAttempt();
        result.current.incrementAttempt();
        result.current.incrementAttempt();
        result.current.incrementCorrect();
        result.current.incrementCorrect();
      });

      const accuracy = result.current.getAccuracy();
      expect(accuracy).toBeCloseTo(66.67, 1);
    });

    it('should return 0 accuracy when no attempts', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      const accuracy = result.current.getAccuracy();
      expect(accuracy).toBe(0);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset entire store to initial state', () => {
      const { result } = renderHook(() => useEvidenceInteractionStore());

      // Modify various states
      act(() => {
        result.current.startDrag('evidence-1');
        result.current.setDropTarget('element-1');
        result.current.flipCard('card-1');
        result.current.completeDrop('evidence-2', 'element-2', true);
        result.current.updateScore(100);
        result.current.addFeedback('success', 'Test');
        result.current.setMode('practice');
        result.current.incrementAttempt();
        result.current.incrementCorrect();
      });

      // Reset everything
      act(() => {
        result.current.reset();
      });

      expect(result.current.draggedItem).toBeNull();
      expect(result.current.dropTarget).toBeNull();
      expect(result.current.flippedCards.size).toBe(0);
      expect(result.current.completedMappings.size).toBe(0);
      expect(result.current.score).toBe(0);
      expect(result.current.feedback).toEqual([]);
      expect(result.current.mode).toBe('watch');
      expect(result.current.isAnimating).toBe(false);
      expect(result.current.attemptCount).toBe(0);
      expect(result.current.correctCount).toBe(0);
    });
  });
});